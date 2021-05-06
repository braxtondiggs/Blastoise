import * as admin from 'firebase-admin';
import * as _ from 'lodash';
import * as fs from 'fs';
import { MasterBreweryData } from './interface';

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
      visits: o.visits.map((oo: any) => ({ start: new Date(+oo.startTimestampMs), end: new Date(+oo.endTimestampMs) })),
      placeId: o.placeId
    }))
    .value();

  const promise: any[] = [];
  data.forEach((location: any) => {
    promise.push(db.doc(`brewery-timeline/${location.placeId}`).set(_.mapKeys(location.visits, (_, key) => key)));
  });
  Promise.all(promise).then(() => console.log('done'));
}

export async function importMasterList() {
  // let { data: breweries }: { data: MasterBreweryData } = await axios.get('https://www.brewersassociation.org/wp-content/themes/ba2019/json-store/breweries/breweries.json');
  const data = JSON.parse(fs.readFileSync('./breweries.json').toString());
  const breweries: MasterBreweryData = JSON.parse(data.toString());
  const new_brewery = _.chain(breweries.ResultData)
    .filter({ 'Country': '', 'NotOpentoPublic': false })
    .reject((brewery) => brewery.Longitude === '0.0000000' || brewery.BreweryType === 'Planning' || brewery.Longitude === 'null' || brewery.Latitude === 'null' || _.isEmpty(brewery.Latitude) || _.isEmpty(brewery.Longitude))
    .map((brewery) => ({
      name: brewery.InstituteName,
      type: brewery.BreweryType,
      address: `${brewery.Address1} ${brewery.City} ${brewery.StateProvince} ${brewery.Zip}`,
      location: new admin.firestore.GeoPoint(parseFloat(brewery.Latitude), parseFloat(brewery.Longitude))
    }))
    .value();

  const promise: any[] = [];
  new_brewery.forEach((brewery: any) => {
    promise.push(db.collection('breweries-master').add(brewery));
  });
  Promise.all(promise).then(() => console.log('done'));
}

function latlng(point: number | string) {
  const p = point.toString().split('-').join('');
  return parseFloat(`${p.slice(0, 2)}.${p.slice(2)}`);
}
