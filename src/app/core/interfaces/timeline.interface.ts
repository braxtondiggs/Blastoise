import { Timestamp } from '@firebase/firestore-types';

export interface BreweryTimeline {
  end: Timestamp;
  start: Timestamp;
  display: any;
}
