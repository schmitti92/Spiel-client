// Regression checks for the recoverable Christmas-ice online state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script, runInNewContext } from 'node:vm';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(dir, 'Weihnachtsevent2/online-ice.js'), 'utf8');
const page = readFileSync(resolve(dir, 'Weihnachtsevent2/index.html'), 'utf8');

test('Christmas-ice browser code parses and ships with cache-busted URL', () => {
 assert.doesNotThrow(() => new Script(source));
 assert.match(page, /online-ice\.js\?v=20[0-9]{6}-[a-z0-9-]+/);
});

test('GET reconciliation uses a receipt ID in query, never a GET body', () => {
 assert.match(source, /pendingId=type==='GET'\?String\(body\?\.pendingId\|\|''\):''/);
 assert.match(source, /encodeURIComponent\(pendingId\)/);
 assert.match(source, /body:type==='GET'\?undefined/);
 assert.match(source, /data\.pendingAction\?\.applied===true/);
 assert.match(source, /if\(confirmed\)forgetPending\(\)/);
});

test('uncertain retries always preserve original request ID, even after progress changes', () => {
 assert.match(source, /const requestId=unresolved\?\.requestId\|\|\(pending\?\.key===key\?pending\.requestId:id\(\)\)/);
 assert.match(source, /pending=\{key:unresolved\?\.key\|\|key,requestId\}/);
 assert.match(source, /if\(!same\)\{/);
});

test('repair bar always appears above the board and is cache-busted', () => {
 assert.match(source, /v44-recovery-bar/);
 assert.match(source, /repair\.onclick=\(\)=>load\(\)/);
 assert.match(page, /online-ice\.js\?v=20[0-9]{6}-[a-z0-9-]+/);
 assert.match(page, /#ice-online \.v44-recovery-bar/);
 assert.match(source, /if\(shouldRecover\)\{/);
 assert.match(source, /await run\(old\.type,old\.extra\|\|\{\}\)/);
});

test('pending action persists across browser tabs, but belongs only to the signed-in profile', () => {
 const fragment = source.slice(source.indexOf('const ICE_PENDING_KEY='), source.indexOf('let galleryPage='));
 assert.ok(fragment.startsWith('const ICE_PENDING_KEY='));
 const current = { uid: 'user-david' };
 let session = '';
 let durable = '';
 const context = {
  sessionStorage: { getItem: () => session, setItem:(k,v)=>{session=v}, removeItem:()=>{session=''} },
  localStorage: { getItem: () => durable, setItem:(k,v)=>{durable=v}, removeItem:()=>{durable=''} },
  user: () => current,
 };
 const action={uid:'user-david',type:'strike',key:'strike:0:3:double',requestId:'ice-existing-request-123',extra:{index:3,hammer:'double'}};
 assert.equal(runInNewContext(fragment + '\nrememberPending(' + JSON.stringify(action) + '); readPending()?.requestId', {...context}), action.requestId);
 session='';
 assert.equal(runInNewContext(fragment + '\nreadPending()?.requestId', {...context}), action.requestId, 'durable fallback must survive tab closure');
 current.uid='other-player';
 assert.equal(runInNewContext(fragment + '\nreadPending()', {...context}), null, 'do not leak one player pending action to another');
 current.uid='user-david';
 durable=JSON.stringify({...action,requestId:'!',savedAt:Date.now()});
 assert.equal(runInNewContext(fragment + '\nreadPending()', {...context}), null, 'invalid IDs must never be replayed');
});
