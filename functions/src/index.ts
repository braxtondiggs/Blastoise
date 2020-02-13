import * as express from 'express';
import * as cors from 'cors';
import * as functions from 'firebase-functions';

const app = express();
app.use(cors({ origin: true }));

app.post('/', (req, res) => {
    return res.status(200).json({ 'message': 'Ok' });
});

exports.endpoint = functions.https.onRequest(app);