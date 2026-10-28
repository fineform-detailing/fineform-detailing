import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('painel carrega um único tema isolado sem alterar o site público',async()=>{
 const html=await readFile(new URL('../dist/painel/index.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../dist/assets/admin-v23.css',import.meta.url),'utf8');
 assert.match(html,/assets\/admin-v23\.css/);
 assert.doesNotMatch(html,/assets\/admin-v(?:18|20|21|22)\.css/);
 assert.match(css,/body\[data-page="admin"\]/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/prefers-reduced-motion/);
});
test('painel preserva operações sensíveis e apresenta indicadores sem valores fictícios',async()=>{
 const js=await readFile(new URL('../dist/assets/admin.mjs',import.meta.url),'utf8');
 for(const endpoint of ['/api/admin/dashboard','/api/admin/quotes?status=pending','/api/admin/session'])assert.ok(js.includes(endpoint),endpoint);
 for(const tab of ['dashboard','quotes','subscriptions','plates','agenda','customers','notifications','settings'])assert.ok(js.includes("'"+tab+"'"),tab);
 assert.match(js,/data-action="new-sub"/);
 assert.match(js,/data-tab="notifications"/);
 assert.match(js,/Number\(data\.quotes\.pending\)/);
 assert.match(js,/Number\(data\.activeSubscriptions\)/);
 assert.match(js,/watchUpdates/);
 assert.doesNotMatch(js,/framer-motion|Assumir o volante|CarStory/);
});


test('tema atual usa a paleta Fine Form em celular e desktop',async()=>{
 const html=await readFile(new URL('../dist/painel/index.html',import.meta.url),'utf8');
 const css=await readFile(new URL('../dist/assets/admin-v23.css',import.meta.url),'utf8');
 assert.match(html,/assets\/admin-v23\.css/);
 assert.match(html,/data-page="admin"/);
 assert.match(css,/body\[data-page="admin"\]/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/admin-mobile-nav/);
 assert.match(css,/--ff-cyan:#58c1b2/);
 assert.doesNotMatch(css,/#(?:c7fb4b|b8f52d|a4d740|99df41)/i);
 const storefront=await readFile(new URL('../dist/assets/studio.css',import.meta.url),'utf8');
 assert.match(storefront,/--orange:#53c3b1/);
 assert.equal((css.match(/\{/g)||[]).length,(css.match(/\}/g)||[]).length);
 assert.doesNotMatch(css,/https?:\/\//);
});
