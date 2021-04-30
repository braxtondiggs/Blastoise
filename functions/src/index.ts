import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
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
                data[size(data)] = { start: new Date() };
                await db.doc(`brewery-timeline/${candidate.place_id}`).set(data);
            } else {
                await db.doc(`brewery-review/${candidate.place_id}`).set({
                    start: new Date(),
                    place_id: candidate.place_id,
                    address: candidate.formatted_address,
                    name: candidate.name,
                    location: new admin.firestore.GeoPoint(parseFloat(candidate.geometry.location.lat), parseFloat(candidate.geometry.location.lng))
                });
            }
        });
        response.json({ success: true, candidates: query.candidates });
    }
});

exports.endpoints = functions.https.onRequest(app);
