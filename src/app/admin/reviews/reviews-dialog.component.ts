import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Brewery, BreweryReview, BreweryTimeline } from 'src/app/core/interfaces';
import * as dayjs from 'dayjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-reviews-dialog',
  templateUrl: './reviews-dialog.component.html',
  styleUrls: ['./reviews-dialog.component.scss'],
})

export class ReviewsDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { reviews: BreweryReview[] },
    private afs: AngularFirestore,
    private toast: MatSnackBar) {
    data.reviews = data.reviews.map((item) => {
      const caption = item.start ? dayjs(item.start.toDate().getTime()).format('dddd MMM D, YYYY - h:mm A').toString() : null;
      return ({
        ...item,
        display: { caption }
      });
    });
  }

  async vote(action: boolean, item: BreweryReview) {
    try {
      if (action) {
        await this.afs.doc<Brewery>(`breweries/${item.place_id}`).set({
          address: item.address,
          location: item.location,
          name: item.name,
          placeId: item.place_id,
          lastUpdated: item.start
        }, { merge: true });
        this.afs.doc<BreweryTimeline>(`brewery-timeline/${item.place_id}`).valueChanges().pipe(take(1)).subscribe(async (timeline: any) => {
          timeline = timeline ?? {};
          const index = Object.keys(timeline).length;
          timeline[index] = { start: item.start, end: item.end } as BreweryTimeline;
          await this.afs.doc<BreweryTimeline>(`brewery-timeline/${item.place_id}`).set(timeline, { merge: true });
        });
      }
      await this.afs.doc(`brewery-review/${item.place_id}`).delete();
      const index = this.data.reviews.map((o) => o.place_id).indexOf(item.place_id);
      this.data.reviews.splice(index, 1);
      this.toast.open('Update Successful', undefined, { duration: 2000 });
    } catch (e: any) {
      this.toast.open(e.message, undefined, { duration: 2000 });
    }
  }
}
