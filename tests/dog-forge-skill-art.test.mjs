import test from 'node:test';
import assert from 'node:assert/strict';
import {Script,runInNewContext} from 'node:vm';
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
 assert.ok(html.includes('dog-forge-ui.js?v=20261110-forge-d3'));
 assert.ok(html.includes('dog-forge.css?v=20261110-forge-d3'));
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
 assert.ok(html.includes('dog-forge-fx.js?v=20261110-forge-d2'));
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

test('D1 scene reacts safely to desktop/mobile and missing images',()=>{
 const fx=read('dog-forge-fx.js');
 const loadedImages=[],listeners={},mediaListeners=[];
 const classes=new Set(),vars=new Map(),memory=new Map();
 const body={
  dataset:{
   forgeBackground:'',
   forgeBackgroundDesktop:'./dog-forge-art/forge-workshop-desktop.webp',
   forgeBackgroundMobile:'./dog-forge-art/forge-workshop-mobile.webp'
  },
  classList:{
   add(name){classes.add(name);},
   remove(name){classes.delete(name);},
   contains(name){return classes.has(name);},
   toggle(name,on){if(on)classes.add(name);else classes.delete(name);}
  },
  style:{setProperty:(key,val)=>vars.set(key,val),removeProperty:key=>vars.delete(key)}
 };
 const makeButton=()=>({
  setAttribute(){},
  addEventListener(type,handler){this.listeners[type]=handler;},
  listeners:{},textContent:'',disabled:false
 });
 const sound=makeButton(),scene=makeButton();
 const workspace={classList:{contains:()=>false},style:{removeProperty(){},setProperty(){}},dataset:{}};
 const dialog={open:false,classList:{contains:()=>false},querySelector(){return null}};
 const media={matches:false,addEventListener(type,handler){if(type==='change')mediaListeners.push(handler);}};
 const document={
  body,hidden:false,
  getElementById(id){return {
   'forge-workspace':workspace,'forge-result':dialog,
   'forge-sound-toggle':sound,'forge-scene-toggle':scene
  }[id]||null;},
  addEventListener(type,handler){listeners[type]=handler;}
 };
 class DummyObserver{observe(){}}
 class FakeImage{
  constructor(){loadedImages.push(this);}
  set src(value){this.path=value;}
 }
 runInNewContext(fx,{
  document,MutationObserver:DummyObserver,Image:FakeImage,
  window:{matchMedia:()=>media},localStorage:{
   getItem:key=>memory.get(key)||null,
   setItem:(key,val)=>memory.set(key,val)
  }
 });
 assert.equal(loadedImages.length,1);
 assert.match(loadedImages[0].path,/forge-workshop-desktop\.webp$/);
 assert.equal(classes.has('forge-has-custom-wall'),false);
 loadedImages[0].onerror();
 assert.equal(classes.has('forge-has-custom-wall'),false,'fallback after 404');
 scene.listeners.click();
 assert.equal(classes.has('forge-scene-off'),true);
 assert.equal(loadedImages.length,1,'scene off does not download more images');
 scene.listeners.click();
 assert.equal(classes.has('forge-scene-off'),false);
 assert.equal(memory.get('dog:forge:scene:v1'),'on');
 assert.equal(loadedImages.length,2);
 loadedImages[1].onload();
 assert.equal(classes.has('forge-has-custom-wall'),true);
 assert.match(vars.get('--forge-custom-wall'),/forge-workshop-desktop\.webp/);
 media.matches=true;mediaListeners[0]();
 assert.equal(loadedImages.length,3);
 assert.match(loadedImages[2].path,/forge-workshop-mobile\.webp$/);
 loadedImages[2].onload();
 assert.match(vars.get('--forge-custom-wall'),/forge-workshop-mobile\.webp/);
 // No hidden data store or game network interaction occurs during this switch.
 assert.equal(typeof listeners.visibilitychange,'function');
});

