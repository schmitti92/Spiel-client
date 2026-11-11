import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../dog-boss-combat-fx.js',import.meta.url),'utf8');
function bootstrap(){
 const window={};
 const document={createElement(tag){
  return {tag,className:'',textContent:'',children:[],
   append(...children){this.children.push(...children)},
   replaceChildren(...children){this.children=children},
   setAttribute(key,value){this[key]=value}};
 }};
 runInNewContext(source,{window,document});
 return window.DogBossCombatFX;
}
const start=1_800_000_000_000;
const view=(phase='fighting')=>({
 phase,startedAt:start,gate:20,name:'Schattenfürst',
 members:[{uid:'a',name:'Alpha'},{uid:'b',name:'Bravo'},{uid:'c',name:'Charlie'}],
 roster:[{uid:'a'},{uid:'b'},{uid:'c'}],
 miniGames:{rounds:[
  {kind:'dodge',round:0,startMs:3000,endMs:10000},
  {kind:'math',round:1,startMs:10000,endMs:17000},
  {kind:'target',round:2,startMs:17000,endMs:24000}
 ],myAnswers:{}}
});
test('Combat director displays synchronized server-clock phases without local randomness',()=>{
 const fx=bootstrap();
 const clock=fx.deriveCue,model=view();
 assert.equal(clock(model,start+1100).kind,'intro');
 assert.equal(clock(model,start+3000).kind,'dodge');
 assert.equal(clock(model,start+9999).kind,'dodge');
 assert.equal(clock(model,start+10000).kind,'math');
 assert.equal(clock(model,start+16999).kind,'math');
 assert.equal(clock(model,start+17000).kind,'target');
 assert.equal(clock(model,start+24000).kind,'finale');
 assert.equal(clock(model,start+29999).kind,'finale');
 assert.equal(clock(model,start+30000).kind,'awaiting');
 assert.equal(clock(view('victory'),start+45000).kind,'victory');
 assert.equal(clock(view('cooldown'),start+45000).kind,'defeat');
 assert.equal(clock(view('waiting'),start+45000).kind,'waiting');
 assert.equal(clock(null,start+10000).kind,'waiting');
 assert.ok(!source.includes('Math.random('));
 assert.ok(!source.includes('fetch('));
});
test('Reconnected client jumps to current round; feedback comes only from server answers',()=>{
 const fx=bootstrap(),model=view();
 assert.equal(fx.deriveCue(model,start+18700).kind,'target');
 const early=fx.deriveCue(model,start+3200);
 assert.equal(early.feedback,'none');
 model.miniGames.myAnswers[0]={correct:true,at:start+4000};
 const success=fx.deriveCue(model,start+4200);
 assert.equal(success.feedback,'correct');
 assert.equal(success.feedbackAt,start+4000);
 model.miniGames.myAnswers[0]={correct:false,at:start+4000};
 assert.equal(fx.deriveCue(model,start+4200).feedback,'wrong');
 assert.equal(fx.deriveCue(model,start+10300).feedback,'none',
  'a previous answer must not affect a later minigame');
});
test('Scene creates exactly participating heroes; single player is not visually replaced by three',()=>{
 const fx=bootstrap(),slots={};
 for(const name of ['#combat-hero-line','#combat-cue','#combat-flash','#combat-boss']){
  slots[name]={children:[],textContent:'',replaceChildren(...nodes){this.children=nodes},
   setAttribute(k,v){this[k]=v}};
 }
 const styles={};
 const root={dataset:{},querySelector:k=>slots[k],
  style:{setProperty(k,v){styles[k]=v}}};
 const director=fx.create(root,20);
 const solo=view();solo.roster=[{uid:'a'}];
 director.update(solo,start+3500);
 assert.equal(slots['#combat-hero-line'].children.length,1);
 assert.equal(slots['#combat-hero-line'].children[0].children[1].textContent,'Alpha');
 assert.equal(root.dataset.cue,'dodge');
 assert.equal(styles['--boss-accent'],'#b68aff');
 assert.equal(slots['#combat-flash'].children.length,1);
 const team=view();director.update(team,start+11300);
 assert.equal(slots['#combat-hero-line'].children.length,3);
 assert.equal(root.dataset.cue,'math');
 director.update(view('victory'),start+30001);
 assert.equal(root.dataset.cue,'victory');
 assert.match(slots['#combat-cue'].textContent,/BOSS BESIEGT/);
});
test('Both arenas load the same combat effects before their controllers',()=>{
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
  const mini=html.indexOf('dog-boss-mini-ui.js');
  const fx=html.indexOf('dog-boss-combat-fx.js');
  const controller=html.indexOf(page.replace('.html','.js'));
  assert.ok(mini>=0&&fx>mini&&controller>fx,page);
  for(const marker of ['id="combat-scene"','id="combat-hero-line"',
   'id="combat-boss"','id="combat-cue"','id="combat-flash"'])
   assert.ok(html.includes(marker),page+' missing '+marker);
 }
 for(const file of ['dog-boss10.js','dog-group-boss.js']){
  const script=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(script.includes("DogBossCombatFX?.create($('combat-scene')"));
  assert.ok(script.includes('combatFx?.update(view,now())'));
 }
 const css=readFileSync(new URL('../dog-boss10.css',import.meta.url),'utf8');
 for(const name of ['combat-defeated','combat-slam','combat-shield',
  'combat-target','combat-runes','combat-projectile'])
  assert.ok(css.includes('@keyframes '+name),name);
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('@media(max-width:620px)'));
});
