'use strict';
/* German Goldstudio host voice. The amount and one original joke are spoken as
   ONE utterance: no overlapping voices, no extra requests and zero Firebase
   writes. Only already-revealed public case amounts are announced. */
(()=>{
 const caseKey='dealCaseVoiceEnabled';
 const storyKey='dealStoryVoiceEnabled';
 const legacyKey='dealAmountVoiceEnabled';
 const synth=window.speechSynthesis;
 const supported=!!synth&&typeof window.SpeechSynthesisUtterance==='function'&&typeof synth.speak==='function';
 let caseEnabled=false,storyEnabled=false,preferredVoice=null,speechSequence=0,hideTimer=null;
 let currentUtterance=null,currentKind=null,queuedStory=null,scheduledStory=null,speechGuard=null;
 let queuedCases=[];
 const lastPicked=new Map();
 try{
  const legacy=localStorage.getItem(legacyKey);
  caseEnabled=(localStorage.getItem(caseKey)??legacy)==='true';
  storyEnabled=(localStorage.getItem(storyKey)??legacy)==='true';
 }catch{}
 const maleNames=/\b(male|mann|männlich|masculine|markus|stefan|thomas|daniel|florian|klaus|hans|martin|christoph|conrad|ralf|ralph|benjamin|bernd|andreas|peter|jan|jonas|moritz|max|tim|thorsten|oliver|rolf|georg|wolfgang)\b/i;
 const femaleNames=/\b(female|frau|weiblich|feminine|anna|petra|helena|hedda|katja|vicki|viktoria|sandra|sabine|marlene|monika|maria|amelie|lea|lara|lena|siri)\b/i;
 function selectVoice(){
  if(!supported)return null;
  const voices=typeof synth.getVoices==='function'?synth.getVoices():[];
  const german=voices.filter(v=>String(v.lang||'').toLowerCase().startsWith('de'));
  const ranked=german.map(v=>{
   let score=String(v.lang||'').toLowerCase()==='de-de'?5:0;
   const name=String(v.name||'');
   if(maleNames.test(name))score+=100;
   if(femaleNames.test(name))score-=100;
   if(/natural|neural|premium|enhanced/i.test(name))score+=3;
   return {v,score};
  }).sort((a,b)=>b.score-a.score);
  preferredVoice=ranked[0]?.v||null;
  return preferredVoice;
 }
 if(supported){selectVoice();synth.addEventListener?.('voiceschanged',selectVoice)}
 const categories=Object.freeze({
  oneCent:1,tiny:10000,small:1000000,medium:20000000,
  large:100000000,million:100000000,threeMillion:300000000,
  fiveMillion:500000000,tenMillion:1000000000
 });
 function classify(cents){
  if(cents===1)return 'oneCent';
  if(cents>=1000000000)return 'tenMillion';
  if(cents===500000000)return 'fiveMillion';
  if(cents===300000000)return 'threeMillion';
  if(cents===100000000)return 'million';
  if(cents>=100000000)return 'otherMillion';
  if(cents>=20000000)return 'large';
  if(cents>=1000000)return 'medium';
  if(cents>10000)return 'small';
  return 'tiny';
 }
 // The host speaks ONLY for the lowest and highest cash prize of the
 // currently selected 26–29-case mode. Nothing about the hidden shuffle
 // or the remaining unopened cases is needed.
 const topPrizeByCases=Object.freeze({26:100000000,27:300000000,28:500000000,29:1000000000});
 function shouldComment(cents,meta={}){
  const count=Number(meta.caseCount);
  return cents===1||topPrizeByCases[count]===cents;
 }
 function formatAmount(cents){
  if(cents===1)return 'Ein Cent';
  const euros=Math.floor(cents/100),cent=cents%100;
  if(euros===0)return cent+' Cent';
  if(cent===0&&euros>=1000000&&euros%1000000===0){
   const millions=euros/1000000;
   return millions===1?'Eine Million Euro':millions+' Millionen Euro';
  }
  if(cent===0&&euros===1)return 'Ein Euro';
  return euros.toLocaleString('de-DE')+' Euro'+(cent?' und '+cent+' Cent':'');
 }
 // Spoken amounts must contain written-out German number words. Android
 // speech engines sometimes spell currency digits ("1 0 0 Komma 0 0")
 // instead of saying "hundert Euro". Visual currency formatting stays intact.
 function spellUnderThousand(value){
  const units=['null','eins','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn','siebzehn','achtzehn','neunzehn'];
  const tens=['','','zwanzig','dreißig','vierzig','fünfzig','sechzig','siebzig','achtzig','neunzig'];
  if(value<20)return units[value];
  if(value<100){
   const ones=value%10;
   return ones?(ones===1?'ein':units[ones])+'und'+tens[Math.floor(value/10)]:tens[Math.floor(value/10)];
  }
  const hundred=Math.floor(value/100),rest=value%100;
  return (hundred===1?'ein':units[hundred])+'hundert'+(rest?spellUnderThousand(rest):'');
 }
 function spellUnderMillion(value){
  if(value<1000)return spellUnderThousand(value);
  const thousands=Math.floor(value/1000),rest=value%1000;
  return (thousands===1?'ein':spellUnderThousand(thousands))+'tausend'+(rest?spellUnderThousand(rest):'');
 }
 function spellNumber(value){
  if(value<1000000)return spellUnderMillion(value);
  const millions=Math.floor(value/1000000),rest=value%1000000;
  const millionsWords=millions===1?'eine Million':spellUnderMillion(millions)+' Millionen';
  return millionsWords+(rest?' '+spellUnderMillion(rest):'');
 }
 function spokenAmount(cents){
  const euros=Math.floor(cents/100),minor=cents%100;
  if(euros===0){
   const words=minor===1?'ein':spellNumber(minor);
   return words[0].toUpperCase()+words.slice(1)+' Cent';
  }
  const euroWords=euros===1?'ein':spellNumber(euros);
  const main=euroWords[0].toUpperCase()+euroWords.slice(1)+' Euro';
  return minor?main+' und '+(minor===1?'ein':spellNumber(minor))+' Cent':main;
 }
 function hashSeed(s){
  let hash=2166136261;
  for(let i=0;i<s.length;i++)hash=Math.imul(hash^s.charCodeAt(i),16777619);
  return hash>>>0;
 }
 function selectLine(cents,meta={}){
  const category=classify(cents);
  const lines=window.DealModeratorLines?.[category]||[];
  if(!lines.length)return null;
  const seed=String(meta.gameId||'')+':'+String(meta.caseNumber||'')+':'+String(cents);
  let index=hashSeed(seed)%lines.length;
  // Rare collision: avoid repeating the very same joke twice in a row.
  if(lines.length>1&&lastPicked.get(category)===index)index=(index+1)%lines.length;
  lastPicked.set(category,index);
  return lines[index];
 }
 const controls=document.querySelector('.studio-header-controls')||document.body;
 function control(id,aria,title){
  // The button exists in the HTML from first paint. Reuse it rather than
  // creating a duplicate that might be offscreen or appended to <body>.
  const button=document.getElementById?.(id)||document.createElement('button');
  button.type='button';button.id=id;
  button.className='studio-tool studio-audio-toggle';
  button.title=title;button.setAttribute('aria-label',aria);
  button.disabled=!supported;
  if(!supported)button.title='Browser unterstützt keine deutsche Sprachausgabe';
  if(!button.isConnected)controls.append(button);
  return button;
 }
 const btn=control('deal-amount-voice','Kofferbeträge vorlesen ein- oder ausschalten',
  'Liest jeden geöffneten Koffer vor; Witze nur bei 1 Cent und dem Höchstbetrag');
 const storyBtn=control('deal-story-voice','Audio-Moderator für die Spielgeschichte umschalten',
  'Moderator erzählt die ereignisabhängige Geschichte der Partie');
 function update(){
  btn.textContent=!supported?'🔇 Koffer':'🔊 Koffer '+(caseEnabled?'AN':'AUS');
  btn.setAttribute('aria-pressed',String(caseEnabled&&supported));
  storyBtn.textContent=!supported?'🔇 Moderator':'🎙️ Moderator '+(storyEnabled?'AN':'AUS');
  storyBtn.setAttribute('aria-pressed',String(storyEnabled&&supported));
 }
 update();
 // Audio-only show: the text caption remains hidden even while speaking.
 const caption=document.createElement('div');
 caption.id='deal-moderator-caption';caption.hidden=true;
 caption.setAttribute('aria-live','off');
 caption.style.cssText='display:none!important';
 document.body.append(caption);
 function broadcastIdle(){
  // Invite a waiting chapter to retry without polling Firestore or the server.
  try{window.dispatchEvent?.(new Event('deal-moderator-idle'))}catch{}
 }
 function discardStory(entry){
  try{entry?.onDiscard?.()}catch{}
 }
 function finish(token){
  if(token!==speechSequence)return;
  clearTimeout(speechGuard);speechGuard=null;
  currentUtterance=null;currentKind=null;
  if(queuedCases.length&&caseEnabled&&!document.hidden){
   const nextCase=queuedCases.shift();
   // Do not let an interrupted chapter vanish behind the case announcements.
   const story=queuedStory;queuedStory=null;
   if(story)discardStory(story);
   hideTimer=setTimeout(()=>{
    if(token===speechSequence&&caseEnabled&&!document.hidden)announce(nextCase.amount,nextCase.meta,true);
   },300);
   return;
  }
  const next=queuedStory;queuedStory=null;
  if(next&&storyEnabled&&!document.hidden){
   // A promised chapter is kept in scheduledStory until it actually begins.
   // If a priority 1-cent / jackpot announcement intervenes, stop() can
   // discard it and unlock the story engine to retry later.
   scheduledStory=next;
   function continueStory(tries=0){
    if(scheduledStory!==next)return;
    if(token!==speechSequence||!storyEnabled||document.hidden){
     scheduledStory=null;discardStory(next);return;
    }
    if(currentUtterance||synth.speaking){
     if(tries<14){hideTimer=setTimeout(()=>continueStory(tries+1),900);return}
     scheduledStory=null;discardStory(next);broadcastIdle();return;
    }
    scheduledStory=null;
    if(!playStory(next)){discardStory(next);broadcastIdle()}
   }
   hideTimer=setTimeout(()=>continueStory(),800);
  }else{
   if(next)discardStory(next);
   hideTimer=setTimeout(()=>{if(token===speechSequence)caption.hidden=true},1000);
   broadcastIdle();
  }
 }
 function guardSpeech(token,length){
  clearTimeout(speechGuard);
  speechGuard=setTimeout(()=>{
   if(token!==speechSequence||!currentUtterance)return;
   try{synth.cancel()}catch{}
   finish(token);
  },Math.min(75000,Math.max(25000,length*140)));
 }
 function stop(keepCaseQueue=false){
  ++speechSequence;
  clearTimeout(hideTimer);hideTimer=null;
  clearTimeout(speechGuard);speechGuard=null;
  currentUtterance=null;currentKind=null;
  if(!keepCaseQueue)queuedCases=[];
  const pending=[queuedStory,scheduledStory];queuedStory=null;scheduledStory=null;
  for(const entry of pending)discardStory(entry);
  caption.hidden=true;
  if(supported)synth.cancel();
 }
 function playStory(entry){
  if(!storyEnabled||!supported||document.hidden||!entry?.text)return false;
  if(currentUtterance){
   if(queuedStory)return false;
   queuedStory=entry;return true;
  }
  // Respect unrelated studio voices (e.g. the Banker's special bonus speech).
  if(synth.speaking)return false;
  stop();
  const token=speechSequence;
  const text=String(entry.text).slice(0,900);
  caption.textContent='🎭 '+String(entry.title||'Die Geschichte')+' · Kapitel '+Number(entry.chapter||1)+' · '+text;
  const voice=new window.SpeechSynthesisUtterance(text);
  voice.lang='de-DE';voice.rate=.96;voice.pitch=.84;voice.volume=1;
  const chosen=selectVoice();if(chosen)voice.voice=chosen;
  currentUtterance=voice;currentKind='story';
  voice.onend=()=>finish(token);voice.onerror=()=>finish(token);
  guardSpeech(token,text.length);
  try{synth.speak(voice)}catch{finish(token);return false}
  try{entry.onStart?.()}catch{}
  return true;
 }
 function speakStory(text,meta={}){
  if(!storyEnabled||!supported||document.hidden||typeof text!=='string'||!text)return false;
  return playStory({text,title:meta.title,chapter:meta.chapter,
   onStart:meta.onStart,onDiscard:meta.onDiscard});
 }
 // Speak a short confirmation within the tap gesture. Mobile browsers may
 // otherwise block the FIRST delayed story after audio was enabled.
 function confirmVoice(kind,message){
  if(!supported||currentUtterance||synth.speaking)return;
  const voice=new window.SpeechSynthesisUtterance(message);
  voice.lang='de-DE';voice.rate=.98;voice.pitch=.9;voice.volume=1;
  const selected=selectVoice();if(selected)voice.voice=selected;
  const token=speechSequence;
  currentUtterance=voice;currentKind=kind;
  voice.onend=()=>finish(token);voice.onerror=()=>finish(token);
  guardSpeech(token,message.length);
  try{synth.speak(voice)}catch{finish(token)}
 }
 btn.addEventListener('click',()=>{
  if(!supported)return;
  caseEnabled=!caseEnabled;
  try{localStorage.setItem(caseKey,String(caseEnabled))}catch{}
  if(!caseEnabled){
   queuedCases=[];
   if(currentKind==='case')stop();
  }else{
   synth.resume?.();
   confirmVoice('case','Kofferansagen eingeschaltet.');
  }
  update();
 });
 storyBtn.addEventListener('click',()=>{
  if(!supported)return;
  storyEnabled=!storyEnabled;
  try{localStorage.setItem(storyKey,String(storyEnabled))}catch{}
  if(!storyEnabled){
   if(currentKind==='story')stop();
   else{
    const pending=[queuedStory,scheduledStory];queuedStory=null;scheduledStory=null;
    if(pending[1]){clearTimeout(hideTimer);hideTimer=null}
    for(const entry of pending)discardStory(entry);
   }
  }else{
   synth.resume?.();
   confirmVoice('story','Moderator eingeschaltet. Unsere Geschichte geht weiter.');
   window.DealModeratorStory?.onEnabled?.();
  }
  update();
 });
 function announce(cents,meta={},fromQueue=false){
  if(!caseEnabled||!supported||document.hidden)return;
  const amount=Math.round(Number(cents));
  if(!Number.isSafeInteger(amount)||amount<0)return;
  const exceptional=shouldComment(amount,meta);
  // Most case values are read aloud without jokes. Queue them while an
  // existing chapter/announcement is speaking rather than interrupting it.
  if(!exceptional&&currentUtterance){
   queuedCases.push({amount,meta});
   if(queuedCases.length>12)queuedCases.shift();
   return;
  }
  const words=spokenAmount(amount),line=exceptional?selectLine(amount,meta):null;
  const number=Number(meta.caseNumber);
  const prefix=Number.isInteger(number)&&number>0?'Koffer '+number+'. ':'';
  const text=prefix+words+'.'+(line?' '+line:'');
  // A one-cent/top-prize reveal takes priority over an ongoing chapter.
  // A chapter discarded here remains eligible for a future retry.
  stop(fromQueue);
  const event=speechSequence;
  caption.textContent='🎙️ KOFFER · '+text;
  const speech=new window.SpeechSynthesisUtterance(text);
  speech.lang='de-DE';
  speech.rate=exceptional&&amount>=100000000?.87:.98;
  speech.pitch=exceptional&&amount>=100000000?.72:.88;
  speech.volume=1;
  const voice=selectVoice();if(voice)speech.voice=voice;
  currentUtterance=speech;currentKind='case';
  speech.onend=()=>finish(event);speech.onerror=()=>finish(event);
  guardSpeech(event,text.length);
  try{synth.speak(speech)}catch{finish(event)}
 }
 window.announceOpenedAmount=announce;
 window.stopOpenedAmountAnnouncement=stop;
 // Pure helpers are also used by regression tests, never for hidden case values.
 window.DealModeratorAudio=Object.freeze({classify,formatAmount,spokenAmount,selectLine,shouldComment,topPrizeByCases,categories,
  speakStory,isStoryEnabled:()=>storyEnabled&&supported,isCaseEnabled:()=>caseEnabled&&supported,
  isEnabled:()=>storyEnabled&&supported});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
})();
