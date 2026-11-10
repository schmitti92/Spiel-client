import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const core=read('js/core.js'),html=read('game.html'),lobby=read('lobby.html');
const app=read('js/app.js'),banker=read('js/banker.js'),broadcast=read('js/broadcast.js');
const finale=read('js/finale.js'),peek=read('js/peek-joker.js'),director=read('js/deluxe-director.js');
const casesCss=read('css/cases.css'),broadcastCss=read('css/broadcast.css');

test('29th new prize equals exactly ten million euros and older modes keep their values',()=>{
 const match=core.match(/\bvalues=(\[[^\]]+\])/);
 assert.ok(match,'shared client values list');
 const values=JSON.parse(match[1]);
 assert.equal(values.length,29);
 assert.equal(new Set(values).size,29);
 assert.equal(values[26],300000000,'27-case mode has 3 million');
 assert.equal(values[27],500000000,'28-case mode has 5 million');
 assert.equal(values[28],1000000000,'29-case mode has 10 million in cents');
 for(const count of [26,27,28,29]){
  assert.equal(values.slice(0,count).length,count);
 }
 assert.doesNotThrow(()=>new Script(core),'game core parses');
});
test('lobby offers 26,27,28,29 cases with distinctive 10 million jackpot and preserves current default',()=>{
 for(const count of [26,27,28,29])assert.match(lobby,new RegExp('name="case-count" value="'+count+'"'));
 assert.match(lobby,/29 Koffer <small>🏆 10 Mio\. €<\/small>/);
 assert.match(lobby,/value="27" checked/,'keep existing default for backward compatibility');
 assert.match(lobby,/body:JSON\.stringify\(\{caseCount:Number\(document\.querySelector/);
});
test('game view, banker offer, broadcast and final replay all use chosen case count',()=>{
 assert.match(app,/\[26,27,28,29\]\.includes\(g\?\.caseCount\)/);
 assert.match(app,/caseGrid\.dataset\.caseCount=String\(g\.caseCount\|\|27\)/);
 assert.match(app,/value===1000000000/);
 assert.match(banker,/\[26,27,28,29\]\.includes\(g\.caseCount\)/);
 assert.match(broadcast,/\[26,27,28,29\]\.includes\(g\?\.caseCount\)/);
 assert.match(broadcast,/\[26,27,28,29\]\.includes\(game\?\.caseCount\)/);
 assert.match(broadcast,/--deal-money-rows/);
 assert.match(broadcastCss,/repeat\(var\(--deal-money-rows,13\),minmax\(0,1fr\)\)/);
 assert.match(broadcastCss,/data-amount="1000000000"/);
 assert.match(casesCss,/\.cases\[data-case-count="29"\] \.case:nth-child\(25\)/);
 assert.match(casesCss,/\.money span\.ten-million-prize/);
 assert.match(finale,/\[26,27,28,29\]\.includes\(g\.caseCount\)/);
 assert.match(director,/opened\/caseCount\*100/);
 assert.match(director,/caseCount-opened/);
});
test('Joker UI accepts case 29 and game resources are reloaded without stale cache',()=>{
 assert.match(peek,/\[26,27,28,29\]\.includes\(Number\(g\?\.caseCount\)\)/);
 assert.match(peek,/for\(let i=0;i<caseCount\(\);i\+\+\)/);
 assert.match(peek,/p\.case<caseCount\(\)/);
 for(const path of ['core','app','banker','finale','broadcast','deluxe-director','peek-joker']){
  assert.match(html,new RegExp('js/'+path+'\\.js\\?v='+(path==='peek-joker'?'20261110-dual-own-opponents-v2':path==='banker'?'20261110-split-audio-v2':path==='app'?'20261110-match-stories-v1':'20261109-'+(path==='banker'?'banker-real-packs-v1':path==='finale'?'personal-cases-show-v2':'29cases-10m'))),'cache-bust '+path);
 }
 for(const path of ['cases','broadcast'])assert.match(html,new RegExp('css/'+path+'\\.css\\?v=20261109-29cases-10m'));
 for(const source of [app,banker,broadcast,finale,peek,director])assert.doesNotThrow(()=>new Script(source));
});
