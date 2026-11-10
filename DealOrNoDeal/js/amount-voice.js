'use strict';
/* German Goldstudio host voice. The amount and one original joke are spoken as
   ONE utterance: no overlapping voices, no extra requests and zero Firebase
   writes. Only already-revealed public case amounts are announced. */
(()=>{
 const key='dealAmountVoiceEnabled';
 const synth=window.speechSynthesis;
 const supported=!!synth&&typeof window.SpeechSynthesisUtterance==='function'&&typeof synth.speak==='function';
 let enabled=false,preferredVoice=null,speechSequence=0,hideTimer=null;
 let currentUtterance=null,queuedStory=null,scheduledStory=null,speechGuard=null;
 const lastPicked=new Map();
 try{enabled=localStorage.getItem(key)==='true'}catch{}
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
 const btn=document.createElement('button');
 btn.type='button';btn.id='deal-amount-voice';
 btn.title='Audio-Moderator: erzählt die Spielgeschichte und kommentiert 1 Cent und den höchsten Betrag';
 btn.setAttribute('aria-label','Audio-Moderator mit Spielgeschichten sowie Kommentaren zu 1 Cent und dem Höchstbetrag ein- oder ausschalten');
 btn.className='studio-tool';btn.style.cssText='white-space:nowrap;min-width:42px;cursor:pointer';
 const update=()=>{
  btn.textContent=!supported?'🔇 Moderator nicht verfügbar':enabled?'🎙️ Moderator AN':'🔇 Moderator AUS';
  btn.setAttribute('aria-pressed',String(enabled&&supported));
 };
 update();
 if(!supported){btn.disabled=true;btn.title='Browser unterstützt keine deutsche Sprachausgabe'}
 (document.querySelector('.studio-header-controls')||document.body).append(btn);
 const caption=document.createElement('div');
 caption.id='deal-moderator-caption';
 caption.setAttribute('role','status');caption.setAttribute('aria-live','polite');
 caption.hidden=true;
 caption.style.cssText='position:fixed;z-index:45;left:50%;bottom:15px;transform:translateX(-50%);width:max-content;max-width:min(92vw,850px);box-sizing:border-box;padding:12px 18px;border:2px solid #f8cd77;border-radius:16px;background:linear-gradient(130deg,rgba(9,24,42,.97),rgba(55,31,18,.97));color:#fff2cf;font:800 clamp(13px,1.5vw,19px)/1.4 system-ui,sans-serif;text-align:center;text-shadow:0 2px 5px #000;box-shadow:0 7px 26px #000b,0 0 22px #dcb25b66;pointer-events:none';
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
  currentUtterance=null;
  const next=queuedStory;queuedStory=null;
  if(next&&enabled&&!document.hidden){
   // A promised chapter is kept in scheduledStory until it actually begins.
   // If a priority 1-cent / jackpot announcement intervenes, stop() can
   // discard it and unlock the story engine to retry later.
   scheduledStory=next;
   function continueStory(tries=0){
    if(scheduledStory!==next)return;
    if(token!==speechSequence||!enabled||document.hidden){
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
 function stop(){
  ++speechSequence;
  clearTimeout(hideTimer);hideTimer=null;
  clearTimeout(speechGuard);speechGuard=null;
  currentUtterance=null;
  const pending=[queuedStory,scheduledStory];queuedStory=null;scheduledStory=null;
  for(const entry of pending)discardStory(entry);
  caption.hidden=true;
  if(supported)synth.cancel();
 }
 function playStory(entry){
  if(!enabled||!supported||document.hidden||!entry?.text)return false;
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
  caption.hidden=false;
  const voice=new window.SpeechSynthesisUtterance(text);
  voice.lang='de-DE';voice.rate=.96;voice.pitch=.84;voice.volume=1;
  const chosen=selectVoice();if(chosen)voice.voice=chosen;
  currentUtterance=voice;
  voice.onend=()=>finish(token);voice.onerror=()=>finish(token);
  guardSpeech(token,text.length);
  try{synth.speak(voice)}catch{finish(token);return false}
  try{entry.onStart?.()}catch{}
  return true;
 }
 function speakStory(text,meta={}){
  if(!enabled||!supported||document.hidden||typeof text!=='string'||!text)return false;
  return playStory({text,title:meta.title,chapter:meta.chapter,
   onStart:meta.onStart,onDiscard:meta.onDiscard});
 }
 btn.addEventListener('click',()=>{
  if(!supported)return;
  enabled=!enabled;
  try{localStorage.setItem(key,String(enabled))}catch{}
  stop();update();
  if(enabled){
   selectVoice();
   synth.resume?.();
   // A user gesture unlocks mobile audio. The first story follows this greeting.
   const hello=new window.SpeechSynthesisUtterance('Goldstudio Moderator eingeschaltet! Jede Partie erzählt jetzt ihre eigene Geschichte. Bei den Koffern kommentiere ich weiterhin nur den kleinsten und den größten Geldbetrag!');
   hello.lang='de-DE';hello.rate=.96;hello.pitch=.86;hello.volume=1;
   if(preferredVoice)hello.voice=preferredVoice;
   currentUtterance=hello;
   const token=speechSequence;
   hello.onend=()=>finish(token);hello.onerror=()=>finish(token);
   guardSpeech(token,hello.text.length);
   try{synth.speak(hello)}catch{finish(token)}
   window.DealModeratorStory?.onEnabled?.();
  }
 });
 function announce(cents,meta={}){
  if(!enabled||!supported||document.hidden)return;
  const amount=Math.round(Number(cents));
  if(!Number.isSafeInteger(amount)||amount<0||!shouldComment(amount,meta))return;
  const words=formatAmount(amount),line=selectLine(amount,meta);
  const text=words+'. '+(line||'Der nächste Koffer wartet schon!');
  stop();
  const event=speechSequence;
  caption.textContent='🎙️ MODERATOR · '+text;
  caption.hidden=false;
  const speech=new window.SpeechSynthesisUtterance(text);
  speech.lang='de-DE';
  speech.rate=amount>=100000000?.87:.98;
  speech.pitch=amount>=100000000?.72:.88;
  speech.volume=1;
  const voice=selectVoice();if(voice)speech.voice=voice;
  currentUtterance=speech;
  speech.onend=()=>finish(event);speech.onerror=()=>finish(event);
  // Some Android TTS engines omit onend; the watchdog also drains stories.
  guardSpeech(event,text.length);
  try{synth.speak(speech)}catch{finish(event)}
 }
 window.announceOpenedAmount=announce;
 window.stopOpenedAmountAnnouncement=stop;
 // Pure helpers are also used by regression tests, never for hidden case values.
 window.DealModeratorAudio=Object.freeze({classify,formatAmount,selectLine,shouldComment,topPrizeByCases,categories,speakStory,isEnabled:()=>enabled&&supported});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
})();
