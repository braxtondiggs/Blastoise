import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as dayjs from 'dayjs';
import * as express from 'express';
import axios from 'axios';
import { Candidate, PlaceSearch } from './interface';
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
  const API = (template.parameters.GOOGLEAPI.defaultValue as any).value;
  if (!API) return response.json({ success: false, msg: 'invalid API token' });
  if (request.body['address'] && request.body['location']) {
    const lastCallSnap = await db.doc('brewery-review/last-call').get();
    const lastCall = lastCallSnap.data();
    if (lastCall) {
      if (dayjs().isBefore(dayjs(lastCall.time.toDate().getTime()).add(30, 'minute'))) {
        functions.logger.warn('Hasn\'t been enough time');
        return  response.json({ success: false, msg: 'Hasn\'t been enough time' });
      }
    }

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

    await axios.get('https://hc-ping.com/a25899e2-fdb1-4be8-aa1b-b27af4ab6664');
    query.candidates = query.candidates.filter((candidate) => convertDistance(candidate.distance, 'ft') <= 150);
    if (!query.candidates.length) {
      if (lastCall && lastCall.place_id) updateBreweryInfo([{ place_id: lastCall.place_id }] as any);

      functions.logger.info('candidates: None Found');
      return response.json({ success: false, msg: 'no valid candidates' });
    }
    updateBreweryInfo(query.candidates);

    await db.doc('brewery-review/last-call').set({
      time: admin.firestore.FieldValue.serverTimestamp(),
      place_id: query.candidates.length ? query.candidates[0].place_id : null
    });

    functions.logger.info('candidates:', query.candidates);
    return response.json({ success: true, candidates: query.candidates });
  } else {
    functions.logger.error('invalid params');
    return response.status(500).json({ success: true, msg: 'invalid params' });
  }
});


function updateBreweryInfo(candidates: Candidate[]) {
  candidates.forEach(async (candidate) => {
    const snapshot = await db.doc(`breweries/${candidate.place_id}`).get();
    if (snapshot.exists) {
      const timeline = await db.doc(`brewery-timeline/${candidate.place_id}`).get();
      const data = timeline.data();
      if (!data) return;
      const isSameDay = Object.entries(data).filter((o) => dayjs().isSame(dayjs(o[1].start._seconds * 1000), 'week'));
      let index = size(data);
      if (isSameDay.length) {
        index--;
        data[index] = { ...data[index], end: admin.firestore.FieldValue.serverTimestamp() };
      } else {
        data[index] = { start: admin.firestore.FieldValue.serverTimestamp() };
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
}

exports.endpoints = functions.https.onRequest(app);
