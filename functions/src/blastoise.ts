import * as admin from 'firebase-admin';
import * as _ from 'lodash';
import * as fs from 'fs';

const db = admin.firestore();

export async function importBackLog() {
  const rawdata = fs.readFileSync('searched.json');
  let data = JSON.parse(rawdata.toString());
  data = _.chain(data)
    .map((o) => ({
      location: new admin.firestore.GeoPoint(latlng(o.latitudeE7), -Math.abs(latlng(o.longitudeE7))),
      placeId: o.placeId,
      address: o.address.split('\n').join(' '),
      name: o.name
    }))
    .value();

  const promise: any[] = [];
  data.forEach((location: any) => {
    promise.push(db.doc(`breweries/${location.placeId}`).set(location));
  });
  Promise.all(promise).then(() => console.log('done'));
}

export async function importBackLogTimeline() {
  const rawdata = fs.readFileSync('searched.json');
  let data = JSON.parse(rawdata.toString());

  data = _.chain(data)
    .map((o) => ({
      visits: o.visits.map((oo: any) =>  ({ start: new Date(+oo.startTimestampMs), end: new Date(+oo.endTimestampMs) })),
      placeId: o.placeId
    }))
    .value();

  const promise: any[] = [];
  data.forEach((location: any) => {
    promise.push(db.doc(`brewery-timeline/${location.placeId}`).set(_.mapKeys(location.visits, (_, key) => key)));
  });
  Promise.all(promise).then(() => console.log('done'));
}

function latlng(point: number | string) {
  point = point.toString().split('-').join('');
  return parseFloat(`${point.slice(0, 2)}.${point.slice(2)}`);
}
