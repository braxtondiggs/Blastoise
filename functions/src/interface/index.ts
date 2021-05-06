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

export interface MasterBreweryData {
  ResultMessage: string;
  ResultData: MasterBrewery[];
}

export interface MasterBrewery {
  InstituteName: string;
  ContactID: string;
  CustomerType: string;
  BreweryType: string
  EmailAddress: string;
  WorkPhone: string;
  Address1: string;
  City: string;
  StateProvince: string;
  Zip: string;
  Country: string;
  InstituteContactID: string;
  WebSite: string;
  BreweryDBID: string;
  Latitude: string;
  Longitude: string;
  MemberDeals: boolean;
  MemberDealsOffer: string;
  OnlineDeal: boolean;
  NotOpentoPublic: boolean;
  NonVoting: boolean,
  NonCraft: boolean,
  TopParentID: string;
  TopParentCoName: string;
  TopParentIsCraft: string;
  IsSupporter: boolean;
  COVIDClosure: boolean;
  FoundedDate: string;
  PaidThru: string;
}
