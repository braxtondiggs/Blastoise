import { Component, OnInit, ViewChild, inject, DestroyRef, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Brewery, BreweryReview, BreweryTimeline } from '../core/interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Observable, of } from 'rxjs';
import { map, take, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Timestamp } from '@firebase/firestore-types';
import * as dayjs from 'dayjs';
import * as duration from 'dayjs/plugin/duration';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { AuthService, ApiService } from '../core/services';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth/auth-dialog.component';
import { ReviewsDialogComponent } from './reviews/reviews-dialog.component';
import { AlertDialogComponent } from './alert/alert-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { TimelineDialogComponent } from './timeline/timeline-dialog.component';
import { BreweryDialogComponent } from './brewery/brewery-dialog.component';
import { AddActionsBottomSheetComponent, AddActionResult } from './add-actions/add-actions-bottom-sheet.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', overflow: 'hidden' })),
      state('expanded', style({ height: '*', overflow: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AdminComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly afs = inject(AngularFirestore);
  private readonly dialog = inject(MatDialog);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly toast = inject(MatSnackBar);
  private readonly titleService = inject(Title);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // Signals for reactive state management (Angular 16 feature)
  public readonly title = signal<string>('');
  public readonly isLoggedIn = signal<boolean>(false);
  public readonly isLoading = signal<boolean>(true);
  public readonly expandedElement = signal<Brewery | null>(null);

  // Traditional reactive properties
  public dataSource = new MatTableDataSource<Brewery>([]);
  public timeline$?: Observable<BreweryTimeline[]>;
  public reviews$?: Observable<BreweryReview[]>;
  public readonly columns: string[] = ['name', 'date', 'actions'];
  public timelineDisplay: Array<{
    title: string;
    start: string;
    end: string | null;
    duration: string | null;
  }> = [];

  // UI state properties
  public currentFilter: string | null = null;
  public viewMode: 'compact' | 'detailed' = 'detailed';
  public readonly originalData: Brewery[] = [];

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  constructor() {
    // Initialize dayjs plugins
    dayjs.extend(duration);
    dayjs.extend(relativeTime);

    // Initialize title from route data
    const routeTitle = this.route.snapshot.data['title'] || 'Admin';
    this.title.set(routeTitle);
    this.titleService.setTitle(routeTitle);
  }

  async ngOnInit(): Promise<void> {
    try {
      const uid = await this.auth.uid();
      this.isLoggedIn.set(!!uid);

      if (this.isLoggedIn()) {
        this.initializeBreweriesData();
        this.initializeReviewsData();
        this.isLoading.set(false);
      } else {
        this.getAuth();
      }
    } catch (error) {
      console.error('Error during initialization:', error);
      this.toast.open('Error loading admin data', 'Close', { duration: 3000 });
    }
  }

  private initializeBreweriesData(): void {
    this.afs.collection<Brewery>('breweries')
      .valueChanges()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map(data => data.map(brewery => ({
          ...brewery,
          updated: brewery.lastUpdated ?
            dayjs((brewery.lastUpdated as Timestamp).toDate()).format('MM/DD/YY h:mm A') : ''
        }))),
        catchError(error => {
          console.error('Error loading breweries:', error);
          this.toast.open('Error loading brewery data', 'Close', { duration: 3000 });
          return of([] as Brewery[]);
        })
      )
      .subscribe(data => {
        this.dataSource.data = data;

        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
        if (this.sort) {
          this.dataSource.sort = this.sort;
          this.dataSource.sortingDataAccessor = (item: Brewery, property: string) => {
            switch (property) {
              case 'date':
                return item.lastUpdated ? new Date((item.lastUpdated as Timestamp).toDate()) : new Date(0);
              default:
                return (item as any)[property];
            }
          };
          this.sort.sortChange.emit(this.sort);
        }
      });
  }

  private initializeReviewsData(): void {
    this.reviews$ = this.afs.collection<BreweryReview>(
      'brewery-review',
      ref => ref.orderBy('start', 'desc')
    ).valueChanges().pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(error => {
        console.error('Error loading reviews:', error);
        this.toast.open('Error loading reviews', 'Close', { duration: 3000 });
        return of([]);
      })
    );
  }

  applyFilter(event: Event): void {
    if (!this.dataSource) return;
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    if (this.dataSource) {
      this.dataSource.filter = '';
      this.currentFilter = null;
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    }
  }

  // Enhanced filter methods
  filterByVisited(): void {
    this.currentFilter = 'visited';
    if (!this.dataSource) return;

    this.dataSource.filterPredicate = (data: Brewery) => {
      return data.timeline !== undefined && data.timeline > 0;
    };
    this.dataSource.filter = 'visited';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  filterByNeverVisited(): void {
    this.currentFilter = 'never-visited';
    if (!this.dataSource) return;

    this.dataSource.filterPredicate = (data: Brewery) => {
      return !data.timeline || data.timeline === 0;
    };
    this.dataSource.filter = 'never-visited';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  filterByRecent(): void {
    this.currentFilter = 'recent';
    if (!this.dataSource) return;

    const thirtyDaysAgo = dayjs().subtract(30, 'days');
    this.dataSource.filterPredicate = (data: Brewery) => {
      if (!data.lastUpdated) return false;
      const lastVisit = dayjs((data.lastUpdated as Timestamp).toDate());
      return lastVisit.isAfter(thirtyDaysAgo);
    };
    this.dataSource.filter = 'recent';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearFilters(): void {
    this.currentFilter = null;
    if (!this.dataSource) return;

    // Reset to default filter predicate
    this.dataSource.filterPredicate = (data: Brewery, filter: string) => {
      const searchText = data.name.toLowerCase();
      return searchText.includes(filter);
    };
    this.dataSource.filter = '';

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getExpandedElement(brewery: Brewery): void {
    const currentExpanded = this.expandedElement();
    this.expandedElement.set(currentExpanded === brewery ? null : brewery);

    this.timeline$ = this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`)
      .valueChanges()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        map((data: any) => {
          if (!data) return [];

          return Object.values(data)
            .sort((a: any, b: any) => b.start.toDate() - a.start.toDate())
            .map((item: any, index: number) => {
              const start = dayjs(item.start.toDate().getTime());
              const end = item.end ? dayjs(item.end.toDate().getTime()) : null;

              this.timelineDisplay[index] = {
                title: start.format('dddd MMM D, YYYY'),
                start: start.format('h:mm A'),
                end: end ? end.format('h:mm A') : null,
                duration: end ? dayjs.duration(end.diff(start)).humanize() : null
              };

              return item;
            });
        }),
        catchError(error => {
          console.error('Error loading timeline:', error);
          this.toast.open('Error loading timeline data', 'Close', { duration: 3000 });
          return of([]);
        })
      );
  }

  modifyTimeline(brewery: Brewery, item: BreweryTimeline, timeline: BreweryTimeline[]): void {
    const dialogRef = this.dialog.open(TimelineDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { brewery, timeline: item }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.handleTimelineModification(brewery, item, timeline, result);
        } catch (error) {
          console.error('Error modifying timeline:', error);
          this.toast.open('Error updating timeline', 'Close', { duration: 3000 });
        }
      }
    });
  }

  private async handleTimelineModification(
    brewery: Brewery,
    item: BreweryTimeline,
    timeline: BreweryTimeline[],
    result: any
  ): Promise<void> {
    const index = timeline.findIndex(o => o.start.toString() === item.start.toString());
    if (index === -1) {
      throw new Error('Timeline item not found');
    }

    const startDate = dayjs(result.start).format('MM/DD/YYYY');
    const endDate = dayjs(result.end).format('MM/DD/YYYY');

    const updatedTimeline = { ...timeline };
    (updatedTimeline as any)[index] = {
      start: dayjs(`${startDate} ${result.startTime}`).toDate(),
      end: dayjs(`${endDate} ${result.endTime}`).toDate()
    };

    const sortedTimeline = Object.values(updatedTimeline)
      .map((item: any) => ({
        start: item.start instanceof Date ? item.start : item.start.toDate()
      }))
      .sort((a: any, b: any) => b.start - a.start);

    if (sortedTimeline[0]) {
      await this.afs.doc<Brewery>(`breweries/${brewery.placeId}`)
        .update({ lastUpdated: sortedTimeline[0].start });
    }

    await this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`)
      .set(updatedTimeline as any);

    this.toast.open('Timeline updated successfully', 'Close', { duration: 2000 });
  }

  openQuickActions(): void {
    const bottomSheetRef = this.bottomSheet.open(AddActionsBottomSheetComponent);

    bottomSheetRef.afterDismissed().subscribe((result: AddActionResult) => {
      if (result?.action === 'timeline') {
        this.addTimeline();
      } else if (result?.action === 'brewery') {
        this.addBrewery();
      }
    });
  }

  addTimeline(brewery?: Brewery): void {
    if (!this.dataSource.data.length) {
      this.toast.open('No brewery data available', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(TimelineDialogComponent, {
      autoFocus: false,
      width: '90vw',
      maxWidth: '600px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { breweries: this.dataSource.data, brewery }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.handleTimelineAddition(result);
      }
    });
  }

  private async handleTimelineAddition(result: any): Promise<void> {
    try {
      const { brewery, start, startTime, end, endTime } = result;

      const timeline = await this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`)
        .valueChanges()
        .pipe(take(1))
        .toPromise() || {};

      const index = Object.values(timeline).length;
      const startDate = dayjs(start).format('MM/DD/YYYY');
      const endDate = dayjs(end).format('MM/DD/YYYY');

      (timeline as any)[index] = {
        start: dayjs(`${startDate} ${startTime}`).toDate(),
        end: dayjs(`${endDate} ${endTime}`).toDate()
      };

      const sortedTimeline = Object.values(timeline)
        .map((item: any) => ({
          start: item.start instanceof Date ? item.start : item.start.toDate()
        }))
        .sort((a: any, b: any) => b.start - a.start);

      await this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).set(timeline as any);

      if (sortedTimeline[0]) {
        await this.afs.doc<Brewery>(`breweries/${brewery.placeId}`)
          .update({ lastUpdated: sortedTimeline[0].start });
      }

      this.toast.open('Timeline updated successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error adding timeline:', error);
      this.toast.open('Error updating timeline', 'Close', { duration: 3000 });
    }
  }

  removeTimeline(brewery: Brewery, item: BreweryTimeline, timeline: BreweryTimeline[]): void {
    const dialogRef = this.dialog.open(AlertDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
      minWidth: '320px',
      data: {
        msg: `You are about to delete timeline information from ${brewery.name}. This action is permanent!`
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.handleTimelineRemoval(brewery, item, timeline);
        } catch (error) {
          console.error('Error removing timeline:', error);
          this.toast.open('Error removing timeline item', 'Close', { duration: 3000 });
        }
      }
    });
  }

  private async handleTimelineRemoval(
    brewery: Brewery,
    item: BreweryTimeline,
    timeline: BreweryTimeline[]
  ): Promise<void> {
    const index = timeline.findIndex(o => o.start.toString() === item.start.toString());
    if (index === -1) {
      throw new Error('Timeline item not found');
    }

    const updatedTimeline = [...timeline];
    updatedTimeline.splice(index, 1);

    const data: Record<string, BreweryTimeline> = {};
    updatedTimeline.forEach((value, index) => {
      data[index] = value;
    });

    const sortedTimeline = updatedTimeline
      .map((item: any) => ({
        start: item.start instanceof Date ? item.start : item.start.toDate()
      }))
      .sort((a: any, b: any) => b.start - a.start);

    await this.afs.doc(`brewery-timeline/${brewery.placeId}`).set(data);

    if (sortedTimeline[0]) {
      await this.afs.doc<Brewery>(`breweries/${brewery.placeId}`)
        .update({ lastUpdated: sortedTimeline[0].start });
    }

    this.toast.open('Timeline item removed successfully', 'Close', { duration: 2000 });
  }

  addBrewery(): void {
    const dialogRef = this.dialog.open(BreweryDialogComponent, {
      autoFocus: false,
      width: '90vw',
      maxWidth: '600px',
      minWidth: '320px',
      maxHeight: '90vh'
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.length) {
        try {
          const promises = result.map((brewery: Brewery) =>
            this.afs.doc<Brewery>(`breweries/${brewery.placeId}`).set(brewery, { merge: true })
          );
          await Promise.all(promises);
          this.toast.open('Brewery added successfully', 'Close', { duration: 2000 });
        } catch (error) {
          console.error('Error adding brewery:', error);
          this.toast.open('Error adding brewery', 'Close', { duration: 3000 });
        }
      }
    });
  }

  async removeBrewery(placeId: string): Promise<void> {
    try {
      await this.afs.doc<Brewery>(`breweries/${placeId}`).delete();
      this.toast.open('Brewery removed successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error removing brewery:', error);
      this.toast.open('Error removing brewery', 'Close', { duration: 3000 });
    }
  }

  openReviews(reviews: BreweryReview[]): void {
    this.dialog.open(ReviewsDialogComponent, {
      width: '95vw',
      maxWidth: '800px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { reviews }
    });
  }

  refresh(): void {
    const dialogRef = this.dialog.open(AlertDialogComponent, {
      width: '90vw',
      maxWidth: '500px',
      minWidth: '320px',
      data: {
        msg: 'You are about to force the brewery app to register your location. Continue?'
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.importLocation();
      }
    });
  }

  public getAuth(): void {
    const dialogRef = this.dialog.open(AuthDialogComponent, {
      backdropClass: 'auth-backdrop',
      disableClose: true,
      width: '90vw',
      maxWidth: '450px',
      minWidth: '320px'
    });

    dialogRef.afterClosed().subscribe(() => {
      this.ngOnInit();
    });
  }

  private async importLocation(): Promise<void> {
    try {
      this.isLoading.set(true);

      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;

      const geocodioResponse = await this.api.getAddressFromLocation(latitude, longitude).toPromise();

      if (!geocodioResponse?.address) {
        throw new Error('Failed to get address from location');
      }

      const importResponse = await this.api.importLocation(
        geocodioResponse.address,
        `${latitude},${longitude}`
      ).toPromise();

      if (!importResponse) {
        throw new Error('No response from import service');
      }

      const response = importResponse.status
        ? importResponse.candidates[0]?.name || 'Location imported successfully'
        : importResponse.msg;

      this.toast.open(response, 'Close', { duration: 2000 });
    } catch (error: any) {
      console.error('Error importing location:', error);
      const errorMessage = error.message || 'Error importing location';
      this.toast.open(errorMessage, 'Close', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(new Error(`Geolocation error: ${error.message}`)),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  // Get appropriate chip color for visit count (Material Design colors)
  getVisitChipColor(timeline: number | undefined): 'primary' | 'accent' | 'warn' | undefined {
    if (!timeline || timeline === 0) return undefined;
    if (timeline <= 3) return 'accent';
    if (timeline <= 10) return 'primary';
    return 'warn'; // frequent visits
  }

  getVisitStatus(timeline: number | undefined): string {
    if (!timeline || timeline === 0) return 'never';
    if (timeline <= 3) return 'few';
    if (timeline <= 10) return 'regular';
    return 'frequent';
  }

  getTotalVisits(): number {
    return this.dataSource.data.reduce((total, brewery) => {
      return total + (brewery.timeline || 0);
    }, 0);
  }

  getRelativeTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
    return dayjs(date).fromNow();
  }

  // Action methods for enhanced UI
  editBrewery(brewery: Brewery): void {
    const dialogRef = this.dialog.open(BreweryDialogComponent, {
      width: '90vw',
      maxWidth: '600px',
      minWidth: '320px',
      maxHeight: '90vh',
      data: { brewery }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.toast.open('Brewery updated successfully', 'Close', { duration: 2000 });
      }
    });
  }

  viewLocation(brewery: Brewery): void {
    if (brewery.location && brewery.location.latitude && brewery.location.longitude) {
      const url = `https://www.google.com/maps?q=${brewery.location.latitude},${brewery.location.longitude}`;
      window.open(url, '_blank');
    } else {
      this.toast.open('Location coordinates not available', 'Close', { duration: 3000 });
    }
  }

  copyLocation(brewery: Brewery): void {
    const address = brewery.address || brewery.name;
    navigator.clipboard.writeText(address).then(() => {
      this.toast.open('Address copied to clipboard', 'Close', { duration: 2000 });
    }).catch(() => {
      this.toast.open('Failed to copy address', 'Close', { duration: 3000 });
    });
  }

  // Track by function for better table performance (Angular 18 best practice)
  trackByBrewery(index: number, brewery: Brewery): string {
    return brewery.placeId || brewery.name || index.toString();
  }
}
