import db from './db';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import cors from 'cors';
import dayjs from 'dayjs';
import express from 'express';
import cheerio from 'cheerio';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Geocodio = require('geocodio-library-node');
import { Candidate, PlaceSearch } from './interface';
import { convertDistance, getDistance } from 'geolib';
import { onTimelineChange } from './watch';
import { size } from 'lodash';

// Add these type definitions
interface RequestBody {
  address?: string;
  location?: string;
  brewery?: string;
}

const app = express();
const config = admin.remoteConfig();
db.settings({ ignoreUndefinedProperties: true });

// Automatically allow cross-origin requestsd
app.use(cors({ origin: true }));

app.post('/import', async (request: express.Request, response: express.Response) => {
  const template = await config.getTemplate();
  const API = (template.parameters.GOOGLEAPI.defaultValue as unknown as { value: string }).value;
  if (!API) return response.json({ success: false, msg: 'invalid API token' });
  const body = request.body as RequestBody;
  if (body.address && body.location) {
    const lastCallSnap = await db.doc('brewery-review/last-call').get();
    const lastCall = lastCallSnap.data();
    logger.info(
      `${dayjs().toString()} - ${dayjs(lastCall?.time.toDate().getTime())
        .add(5, 'minute').toString()}`
    );
    if (dayjs().isBefore(
      dayjs(lastCall?.time.toDate().getTime()).add(5, 'minute')
    )) {
      logger.warn('Hasn\'t been enough time');
      return response.json({
        success: false,
        msg: 'Hasn\'t been enough time'
      });
    }

    const location = body.location.split(',');
    const { data: query }: { data: PlaceSearch } = await axios.get(
      'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
      {
        params: {
          input: decodeURIComponent(`brewery%20near%20${body.address}`),
          key: API,
          inputtype: 'textquery',
          fields: 'formatted_address,name,geometry,place_id'
        }
      }
    );

    // Validate candidates and calculate distances
    for (const candidate of query.candidates) {
      if (!candidate.geometry || !candidate.geometry?.location) {
        return response.json({ success: false, msg: 'Location Error' });
      }
      candidate.distance = getDistance({
        latitude: candidate.geometry.location.lat,
        longitude: candidate.geometry.location.lng
      }, {
        latitude: parseFloat(location[0]),
        longitude: parseFloat(location[1])
      });
    }

    await axios.get(
      'https://hc-ping.com/a25899e2-fdb1-4be8-aa1b-b27af4ab6664'
    );
    query.candidates = query.candidates.filter(
      (candidate) => convertDistance(candidate.distance, 'ft') <= 250
    );

    const hasCandidates = query.candidates.length > 0;
    await db.doc('brewery-review/last-call').set({
      time: admin.firestore.FieldValue.serverTimestamp(),
      place_id: hasCandidates ? query.candidates[0].place_id : undefined
    });

    if (!hasCandidates) {
      if (lastCall && lastCall.place_id) {
        updateBreweryInfo([{
          place_id: query.candidates[0].place_id
        }] as Candidate[]);
      }

      logger.info('candidates: None Found');
      return response.json({ success: false, msg: 'no valid candidates' });
    }

    updateBreweryInfo(query.candidates);

    logger.info('candidates:', query.candidates);
    return response.json({
      success: true,
      candidates: JSON.stringify(query.candidates)
    });
  } else {
    logger.error(`invalid params: ${JSON.stringify(request.body)}`);
    return response.status(500).json({
      success: true,
      msg: `invalid params: ${JSON.stringify(request.body)}`
    });
  }
});

function updateBreweryInfo(candidates: Candidate[]) {
  candidates.forEach(async (candidate) => {
    const snapshot = await db.doc(`breweries/${candidate.place_id}`).get();
    if (snapshot.exists) {
      const timeline = await db.doc(
        `brewery-timeline/${candidate.place_id}`
      ).get();
      const data = timeline.data();
      if (!data) return;
      const isSameDay = Object.entries(data).filter((o) =>
        dayjs().isSame(
          dayjs((o[1] as { start: admin.firestore.Timestamp }).start.toDate().getTime()),
          'week'
        )
      );
      let index = size(data);
      if (isSameDay.length) {
        index--;
        data[index] = {
          ...data[index],
          end: admin.firestore.FieldValue.serverTimestamp()
        };
      } else {
        data[index] = {
          start: admin.firestore.FieldValue.serverTimestamp()
        };
        sendNotifications(candidate);
      }
      await db.doc(`brewery-timeline/${candidate.place_id}`).update(data);
      await db.doc(`breweries/${candidate.place_id}`).update({
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
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
          location: new admin.firestore.GeoPoint(
            parseFloat(candidate.geometry.location.lat),
            parseFloat(candidate.geometry.location.lng)
          )
        });
        const snap = await db.doc(
          `brewery-review/${candidate.place_id}`
        ).get();
        const brewery = snap.data();
        const approval = await checkForApproval(
          brewery as admin.firestore.DocumentData
        );
        if (approval) await instantApproveUnderReview(brewery);
      }
    }
  });
}

