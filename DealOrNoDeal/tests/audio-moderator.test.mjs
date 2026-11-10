import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const catalogue=read('js/moderator-lines.js'),script=read('js/amount-voice.js');
const game=read('game.html'),caseScript=read('js/cases.js'),banker=read('js/banker.js');
function harness({legacy=false,cases=null,stories=null,supported=true}={}){
 const storage=new Map(),spoken=[],cancelled=[],timers=new Map(),elements=[],listeners=new Map();
 if(legacy)storage.set('dealAmountVoiceEnabled','true');
 if(cases!==null)storage.set('dealCaseVoiceEnabled',String(cases));
 if(stories!==null)storage.set('dealStoryVoiceEnabled',String(stories));
 let timerId=0;
 const node=tag=>({tag,textContent:'',hidden:false,disabled:false,style:{},attributes:{},
  handlers:new Map(),setAttribute(k,v){this.attributes[k]=String(v)},
  addEventListener(k,v){this.handlers.set(k,v)},append(){},title:'',id:''});
 // The production buttons are present from the HTML first paint.
 for(const id of ['deal-story-voice','deal-amount-voice']){
  const el=node('button');el.id=id;el.isConnected=true;el.disabled=true;
  elements.push(el);
 }
 const document={hidden:false,body:{append:el=>elements.push(el)},
  createElement:tag=>{const el=node(tag);elements.push(el);return el},
  getElementById:id=>elements.find(el=>el.id===id)||null,
  querySelector:()=>({append(){}}),
  addEventListener:(name,callback)=>listeners.set(name,callback)};
 const voices=[{lang:'de-DE',name:'Anna female'},{lang:'de-DE',name:'Markus male'}];
 const synth={speaking:false,getVoices:()=>voices,addEventListener:()=>{},
  speak:utterance=>spoken.push(utterance),cancel:()=>cancelled.push(true),resume:()=>{}};
 class SpeechSynthesisUtterance{constructor(text){this.text=text}}
 const window={...(supported?{speechSynthesis:synth,SpeechSynthesisUtterance}:{}),
  DealModeratorLines:null,dispatchEvent:()=>{},DealModeratorStory:{onEnabled:()=>{}}};
 const context={window,document,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},
  setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,delay});return id},
  clearTimeout:id=>timers.delete(id)};
 runInNewContext(catalogue,context);runInNewContext(script,context);
 const buttons=()=>({case:elements.find(el=>el.id==='deal-amount-voice'),
  story:elements.find(el=>el.id==='deal-story-voice')});
 const click=kind=>{const el=buttons()[kind];el.handlers.get('click')()};
 return {window,document,synth,storage,spoken,cancelled,timers,buttons,click,
  caption:elements.find(el=>el.id==='deal-moderator-caption'),
  announce:(cents,meta={})=>window.announceOpenedAmount(cents,meta),
  speakStory:(text,meta={})=>window.DealModeratorAudio.speakStory(text,meta),
  fireTimer:delay=>{const pair=[...timers.entries()].find(([id,t])=>t.delay===delay);
   assert.ok(pair,'no timer with delay '+delay);timers.delete(pair[0]);pair[1].fn()},
  listener:name=>listeners.get(name)};
}

