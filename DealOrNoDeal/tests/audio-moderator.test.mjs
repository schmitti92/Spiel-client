import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const catalogue=read('js/moderator-lines.js');
const voiceScript=read('js/amount-voice.js');
const caseScript=read('js/cases.js');
const page=read('game.html');

function harness({stored=false,support=true}={}){
 const spoken=[],cancelled=[],listeners=new Map(),elements=new Map(),storage=new Map();
 if(stored)storage.set('dealAmountVoiceEnabled','true');
 const makeElement=tag=>({
  tagName:tag,hidden:false,disabled:false,textContent:'',style:{cssText:''},attributes:{},listeners:new Map(),
  setAttribute(name,value){this.attributes[name]=String(value)},
  addEventListener(name,callback){this.listeners.set(name,callback)},
  append(){},
 });
 const header=makeElement('nav'),body=makeElement('body');
 const document={
  hidden:false,body,
  createElement:tag=>{
   const el=makeElement(tag);
   if(tag==='button')elements.set('button',el);
   if(tag==='div')elements.set('caption',el);
   return el;
  },
  querySelector:()=>header,
  addEventListener:(name,callback)=>listeners.set(name,callback)
 };
 const voices=[
  {lang:'de-DE',name:'Anna (female)'},
  {lang:'de-DE',name:'Markus (male)'}
 ];
 const synth={
  getVoices:()=>voices,
  addEventListener:()=>{},
  cancel:()=>cancelled.push('cancel'),
  resume:()=>{},
  speak:utterance=>spoken.push(utterance)
 };
 class SpeechSynthesisUtterance{
  constructor(text){this.text=text;this.voice=null;this.pitch=1;this.rate=1;this.volume=1;this.lang=''}
 }
 const window={
  ...(support?{speechSynthesis:synth,SpeechSynthesisUtterance}:{}),
  DealModeratorLines:null
 };
 const timers=new Map();let nextTimer=0;
 const context={
  window,document,
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer},
  clearTimeout:id=>timers.delete(id)
 };
 runInNewContext(catalogue,context);
 runInNewContext(voiceScript,context);
 return{
  window,document,spoken,cancelled,storage,listeners,elements,
  button:elements.get('button'),caption:elements.get('caption'),
  toggle:()=>elements.get('button').listeners.get('click')(),
  announce:(cents,meta={})=>window.announceOpenedAmount(cents,meta),
  timers
 };
}

test('voice and original moderator lines parse and are loaded in the correct order',()=>{
 assert.doesNotThrow(()=>new Script(catalogue));
 assert.doesNotThrow(()=>new Script(voiceScript));
 const lines=page.indexOf('./js/moderator-lines.js?');
 const announcer=page.indexOf('./js/amount-voice.js?');
 const cases=page.indexOf('./js/cases.js?');
 assert.ok(lines>0&&announcer>lines&&cases>announcer);
 assert.match(caseScript,/announceOpenedAmount\(item\.amount,\{caseNumber:item\.case\+1,gameId:g\.id\}\)/);
 assert.match(caseScript,/if\(directorLastGame\)window\.stopOpenedAmountAnnouncement\?\.\(\)/);
});

test('126 original jokes cover ten value classes with punchlines for the 10m case',()=>{
 const fx=harness();
 const lines=fx.window.DealModeratorLines;
 assert.equal(Object.keys(lines).length,10);
 assert.equal(Object.values(lines).reduce((n,pool)=>n+pool.length,0),126);
 for(const pool of Object.values(lines)){
  assert.ok(pool.length>=8);
  assert.equal(new Set(pool).size,pool.length,'no duplicate jokes within category');
  assert.ok(pool.every(phrase=>phrase.length>=30),'no placeholder jokes');
 }
 assert.equal(lines.tenMillion.length,16);
});

test('one cent is excellent, small amounts are relief, and exact millions get unique dramatic jokes',()=>{
 const fx=harness(),api=fx.window.DealModeratorAudio;
 const amounts=[
  [1,'oneCent','Ein Cent'],
  [100,'tiny','Ein Euro'],
  [100000,'small','1.000 Euro'],
  [5000000,'medium','50.000 Euro'],
  [50000000,'large','500.000 Euro'],
  [100000000,'million','Eine Million Euro'],
  [300000000,'threeMillion','3 Millionen Euro'],
  [500000000,'fiveMillion','5 Millionen Euro'],
  [1000000000,'tenMillion','10 Millionen Euro']
 ];
 for(const [cents,category,formatted]of amounts){
  assert.equal(api.classify(cents),category,String(cents));
  assert.equal(api.formatAmount(cents),formatted,String(cents));
  const joke=api.selectLine(cents,{gameId:'my-match',caseNumber:2});
  assert.ok(fx.window.DealModeratorLines[category].includes(joke),'wrong classification for '+formatted);
 }
});

test('moderator never speaks without enabled voice, then announces actual amount and joke exactly once',()=>{
 const fx=harness();
 assert.equal(fx.button.textContent,'🔇 Moderator AUS');
 assert.equal(fx.button.attributes['aria-pressed'],'false');
 fx.announce(1000000000,{caseNumber:29,gameId:'game-1'});
 assert.equal(fx.spoken.length,0);
 fx.toggle();
 assert.equal(fx.storage.get('dealAmountVoiceEnabled'),'true');
 assert.equal(fx.button.textContent,'🎙️ Moderator AN');
 assert.equal(fx.spoken.length,1,'first tap unlocks browser TTS through a short introduction');
 fx.announce(1000000000,{caseNumber:29,gameId:'game-1'});
 assert.equal(fx.spoken.length,2);
 assert.match(fx.spoken.at(-1).text,/10 Millionen Euro\./);
 assert.ok(fx.spoken.at(-1).text.length>90,'amount plus real joke, not number alone');
 assert.equal(fx.spoken.at(-1).voice.name,'Markus (male)','prefer German male voice when available');
 assert.equal(fx.spoken.at(-1).lang,'de-DE');
 assert.equal(fx.caption.hidden,false);
 assert.match(fx.caption.textContent,/MODERATOR/);
 assert.equal(fx.spoken.at(-1).pitch,.72);
});

test('each later reveal replaces the previous speech and does not leak into other rounds',()=>{
 const fx=harness({stored:true});
 fx.announce(100000000,{gameId:'a',caseNumber:1});
 fx.announce(1,{gameId:'a',caseNumber:2});
 assert.equal(fx.spoken.length,2,'one utterance per revealed case');
 assert.match(fx.spoken[1].text,/^Ein Cent\./);
 assert.ok(fx.cancelled.length>=2,'stop previous voice before next reveal');
 fx.document.hidden=true;
 fx.announce(300000000,{gameId:'a',caseNumber:3});
 assert.equal(fx.spoken.length,2,'hidden tab must never speak');
 fx.listeners.get('visibilitychange')();
 assert.equal(fx.caption.hidden,true);
 fx.document.hidden=false;
 fx.toggle();
 assert.equal(fx.button.attributes['aria-pressed'],'false');
 fx.announce(500000000,{gameId:'a',caseNumber:4});
 assert.equal(fx.spoken.length,2,'audio off disables narration');
});

test('unsupported browsers safely disable moderator without affecting game state',()=>{
 const fx=harness({support:false});
 assert.equal(fx.button.disabled,true);
 assert.equal(fx.button.textContent,'🔇 Moderator nicht verfügbar');
 assert.doesNotThrow(()=>fx.announce(1000000000,{caseNumber:3}));
 assert.equal(fx.spoken.length,0);
});
