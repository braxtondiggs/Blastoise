import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Brewery, BreweryReview, BreweryTimeline } from 'src/app/core/interfaces';
import { take } from 'rxjs/operators';
import * as dayjs from 'dayjs';
import * as isBetween from 'dayjs/plugin/isBetween';
import * as duration from 'dayjs/plugin/duration';

interface EnhancedBreweryReview extends BreweryReview {
  display: {
    caption: string;
    duration?: string;
    isCurrentVisit?: boolean;
  };
}

@Component({
  selector: 'app-reviews-dialog',
  templateUrl: './reviews-dialog.component.html',
  styleUrls: ['./reviews-dialog.component.scss'],
})

export class ReviewsDialogComponent {
  processingItems = new Set<string>();

  public data = inject(MAT_DIALOG_DATA) as { reviews: EnhancedBreweryReview[] };
  private afs = inject(AngularFirestore);
  private http = inject(HttpClient);
  private toast = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<ReviewsDialogComponent>);

  constructor() {
    dayjs.extend(isBetween);
    dayjs.extend(duration);
    this.enhanceReviewsData();
  }

  private enhanceReviewsData(): void {
    this.data.reviews = this.data.reviews.map((item) => {
      const startTime = item.start ? dayjs(item.start.toDate()) : null;
      const endTime = item.end ? dayjs(item.end.toDate()) : null;
      const now = dayjs();

      let caption = '';
      let visitDuration = '';
      let isCurrentVisit = false;

      if (startTime) {
        caption = startTime.format('dddd, MMM D, YYYY - h:mm A');

        if (endTime) {
          const duration = dayjs.duration(endTime.diff(startTime));
          visitDuration = duration.humanize();
        }

        if (endTime) {
          isCurrentVisit = now.isBetween(startTime, endTime);
        } else {
          // If no end time, consider it current if it started within the last 8 hours
          isCurrentVisit = now.diff(startTime, 'hours') <= 8;
        }
      }

      return {
        ...item,
        display: {
          caption,
          duration: visitDuration,
          isCurrentVisit
        }
      };
    });
  }

  trackByPlaceId(index: number, item: EnhancedBreweryReview): string {
    return item.place_id;
  }

  async vote(action: boolean, item: EnhancedBreweryReview): Promise<void> {
    if (this.processingItems.has(item.place_id)) {
      return;
    }

    this.processingItems.add(item.place_id);

    try {
      if (action) {
        await this.approveReview(item);
      }

      await this.removeReview(item);
      this.showSuccessMessage(action ? 'approved' : 'rejected');
    } catch (error: any) {
      console.error('Error processing review:', error);
      this.toast.open(
        error.message || 'An error occurred while processing the review',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.processingItems.delete(item.place_id);
    }
  }

  async approveAll(): Promise<void> {
    if (this.processingItems.size > 0) {
      return;
    }

    const reviewsToProcess = [...this.data.reviews];

    try {
      for (const review of reviewsToProcess) {
        this.processingItems.add(review.place_id);
      }

      const promises = reviewsToProcess.map(review => this.vote(true, review));
      await Promise.all(promises);

      this.toast.open(
        `Successfully approved ${reviewsToProcess.length} review${reviewsToProcess.length !== 1 ? 's' : ''}`,
        'Close',
        { duration: 3000 }
      );
    } catch (error: any) {
      console.error('Error approving all reviews:', error);
      this.toast.open('Some reviews could not be processed', 'Close', { duration: 5000 });
    }
  }

  private async approveReview(item: EnhancedBreweryReview): Promise<void> {
    // Add brewery to the main collection
    await this.afs.doc<Brewery>(`breweries/${item.place_id}`).set({
      address: item.address,
      location: item.location,
      name: item.name,
      placeId: item.place_id,
      lastUpdated: item.start
    }, { merge: true });

    // Add timeline entry
    const timeline = await this.afs.doc<any>(`brewery-timeline/${item.place_id}`)
      .valueChanges()
      .pipe(take(1))
      .toPromise();

    const timelineData: any = timeline || {};
    const index = Object.keys(timelineData).length;
    timelineData[index] = {
      start: item.start,
      end: item.end
    };

    await this.afs.doc(`brewery-timeline/${item.place_id}`)
      .set(timelineData, { merge: true });

    // Send notification if it's a current visit
    if (item.display.isCurrentVisit) {
      try {
        await this.http.post('https://us-central1-mybuddiesio.cloudfunctions.net/endpoints/notification', {
          brewery: item.name
        }).toPromise();
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
        // Don't fail the entire approval for notification errors
      }
    }
  }

  private async removeReview(item: EnhancedBreweryReview): Promise<void> {
    await this.afs.doc(`brewery-review/${item.place_id}`).delete();

    const index = this.data.reviews.findIndex(review => review.place_id === item.place_id);
    if (index > -1) {
      this.data.reviews.splice(index, 1);
    }
  }

  private showSuccessMessage(action: string): void {
    this.toast.open(
      `Review ${action} successfully`,
      'Close',
      { duration: 2000 }
    );
  }
}
