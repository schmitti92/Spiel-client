import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Private single-device pilot uses real server preview with two bots',()=>{
 const html=read('dog-private-preview.html'),js=read('dog-private-preview.js');
 assert.match(html,/Privater Test/);assert.match(html,/id="test-code"/);
 assert.match(html,/id="gate-grid"/);assert.match(html,/id="chapter"/);
 assert.match(js,/\/api\/dog\/preview\//);assert.match(js,/X-DOG-Preview-Key/);
 assert.match(js,/preview-bot-alpha/);assert.match(js,/preview-bot-beta/);
 assert.match(js,/act\('minigame'/);assert.match(js,/command:'ready'|act\('ready'/);
});
test('Private actions are persisted and retried using the same receipt ID',()=>{
 const html=read('dog-private-preview.html'),js=read('dog-private-preview.js');
 assert.match(html,/id="retry-action"/);
 assert.match(js,/sessionStorage\.setItem\(ACTION_KEY\+uid/);
 assert.match(js,/requestId:operation.requestId/);
 assert.match(js,/act\(null,\{\},true\)/);
});
test('Normal players cannot see a 100-Tore button in the Deal lobby',()=>{
 const html=read('DealOrNoDeal/lobby.html');
 assert.doesNotMatch(html,/<a class="dog-event-entry" id="dog-expedition-entry"/);
 assert.match(html,/Die 100 Tore sind bis zum Abschluss des privaten Tests ausgeblendet/);
});
test('Private route is not referenced by public menus',()=>{
 for(const path of ['DealOrNoDeal/lobby.html','index.html','hub-lobby.html']){
  assert.doesNotMatch(read(path),/href=["'][^"']*dog-private-preview\.html/i);
 }
});