async function sendNotifications(brewery: Candidate) {
  const snap = await db.collection('notifications').get();
  const tokens: string[] = [];
  snap.forEach((doc) => {
    const data = doc.data();
    tokens.push(data.token);
  });

  const payload = {
    notification: {
      title: `Braxton is at ${brewery.name}`,
      body: 'Click to find out more info!',
      icon: 'https://braxton.beer/assets/icons/icon-128x128.png'
    }
  };
  await admin.messaging().sendToDevice(tokens, payload);
}

async function checkForApproval(
  brewery: admin.firestore.DocumentData | undefined
): Promise<boolean> {
  let approval = false;
  if (!brewery) return approval;

  const response = await axios.get(
    `http://www.google.com/search?q=${encodeURIComponent(brewery.name)}%20${
      encodeURIComponent(brewery.formatted_address)
    }`
  );
  if (response.status === 200) {
    const $ = cheerio.load(response.data);
    const text = $.text().toLowerCase();
    if (text.includes('brew') || text.includes('distill')) approval = true;
  }
  return approval;
}

async function instantApproveUnderReview(
  brewery: admin.firestore.DocumentData | undefined
) {
  if (!brewery) return;

  await db.doc(`breweries/${brewery.place_id}`).set({
    address: brewery.address,
    location: brewery.location,
    name: brewery.name,
    placeId: brewery.place_id,
    lastUpdated: brewery.start
  }, { merge: true });
  const snap = await db.doc(`brewery-timeline/${brewery.place_id}`).get();
  let timeline = snap.data();
  timeline = timeline ?? {};
  const index = Object.keys(timeline).length;
  timeline[index] = { start: brewery.start, end: brewery.end };
  await db.doc(`brewery-timeline/${brewery.place_id}`).set(
    timeline,
    { merge: true }
  );
  await db.doc(`brewery-review/${brewery.place_id}`).delete();
  sendNotifications(brewery as Candidate);
}

app.post('/geocodio', async (request: express.Request, response: express.Response) => {
  const template = await config.getTemplate();
  const API = (template.parameters.GEOCODIO.defaultValue as unknown as { value: string }).value;
  if (!API) return response.json({ success: false, msg: 'invalid API token' });
  const body = request.body as RequestBody;
  if (body.location) {
    const geocoder = new Geocodio(API);
    try {
      const { results } = await geocoder.reverse(body.location);
      return response.json({ address: results[0].formatted_address });
    } catch (e) {
      return response.status(500).json(e);
    }
  } else {
    logger.error('invalid params');
    return response.status(500).json({
      success: true,
      msg: 'invalid params'
    });
  }
});

app.post('/brewery', async (request: express.Request, response: express.Response) => {
  const template = await config.getTemplate();
  const API = (template.parameters.GOOGLEAPI.defaultValue as unknown as { value: string }).value;
  const body = request.body as RequestBody;
  const { data: query }: { data: PlaceSearch } = await axios.get(
    'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
    {
      params: {
        input: decodeURIComponent(body.brewery || ''),
        key: API,
        inputtype: 'textquery',
        fields: 'formatted_address,name,geometry,place_id'
      }
    }
  );
  return response.json(query.candidates);
});

app.get('/last-updated', async (
  _request: express.Request,
  response: express.Response
) => {
  const snapshot = await db.collection('breweries').get();
  const breweries: admin.firestore.DocumentData[] = [];
  snapshot.forEach(async (doc) => {
    const brewery = doc.data();
    breweries.push(brewery);
  });

  for await (const brewery of breweries) {
    const timelineSnapshot = await db.doc(
      `brewery-timeline/${brewery.placeId}`
    ).get();
    const timeline = timelineSnapshot.data();
    if (!timeline) continue;

    const entries = Object.values(timeline) as Array<{
      start: admin.firestore.Timestamp;
    }>;
    const [first] = entries.sort(
      (a, b) => b.start.toDate().getTime() - a.start.toDate().getTime()
    );
    await db.doc(`breweries/${brewery.placeId}`).update({
      lastUpdated: first.start
    });
  }
  return response.json({});
});

app.post('/notification', async (
  request: express.Request,
  response: express.Response
) => {
  const body = request.body as RequestBody;
  if (!body.brewery) return response.json({});
  sendNotifications({
    name: decodeURIComponent(body.brewery)
  } as Candidate);
  return response.json({});
});

// HTTP Cloud Function with v6 syntax
export const endpoints = onRequest({
  timeoutSeconds: 540,
  memory: '1GiB',
  region: 'us-central1'
}, app);

// Firestore trigger with v6 syntax
export const onTimelineCreate = onDocumentWritten(
  'brewery-timeline/{id}',
  onTimelineChange
);
