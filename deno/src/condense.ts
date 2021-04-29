import { readJsonSync, writeJsonSync } from 'https://deno.land/x/jsonfile/mod.ts';
import "https://deno.land/x/lodash@4.17.19/dist/lodash.js";
const _ = (self as any)._;

const data = [];
for await (const dirEntry of Deno.readDir('Location History')) {
    if (dirEntry.isFile && dirEntry.name.includes('json')) {
        const { timelineObjects }: any = readJsonSync(`Location History/${dirEntry.name}`);
        if (timelineObjects) {
            const location = _.chain(timelineObjects)
                .filter('placeVisit')
                .value()
            data.push(...location);
        }
    }
}
const locations = _.chain(data)
    .map((o: any) => ({ ...o.placeVisit.location, ...o.placeVisit.duration  }))
    .groupBy('placeId')
    .map((group: any) => ({
        ..._.chain(group).first().omit(['locationConfidence', 'startTimestampMs', 'endTimestampMs', 'sourceInfo']).value(),
        visits: _.map(group, (o: any) => ({startTimestampMs: o.startTimestampMs, endTimestampMs: o.endTimestampMs }))
    }))
    .value();

writeJsonSync('output/condensed.json', locations)
