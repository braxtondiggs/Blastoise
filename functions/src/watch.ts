import { size } from 'lodash';
import { FirestoreEvent, Change } from 'firebase-functions/v2/firestore';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import db from './db';

export async function onTimelineChange(
  event: FirestoreEvent<Change<DocumentSnapshot> | undefined, { id: string }>
) {
  if (!event.data) return;

  const timelineSnapshot = await db
    .doc(`brewery-timeline/${event.params.id}`)
    .get();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline: any = timelineSnapshot.data();

  const brewerySnap = await db.doc(`breweries/${event.params.id}`).get();
  if (brewerySnap.exists) {
    await db
      .doc(`breweries/${event.params.id}`)
      .update({ timeline: size(timeline) });
  }
}
