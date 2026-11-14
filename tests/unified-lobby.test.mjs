import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const redirect=read('legacy-lobby-redirect.js');
const main=read('hub-lobby.html'),js=read('hub-lobby.js');
const local=read('spielauswahl-lokal.html'),online=read('spielauswahl-online.html'),index=read('index.html');
function forwarded(href,mode){
 const navigated=[],document={currentScript:{dataset:{mode}},documentElement:{style:{}}};
 const location={href,replace:target=>navigated.push(target)};
 runInNewContext(redirect,{document,location,URL});
 return navigated[0]?new URL(navigated[0]):null;
}
test('old offline and online links both land on one main lobby without losing valid room codes',()=>{
 const local=forwarded('https://example.org/app/spielauswahl-lokal.html?room=123','local');
 const online=forwarded('https://example.org/app/spielauswahl-online.html?room=ABC23D&choose=1','online');
 assert.equal(local.pathname,'/app/hub-lobby.html');
 assert.equal(local.searchParams.get('view'),'local');
 assert.equal(local.searchParams.get('room'),'123');
 assert.equal(online.pathname,'/app/hub-lobby.html');
 assert.equal(online.searchParams.get('view'),'online');
 assert.equal(online.searchParams.get('room'),'ABC23D');
 assert.equal(online.searchParams.get('choose'),'1');
});
test('root index is now a main lobby alias with explicit access to old updates catalog',()=>{
 assert.equal(forwarded('https://example.org/app/index.html','auto').pathname,'/app/hub-lobby.html');
 assert.equal(forwarded('https://example.org/app/index.html?view=local','auto').searchParams.get('view'),'local');
 assert.equal(forwarded('https://example.org/app/index.html?catalog=1','auto'),null);
});
test('redirect does not forward a forged room or an external return URL',()=>{
 const u=forwarded('https://example.org/app/spielauswahl-online.html?room=INVALID-ROOM&return=https://evil.example&invite=XYZZZ','online');
 assert.equal(u.searchParams.has('room'),false);
 assert.equal(u.searchParams.has('invite'),false);
 assert.equal(u.searchParams.has('return'),false);
 assert.equal(u.origin,'https://example.org');
 assert.doesNotMatch(redirect,/fetch\(|Firestore|setItem\(/);
});
test('main lobby handles both modes, all core games and active room actions',()=>{
 for(const code of ['dog','barikade','skyjo','kreuz','business','partychallenge'])
  assert.ok(main.includes('data-game="'+code+'"'),code);
 for(const path of ['DOG/index.html','Kniffel/index.html','Barikade/barikade.html?offline=1',
  'Business/business_local.html'])assert.ok(main.includes('href="'+path+'"'),path);
 for(const special of ['deal','kniffel','mini'])assert.ok(main.includes('data-hub-shortcut="'+special+'"'));
 assert.match(js,/setPlayMode\('local',\{updateUrl:true\}\)/);
 assert.match(js,/activateRoom\(r\);pollStart\(\);notice/);
 assert.doesNotMatch(js,/location\.(?:assign|replace)\('spielauswahl-(?:online|lokal)\.html/);
 assert.match(js,/stayInSelection/);
 assert.match(js,/room\.match\.id!==launchedMatchId/);
});
test('old HTML pages load redirect before legacy game-selection scripts',()=>{
 for(const [html,mode] of [[local,'local'],[online,'online'],[index,'auto']]){
  const start=html.indexOf('legacy-lobby-redirect.js?v=2');
  assert.ok(start>=0);
  assert.ok(html.includes('data-mode="'+mode+'"'));
  assert.ok(start<html.indexOf('</head>'));
 }
});
test('game return buttons lead directly to hub while preserving their context',()=>{
 assert.match(read('DOG/index.html'),/href="\.\.\/hub-lobby\.html\?view=local"/);
 assert.match(read('DOG/app.js'),/backParams=new URLSearchParams\(\{room:hubCode,stage:'1'\}\)/);
 assert.match(read('DealOrNoDeal/lobby.html'),/hub-lobby\.html\?view=online'\+\(valid\?'&room=/);
 assert.match(read('MinispieleV2/lobby.html'),/hub-lobby\.html\?view=online&stay=1/);
 assert.match(read('Kniffel/lobby.js'),/hub-lobby\.html\?view=online'\+\(valid\?'&room=/);
 assert.match(read('hub-game-bridge.js'),/hub-lobby\.html\?view=online&room=/);
});
