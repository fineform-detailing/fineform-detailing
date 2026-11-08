import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('a paleta do painel coincide com a referência e não afeta o site público',async()=>{
 const html=await readFile(new URL('../dist/painel/index.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../dist/assets/admin-v23.css',import.meta.url),'utf8');
 const original=await readFile(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 for(const hex of ['#ff8000','#f2f0ea','#9ea39e','#0b0d0c']) assert.ok(css.includes(hex),hex);
 assert.match(html,/assets\/admin-v23\.css/);
 assert.match(html,/content="#0B0D0C"/);
 assert.match(css,/body\[data-page="admin"\]/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(original,/--orange:#ff8000/);
 assert.match(css,/admin-glass-header/);
 assert.match(css,/\.ff-overview-hero/);
 assert.doesNotMatch(css,/#(?:c7fb4b|b8f52d|a4d740|99df41|236c5f|245f53|e1f3ed|389b89)/i);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
});

test('painel conserva scripts e proteções administrativas',async()=>{
 const html=await readFile(new URL('../dist/painel/index.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../dist/assets/admin.mjs',import.meta.url),'utf8');
 assert.match(html,/assets\/admin\.mjs/);
 for(const key of ['reauth','notifications','plates','subscriptions','dashboard']) assert.ok(js.includes(key),key);
 assert.match(js,/watchUpdates/);
 assert.match(js,/clearAdminSession/);
});
