import { Timestamp } from '@firebase/firestore-types';

export interface BreweryTimeline {
  end: Timestamp | Date;
  start: Timestamp| Date;
}