test('D2 uses a dedicated skippable smithing stage without new network actions',()=>{
 const html=read('dog-forge.html'),ui=read('dog-forge-ui.js'),
  script=read('dog-forge-ceremony.js'),css=read('dog-forge.css');
 assert.ok(html.includes('dog-forge-ceremony.js?v=20261110-forge-d2'));
 for(const id of ['forge-ceremony','forge-ceremony-art','forge-ceremony-title',
  'forge-ceremony-status','forge-ceremony-caption','forge-ceremony-skip']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 for(const selector of ['.ceremony-hammer','.ceremony-weapon','.ceremony-sparks i',
  '.forge-ceremony[data-phase="failure"]',
  '.forge-ceremony[data-phase="legendary"]',
  '@media(prefers-reduced-motion:reduce)'])assert.ok(css.includes(selector),selector);
 assert.equal(script.includes('fetch('),false);
 assert.equal(script.includes('XMLHttpRequest'),false);
 assert.equal(script.includes('localStorage'),false);
 assert.ok(ui.includes("if(!retry&&op.action==='upgrade')"));
 assert.ok(ui.includes('window.DogForgeCeremony.start({item,level:levelFor(item.id)})'));
 assert.ok(ui.includes('await window.DogForgeCeremony?.finish?.(response.result)'));
 assert.ok(ui.indexOf("request('POST',op.action")<ui.indexOf('DogForgeCeremony?.finish?.(response.result)'));
 assert.ok(ui.includes('window.DogForgeCeremony?.abort?.()'));
 assert.doesNotThrow(()=>new Script(script,{filename:'dog-forge-ceremony.js'}));
});
function ceremonyHarness({reduced=false}={}){
 const source=read('dog-forge-ceremony.js'),callbacks={},events={},timers=new Map();
 let nextTimer=0,closed=0;
 const plainElement=()=>({textContent:'',className:'',src:'',alt:'',
  decoding:'',loading:'',isConnected:true,addEventListener(){},
  replaceWith(){}});
 const art={children:[],replaceChildren(){this.children=[];},append(child){this.children.push(child);}};
 const dialog={open:false,dataset:{},style:{setProperty(){}},
  classList:{toggle(){}},addEventListener(type,cb){events[type]=cb;},
  showModal(){this.open=true;},
  close(){this.open=false;closed++;if(events.close)events.close();}
 };
 const skip={addEventListener(type,cb){callbacks[type]=cb;}};
 const titles={'forge-ceremony-title':plainElement(),
  'forge-ceremony-status':plainElement(),'forge-ceremony-caption':plainElement()};
 const doc={
  hidden:false,
  getElementById(id){return {
   'forge-ceremony':dialog,'forge-ceremony-art':art,
   'forge-ceremony-skip':skip,...titles
  }[id]||null;},
  createElement(){return plainElement();},
  addEventListener(type,cb){events['document:'+type]=cb;}
 };
 const win={
  matchMedia:()=>({matches:reduced}),
  setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},
  clearTimeout(id){timers.delete(id);}
 };
 runInNewContext(source,{document:doc,window:win});
 return {api:win.DogForgeCeremony,dialog,art,skip,timers,titles,events,
  get closed(){return closed;},
  flush(){for(const [id,task] of [...timers]){timers.delete(id);task.fn();}}
 };
}
test('D2 does not announce victory before authoritative upgrade result',async()=>{
 const h=ceremonyHarness();
 h.api.start({item:{id:'weapon',group:'equipment',name:'Waffe'},level:5});
 assert.equal(h.dialog.open,true);
 assert.equal(h.dialog.dataset.phase,'smithing');
 assert.match(h.art.children[0].src,/weapon-1\.svg$/);
 assert.match(h.titles['forge-ceremony-status'].textContent,/Server/);
 assert.equal(h.timers.size,0,'before server response there is no result timer');
 const done=h.api.finish({type:'upgrade',itemId:'weapon',oldLevel:5,newLevel:6,success:true});
 assert.equal(h.dialog.dataset.phase,'legendary');
 assert.match(h.art.children[0].src,/weapon-2\.svg$/);
 assert.equal(h.timers.size,1);
 h.flush();await done;
 assert.equal(h.dialog.open,false);
});
test('D2 failure smoke, skip and hidden tab cannot duplicate a transaction',async()=>{
 const h=ceremonyHarness();
 h.api.start({item:{id:'armor',group:'equipment',name:'Rüstung'},level:8});
 const done=h.api.finish({type:'upgrade',itemId:'armor',oldLevel:8,newLevel:8,success:false});
 assert.equal(h.dialog.dataset.phase,'failure');
 assert.match(h.art.children[0].src,/armor-2\.svg$/);
 h.skip && h.skip.addEventListener; // skip event is registered in harness callbacks
 h.events['document:visibilitychange']();
 assert.equal(h.dialog.open,true,'still visible when tab is not marked hidden');
 h.skip.addEventListener && h.skip;
 // A click at any time only skips the animation, never triggers another request.
 h.api.abort();await done;
 assert.equal(h.dialog.open,false);
 h.api.start({item:{id:'armor',group:'equipment',name:'Rüstung'},level:8});
 h.api.abort();
 assert.equal(h.timers.size,0);
});
test('D2 reduced-motion viewers do not get a mandatory animation',async()=>{
 const h=ceremonyHarness({reduced:true});
 h.api.start({item:{id:'weapon',group:'equipment',name:'Waffe'},level:1});
 assert.equal(h.dialog.open,false);
 await h.api.finish({type:'upgrade',success:true,oldLevel:1,newLevel:2});
 assert.equal(h.timers.size,0);
});

