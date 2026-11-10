import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
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
 assert.ok(html.includes('dog-forge-ui.js?v=20261110-forge-d1'));
 assert.ok(html.includes('dog-forge.css?v=20261110-forge-d1'));
 for(const selector of ['.skill-display','.skill-visual.compact','.item-choice.skill-entry',
  '.result-art .skill-illustration'])assert.ok(css.includes(selector),'missing selector '+selector);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('C1 filter uses server-provided quotes and never estimates costs',()=>{
 const ui=read('dog-forge-ui.js'),page=read('dog-forge.html');
 assert.match(ui,/const canUpgradeItem=id=>\{const q=quoteFor\(id\);return !!q&&!q\.maxed&&q\.affordable/);
 assert.ok(ui.includes('all.filter(x=>canUpgradeItem(x.id))'));
 assert.ok(ui.includes('const readyCount=all.filter(x=>canUpgradeItem(x.id)).length'));
 assert.ok(ui.includes('const missing=Object.entries(quote.cost||{})'));
 assert.ok(ui.includes('amount-have(id)'));
 assert.ok(ui.includes("node('span','cost-progress"));
 for(const id of ['forge-list-toolbar','forge-list-summary','forge-ready-filter','forge-ready-count']){
  assert.ok(page.includes('id="'+id+'"'),id);
 }
});
test('C1 upgrade confirmation is in-page and never spends before approval',()=>{
 const ui=read('dog-forge-ui.js'),page=read('dog-forge.html');
 for(const id of ['forge-confirm','forge-confirm-art','forge-confirm-cost','forge-confirm-title',
  'forge-confirm-step','forge-confirm-warning','forge-confirm-chance','forge-confirm-submit',
  'forge-confirm-x','forge-confirm-cancel'])assert.ok(page.includes('id="'+id+'"'),id);
 assert.ok(ui.includes('function openUpgradeConfirm(item,quote)'));
 assert.ok(ui.includes("if(!dialog.open)dialog.showModal();"));
 assert.ok(ui.includes("button.addEventListener('click',()=>openUpgradeConfirm(item,quote))"));
 assert.ok(ui.includes("void action('upgrade',requested)"));
 assert.equal(ui.includes('window.confirm('),false,'Native confirmation must not be used');
 assert.ok(ui.includes('current.level!==requested.expectedLevel'));
 assert.ok(ui.includes('!current.affordable'));
});
test('C1 handles definitive rejections via reload but preserves ambiguous operations',()=>{
 const ui=read('dog-forge-ui.js');
 assert.ok(ui.includes("if(['STALE_FORGE_LEVEL','DOG_MATERIALS_MISSING','FORGE_MAX_LEVEL'"));
 assert.ok(ui.includes('clearPending(account);\n    // Only definitive server rejections'));
 assert.ok(ui.includes('await reload();'));
 assert.ok(ui.includes('Bitte „Sicher wiederholen“ wählen'));
 // A JS parse test catches syntax errors missed by static feature checks.
 assert.doesNotThrow(()=>new Script(ui,{filename:'dog-forge-ui.js'}));
});
test('C1 styles include accessible resource bars and compact responsive confirmation',()=>{
 const css=read('dog-forge.css');
 for(const selector of ['.ready-filter.active','.material-hint.missing',
  '.cost-progress-fill','.forge-confirm::backdrop','.confirm-actions',
  '@media(max-width:420px)'])assert.ok(css.includes(selector),selector);
 assert.equal(css.split('{').length,css.split('}').length,'unbalanced CSS block braces');
});

test('C2 next-look preview derives graphics from actual equipment stages',()=>{
 const ui=read('dog-forge-ui.js'),page=read('dog-forge.html');
 assert.ok(ui.includes('STAGES[stage-1].limit+1'));
 assert.ok(ui.includes('gearVisual(item.id,nextLevel,true)'));
 assert.ok(ui.includes("'NÄCHSTE AUSSEHENSSTUFE'"));
 assert.ok(ui.includes("'Ab Stufe '+nextLevel"));
 assert.ok(ui.includes("'Endgültige Ausrüstungsoptik freigeschaltet'"));
 assert.ok(page.includes('id="forge-chronicle"'));
});
test('C2 book uses persistent hero counters and at most ten journal entries',()=>{
 const ui=read('dog-forge-ui.js'),page=read('dog-forge.html');
 for(const key of ['crafts','successes','failures','exchanges']){
  assert.ok(ui.includes('hero?.'+key),key);
 }
 assert.ok(ui.includes('Array.isArray(hero?.recent)?hero.recent:[]'));
 assert.ok(ui.includes('entries.slice(0,10)'));
 assert.ok(ui.includes('function milestoneValue('));
 assert.ok(ui.includes('function renderChronicle(){'));
 assert.ok(ui.includes('renderChronicle();renderStock();'));
 for(const id of ['forge-chronicle-stats','forge-achievements',
  'forge-journal','forge-achievements-count'])assert.ok(page.includes('id="'+id+'"'),id);
});
test('C2 milestone awards are display-only and include a future max-skill badge',()=>{
 const ui=read('dog-forge-ui.js'),css=read('dog-forge.css');
 assert.ok(ui.includes("title:'Vollendete Kunst',key:'maxSkill',goal:50"));
 assert.ok(ui.includes("title:'Drachenschmied',key:'weapon',goal:20"));
 assert.ok(ui.includes("title:'Wächterrüstung',key:'armor',goal:20"));
 assert.ok(ui.includes('view?.hero'));
 for(const selector of ['.evolution-teaser','.forge-chronicle','.milestone-grid',
  '.journal-entry'])assert.ok(css.includes(selector),selector);
 assert.doesNotThrow(()=>new Script(ui,{filename:'dog-forge-ui.js'}));
});

test('C3 ambience module is isolated from authoritative forge state',()=>{
 const ui=read('dog-forge-ui.js'),fx=read('dog-forge-fx.js'),html=read('dog-forge.html');
 assert.ok(html.includes('dog-forge-fx.js?v=20261110-forge-d1'));
 assert.ok(html.includes('id="forge-sound-toggle"'));
 assert.ok(html.includes('data-forge-background=""'));
 assert.ok(fx.includes("const SOUND_KEY='dog:forge:sound:v1'"));
 assert.ok(fx.includes("localStorage.getItem(SOUND_KEY)==='on'"));
 assert.ok(fx.includes("button.addEventListener('click'"));
 assert.ok(fx.includes("new MutationObserver(onForging)"));
 assert.ok(fx.includes("new MutationObserver(onResult)"));
 assert.ok(fx.includes("if(!soundEnabled||!AUDIO_AVAILABLE)return null;"));
 assert.equal(fx.includes('fetch('),false,'FX controller must never fetch game data');
 assert.equal(fx.includes('XMLHttpRequest'),false);
 assert.doesNotThrow(()=>new Script(fx,{filename:'dog-forge-fx.js'}));
 assert.doesNotThrow(()=>new Script(ui,{filename:'dog-forge-ui.js'}));
});
test('C3 background art hook is optional, safe and keeps fallback',()=>{
 const html=read('dog-forge.html'),fx=read('dog-forge-fx.js'),css=read('dog-forge.css');
 assert.ok(fx.includes("document.body.dataset.forgeBackground||''"));
 assert.ok(fx.includes("document.body.classList.add('forge-has-custom-wall')"));
 assert.ok(css.includes('body.forge-has-custom-wall:before'));
 assert.ok(css.includes('var(--forge-custom-wall)'));
 for(const selector of ['.furnace-flames i','.furnace-embers i',
  '.forge-impact span','.forge-result.result-legendary',
  'body.forge-hidden .furnace-embers i',
  '@media(prefers-reduced-motion:reduce)'])assert.ok(css.includes(selector),selector);
 for(const marker of ['class="furnace-flames"','class="furnace-embers"','class="forge-impact"'])
  assert.ok(html.includes(marker));
 assert.equal(css.split('{').length,css.split('}').length);
});

test('D1 establishes both workshop image slots and a local vector fallback',()=>{
 const html=read('dog-forge.html');
 const fx=read('dog-forge-fx.js');
 const css=read('dog-forge.css');
 const fallback=read('dog-forge-art/forge-workshop-fallback.svg');
 assert.match(html,/data-forge-background-desktop="\.\/dog-forge-art\/forge-workshop-desktop\.webp"/);
 assert.match(html,/data-forge-background-mobile="\.\/dog-forge-art\/forge-workshop-mobile\.webp"/);
 assert.match(html,/id="forge-scene-toggle"/);
 assert.ok(css.includes('forge-workshop-fallback.svg'));
 assert.ok(css.includes('body.forge-scene-off:before'));
 assert.ok(css.includes('body.forge-has-custom-wall:before'));
 assert.ok(fx.includes('dataset.forgeBackgroundDesktop'));
 assert.ok(fx.includes('dataset.forgeBackgroundMobile'));
 assert.ok(fx.includes("window.matchMedia?.('(max-width: 720px)')"));
 assert.ok(fx.includes('image.onerror=()=>'));
 assert.ok(fx.includes('media?.addEventListener?.(\'change\',setBackdrop)'));
 assert.ok(fallback.startsWith('<svg'));
 assert.ok(fallback.endsWith('</svg>'));
 assert.ok(!fallback.includes('<script'));
});
test('D1 workshop scene setting is client-only and independent of forge progress',()=>{
 const fx=read('dog-forge-fx.js'),ui=read('dog-forge-ui.js');
 assert.ok(fx.includes("const SCENE_KEY='dog:forge:scene:v1'"));
 assert.ok(fx.includes("localStorage.setItem(SCENE_KEY,sceneEnabled?'on':'off')"));
 assert.ok(fx.includes("document.body.classList.toggle('forge-scene-off',!sceneEnabled)"));
 assert.ok(fx.includes('version!==generation'),'ignore stale image callbacks');
 assert.ok(fx.includes('if(!sceneEnabled)'), 'no image fetching when scene is disabled');
 assert.ok(!fx.includes('fetch('));
 assert.ok(!fx.includes('XMLHttpRequest'));
 assert.doesNotThrow(()=>new Script(fx,{filename:'dog-forge-fx.js'}));
 assert.doesNotThrow(()=>new Script(ui,{filename:'dog-forge-ui.js'}));
});
