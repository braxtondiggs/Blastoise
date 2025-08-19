import * as admin from 'firebase-admin';

export const defaultApp = admin.initializeApp();

const firestore = admin.firestore();
export default firestore;
