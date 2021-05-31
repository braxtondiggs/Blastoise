import { Timestamp, GeoPoint } from '@firebase/firestore-types';

export interface BreweryReview {
  address: string;
  end: Timestamp;
  start: Timestamp;
  location: GeoPoint;
  name: string;
  place_id: string;
  display?: any;
}
