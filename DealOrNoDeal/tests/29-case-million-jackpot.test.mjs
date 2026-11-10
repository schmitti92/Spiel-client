import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const core=read('js/core.js'),html=read('game.html'),lobby=read('lobby.html');
const app=read('js/app.js'),banker=read('js/banker.js'),broadcast=read('js/broadcast.js');
const finale=read('js/finale.js'),peek=read('js/peek-joker.js'),director=read('js/deluxe-director.js');
const casesCss=read('css/cases.css'),broadcastCss=read('css/broadcast.css');

test('30 case values include exactly one 50 million prize and preserve previous jackpots',()=>{
 const match=core.match(/\bvalues=(\[[^\]]+\])/);
 assert.ok(match,'shared client values list');
 const amounts=JSON.parse(match[1]);
 assert.equal(amounts.length,30);
 assert.equal(new Set(amounts).size,30);
 assert.equal(amounts[26],300000000,'27 cases: 3m');
 assert.equal(amounts[27],500000000,'28 cases: 5m');
 assert.equal(amounts[28],1000000000,'29 cases: 10m');
 assert.equal(amounts[29],5000000000,'30 cases: 50m (cents)');
 for(const count of [26,27,28,29,30])assert.equal(amounts.slice(0,count).length,count);
 assert.doesNotThrow(()=>new Script(core));
});
test('host can select 26–30 cases without changing the existing 27-case default',()=>{
 for(const count of [26,27,28,29,30]){
  assert.match(lobby,new RegExp('name="case-count" value="'+count+'"'));
 }
 assert.match(lobby,/29 Koffer <small>🏆 10 Mio\. €<\/small>/);
 assert.match(lobby,/30 Koffer <small>💎 50 Mio\. €<\/small>/);
 assert.match(lobby,/value="27" checked/);
 assert.match(lobby,/body:JSON\.stringify\(\{caseCount:Number\(document\.querySelector/);
});
test('30th case propagates through case grid, banker board, commentator and broadcast',()=>{
 assert.match(app,/\[26,27,28,29,30\]\.includes\(g\?\.caseCount\)/);
 assert.match(app,/caseGrid\.dataset\.caseCount=String\(g\.caseCount\|\|27\)/);
 assert.match(app,/value===1000000000/);
 assert.match(app,/value===5000000000/);
 assert.match(banker,/\[26,27,28,29,30\]\.includes\(g\.caseCount\)/);
 assert.match(broadcast,/\[26,27,28,29,30\]\.includes\(g\?\.caseCount\)/);
 assert.match(broadcast,/\[26,27,28,29,30\]\.includes\(game\?\.caseCount\)/);
 assert.match(broadcast,/--deal-money-rows/);
 assert.match(broadcastCss,/repeat\(var\(--deal-money-rows,13\),minmax\(0,1fr\)\)/);
 assert.match(broadcastCss,/data-amount="1000000000"/);
 assert.match(broadcastCss,/data-amount="5000000000"/);
 assert.match(casesCss,/\.cases\[data-case-count="29"\] \.case:nth-child\(25\)/);
 assert.match(casesCss,/\.cases\[data-case-count="30"\] \.case:nth-child\(25\)/);
 assert.match(casesCss,/\.money span\.ten-million-prize/);
 assert.match(casesCss,/\.money span\.fifty-million-prize/);
 assert.match(finale,/\[26,27,28,29,30\]\.includes\(g\.caseCount\)/);
 assert.match(director,/opened\/caseCount\*100/);
 assert.match(director,/caseCount-opened/);
});
test('case 30 works with the Joker and the whole jackpot asset bundle refreshes',()=>{
 assert.match(peek,/\[26,27,28,29,30\]\.includes\(Number\(g\?\.caseCount\)\)/);
 assert.match(peek,/for\(let i=0;i<caseCount\(\);i\+\+\)/);
 assert.match(peek,/p\.case<caseCount\(\)/);
 for(const name of ['core','finale','broadcast','peek-joker','amount-voice','moderator-stories']){
  assert.ok(html.includes('./js/'+name+'.js?v=20261110-30cases-50m-v1'),name+' cache bust');
 }
 assert.ok(html.includes('./js/banker.js?v=20261110-special-bonuses-v1'),'banker bonus cache bust');
 assert.ok(html.includes('./js/app.js?v=20261110-soft-gold-no-turn-label-v2'),'gold turn client cache bust');
 for(const name of ['cases','broadcast']){
  assert.ok(html.includes('./css/'+name+'.css?v=20261110-30cases-50m-v1'),name+' CSS cache bust');
 }
 for(const source of [app,banker,broadcast,finale,peek,director])assert.doesNotThrow(()=>new Script(source));
});
