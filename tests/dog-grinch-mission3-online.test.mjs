import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=name=>readFileSync(new URL('../DOG/grinch-campaign/'+name,import.meta.url),'utf8');
test('online mode uses the existing authenticated hub transport, only commands, no local saves or preview actions',()=>{
 const ui=src('mission-3.js'),net=src('mission-3-online.js'),html=src('mission-3.html');
 assert.match(net,/\/grinch\/launch3/);assert.match(net,/\/grinch\/action3/);
 assert.match(net,/expectedRevision:state.revision/);assert.match(net,/profileIdToken:token/);
 assert.match(ui,/if\(onlineMode\)return;try\{localStorage/);
 assert.match(ui,/if\(onlineMode\)return;\s*clearTimeout\(botTimer\)/);
 assert.match(ui,/game.hands\[ownSeat\(\)\]/);
 assert.match(ui,/if\(onlineMode\|\|!game\|\|game.complete\|\|busy\)return/);
 assert.doesNotMatch(html,/searchParams.delete\('room'\)/);
 assert.match(ui,/m.grinchFrames/);
 assert.doesNotThrow(()=>new Function(net.replace(/\bexport function /g,'function ')));
});
