import * as admin from 'firebase-admin';
import { chain, mapKeys, isEmpty } from 'lodash';
import db from './db';
import { readFileSync } from 'fs';
import { MasterBreweryData } from './interface';

interface LocationData {
  placeId: string;
  location: admin.firestore.GeoPoint;
  address: string;
  name: string;
}

interface TimelineData {
  placeId: string;
  visits: Array<{ start: Date; end: Date }>;
}

export async function importBackLog() {
  const rawdata = readFileSync('searched.json');
  let data = JSON.parse(rawdata.toString());
  data = chain(data)
    .map((o) => ({
      location: new admin.firestore.GeoPoint(
        latlng(o.latitudeE7),
        -Math.abs(latlng(o.longitudeE7))
      ),
      placeId: o.placeId,
      address: o.address.split('\n').join(' '),
      name: o.name
    }))
    .value();

  const promise: Promise<admin.firestore.WriteResult>[] = [];
  data.forEach((location: LocationData) => {
    promise.push(db.doc(`breweries/${location.placeId}`).set(location));
  });
  Promise.all(promise).then(() => console.log('done'));
}

export async function importBackLogTimeline() {
  const rawdata = readFileSync('searched.json');
  let data = JSON.parse(rawdata.toString());

  data = chain(data)
    .map((o) => ({
      visits: o.visits.map((oo: unknown) => ({
        start: new Date(+(oo as { startTimestampMs: string }).startTimestampMs),
        end: new Date(+(oo as { endTimestampMs: string }).endTimestampMs)
      })),
      placeId: o.placeId
    }))
    .value();

  const promise: Promise<admin.firestore.WriteResult>[] = [];
  data.forEach((location: TimelineData) => {
    promise.push(
      db.doc(`brewery-timeline/${location.placeId}`)
        .set(mapKeys(location.visits, (__, key) => key))
    );
  });
  Promise.all(promise).then(() => console.log('done'));
}

export async function importMasterList() {
  // eslint-disable-next-line max-len
  // let { data: breweries }: { data: MasterBreweryData } = await axios.get('https://www.brewersassociation.org/wp-content/themes/ba2019/json-store/breweries/breweries.json');
  const data = JSON.parse(readFileSync('./breweries.json').toString());
  const breweries: MasterBreweryData = JSON.parse(data.toString());
  const new_brewery = chain(breweries.ResultData)
    .filter({ 'Country': '', 'NotOpentoPublic': false })
    .reject((brewery) =>
      brewery.Longitude === '0.0000000' ||
      brewery.BreweryType === 'Planning' ||
      brewery.Longitude === 'null' ||
      brewery.Latitude === 'null' ||
      isEmpty(brewery.Latitude) ||
      isEmpty(brewery.Longitude)
    )
    .map((brewery) => ({
      name: brewery.InstituteName,
      type: brewery.BreweryType,
      address: `${brewery.Address1} ${brewery.City} ${brewery.StateProvince} ${brewery.Zip}`,
      location: new admin.firestore.GeoPoint(
        parseFloat(brewery.Latitude),
        parseFloat(brewery.Longitude)
      )
    }))
    .value();

  const promise: Promise<admin.firestore.DocumentReference>[] = [];
  new_brewery.forEach((brewery: {
    name: string;
    type: string;
    address: string;
    location: admin.firestore.GeoPoint;
  }) => {
    promise.push(db.collection('breweries-master').add(brewery));
  });
  Promise.all(promise).then(() => console.log('done'));
}

function latlng(point: number | string) {
  const p = point.toString().split('-').join('');
  return parseFloat(`${p.slice(0, 2)}.${p.slice(2)}`);
}
