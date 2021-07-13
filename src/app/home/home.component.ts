import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireMessaging } from '@angular/fire/messaging';
import { combineLatest, Observable } from 'rxjs';
import { HumanizeDuration, HumanizeDurationLanguage } from 'humanize-duration-ts';
import { map } from 'rxjs/operators';
import { Brewery, BreweryReview } from '../core/interfaces';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isLoading = true;
  brewery$?: Observable<any>;
  constructor(private afs: AngularFirestore,
    private afMessaging: AngularFireMessaging) { }

  ngOnInit(): void {
    this.requestNotificationPermission();
    this.brewery$ = combineLatest<any[]>([
      this.afs.collection<Brewery>('breweries', ref => ref.orderBy('lastUpdated', 'desc').limit(1)).valueChanges(),
      this.afs.collection<BreweryReview>('brewery-review', ref => ref.orderBy('start', 'desc').limit(1)).valueChanges()
    ]).pipe(
      map(arr => arr.reduce((acc, cur) => acc.concat(cur))),
      map(brewery => this.isAtBrewery(brewery))
    );
  }

  getLastUpdated(brewery: any) {
    const langService = new HumanizeDurationLanguage();
    const humanizer = new HumanizeDuration(langService);
    const date = brewery.lastUpdated ?? brewery.start;
    console.log(date);
    return humanizer.humanize(dayjs().diff(dayjs(date.toDate().getTime()), 'millisecond'), { units: ['d', 'h', 'm'], conjunction: ", ", serialComma: false, round: true });
  }

  private isAtBrewery(breweries: any) {
    setTimeout(() => this.isLoading = false, 1000);
    return breweries.filter((brewery: any) => {
      const time = brewery.lastUpdated ?? brewery.start;
      if (dayjs().isBefore(dayjs(time.toDate().getTime()).add(2, 'hour'))) return brewery;
    });
  }

  private requestNotificationPermission() {
    this.afMessaging.requestToken
      .subscribe(
        (token) => { console.log('Permission granted! Save to the server!', token); },
        (error) => { console.error(error); },
      );
    this.afMessaging.messages
      .subscribe((message) => { console.log(message); });
  }
}
