import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/firestore';
import { Brewery, BreweryReview, BreweryTimeline } from '../core/interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Timestamp } from '@firebase/firestore-types';
import * as dayjs from 'dayjs';
import * as duration from 'dayjs/plugin/duration';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { AuthService } from '../core/services';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth/auth-dialog.component';
import { ReviewsDialogComponent } from './reviews/reviews-dialog.component';
import { AlertDialogComponent } from './alert/alert-dialog.component';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TimelineDialogComponent } from './timeline/timeline-dialog.component';
import { BreweryDialogComponent } from './brewery/brewery-dialog.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AdminComponent implements OnInit {
  public title: string = this.route.snapshot.data['title'];
  public dataSource?: MatTableDataSource<Brewery> | any;
  public timeline$?: Observable<BreweryTimeline[]>;
  public reviews$?: Observable<BreweryReview[]>;
  public columns: string[] = ['name', 'date'];
  public expandedElement?: Brewery | null;
  public timelineDisplay: any[] = [];
  public isLoggedIn = false;
  public isLoading = false;
  @ViewChild(MatSort) sort?: Sort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private dialog: MatDialog,
    private http: HttpClient,
    private toast: MatSnackBar,
    private titleService: Title,
    private route: ActivatedRoute) {
    dayjs.extend(duration);
    dayjs.extend(relativeTime);
    this.titleService.setTitle(this.title);
  }

  async ngOnInit() {
    const uid = await this.auth.uid();
    this.isLoggedIn = !!uid;
    if (this.isLoggedIn) {
      this.afs.collection<Brewery>('breweries').valueChanges().subscribe(data => { //, (ref) => ref.limit(15)
        data = data.map(o => ({
          ...o,
          updated: o.lastUpdated ? dayjs((o.lastUpdated as Timestamp).toDate()).format('MM/DD/YY h:mm A').toString() : ''
        }));
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator as any;
        this.dataSource.sort = this.sort;
        this.dataSource.sortingDataAccessor = (item: any, property: string) => {
          switch (property) {
            case 'date': return new Date(item.lastUpdated.toDate());
            default: return item[property];
          }
        }
      });
      this.reviews$ = this.afs.collection<BreweryReview>('brewery-review', (ref) => ref.orderBy('start', 'desc')).valueChanges();
    } else {
      this.getAuth();
    }
  }

  applyFilter(event: Event) {
    if (!this.dataSource) return;
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getExpandedElement(brewery: Brewery) {
    this.expandedElement = this.expandedElement === brewery ? null : brewery;
    this.timeline$ = this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).valueChanges().pipe(map((data: any) => {
      if (!data) return data;
      return Object.values(data).sort((a: any, b: any) => b.start.toDate() - a.start.toDate()).map((item: any, key: number) => {
        const start = dayjs(item.start.toDate().getTime());
        const end = dayjs(item.end.toDate().getTime());
        this.timelineDisplay[key] = {
          title: start.format('dddd MMM D, YYYY').toString(),
          start: start.format('h:mm A').toString(),
          end: end.format('h:mm A').toString(),
          duration: dayjs.duration(end.diff(start)).humanize()
        };
        return item;
      })
    }));
  }

  openReviews(reviews: BreweryReview[]) {
    this.dialog.open(ReviewsDialogComponent, {
      minWidth: 320,
      maxWidth: 480,
      data: { reviews }
    });
  }

  refresh() {
    const dialogRef = this.dialog.open(AlertDialogComponent, {
      minWidth: 320,
      maxWidth: 480,
      data: { msg: 'You are about to force the brewery app to to register your location?' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) this.importLocation();
    });
  }

  modifyTimeline(brewery: Brewery, item: BreweryTimeline, timeline: BreweryTimeline[]) {
    const dialogRef = this.dialog.open(TimelineDialogComponent, {
      minWidth: 320,
      maxWidth: 480,
      data: { brewery, timeline: item }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const index = timeline.map((o) => o.start.toString()).indexOf(item.start.toString());
        const start = dayjs(result.start).format('MM/DD/YYYY').toString();
        const end = dayjs(result.end).format('MM/DD/YYYY').toString();
        const _timeline = { ...timeline };
        _timeline[index] = {
          start: dayjs(`${start} ${result.startTime}`).toDate(),
          end: dayjs(`${end} ${result.endTime}`).toDate()
        };
        const [first] = Object.values(_timeline)
          .map((o: any) => ({ start: (o.start instanceof Date) ? o.start : o.start.toDate() }))
          .sort((a: any, b: any) => b.start - a.start);
        if (first) await this.afs.doc<Brewery>(`breweries/${brewery.placeId}`).update({ lastUpdated: first.start });
        await this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).set(_timeline as any);
        this.toast.open('Timeline updated successfully', undefined, { duration: 2000 });
      }
    });
  }

  addTimeline(brewery?: Brewery) {
    const dialogRef = this.dialog.open(TimelineDialogComponent, {
      autoFocus: false,
      minWidth: 320,
      maxWidth: 480,
      data: { breweries: this.dataSource._data._value, brewery }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        let { brewery, start, startTime, end, endTime } = result;
        this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).valueChanges().pipe(take(1)).subscribe(async (timeline: any) => {
          timeline = timeline ?? {};
          const index = Object.values(timeline).length;
          start = dayjs(start).format('MM/DD/YYYY').toString();
          end = dayjs(end).format('MM/DD/YYYY').toString();
          timeline[index] = {
            start: dayjs(`${start} ${startTime}`).toDate(),
            end: dayjs(`${end} ${endTime}`).toDate()
          };
          const [first] = Object.values(timeline)
            .map((o: any) => ({ start: (o.start instanceof Date) ? o.start : o.start.toDate() }))
            .sort((a: any, b: any) => b.start - a.start);
          await this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).set(timeline);
          if (first) await this.afs.doc<Brewery>(`breweries/${brewery.placeId}`).update({ lastUpdated: first.start });
          this.toast.open('Timeline updated successfully', undefined, { duration: 2000 });
        });
      }
    });
  }

  removeTimeline(brewery: Brewery, item: BreweryTimeline, timeline: BreweryTimeline[]) {
    const dialogRef = this.dialog.open(AlertDialogComponent, {
      minWidth: 320,
      maxWidth: 480,
      data: { msg: `You are about delete timeline information from ${brewery.name}, this is permanent!` }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        const data: any = {};
        const index = timeline.map((o) => o.start.toString()).indexOf(item.start.toString());
        timeline.splice(index, 1);
        const [first] = Object.values(timeline)
          .map((o: any) => ({ start: (o.start instanceof Date) ? o.start : o.start.toDate() }))
          .sort((a: any, b: any) => b.start - a.start);
        Object.entries(timeline).forEach(([key, value]) => data[key] = value);
        await this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).set(data);
        if (first) await this.afs.doc<Brewery>(`breweries/${brewery.placeId}`).update({ lastUpdated: first.start });
        this.toast.open('Timeline item remove successfully', undefined, { duration: 2000 });
      }
    });
  }

  addBrewery() {
    const dialogRef = this.dialog.open(BreweryDialogComponent, {
      autoFocus: false,
      minWidth: 320,
      maxWidth: 480
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && result.length) {
        const promise = result.map(((o: any) => this.afs.doc<Brewery>(`breweries/${o.placeId}`).set(o, { merge: true })));
        await Promise.all(promise);
        this.toast.open('Brewery added successfully', undefined, { duration: 2000 });
      }
    });
  }

  private getAuth() {
    const dialogRef = this.dialog.open(AuthDialogComponent, {
      backdropClass: 'auth-backdrop',
      disableClose: true,
      minWidth: 320,
      maxWidth: 480
    });

    dialogRef.afterClosed().subscribe(() => this.ngOnInit());
  }

  private importLocation() {
    try {
      this.isLoading = true;
      navigator.geolocation.getCurrentPosition(async position => {
        const { address } = await this.http.post('https://us-central1-blastoise-5d78e.cloudfunctions.net/endpoints/geocodio', {
          location: `${position.coords.latitude},${position.coords.longitude}`
        }).toPromise() as any;
        const { msg, status, candidates } = await this.http.post('https://us-central1-blastoise-5d78e.cloudfunctions.net/endpoints/import', {
          address,
          location: `${position.coords.latitude},${position.coords.longitude}`
        }).toPromise() as any;
        const response = status ? candidates[0].name : msg;
        this.toast.open(response, undefined, { duration: 2000 });
      });
    } catch (e) {
      this.isLoading = false;
      this.toast.open(e.msg, undefined, { duration: 2000 });
    }
  }
}
