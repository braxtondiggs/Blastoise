import { Timestamp, GeoPoint } from '@firebase/firestore-types';

export interface Brewery {
  address: string;
  location: GeoPoint;
  name: string;
  placeId: string;
  lastUpdated: Timestamp;
}
