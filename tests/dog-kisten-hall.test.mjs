import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('dog-expedition.html');
const ui=read('dog-materials-ui.js');
const tabs=read('dog-event-tabs.js');
const css=read('dog-materials.css');

test('Top expedition tab is called Kisten and keeps the same URL and room context',()=>{
 assert.match(tabs,/\['dog-expedition\.html','📦 Kisten'/);
 assert.doesNotMatch(tabs,/📦 Start & Lager/);
 assert.match(tabs,/if\(room\)q\.set\('room',room\)/);
 assert.match(html,/<h1>📦 Deine Kisten<\/h1>/);
});

test('The five primary chests render as an accessible, responsive collection',()=>{
 const five=['wood','iron','silver','gold','legendary'];
 assert.equal((html.match(/class="chest-illustration chest-illustration-image"/g)||[]).length,5);
 assert.equal((html.match(/class="crate-action"/g)||[]).length,5);
 for(const tier of five){
  assert.match(html,new RegExp('id="open-'+tier+'"'));
  assert.match(html,new RegExp('id="'+tier+'-count"'));
  assert.match(html,new RegExp('tier-'+tier));
  assert.match(ui,new RegExp("'"+tier+"'"));
 }
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:710px\)/);
 assert.match(css,/\.chest-lid/);
 assert.match(css,/\.chest-box/);
});

test('The manual opening path keeps receipts and never auto-opens won chests',()=>{
 assert.match(ui,/button\.disabled=!eligible\|\|!\(amount>0\)/);
 assert.match(ui,/button\.classList\.toggle\('has-chest'/);
 assert.match(ui,/button\.querySelector\('\.crate-action'\)/);
 assert.match(ui,/if\(!pending&&!storePending\(uid,id,requestTier\)\)/);
 assert.match(ui,/request\('POST','open'/);
 assert.match(ui,/addEventListener\('click',\(\)=>void openChest\(tier\)\)/);
 assert.match(ui,/if\(!document\.hidden&&!busy\)void reload\(\)/);
});

test('Legacy chests and material stock are preserved behind secondary sections',()=>{
 assert.match(html,/<details class="chest-archive">/);
 assert.match(html,/<details class="chest-inventory-fold">/);
 assert.match(html,/id="resource-groups"/);
 assert.match(html,/id="open-legacy"/);
 for(const id of ['small','medium','large'])assert.match(html,new RegExp('id="open-'+id+'"'));
 assert.match(ui,/archive\.hidden=!inventory/);
 assert.match(html,/id="reward-dialog"/);
 assert.match(ui,/result\.replayed/);
 assert.match(html,/id="refresh-hero"/);
 assert.match(ui,/refresh-hero'\)\?\.addEventListener\('click'/);
});

test('All five uploaded PNG assets are wired to their correct chest cards',()=>{
 const expected={
  wood:'01_Holzkiste.png',
  iron:'02_Eisenkiste.png',
  silver:'03_Silberkiste.png',
  gold:'04_Goldkiste.png',
  legendary:'05_Legendaere_Kiste.png'
 };
 for(const [tier,file] of Object.entries(expected)){
  const card=html.match(new RegExp('<button id="open-'+tier+'"[^>]*>([\\s\\S]*?)<\\/button>'));
  assert.ok(card,'missing '+tier+' card');
  assert.ok(card[1].includes('src="dog-chest-art/'+file+'"'),tier+' wrong PNG');
 }
 assert.match(css,/\.chest-illustration-image img/);
 assert.match(html,/dog-materials\.css\?v=20261113-chest-art-v4/);
});
