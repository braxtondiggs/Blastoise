import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Firestore, setDoc, doc, docData, deleteDoc } from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Brewery, BreweryReview, BreweryTimeline } from 'src/app/core/interfaces';
import { ApiService } from '../../core/services';
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
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatChipsModule, MatProgressSpinnerModule]
})

export class ReviewsDialogComponent {
  processingItems = new Set<string>();

  public data = inject(MAT_DIALOG_DATA) as { reviews: EnhancedBreweryReview[] };
  private afs = inject(Firestore);
  private api = inject(ApiService);
  private toast = inject(MatSnackBar);

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
    await setDoc(doc(this.afs, 'breweries', item.place_id), {
      address: item.address,
      location: item.location,
      name: item.name,
      placeId: item.place_id,
      lastUpdated: item.start
    }, { merge: true } as any);

    // Add timeline entry
  const timelineRef = doc(this.afs, 'brewery-timeline', item.place_id);
  const timelineData: any = await docData(timelineRef) as any || {};
    const index = Object.keys(timelineData).length;
    timelineData[index] = {
      start: item.start,
      end: item.end
    };

  await setDoc(doc(this.afs, 'brewery-timeline', item.place_id), timelineData as any, { merge: true } as any);

    // Send notification if it's a current visit
    if (item.display.isCurrentVisit) {
      try {
        await this.api.sendNotification({
          brewery: item.name
        }).toPromise();
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
        // Don't fail the entire approval for notification errors
      }
    }
  }

  private async removeReview(item: EnhancedBreweryReview): Promise<void> {
  await deleteDoc(doc(this.afs, 'brewery-review', item.place_id));

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
