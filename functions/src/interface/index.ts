export interface PlaceSearch {
  candidates: Candidate[];
}

export interface Candidate {
  formatted_address: string;
  geometry: {
    location: {
      lat: string;
      lng: string
    }
  };
  name: string;
  place_id: string;
  distance: number;
}
