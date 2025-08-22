import { Component, OnInit, inject, DestroyRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Firestore, collectionData, collection, query, orderBy, limit as limitFn, addDoc } from '@angular/fire/firestore';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { Observable, timeout, of } from 'rxjs';
import { map, tap, catchError, startWith, finalize } from 'rxjs/operators';
import { HumanizeDuration, HumanizeDurationLanguage } from 'humanize-duration-ts';
import { Brewery } from '../core/interfaces';
import * as dayjs from 'dayjs';

// Angular Material imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

interface HomeComponentState {
  breweries: Brewery[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatCardModule
  ]
})
export class HomeComponent implements OnInit {
  // Angular v16 dependency injection
  private readonly afs = inject(Firestore);
  private readonly afMessaging = inject(Messaging);
  private readonly destroyRef = inject(DestroyRef);

  // Angular v16 signals for reactive state management
  private readonly state = signal<HomeComponentState>({
    breweries: [],
    isLoading: true,
    hasError: false
  });

  // Computed signals for derived state
  readonly isLoading = computed(() => this.state().isLoading);
  readonly hasError = computed(() => this.state().hasError);
  readonly errorMessage = computed(() => this.state().errorMessage);
  readonly currentBrewery = computed(() => this.state().breweries[0] || null);
  readonly isAtBrewery = computed(() => this.state().breweries.length > 0);

  // Notification state
  private readonly notificationToken = signal<string | null>(
    localStorage.getItem('notificationToken')
  );
  readonly hasNotifications = computed(() =>
    this.notificationToken() !== null && this.notificationToken()!.length > 0
  );

  // Observable for brewery data
  brewery$?: Observable<Brewery[]>;

  // Humanizer for date formatting
  private readonly humanizer: HumanizeDuration;

  constructor() {
    const langService = new HumanizeDurationLanguage();
    this.humanizer = new HumanizeDuration(langService);
  }

  ngOnInit(): void {
    this.initializeNotifications();
    this.loadBreweryData();
  }

