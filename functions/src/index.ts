import express from 'express';
import cors from 'cors';
import axios, { AxiosResponse, AxiosError } from 'axios';
import * as functions from 'firebase-functions';

const app = express();
app.use(cors({ origin: true }));

app.post('/', (req, res) => {
    const { address, name, type } = req.body;
    if (address && name && type) {
        return axios({
            method: 'get',
            url: 'https://api.openbrewerydb.org/breweries/search',
            data: { query: name }
        }).then((response: AxiosResponse) => {
            if (response.data && response.data.length > 0) {
                const data = response.data[0];

                return res.status(200).send(data);
            }
            return res.status(200).json({});
        }).catch((error: AxiosError) => res.status(400).json(error.toJSON()))
    }
    return res.status(400).send('Bad Request: An error has occured');
});

exports.endpoint = functions.https.onRequest(app);