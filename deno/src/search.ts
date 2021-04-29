import { delay } from 'https://deno.land/x/delay@v0.2.0/mod.ts';
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { readJsonSync, writeJsonSync } from 'https://deno.land/x/jsonfile/mod.ts';

const locations: any = readJsonSync('output/condensed.json');

const data = [];
for await (const location of locations) {
    await delay(500);
    console.log(location.name);
    const html = await fetch(`http://www.google.com/search?q=${encodeURIComponent(location.name)}%20${encodeURIComponent(location.address)}`).then((res) =>res.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc?.querySelector('body')!;
    const text = body.textContent.toLowerCase();
    if (text.includes('brew')) data.push(location);
}
writeJsonSync('output/searched.json', data);