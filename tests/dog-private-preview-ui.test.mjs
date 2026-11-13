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
test('public 100-Tore event is always visible directly above Christmas while private preview stays isolated',()=>{
 const html=read('DealOrNoDeal/lobby.html');
 const css=read('DealOrNoDeal/css/dog-expedition-entry.css');
 assert.match(html,/<a id="dog-expedition-entry" class="dog-event-entry" href="\.\.\/dog-start\.html" aria-label="100-Tore-Event öffnen – für alle Spieler"/);
 assert.doesNotMatch(html,/id="dog-expedition-entry"[^>]*\shidden(?:\s|>)/);
 assert.doesNotMatch(html,/EXKLUSIVER VORABZUGANG · CHRIS/);
 assert.match(html,/NEUES EVENT · JETZT FÜR ALLE SPIELER/);
 assert.match(html,/function showPublicDogEvent\(\)/);
 assert.match(html,/entry\.hidden=false/);
 assert.match(html,/function boot\(\)\{checkChrisHatsAccess\(\);showPublicDogEvent\(\)/);
 assert.match(html,/entry\.href='\.\.\/dog-start\.html'/);
 assert.ok(html.indexOf('id="dog-expedition-entry"')<
  html.indexOf('class="santa-event-entry"'),'100-Tore entry appears ABOVE Christmas');
 assert.match(css,/\.launch-stage \.deal-event-stack \.santa-event-entry/);
 assert.match(css,/@media\(max-width:700px\)/);
 const start=read('dog-start.html');
 for(const page of ['dog-tor-map.html','dog-expedition.html','dog-forge.html','dog-merchant.html','DealOrNoDeal/lobby.html'])
  assert.ok(start.includes('data-dog-page="'+page+'"'));
});
test('Private route is not referenced by public menus',()=>{
 for(const path of ['DealOrNoDeal/lobby.html','index.html','hub-lobby.html']){
  assert.doesNotMatch(read(path),/href=["'][^"']*dog-private-preview\.html/i);
 }
});
