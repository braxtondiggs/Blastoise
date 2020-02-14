import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import cors from 'cors';
import dayjs from 'dayjs';
import db from './db';
import express from 'express';

const app = express();
app.use(cors({ origin: true }));

app.post('/', (req, res) => {
    const { address, location, name, type } = req.body;
    if (address && location && name && type && type === 'brewery') {
        return exists(name).then((result) => {
            const path = result ? `locations/${result.id}` : `locations/${createID()}`;
            const data = result ? result : req.body;
            return db.doc(path).set(formatData(data, path)).then(() => res.status(200).send('Success'))
        }).catch(() => res.status(200).send('Duplicate Entry'));
    }
    return res.status(400).send('Bad Request: An error has occured');
});

exports.endpoint = functions.https.onRequest(app);

function exists(name: string): Promise<Location> {
    return new Promise(async (resolve, reject) => {
        const snapshot = await db.collection('locations').where('name', '==', name).get();
        // tslint:disable-next-line: no-void-expression
        if (snapshot.empty) return resolve();
        snapshot.forEach(doc => {
            const data = doc.data() as Location;
            return dayjs((data.updated as any).toDate()).isSame(dayjs(), 'day') ? reject() : resolve(data);
        });
    });
}

function formatData(data: any, path: string): Location {
    const id = path.split('/')[1];
    const today = dayjs().toDate();
    if (data.id) {
        data.updated = today;
        data.timeline.push(today);
        return data;
    } else {
        const location = data.location.split(',');
        return {
            address: data.address,
            created: today,
            id,
            location: new admin.firestore.GeoPoint(+location[0], +location[1]),
            name: data.name,
            timeline: [today],
            updated: today
        };
    }
}

function createID(): string {
    const ref = db.collection('locations').doc();
    return ref.id;
}

interface Location {
    address: string;
    created: admin.firestore.Timestamp | Date;
    id: string;
    location: admin.firestore.GeoPoint,
    name: string;
    timeline: admin.firestore.Timestamp[] | Date[];
    updated: admin.firestore.Timestamp | Date;
}