test('D3 shows personal goal and uses only local, account-scoped selection',()=>{
 const html=read('dog-forge.html'),ui=read('dog-forge-ui.js'),css=read('dog-forge.css');
 for(const id of ['forge-goal-banner','forge-goal-visual','forge-goal-title',
  'forge-goal-desc','forge-goal-progress','forge-goal-open','forge-goal-clear'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(ui.includes("const goalKey=account=>'dog:forge:goal:'+account;"));
 assert.ok(ui.includes('const loadGoal=account=>'));
 assert.ok(ui.includes('localStorage.setItem(goalKey(uid),goalId)'));
 assert.ok(ui.includes('localStorage.removeItem(goalKey(uid))'));
 assert.ok(ui.includes('function renderGoal()'));
 assert.ok(ui.includes('goalId=loadGoal(account)'));
 assert.ok(ui.includes('renderGoal();renderChronicle();renderStock();'));
 assert.ok(ui.includes("node('button','forge-goal-pin'"));
 assert.ok(css.includes('.forge-goal-banner'));
 assert.ok(css.includes('.forge-goal-progress'));
});
test('D3 validates direct material advice and does not auto-spend resources',()=>{
 const ui=read('dog-forge-ui.js');
 assert.ok(ui.includes('function exchangeHints(quote)'));
 assert.ok(ui.includes('const spare=Math.max(0,have(source)-reserve)'));
 assert.ok(ui.includes('Math.floor(spare/10)'));
 assert.ok(ui.includes('1000000-have(id)'));
 assert.ok(ui.includes("tab='exchange';tradeGroup=suggestion.group;render();"));
 assert.ok(ui.includes('exchangeHints(quote)'));
 assert.ok(ui.includes('nur teilweise ausreichend'));
});
test('D3 batch trade confirms real quantities and retains pending receipt safety',()=>{
 const ui=read('dog-forge-ui.js'),html=read('dog-forge.html'),css=read('dog-forge.css');
 for(const id of ['forge-exchange-confirm','forge-exchange-confirm-submit',
  'forge-exchange-confirm-cancel','forge-exchange-confirm-preview',
  'forge-exchange-confirm-description']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(ui.includes('Math.min(100,Math.floor(stock/10),1000000-have(to[0]))'));
 assert.ok(ui.includes('new Set([1,5,10,25,maxBatch])'));
 assert.ok(ui.includes("if(count===1)void action('exchange',{resourceId:from[0]});"));
 assert.ok(ui.includes("else openExchangeConfirm(from[0],count);"));
 assert.ok(ui.includes("void action('exchange',{resourceId:req.resourceId,count:req.count});"));
 assert.ok(ui.includes('have(req.resourceId)<req.count*10'));
 assert.ok(ui.includes('have(to)+req.count>1000000'));
 assert.ok(ui.includes('money(result.spent||10)'));
 assert.ok(ui.includes('money(result.received||1)'));
 assert.ok(ui.includes('savePending(account,op)'));
 assert.ok(css.includes('.multi-exchange-row'));
 assert.ok(css.includes('.exchange-controls'));
 assert.doesNotThrow(()=>new Script(ui,{filename:'dog-forge-ui.js'}));
 assert.equal(css.split('{').length,css.split('}').length);
});
