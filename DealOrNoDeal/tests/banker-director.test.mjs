import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'game.html'),'utf8');
const js=readFileSync(resolve(root,'js/banker.js'),'utf8');
const css=readFileSync(resolve(root,'css/broadcast.css'),'utf8');

test('the full-stage banker portrait includes a live director caption',()=>{
 assert.match(html,/id="banker-director-caption"/);
 assert.match(html,/class="banker-call-portrait"/);
 assert.match(css,/#banker-call \.banker-director-caption/);
 assert.match(css,/#banker-call \.banker-call-card\{[\s\S]*?scrollbar-gutter:stable/);
});
test('vote direction uses public counts and never discloses individual decisions',()=>{
 assert.match(js,/const castVotes=h\.decisions\.length/);
 assert.match(js,/directorCaption\.textContent=/);
 assert.match(js,/voteProgress\.dataset\.stage=/);
 assert.match(js,/Entscheidungen geheim/);
 assert.doesNotMatch(js,/directorCaption\.textContent\s*=\s*[^;]*\.deal/);
});
test('voting and banker presentation remain usable without animations',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.banker-director-caption\{animation:none!important\}/);
 assert.match(css,/#banker-call #banker-vote-progress-fill\{transition:none!important\}/);
});

test('Banker uses the actual three Christmas shop pack artworks in offer and reveal',()=>{
 const shop=readFileSync(resolve(root,'weihnachten.html'),'utf8');
 const stage=readFileSync(resolve(root,'css/banker-stage.css'),'utf8');
 const sprite='file_00000000bd0c8210bf6f3733cc5c807d.png';
 assert.ok(shop.includes('assets/weihnachts_event/'+sprite),'shop source of truth');
 assert.ok(stage.includes('../assets/weihnachts_event/'+sprite),'Banker reuses real shop asset');
 assert.match(stage,/#banker-call \.banker-bonus-pack-art,/);
 for(const [type,position] of [['small','0%'],['large','50%'],['premium','100%']]){
  assert.ok(stage.includes('.banker-bonus-reveal-item.pack.'+type+' .banker-bonus-pack-art'),'reveal '+type);
  assert.ok(stage.includes('#banker-christmas-bonus[data-pack="'+type+'"] .banker-pack-mini-art'),'offer '+type);
  assert.ok(stage.includes('--banker-pack-x:'+position),'sprite region '+type);
  assert.ok(js.includes(type+":{name:"),'supported banker type '+type);
 }
 assert.match(html,/id="banker-christmas-bonus-art"/);
 assert.match(html,/class="banker-pack-bonus-copy"/);
 assert.match(js,/art\.setAttribute\('role','img'\)/);
 assert.match(js,/preview\.setAttribute\('aria-label',pack\?\.name/);
 assert.doesNotMatch(js,/art\.textContent=pack\.icon/);
 assert.match(html,/banker-stage\.css\?v=20261109-banker-real-packs-v1/);
 assert.match(html,/banker\.js\?v=20261110-split-audio-v2/);
});