  /**
   * Initialize Firebase Cloud Messaging if notifications are enabled
   */
  private initializeNotifications(): void {

    // Check service worker registration
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        console.log('Service worker registrations:', registrations.length);
        registrations.forEach((registration, index) => {
          console.log(`SW ${index}:`, registration.scope);
        });
      });
    }

    // Check if user has granted permission but token is missing
    if (Notification.permission === 'granted' && !this.notificationToken()) {
      console.log('Permission granted but token missing, requesting new token...');
      this.listenToNotifications();
    } else if (this.hasNotifications()) {
      console.log('Notifications already set up, setting up listener...');
      this.setupNotificationListener();
    }
  }

  /**
   * Load brewery data from Firestore with error handling
   */
  private loadBreweryData(): void {
  const colRef = collection(this.afs, 'breweries');
  const q = query(colRef, orderBy('lastUpdated', 'desc'), limitFn(1));
  this.brewery$ = collectionData(q, { idField: 'placeId' }) as unknown as Observable<Brewery[]>;

  this.brewery$ = this.brewery$.pipe(
        startWith([]), // Start with empty array
        map(breweries => this.filterActiveBreweries(breweries)),
        tap(breweries => this.updateState({ breweries, isLoading: false, hasError: false })),
        catchError(error => {
          console.error('Error loading brewery data:', error);
          this.updateState({
            breweries: [],
            isLoading: false,
            hasError: true,
            errorMessage: 'Failed to load brewery status. Please try again.'
          });
          return [];
        }),
        finalize(() => this.updateState({ isLoading: false })),
        takeUntilDestroyed(this.destroyRef)
      );

    // Subscribe to brewery data to update component state
    this.brewery$?.subscribe();
  }

  /**
   * Filter breweries to only show active ones (within 2 hours)
   */
  private filterActiveBreweries(breweries: Brewery[]): Brewery[] {
    if (!breweries || breweries.length === 0) return [];

    return breweries.filter(brewery => {
      const timestamp = brewery.lastUpdated || brewery.timeline;
      if (!timestamp) return false;

      const breweryTime = dayjs(timestamp.toDate());
      const cutoffTime = dayjs().subtract(2, 'hours');

      return breweryTime.isAfter(cutoffTime);
    });
  }

  /**
   * Update component state immutably
   */
  private updateState(partialState: Partial<HomeComponentState>): void {
    this.state.update(currentState => ({
      ...currentState,
      ...partialState
    }));
  }

  /**
   * Get human-readable time since last update
   */
  getLastUpdated(brewery: Brewery): string {
    if (!brewery) return '';

    const timestamp = brewery.lastUpdated || brewery.timeline;
    if (!timestamp) return 'Unknown';

    const diffMs = dayjs().diff(dayjs(timestamp.toDate()), 'milliseconds');

    return this.humanizer.humanize(diffMs, {
      units: ['d', 'h', 'm'],
      conjunction: ', ',
      serialComma: false,
      round: true,
      largest: 2 // Only show the two largest units
    });
  }

  /**
   * Request notification permissions and setup FCM
   */
  async listenToNotifications(): Promise<void> {
    try {
      // Check if we already have notifications enabled (token exists and permissions granted)
      if (this.hasNotifications()) {
        console.log('Notifications already enabled');
        return;
      }

      console.log('Requesting FCM token...');

      // Use modular getToken
      try {
        const token = await getToken(this.afMessaging as any, { vapidKey: undefined });
        if (token) {
          console.log('FCM token received:', token);
          await this.saveToken(token);
          return;
        }
      } catch (getTokenError) {
        console.warn('getToken failed or timed out:', getTokenError);
      }

    } catch (error) {
      console.error('Error setting up notifications:', error);
      // Clear any stale token if there was an error
      localStorage.removeItem('notificationToken');
      this.notificationToken.set(null);
    }
  }

  /**
   * Save the FCM token to localStorage and Firestore
   */
  private async saveToken(token: string): Promise<void> {
    try {
      // Store token in Firestore using modular API
      await addDoc(collection(this.afs, 'notifications'), {
        token,
        createdAt: new Date(),
        userAgent: navigator.userAgent,
        active: true
      });

      // Update local storage and state
      localStorage.setItem('notificationToken', token);
      this.notificationToken.set(token);

      console.log('Notification token saved to localStorage');

      this.setupNotificationListener();
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  }

  /**
   * Setup listener for incoming FCM messages
   */
  private setupNotificationListener(): void {
    // Use modular messaging onMessage for foreground messages
    onMessage(this.afMessaging as any, (message) => {
      try {
        console.log('Received FCM message:', message);
        this.handleNotificationMessage(message);
      } catch (e) {
        console.error('FCM message handling error:', e);
      }
    });
  }

  /**
   * Handle incoming notification messages
   */
  private handleNotificationMessage(message: any): void {
    // You can implement custom notification handling here
    // For example, update the brewery data or show a snackbar
    this.loadBreweryData(); // Refresh data when notification arrives
  }

  /**
   * Retry loading brewery data
   */
  retryLoad(): void {
    this.updateState({
      isLoading: true,
      hasError: false,
      errorMessage: undefined
    });
    this.loadBreweryData();
  }

  /**
   * Generate Google Maps URL for a brewery
   */
  getGoogleMapsUrl(brewery: Brewery): string {
    if (!brewery) return '';

    const query = encodeURIComponent(`${brewery.name} ${brewery.address}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  /**
   * Generate Google Static Maps image URL
   */
  getStaticMapUrl(brewery: Brewery): string {
    if (!brewery || !brewery.location) return '';

    const lat = brewery.location.latitude;
    const lng = brewery.location.longitude;
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: '18',
      size: '600x300',
      maptype: 'roadmap',
      markers: `color:red|label:B|${lat},${lng}`,
      key: 'AIzaSyDgiyC2qlZIZy7rPNWTMcUj44g48rIbWtk'
    });

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }

  /**
   * Track by function for brewery list (if needed for performance)
   */
  trackByBreweryId(index: number, brewery: Brewery): string {
    return brewery.placeId || brewery.name || index.toString();
  }

  /**
   * Handle image loading errors
   */
  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
    }
  }
}
