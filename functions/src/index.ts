import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as dayjs from 'dayjs';
import * as express from 'express';
import axios from 'axios';
const Geocodio = require('geocodio-library-node');
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
    functions.logger.info(`${dayjs().toString()} - ${dayjs(lastCall?.time.toDate().getTime()).add(30, 'minute').toString()}`);
    if (dayjs().isBefore(dayjs(lastCall?.time.toDate().getTime()).add(30, 'minute'))) {
      functions.logger.warn('Hasn\'t been enough time');
      return response.json({ success: false, msg: 'Hasn\'t been enough time' });
    }

    const location = request.body['location'].split(',');
    const { data: query }: { data: PlaceSearch } = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
      params: {
        input: decodeURIComponent(`brewery%20near%20${request.body['address']}`),
        key: API,
        inputtype: 'textquery',
        fields: 'formatted_address,name,geometry,place_id'
      }
    });

    await db.doc('brewery-review/last-call').set({
      time: admin.firestore.FieldValue.serverTimestamp(),
      place_id: query.candidates.length ? query.candidates[0].place_id : null
    });

    query.candidates.forEach((candidate) => {
      if (!candidate.geometry || !candidate.geometry?.location) return response.json({ success: false, msg: 'Location Error' });
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
      await db.doc(`breweries/${candidate.place_id}`).update({ lastUpdated: admin.firestore.FieldValue.serverTimestamp() });
    } else {
      const reviewSnap = await db.doc(`brewery-review/${candidate.place_id}`).get();
      if (reviewSnap.exists) {
        await db.doc(`brewery-review/${candidate.place_id}`).update({
          end: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        if (!candidate.geometry || !candidate.geometry?.location) return;
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

app.post('/geocodio', async (request: any, response: any) => {
  const template = await config.getTemplate()
  const API = (template.parameters.GEOCODIO.defaultValue as any).value;
  if (!API) return response.json({ success: false, msg: 'invalid API token' });
  if (request.body['location']) {
    const geocoder = new Geocodio(API);
    try {
      const { results } = await geocoder.reverse(request.body['location']);
      return response.json({ address: results[0].formatted_address });
    } catch (e) {
      return response.status(500).json(e);
    }
  } else {
    functions.logger.error('invalid params');
    return response.status(500).json({ success: true, msg: 'invalid params' });
  }
});

app.post('/brewery', async (request: any, response: any) => {
  const template = await config.getTemplate();
  const API = (template.parameters.GOOGLEAPI.defaultValue as any).value;
  const { data: query }: { data: PlaceSearch } = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
    params: {
      input: decodeURIComponent(request.body['brewery']),
      key: API,
      inputtype: 'textquery',
      fields: 'formatted_address,name,geometry,place_id'
    }
  });
  return response.json(query.candidates);
});

app.get('/last-updated', async (request: any, response: any) => {
  const snapshot = await db.collection('breweries').get();
  const breweries: any = [];
  snapshot.forEach(async (doc) => {
    const brewery = doc.data();
    breweries.push(brewery);
  });

  for await (const brewery of breweries) {
    const timelineSnapshot = await db.doc(`brewery-timeline/${brewery.placeId}`).get();
    const timeline: any = timelineSnapshot.data();
    const [first]: any = Object.values(timeline).sort((a: any, b: any) => b.start.toDate() - a.start.toDate());
    await db.doc(`breweries/${brewery.placeId}`).update({ lastUpdated: first.start });
    // console.log(brewery.placeId, JSON.stringify(first));
  }
  return response.json({});
});

exports.endpoints = functions.runWith({ timeoutSeconds: 540 }).https.onRequest(app);
