import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireMessaging } from '@angular/fire/compat/messaging';
import { Observable } from 'rxjs';
import { HumanizeDuration, HumanizeDurationLanguage } from 'humanize-duration-ts';
import { map } from 'rxjs/operators';
import { Brewery } from '../core/interfaces';
import * as dayjs from 'dayjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isLoading = true;
  token = localStorage.getItem('token');
  hasNotifications= (this.token !== null && this.token.length > 0);
  brewery$?: Observable<any>;
  constructor(private afs: AngularFirestore,
    private afMessaging: AngularFireMessaging) { }

  ngOnInit(): void {
    if (this.hasNotifications) this.listenToNotifications();
    this.brewery$ = this.afs.collection<Brewery>('breweries', ref => ref.orderBy('lastUpdated', 'desc').limit(1)).valueChanges().pipe(
      map(brewery => this.isAtBrewery(brewery))
    );
  }

  getLastUpdated(brewery: any) {
    const langService = new HumanizeDurationLanguage();
    const humanizer = new HumanizeDuration(langService);
    const date = brewery.lastUpdated ?? brewery.start;
    return humanizer.humanize(dayjs().diff(dayjs(date.toDate().getTime()), 'millisecond'), { units: ['d', 'h', 'm'], conjunction: ", ", serialComma: false, round: true });
  }

  listenToNotifications() {
    if (!this.hasNotifications) this.afMessaging.requestToken.subscribe(async (token) => {
      if (!token) return;
      await this.afs.collection('notifications').add({ token });
      localStorage.setItem('token', token.toString());
      this.hasNotifications = true;
    });
    this.afMessaging.messages.subscribe();
  }

  private isAtBrewery(breweries: any) {
    setTimeout(() => this.isLoading = false, 1000);
    return breweries.filter((brewery: any) => {
      const time = brewery.lastUpdated ?? brewery.start;
      if (dayjs().isBefore(dayjs(time.toDate().getTime()).add(2, 'hour'))) return brewery;
    });
  }
}
