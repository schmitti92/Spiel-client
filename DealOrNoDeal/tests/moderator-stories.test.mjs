import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../js/'+name,import.meta.url),'utf8');
const source=read('moderator-stories.js'),engine=read('moderator-story-engine.js');
const voice=read('amount-voice.js'),app=read('app.js');
const html=readFileSync(new URL('../game.html',import.meta.url),'utf8');

function setup({store=new Map(),enabled=true}={}){
 const spoken=[],listeners=new Map(),overlays=new Map(),timers=new Map();
 let now=1800000000000,id=0,canSpeak=true;
 const root={
  addEventListener:(name,cb)=>listeners.set(name,cb),
  DealModeratorAudio:{
   isStoryEnabled:()=>enabled,
   speakStory:(line,meta)=>{
    if(!canSpeak)return false;
    spoken.push({line,meta});meta.onStart?.();return true;
   }
  }
 };
 const document={
  hidden:false,
  getElementById:name=>overlays.get(name)||null,
  addEventListener:(name,cb)=>listeners.set(name,cb)
 };
 const sessionStorage={
  getItem:key=>store.get(key)||null,
  setItem:(key,val)=>store.set(key,val)
 };
 const context={window:root,document,sessionStorage,Date:{now:()=>now},
  setTimeout:(fn,ms)=>{const timer=++id;timers.set(timer,{fn,ms});return timer},
  clearTimeout:timer=>timers.delete(timer)};
 runInNewContext(source,context);
 runInNewContext(engine,context);
 return{
  root,document,spoken,store,listeners,overlays,timers,
  changeEnable:value=>{enabled=value},
  changeSpeak:value=>{canSpeak=value},
  advance:ms=>{now+=ms},
  observe:g=>root.DealModeratorStory.observe(g),
  reset:()=>root.DealModeratorStory.observe(null)
 };
}
const caseAmounts=length=>Array.from({length},(_,i)=>({case:i,amount:i===0?1:100000+i*100}));
const match=(overrides={})=>({id:'partie-7828',caseCount:29,phase:'open',
 players:[{id:'a',case:26,deal:null},{id:'b',case:27,deal:null},{id:'c',case:28,deal:null}],
 openedAmounts:[],history:[],finalValues:null,...overrides});

test('eight complete, distinct prewritten plots all have a 5-chapter adaptive ending',()=>{
 assert.doesNotThrow(()=>new Script(source));
 assert.doesNotThrow(()=>new Script(engine));
 const {root}=setup();
 const narratives=root.DealModeratorStories.stories;
 assert.equal(narratives.length,8);
 assert.equal(new Set(narratives.map(s=>s.id)).size,8);
 assert.equal(new Set(narratives.map(s=>s.title)).size,8);
 const bodyKeys=['stingy','normal','generous'];
 const turnKeys=['top','cent','lucky','rough','balanced'];
 const lateKeys=['hope','lost'];
 const endKeys=['early','triumph','ordinary'];
 for(const story of narratives){
  assert.ok(story.intro.length>130,story.id+' must have a substantial intro');
  for(const [group,keys] of [['banker',bodyKeys],['twist',turnKeys],['late',lateKeys],['finale',endKeys]]){
   for(const key of keys)assert.ok(story[group][key].length>120,story.id+':'+group+':'+key);
  }
 }
});

