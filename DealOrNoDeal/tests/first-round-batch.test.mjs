import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('game.html'),app=read('js/app.js'),core=read('js/core.js'),cases=read('js/cases.js'),css=read('css/cases.css');

test('new 30-case three-pick round is available without breaking old game scripts',()=>{
 for(const [name,code] of Object.entries({app,core,cases}))assert.doesNotThrow(()=>new Script(code),name);
 assert.match(app,/g\.phase==='batch-pick'\?g\.order\[Math\.floor/);
 assert.match(app,/g\.phase==='select'\?'select':'open'/);
 assert.match(app,/g\.openingBatch\?\.picks\?\.map/);
 assert.match(core,/!g\.openingBatch\?\.picks\?\.some/);
 assert.match(app,/\['select','batch-pick','open'\]/);
});

test('rapid grouped reveal stays on server time and opens a single banker round',()=>{
 assert.match(app,/function fastBatchSnapshot\(game,now=dealServerNow\(\)\)/);
 assert.match(app,/const reveals=Array\.isArray\(batch\?\.reveals\)/);
 assert.match(app,/const marks=batch\.reveals\.map/);
 assert.match(app,/scheduleFastBatch\(\)/);
 assert.match(app,/action\('ack-batch'\)/);
 assert.match(app,/visibleOpened=\[\.\.\.g\.openedAmounts,\.\.\.batchFrame\.visible\]/);
 assert.match(app,/updateMoneyBoard\(visibleOpened\)/);
 assert.match(css,/#cases \.case\.batch-queued/);
 assert.match(css,/#cases \.case\.batch-fast\.revealing/);
 assert.match(css,/animation-duration:\.52s!important/);
 assert.match(html,/cases\.css\?v=[^"]+rapid30=1/);
 assert.match(html,/app\.js\?v=[^"]+rapid30=2/);
});
