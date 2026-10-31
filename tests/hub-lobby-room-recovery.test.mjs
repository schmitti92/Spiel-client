import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../hub-lobby-20261030-newgames.js',import.meta.url),'utf8');
const boot=source.slice(source.indexOf('async function boot(){'),source.indexOf('\nsetPlayMode(playMode);'));

test('lobby preserves a valid room code before fetching room data',()=>{
 assert.match(boot,/const requestedCode=fromUrl\.toUpperCase\(\)/);
 assert.match(boot,/setRoomCode\(requestedCode\)/);
 assert.match(boot,/pendingRoomRecovery=requestedCode/);
 assert.match(boot,/if\(activeProfile\(\)\)void recoverPendingRoom\(\)/);
 assert.doesNotMatch(boot,/request\('\/rooms','POST'/);
});

test('recovery never creates a replacement room and retries transient errors',()=>{
 const start=source.indexOf('async function recoverPendingRoom(){');
 const end=source.indexOf("window.addEventListener('spielonline-change'",start);
 const recovery=source.slice(start,end);
 assert.match(recovery,/request\('\/rooms\/'\+encodeURIComponent\(requestedCode\)\)/);
 assert.match(recovery,/scheduleRecoveryRetry\(\)/);
 assert.doesNotMatch(recovery,/request\('\/rooms','POST'/);
});

test('polling errors preserve the existing room code rather than leaving the room',()=>{
 const start=source.indexOf('function pollStart(){');
 const end=source.indexOf('function leaveView(){',start);
 const polling=source.slice(start,end);
 assert.match(polling,/pendingRoomRecovery=requestedCode/);
 assert.doesNotMatch(polling,/leaveView\(\)/);
});