test('story identity is stable per match and prewritten scripts adapt to genuinely public events',()=>{
 const {root}=setup();
 const api=root.DealModeratorStories;
 for(let n=0;n<50;n++)assert.equal(api.pick('game-'+n).id,api.pick('game-'+n).id);
 assert.ok(new Set(Array.from({length:50},(_,i)=>api.pick('game-'+i).id)).size>=6,
  'different matches must rotate through multiple plots');
 const g=match({history:[{round:1,offer:2000,expectedValue:10000,participants:['a'],decisions:[]}]});
 const stingy=api.chapter(g.id,'banker',g);
 const generous=api.chapter(g.id,'banker',{...g,history:[{...g.history[0],offer:9200}]});
 assert.notEqual(stingy.text,generous.text,'banker generosity changes the chapter');
 const top=api.chapter(g.id,'turn',{...g,openedAmounts:[{case:2,amount:1000000000}]});
 const tiny=api.chapter(g.id,'turn',{...g,openedAmounts:[{case:2,amount:1}]});
 assert.notEqual(top.text,tiny.text,'extreme public case result changes the plot');
 const alive=api.chapter(g.id,'climax',{...g,openedAmounts:caseAmounts(24)});
 const gone=api.chapter(g.id,'climax',{...g,openedAmounts:[...caseAmounts(23),{case:23,amount:1000000000}]});
 assert.notEqual(alive.text,gone.text,'narration reflects public survival of top prize');
 const early=api.chapter(g.id,'final',{...g,openedAmounts:caseAmounts(5),finalValues:[{payout:20000}]});
 const rich=api.chapter(g.id,'final',{...g,openedAmounts:caseAmounts(25),finalValues:[{payout:100000000}]});
 assert.notEqual(early.text,rich.text,'finale reflects real, public outcomes');
});

test('a real match plays a coherent introduction, banker scene, twist, cliffhanger and finale once each',()=>{
 const fx=setup(),g=match(),story=fx.root.DealModeratorStories.pick(g.id);
 fx.observe(g);
 assert.equal(fx.spoken.length,1);
 assert.equal(fx.spoken[0].meta.title,story.title);
 assert.equal(fx.spoken[0].meta.chapter,1);
 fx.observe(g);
 assert.equal(fx.spoken.length,1,'same game update must never repeat a chapter');
 const firstOffer={round:1,offer:2000,expectedValue:10000,participants:['a','b','c'],
  decisions:[{id:'a',deal:false},{id:'b',deal:false},{id:'c',deal:false}]};
 const six=match({openedAmounts:caseAmounts(6),history:[firstOffer]});
 fx.advance(18000);fx.observe(six);
 assert.equal(fx.spoken.length,2);
 assert.equal(fx.spoken[1].meta.chapter,2);
 const middle=match({openedAmounts:caseAmounts(12),history:[firstOffer]});
 fx.advance(18000);fx.observe(middle);
 assert.equal(fx.spoken.length,3);
 assert.equal(fx.spoken[2].meta.chapter,3);
 const late=match({openedAmounts:caseAmounts(24),history:[firstOffer]});
 fx.advance(18000);fx.observe(late);
 assert.equal(fx.spoken.length,4);
 assert.equal(fx.spoken[3].meta.chapter,4);
 const final=match({phase:'final',openedAmounts:caseAmounts(26),history:[firstOffer],
  finalValues:[{id:'a',payout:50000},{id:'b',payout:25000},{id:'c',payout:100000}]});
 fx.advance(18000);fx.observe(final);
 assert.equal(fx.spoken.length,4,'cannot spoil or overlap the personal case finale');
 fx.store.set('finale-watched:'+g.id+':finale','yes');
 fx.listeners.get('deal-finale-finished')();
 assert.equal(fx.spoken.length,5);
 assert.equal(fx.spoken[4].meta.chapter,5);
 assert.ok(fx.spoken.every(line=>line.meta.title===story.title));
 fx.observe(final);fx.listeners.get('deal-finale-finished')();
 assert.equal(fx.spoken.length,5,'final scene must never repeat');
 const saved=JSON.parse(fx.store.get('deal-moderator-story-v1:'+g.id));
 assert.deepEqual(saved.played,['intro','banker','turn','climax','final']);
});

