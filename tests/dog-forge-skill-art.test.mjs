import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const skills=[
 ['destruction','Vernichtungsschlag'],['precision','Präzision'],
 ['double_strike','Doppelschlag'],['attack_power','Angriffskraft'],
 ['critical','Kritische Treffer'],['regeneration','Regeneration'],
 ['blocking','Blocken'],['evasion','Ausweichen'],
 ['resilience','Widerstandskraft'],['vitality','Lebensenergie'],
 ['last_stand','Letzter Widerstand']
];

test('All 11 DOG skill illustrations exist as standalone accessible SVGs',()=>{
 for(const [id,label] of skills){
  const file='dog-forge-art/skill-'+id+'.svg';
  assert.equal(existsSync(resolve(root,file)),true,file);
  const svg=read(file);
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<\/svg>$/);
  assert.ok(svg.includes('aria-label="'+label+'"'),id+' name');
  assert.ok(svg.includes('viewBox="0 0 256 256"'),id+' size');
  for(const name of ['blade','trim','field','aura'])assert.ok(svg.includes('id="'+name+'"'),id+' gradient '+name);
  assert.ok(svg.length>1500,id+' illustration detail');
 }
});
test('Forge UI maps every server-recognized skill to an illustration',()=>{
 const ui=read('dog-forge-ui.js');
 for(const [id] of skills)assert.ok(ui.includes(id+":{accent:"),'missing theme '+id);
 assert.match(ui,/dog-forge-art\/skill-/);
 assert.match(ui,/skillVisual\(item,true\)/);
 assert.match(ui,/scene\.append\(skillVisual\(item\)\)/);
 assert.match(ui,/art\.append\(skillVisual\(item\)\)/);
});
test('Forge UI styles and HTML load the current skill artwork release',()=>{
 const html=read('dog-forge.html'),css=read('dog-forge.css');
 assert.ok(html.includes('dog-forge-ui.js?v=20261110-skills-b2'));
 assert.ok(html.includes('dog-forge.css?v=20261110-skills-b2'));
 for(const selector of ['.skill-display','.skill-visual.compact','.item-choice.skill-entry',
  '.result-art .skill-illustration'])assert.ok(css.includes(selector),'missing selector '+selector);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
