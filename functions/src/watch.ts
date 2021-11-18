import { size } from 'lodash';
import * as functions from 'firebase-functions';
import db from './db';

export async function onTimelineChange(_change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) {
  const timelineSnapshot = await db.doc(`brewery-timeline/${context.params.id}`).get();
  const timeline: any = timelineSnapshot.data();

  const brewerySnap = await db.doc(`breweries/${context.params.id}`).get();
  if (brewerySnap.exists) await db.doc(`breweries/${context.params.id}`).update({ timeline: size(timeline) });
}
