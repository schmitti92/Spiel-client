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
test('100 Tore is hidden until the signed-in Chris profile is identified, then opens the Start hub',()=>{
 const html=read('DealOrNoDeal/lobby.html');
 const css=read('DealOrNoDeal/css/dog-expedition-entry.css');
 assert.match(html,/<a id="dog-expedition-entry" class="dog-event-entry" href="\.\.\/dog-start\.html" hidden/);
 assert.match(html,/entry\.hidden=!isChrisPreviewProfile\(\)/);
 assert.match(html,/entry\.href='\.\.\/dog-start\.html'/);
 const start=read('dog-start.html');
 for(const page of ['dog-tor-map.html','dog-expedition.html','dog-forge.html','dog-merchant.html','DealOrNoDeal/lobby.html'])assert.ok(start.includes('data-dog-page="'+page+'"'));

 assert.match(html,/function isChrisPreviewProfile\(\)/);
 assert.match(html,/return !!user\(\)&&String\(profile\?\.name\|\|''\)/);
 assert.match(html,/function boot\(\)\{checkChrisHatsAccess\(\);checkChrisGatesAccess\(\)/);
 assert.match(css,/\.launch-stage \.dog-event-entry\[hidden\]\{display:none!important\}/);
 assert.ok(html.indexOf('id="dog-expedition-entry"')<
  html.indexOf('class="santa-event-entry"'),'100 Tore must appear above Christmas');
});
test('Private route is not referenced by public menus',()=>{
 for(const path of ['DealOrNoDeal/lobby.html','index.html','hub-lobby.html']){
  assert.doesNotMatch(read(path),/href=["'][^"']*dog-private-preview\.html/i);
 }
});