test('both switches are visible, independently accessible and audio subtitles are permanently hidden',()=>{
 const fx=harness(),btn=fx.buttons();
 assert.match(game,/deal\/or\/no\/deal|DEAL OR NO DEAL/i);
 assert.equal(btn.case.textContent,'🔊 Koffer AUS');
 assert.equal(btn.story.textContent,'🎙️ Moderator AUS');
 assert.equal(btn.case.disabled,false);
 assert.equal(btn.story.disabled,false);
 assert.equal(fx.buttons().case.isConnected,true);
 assert.equal(fx.buttons().story.isConnected,true);
 assert.equal((game.match(/id="deal-story-voice"/g)||[]).length,1,'moderator exists in static HTML');
 assert.equal((game.match(/id="deal-amount-voice"/g)||[]).length,1,'case button exists in static HTML');
 assert.equal(btn.case.attributes['aria-pressed'],'false');
 assert.equal(btn.story.attributes['aria-pressed'],'false');
 assert.equal(fx.caption.hidden,true);
 assert.match(fx.caption.style.cssText,/display:none/);
 assert.match(fx.caption.attributes['aria-live'],/off/);
 assert.doesNotThrow(()=>new Script(script));
 assert.doesNotThrow(()=>new Script(catalogue));
 assert.match(game,/amount-voice\.js\?v=20261110-amount-words-v6/);
 assert.match(caseScript,/announceOpenedAmount\(item\.amount/);
});
test('previously enabled combined voice is migrated to both independent switches',()=>{
 const fx=harness({legacy:true});
 assert.equal(fx.buttons().case.textContent,'🔊 Koffer AN');
 assert.equal(fx.buttons().story.textContent,'🎙️ Moderator AN');
 fx.click('case');
 assert.equal(fx.storage.get('dealCaseVoiceEnabled'),'false');
 assert.equal(fx.window.DealModeratorAudio.isCaseEnabled(),false);
 assert.equal(fx.window.DealModeratorAudio.isStoryEnabled(),true);
 assert.equal(fx.storage.get('dealAmountVoiceEnabled'),'true','do not overwrite historical preference');
 fx.click('story');
 assert.equal(fx.storage.get('dealStoryVoiceEnabled'),'false');
});
test('Koffer-only reads every opened amount, but gives a funny comment only on the two extremes',()=>{
 const fx=harness({cases:true,stories:false});
 const base={caseCount:29,gameId:'solo-1'};
 for(const [amount,number]of [[100,2],[50000,3],[100000000,4],[300000000,5]]){
  fx.announce(amount,{...base,caseNumber:number});
  fx.spoken.at(-1)?.onend?.();
 }
 // Advance the queued announcements as they finish.
 while([...fx.timers.values()].some(t=>t.delay===300)){
  fx.fireTimer(300);
  fx.spoken.at(-1).onend();
 }
 assert.equal(fx.spoken.length,4,'all four ordinary case amounts must be spoken');
 assert.match(fx.spoken[0].text,/Koffer 2\. Ein Euro\./);
 assert.match(fx.spoken[1].text,/Koffer 3\. Fünfhundert Euro\./);
 assert.match(fx.spoken[2].text,/Koffer 4\. Eine Million Euro\./);
 assert.ok(fx.spoken.slice(0,4).every(x=>x.text.length<60),'no jokes for ordinary amounts');
 fx.announce(1,{...base,caseNumber:8});
 assert.match(fx.spoken.at(-1).text,/Ein Cent/);
 assert.ok(fx.spoken.at(-1).text.length>90,'lowest value gets the special joke');
 fx.announce(1000000000,{...base,caseNumber:29});
 assert.match(fx.spoken.at(-1).text,/Zehn Millionen Euro/);
 assert.ok(fx.spoken.at(-1).text.length>90,'highest value gets the special joke');
 assert.equal(fx.caption.hidden,true,'no narration text appears');
 assert.equal(fx.spoken.at(-1).voice.name,'Markus male');
 assert.equal(fx.spoken.at(-1).lang,'de-DE');
 assert.equal(fx.synth.speaking,false);
 assert.equal(fx.speakStory('Eine Geschichte',{title:'Test',chapter:1}),false);
});
test('Story-only tells chapters and never speaks a case amount, even for ten million',()=>{
 const fx=harness({cases:false,stories:true});
 const spoken=fx.speakStory('Herbert und sein Gartenzwerg erleben ein Wunder.',{title:'Herbert',chapter:1});
 assert.equal(spoken,true);
 assert.match(fx.spoken[0].text,/Gartenzwerg/);
 fx.announce(1,{caseCount:29,caseNumber:1});
 fx.announce(1000000000,{caseCount:29,caseNumber:29});
 fx.announce(100,{caseCount:29,caseNumber:2});
 assert.equal(fx.spoken.length,1);
 assert.equal(fx.caption.hidden,true);
 fx.click('case');
 assert.equal(fx.window.DealModeratorAudio.isStoryEnabled(),true);
 assert.equal(fx.window.DealModeratorAudio.isCaseEnabled(),true);
});
test('turning case narration off does not interrupt a story; story OFF does not interrupt case speech',()=>{
 const a=harness({cases:true,stories:true});
 assert.equal(a.speakStory('Eine ausführliche eigenständige Geschichte.',{title:'A',chapter:1}),true);
 const cancels=a.cancelled.length;
 a.click('case');assert.equal(a.cancelled.length,cancels);
 assert.equal(a.window.DealModeratorAudio.isStoryEnabled(),true);
 const b=harness({cases:true,stories:true});
 b.announce(100,{caseCount:29,caseNumber:2});
 const current=b.spoken[0],old=b.cancelled.length;
 b.click('story');
 assert.equal(b.cancelled.length,old,'turning off Story must leave case voice playing');
 assert.equal(b.window.DealModeratorAudio.isCaseEnabled(),true);
 assert.equal(b.window.DealModeratorAudio.isStoryEnabled(),false);
 assert.equal(b.spoken[0],current);
});
test('case announcements queue behind stories rather than cutting off the story',()=>{
 const fx=harness({cases:true,stories:true});
 let started=0;
 fx.speakStory('Professor Blubb untersucht die Koffer.',{onStart:()=>started++});
 fx.announce(100,{caseCount:29,caseNumber:2});
 fx.announce(500,{caseCount:29,caseNumber:3});
 assert.equal(fx.spoken.length,1);
 assert.equal(started,1);
 fx.spoken[0].onend();
 fx.fireTimer(300);
 assert.equal(fx.spoken.length,2);
 assert.match(fx.spoken[1].text,/Koffer 2/);
 fx.spoken[1].onend();
 fx.fireTimer(300);
 assert.equal(fx.spoken.length,3);
 assert.match(fx.spoken[2].text,/Koffer 3/);
 assert.equal(fx.caption.hidden,true);
});
test('exceptional case overrides a story without leaking confidential values',()=>{
 const fx=harness({cases:true,stories:true});
 fx.speakStory('Onkel Erwin erzählt vom verlorenen Schatz.',{title:'Erwin',chapter:2});
 fx.announce(1000000000,{caseCount:29,caseNumber:29});
 assert.equal(fx.spoken.length,2);
 assert.match(fx.spoken[1].text,/Zehn Millionen Euro/);
 assert.ok(fx.cancelled.length>=2);
 assert.equal(fx.caption.hidden,true);
});
test('queued story chapters can resume after case narration but are discarded safely when priorities collide',()=>{
 const fx=harness({cases:true,stories:true});
 fx.announce(1,{caseCount:29,caseNumber:7});
 let started=0,discarded=0;
 assert.equal(fx.speakStory('Herbert und Günther halten ihre zweite Rede.',{
  onStart:()=>started++,onDiscard:()=>discarded++
 }),true);
 fx.spoken[0].onend();
 assert.ok([...fx.timers.values()].some(t=>t.delay===800));
 fx.announce(1000000000,{caseCount:29,caseNumber:8});
 assert.equal(discarded,1);
 assert.equal(started,0);
 assert.equal(fx.spoken.length,2);
 const later=harness({cases:true,stories:true});
 later.announce(1,{caseCount:29,caseNumber:7});
 let begun=0;
 later.speakStory('Die nächste Geschichte fängt jetzt endlich an.',{onStart:()=>begun++});
 later.spoken[0].onend();later.fireTimer(800);
 assert.equal(begun,1);
 assert.match(later.spoken.at(-1).text,/nächste Geschichte/);
});
test('each 26–29 case mode only gets a JOKE for 1 cent and its actual jackpot',()=>{
 const fx=harness({cases:true,stories:false}),api=fx.window.DealModeratorAudio;
 for(const [caseCount,top]of [[26,100000000],[27,300000000],[28,500000000],[29,1000000000]]){
  assert.equal(api.shouldComment(1,{caseCount}),true);
  assert.equal(api.shouldComment(top,{caseCount}),true);
  for(const other of [100,500,2000000,1000000000].filter(n=>n!==top))
   assert.equal(api.shouldComment(other,{caseCount}),false);
 }
 assert.equal(api.formatAmount(1000000000),'10 Millionen Euro');
 assert.ok(Object.values(fx.window.DealModeratorLines).reduce((n,p)=>n+p.length,0)>=126);
});
test('unsupported browsers disable both independent switches',()=>{
 const fx=harness({supported:false});
 assert.equal(fx.buttons().case.disabled,true);
 assert.equal(fx.buttons().story.disabled,true);
 assert.doesNotThrow(()=>fx.announce(1,{caseCount:29}));
 assert.equal(fx.speakStory('Hallo!'),false);
});

test('moderator stays visible without JavaScript and is reused, not duplicated, on initialization',()=>{
 const fx=harness();
 assert.equal(fx.buttons().story.isConnected,true);
 assert.equal(fx.buttons().case.isConnected,true);
 assert.equal(fx.buttons().story.id,'deal-story-voice');
 assert.equal(fx.buttons().case.id,'deal-amount-voice');
 assert.match(game,/<nav class="studio-header-controls"[\s\S]*?id="deal-story-voice"[\s\S]*?id="deal-amount-voice"/);
 assert.match(game,/#deal-story-voice,#?\.?studio-header-controls|\.studio-header-controls #deal-story-voice/);
 assert.equal(fx.buttons().story.attributes['aria-pressed'],'false');
 assert.equal(fx.caption.hidden,true,'the spoken subtitle remains invisible');
});

test('tapping Moderator ON unlocks mobile speech immediately, independently of Koffer narration',()=>{
 const fx=harness();
 fx.click('story');
 assert.equal(fx.buttons().story.textContent,'🎙️ Moderator AN');
 assert.equal(fx.buttons().case.textContent,'🔊 Koffer AUS');
 assert.equal(fx.window.DealModeratorAudio.isStoryEnabled(),true);
 assert.equal(fx.window.DealModeratorAudio.isCaseEnabled(),false);
 assert.equal(fx.storage.get('dealStoryVoiceEnabled'),'true');
 assert.equal(fx.spoken.length,1,'audio permission is unlocked directly by user tap');
 assert.match(fx.spoken[0].text,/Moderator eingeschaltet/);
 assert.equal(fx.caption.hidden,true);
 fx.click('story');
 assert.equal(fx.buttons().story.textContent,'🎙️ Moderator AUS');
 assert.equal(fx.window.DealModeratorAudio.isStoryEnabled(),false);
});

test('tapping Koffer ON unlocks separate narration even with Moderator OFF',()=>{
 const fx=harness();
 fx.click('case');
 assert.equal(fx.buttons().case.textContent,'🔊 Koffer AN');
 assert.equal(fx.buttons().story.textContent,'🎙️ Moderator AUS');
 assert.equal(fx.spoken.length,1);
 assert.match(fx.spoken[0].text,/Kofferansagen eingeschaltet/);
 assert.equal(fx.window.DealModeratorAudio.isCaseEnabled(),true);
 assert.equal(fx.window.DealModeratorAudio.isStoryEnabled(),false);
});

test('banker special-bonus audio honors the Story switch, not the Koffer switch',()=>{
 assert.match(banker,/DealModeratorAudio\?\.isStoryEnabled\?\.\(\)/);
 assert.doesNotMatch(banker,/localStorage\.getItem\('dealAmountVoiceEnabled'\)/);
});

test('opened-case currency is spoken as complete German words, never digit by digit',()=>{
 const fx=harness({cases:true,stories:false});
 const spoken=fx.window.DealModeratorAudio.spokenAmount;
 const scenarios=[
  [1,'Ein Cent'],
  [2,'Zwei Cent'],
  [50,'Fünfzig Cent'],
  [99,'Neunundneunzig Cent'],
  [100,'Ein Euro'],
  [101,'Ein Euro und ein Cent'],
  [150,'Ein Euro und fünfzig Cent'],
  [2100,'Einundzwanzig Euro'],
  [10000,'Einhundert Euro'],
  [12345,'Einhundertdreiundzwanzig Euro und fünfundvierzig Cent'],
  [50000,'Fünfhundert Euro'],
  [100000,'Eintausend Euro'],
  [125000,'Eintausendzweihundertfünfzig Euro'],
  [10000000,'Einhunderttausend Euro'],
  [125000000,'Eine Million zweihundertfünfzigtausend Euro'],
  [300000000,'Drei Millionen Euro'],
  [500000000,'Fünf Millionen Euro'],
  [1000000000,'Zehn Millionen Euro']
 ];
 for(const [cents,expected] of scenarios){
  assert.equal(spoken(cents),expected,'value '+cents);
  assert.doesNotMatch(spoken(cents),/[0-9.,]/,'speech must not contain numeric digits or decimal separators');
 }
 const meta={gameId:'spoken-test',caseNumber:3,caseCount:29};
 fx.announce(10000,meta);
 assert.match(fx.spoken.at(-1).text,/Koffer 3\. Einhundert Euro\./);
 assert.doesNotMatch(fx.spoken.at(-1).text,/100[,.]00/);
 assert.equal(fx.window.DealModeratorAudio.formatAmount(10000),'100 Euro',
  'visible currency formatting stays unchanged');
});

test('spoken currency conversion is separate from the evolving match story',()=>{
 const fx=harness({cases:false,stories:true});
 const original='Herbert sagt: 100 Euro liegen in der Schublade.';
 assert.equal(fx.speakStory(original,{title:'Herbert',chapter:1}),true);
 assert.equal(fx.spoken.at(-1).text,original,'story content is not rewritten');
});