test('story is private browser presentation, not a shared game action, and reload never repeats chapters',()=>{
 const store=new Map(),g=match();
 const fx=setup({store});
 fx.observe(g);
 assert.equal(fx.spoken.length,1);
 const reopened=setup({store});
 reopened.observe(g);
 assert.equal(reopened.spoken.length,0,'session refresh must not replay old introduction');
 assert.doesNotMatch(source+engine,/\bfetch\s*\(|\brequest\s*\(|\bFirestore\s*\(|\bdb\.collection\s*\(/);
 assert.doesNotMatch(source+engine,/\bgame\??\.values\b|\bg\??\.values\b/,
  'never inspect case assignments or hidden values');
 assert.match(app,/window\.DealModeratorStory\?\.observe\(g\)/);
 assert.match(app,/window\.DealModeratorStory\?\.observe\(null\)/);
 assert.match(html,/moderator-stories\.js\?v=20261110-match-stories-v1/);
 assert.match(html,/moderator-story-engine\.js\?v=20261110-split-audio-v3/);
 assert.ok(html.indexOf('amount-voice.js?')<html.indexOf('moderator-stories.js?'));
 assert.ok(html.indexOf('moderator-stories.js?')<html.indexOf('moderator-story-engine.js?'));
 assert.ok(html.indexOf('moderator-story-engine.js?')<html.indexOf('cases.js?'));
});

test('no narration while muted, in the banker vote, with a modal on screen or a hidden tab',()=>{
 const fx=setup({enabled:false}),g=match();
 fx.observe(g);
 assert.equal(fx.spoken.length,0);
 fx.changeEnable(true);fx.root.DealModeratorStory.onEnabled();
 assert.equal(fx.spoken.length,1);
 const busy=setup();busy.overlays.set('banker-call',{hidden:false});
 busy.observe(g);
 assert.equal(busy.spoken.length,0,'do not talk over Banker video');
 busy.overlays.get('banker-call').hidden=true;
 busy.listeners.get('deal-banker-reveal-finished')();
 assert.equal(busy.spoken.length,1);
 const voting=setup();
 voting.observe(match({phase:'decision',history:[{round:1,offer:123,expectedValue:500,decisions:[]}]}));
 assert.equal(voting.spoken.length,0,'the Banker decision must not be interrupted');
 const hidden=setup();
 hidden.document.hidden=true;hidden.observe(g);
 assert.equal(hidden.spoken.length,0);
 hidden.document.hidden=false;
 hidden.listeners.get('visibilitychange')();
 assert.equal(hidden.spoken.length,1);
});

test('a new game always starts a new deterministic story, even when old match had completed',()=>{
 const fx=setup(),a=match({id:'older-match-77'}),b=match({id:'brand-new-match-88'});
 fx.observe(a);
 assert.equal(fx.spoken.length,1);
 fx.reset();
 fx.observe(b);
 assert.equal(fx.spoken.length,2);
 assert.notEqual(fx.store.get('deal-moderator-story-v1:'+a.id),null);
 assert.notEqual(fx.store.get('deal-moderator-story-v1:'+b.id),null);
});

test('existing 1-cent / top-prize voice-only rule stays intact alongside longer stories',()=>{
 assert.match(voice,/const exceptional=shouldComment\(amount,meta\)/);
 assert.match(voice,/function speakStory\(text,meta=\{\}\)/);
 assert.match(voice,/if\(currentUtterance\)/);
 assert.match(voice,/queuedStory=entry/);
 assert.match(voice,/window\.DealModeratorAudio=Object\.freeze\(/);
 assert.doesNotMatch(engine,/announceOpenedAmount\(/,
  'story engine must not narrate ordinary case amounts');
});

test('story chapters persist only after actual speech begins; discarded queued narration is recoverable',()=>{
 const fx=setup(),g=match();
 // Model an audio channel that accepted a chapter but has not begun speaking.
 const oldSpeak=fx.root.DealModeratorAudio.speakStory;
 let pending=null;
 fx.root.DealModeratorAudio.speakStory=(line,meta)=>{
  pending={line,meta};return true;
 };
 fx.observe(g);
 assert.ok(pending);
 assert.equal(fx.spoken.length,0);
 assert.equal(fx.store.has('deal-moderator-story-v1:'+g.id),false,
  'queued story must not be marked read before audio actually starts');
 fx.observe(g);
 assert.equal(fx.store.has('deal-moderator-story-v1:'+g.id),false);
 pending.meta.onDiscard();
 fx.root.DealModeratorAudio.speakStory=oldSpeak;
 fx.advance(18000);
 fx.observe(g);
 assert.equal(fx.spoken.length,1);
 const saved=JSON.parse(fx.store.get('deal-moderator-story-v1:'+g.id));
 assert.deepEqual(saved.played,['intro']);
});
