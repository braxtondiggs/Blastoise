import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as dayjs from 'dayjs';
import * as express from 'express';
import axios from 'axios';
import { PlaceSearch } from './interface';
import { convertDistance, getDistance } from 'geolib';
import { size } from 'lodash';

admin.initializeApp();

const db = admin.firestore();
const app = express();
const config = admin.remoteConfig();

// Automatically allow cross-origin requestsd
app.use(cors({ origin: true }));

app.post('/import', async (request: any, response: any) => {
  const template = await config.getTemplate()
  const API = template.parameters.GOOGLEAPI;
  if (request.body['address'] && request.body['location']) {
    const lastCall = await getLastCall();
    if (lastCall) return;

    const location = request.body['location'].split(',');
    const { data: query }: { data: PlaceSearch } = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: {
        input: `brewery%20near%20${request.body['address']}`,
        key: API,
        inputtype: 'textquery',
        fields: 'formatted_address,name,geometry,place_id'
      }
    });

    query.candidates.forEach((candidate) => {
      candidate.distance = getDistance({
        latitude: candidate.geometry.location.lat,
        longitude: candidate.geometry.location.lng
      }, {
        latitude: parseFloat(location[0]),
        longitude: parseFloat(location[1])
      });
    });

    query.candidates = query.candidates.filter((candidate) => convertDistance(candidate.distance, 'ft') <= 150);
    if (!query.candidates.length) return;

    query.candidates.forEach(async (candidate) => {
      const snapshot = await db.doc(`breweries/${candidate.place_id}`).get();
      if (snapshot.exists) {
        const timeline = await db.doc(`brewery-timeline/${candidate.place_id}`).get();
        const data = timeline.data();
        if (!data) return;
        const isSameDay = Object.entries(data).filter((o) => dayjs().isSame(dayjs(o[1].start._seconds * 1000), 'day'));
        if (isSameDay.length) {
          data[size(data) - 1] = { end: admin.firestore.FieldValue.serverTimestamp() };
        } else {
          data[size(data)] = { start: admin.firestore.FieldValue.serverTimestamp() };
        }
        await db.doc(`brewery-timeline/${candidate.place_id}`).update(data);
      } else {
        const reviewSnap = await db.doc(`brewery-review/${candidate.place_id}`).get();
        if (reviewSnap.exists) {
          await db.doc(`brewery-review/${candidate.place_id}`).update({
            end: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          await db.doc(`brewery-review/${candidate.place_id}`).set({
            start: admin.firestore.FieldValue.serverTimestamp(),
            place_id: candidate.place_id,
            address: candidate.formatted_address,
            name: candidate.name,
            location: new admin.firestore.GeoPoint(parseFloat(candidate.geometry.location.lat), parseFloat(candidate.geometry.location.lng))
          });
        }
      }
    });
    response.json({ success: true, candidates: query.candidates });
  }
});

async function getLastCall(): Promise<boolean> {
  const lastCallSnap = await db.doc('brewery-review/last-call').get();
  const lastCall = lastCallSnap.data();
  if (!lastCall) return false;
  return dayjs().isBefore(dayjs(lastCall.time._secounds).add(30, 'minute'));
}

exports.endpoints = functions.https.onRequest(app);
