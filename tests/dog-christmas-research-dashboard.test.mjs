import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=name=>readFileSync(new URL('../DOG/'+name,import.meta.url),'utf8');
const html=read('christmas-event.html');
const controller=read('christmas-research-ui.js');
const app=read('christmas-event.js');
const css=read('christmas-research-glass.css');
test('reference layout shows filter sidebar, central research cards and a separate right detail view',()=>{
 for(const id of ['panel-research','dog-research-shell','dog-research-filters','dog-research-cards','dog-research-detail','dog-research-active-bonuses','dog-research-sort','dog-research-points','dog-research-grid-toggle','dog-research-list-toggle']){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 for(const cls of ['dr-topbar','dr-hero','dr-summary','dr-workspace','dr-category-panel','dr-gallery','dr-detail-panel','dr-status-footer']){
  assert.match(html,new RegExp('class="[^"]*'+cls),'section '+cls);
  assert.match(css,new RegExp('\\.'+cls+'\\b'),'styled '+cls);
 }
 assert.match(css,/grid-template-columns:minmax\(196px,17\.5%\) minmax\(0,1fr\) minmax\(312px,30%\)/);
});
test('only the research tab changes to immersive full-width layout',()=>{
 assert.match(app,/classList\.toggle\('research-mode',id==='research'\)/);
 assert.match(css,/body\.research-mode:not\(\.scratch-ticket-open\) \.event-layout>/);
 assert.match(css,/\.event-layout>\.event-sidebar\{display:none!important\}/);
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(html,/christmas-research-glass\.css\?v=/);
 assert.match(html,/id="tab-research"/);
});
test('all pricing, levels, points, purchase, claim and bonuses use authenticated server data',()=>{
 assert.match(controller,/\/api\/hub\/dog\/research/);
 assert.match(controller,/getIdToken\(\)/);
 assert.match(controller,/result\.ok!==true/);
 assert.match(controller,/data\.available/);
 assert.match(controller,/skill\.nextCost/);
 assert.match(controller,/data\.skills\.filter/);
 assert.match(controller,/data\.levels\?\.\[skill\.id\]/);
 assert.match(controller,/call\('\/upgrade',\{id:skill\.id\}\)/);
 assert.match(controller,/call\('\/claim',\{type:id,/);
 assert.match(controller,/user\(\)\?\.uid!==uid/);
 assert.doesNotMatch(controller,/localStorage|sessionStorage|runTransaction/);
 for(const fake of ['12.480','1.500','+20 Lose/Tag','Stufe 3 / 10']){
  assert.ok(!html.includes(fake),'reference-only numbers are not hardcoded: '+fake);
 }
});
test('all controls are actually wired and show active, selected, list and sorting states',()=>{
 assert.match(controller,/sortSelect\.addEventListener\('change'/);
 assert.match(controller,/selectedId=skill\.id/);
 assert.match(controller,/category=cat\.id/);
 assert.match(controller,/cards\.classList\.toggle\('is-list'/);
 assert.match(controller,/renderDetail\(data\.skills\.find/);
 assert.match(controller,/aria-pressed/);
 assert.match(controller,/root\.querySelectorAll\('\[data-research-open-tab\]'\)/);
 assert.match(controller,/ticketTier=select\.value/);
});
test('illustrated lantern exists and is reachable from the HTML research panel',()=>{
 assert.ok(existsSync(new URL('../DOG/assets/research/lantern-illustration.svg',import.meta.url)));
 assert.match(controller,/\.\/assets\/research\/lantern-illustration\.svg/);
 assert.match(css,/01_hintergrund_winternacht\.png/);
 assert.match(controller,/scene|artwork|picture/);
});
