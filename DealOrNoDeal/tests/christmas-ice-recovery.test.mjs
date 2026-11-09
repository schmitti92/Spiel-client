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
 assert.match(page, /online-ice\.js\?v=20261109-action-recovery-v2/);
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
 assert.match(source, /if\(!same\)\{message/);
});

test('pending action belongs to the signed-in profile and is validated', () => {
 const fragment = source.slice(source.indexOf('function readPending(){'), source.indexOf('function forgetPending(){'));
 assert.ok(fragment.startsWith('function readPending(){'));
 const current = { uid: 'user-david' };
 let stored = JSON.stringify({ uid: 'user-david', type: 'strike', key:'strike:0:3:double',
  requestId:'ice-existing-request-123',extra:{index:3,hammer:'double'} });
 const context = {
  sessionStorage: { getItem: () => stored },
  user: () => current
 };
 assert.equal(runInNewContext(fragment + '\nreadPending()?.requestId', context), 'ice-existing-request-123');
 current.uid = 'another-player';
 assert.equal(runInNewContext(fragment + '\nreadPending()', context), null);
 current.uid = 'user-david';
 stored = JSON.stringify({uid:'user-david',type:'strike',key:'bad',requestId:'!',extra:{}});
 assert.equal(runInNewContext(fragment + '\nreadPending()', context), null);
});
