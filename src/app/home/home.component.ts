import { Component, OnInit, OnDestroy, inject, DestroyRef, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, tap, catchError, startWith, finalize } from 'rxjs/operators';
import { HumanizeDuration, HumanizeDurationLanguage } from 'humanize-duration-ts';
import { Brewery } from '../core/interfaces';
import * as dayjs from 'dayjs';

interface HomeComponentState {
  breweries: Brewery[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  // Angular v16 dependency injection
  private readonly afs = inject(AngularFirestore);
  private readonly afMessaging = inject(AngularFireMessaging);
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

  ngOnDestroy(): void {
    // Cleanup is handled automatically by takeUntilDestroyed
  }

  /**
   * Initialize Firebase Cloud Messaging if notifications are enabled
   */
  private initializeNotifications(): void {
    if (this.hasNotifications()) {
      this.setupNotificationListener();
    }
  }

  /**
   * Load brewery data from Firestore with error handling
   */
  private loadBreweryData(): void {
    this.brewery$ = this.afs
      .collection<Brewery>('breweries', ref =>
        ref.orderBy('lastUpdated', 'desc').limit(1)
      )
      .valueChanges()
      .pipe(
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
    this.brewery$.subscribe();
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
      if (this.hasNotifications()) return;

      const token = await this.afMessaging.requestToken.pipe(
        takeUntilDestroyed(this.destroyRef)
      ).toPromise();

      if (!token) {
        console.warn('No FCM token received');
        return;
      }

      // Store token in Firestore
      await this.afs.collection('notifications').add({
        token,
        createdAt: new Date(),
        userAgent: navigator.userAgent,
        active: true
      });

      // Update local storage and state
      localStorage.setItem('notificationToken', token);
      this.notificationToken.set(token);

      this.setupNotificationListener();

    } catch (error) {
      console.error('Error setting up notifications:', error);
      // Could show user-friendly error message here
    }
  }

  /**
   * Setup listener for incoming FCM messages
   */
  private setupNotificationListener(): void {
    this.afMessaging.messages
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (message) => {
          console.log('Received FCM message:', message);
          // Handle incoming notification
          this.handleNotificationMessage(message);
        },
        error: (error) => {
          console.error('FCM message error:', error);
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
