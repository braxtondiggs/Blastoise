import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AngularFirestore } from '@angular/fire/firestore';
import { Brewery, BreweryTimeline } from '../core/interfaces';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, Sort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as dayjs from 'dayjs';
import * as duration from 'dayjs/plugin/duration';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import { AuthService } from '../core/services';
import { MatDialog } from '@angular/material/dialog';
import { AuthDialogComponent } from './auth/auth-dialog.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class AdminComponent implements OnInit {
  public title: string = this.route.snapshot.data['title'];
  public dataSource?: MatTableDataSource<Brewery> | any;
  public timeline$?: Observable<BreweryTimeline[]> = of([]);
  public columns: string[] = ['name', 'date'];
  public expandedElement?: Brewery | null;
  public isLoggedIn = false;
  @ViewChild(MatSort) sort?: Sort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private dialog: MatDialog,
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
      this.afs.collection<Brewery>('breweries').valueChanges().subscribe(data => { // , (ref) => ref.limit(15)
        this.dataSource = new MatTableDataSource(data);
        this.dataSource.paginator = this.paginator as any;
        this.dataSource.sort = this.sort as any;
      });
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
    this.timeline$ = this.afs.doc<BreweryTimeline>(`brewery-timeline/${brewery.placeId}`).valueChanges().pipe(map((data: any) =>
      Object.values(data).map((item: any) => {
        const start = dayjs(item.start.toDate().getTime());
        const end = dayjs(item.end.toDate().getTime());
        return ({
          ...item,
          display: {
            title: start.format('dddd MMM D, YYYY').toString(),
            start: start.format('h:mm A').toString(),
            end: end.format('h:mm A').toString(),
            duration: dayjs.duration(end.diff(start)).humanize()
          }
        })
      }).reverse()
    ));
    if (this.timeline$) this.timeline$.subscribe(console.log);
  }

  private getAuth() {
    const dialogRef = this.dialog.open(AuthDialogComponent, {
      backdropClass: 'auth-backdrop',
      autoFocus: true,
      disableClose: true,
      panelClass: 'auth-dialog',
      minWidth: 320,
      maxWidth: 480
    });

    dialogRef.afterClosed().subscribe(() => this.ngOnInit());
  }
}
