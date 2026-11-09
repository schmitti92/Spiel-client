'use strict';
/* German Goldstudio host voice. The amount and one original joke are spoken as
   ONE utterance: no overlapping voices, no extra requests and zero Firebase
   writes. Only already-revealed public case amounts are announced. */
(()=>{
 const key='dealAmountVoiceEnabled';
 const synth=window.speechSynthesis;
 const supported=!!synth&&typeof window.SpeechSynthesisUtterance==='function'&&typeof synth.speak==='function';
 let enabled=false,preferredVoice=null,speechSequence=0,hideTimer=null;
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
 btn.title='Originale, freche Moderatorsprüche zu jedem aufgedeckten Geldbetrag vorlesen';
 btn.setAttribute('aria-label','Audio-Moderator mit Geldbeträgen und lustigen Kommentaren ein- oder ausschalten');
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
 function stop(){
  ++speechSequence;
  clearTimeout(hideTimer);hideTimer=null;
  caption.hidden=true;
  if(supported)synth.cancel();
 }
 btn.addEventListener('click',()=>{
  if(!supported)return;
  enabled=!enabled;
  try{localStorage.setItem(key,String(enabled))}catch{}
  stop();update();
  if(enabled){
   selectVoice();
   synth.resume?.();
   // Start speech within the user's gesture, which unlocks audio on many devices.
   const hello=new window.SpeechSynthesisUtterance('Goldstudio Moderator eingeschaltet. Ich kommentiere jetzt jeden geöffneten Koffer!');
   hello.lang='de-DE';hello.rate=.96;hello.pitch=.86;hello.volume=1;
   if(preferredVoice)hello.voice=preferredVoice;
   try{synth.speak(hello)}catch{}
  }
 });
 function announce(cents,meta={}){
  if(!enabled||!supported||document.hidden)return;
  const amount=Math.round(Number(cents));
  if(!Number.isSafeInteger(amount)||amount<0)return;
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
  const hide=()=>{if(event!==speechSequence)return;clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(event===speechSequence)caption.hidden=true},1400)};
  speech.onend=hide;speech.onerror=hide;
  // Some Android TTS engines never raise onend; clear stale subtitles anyway.
  hideTimer=setTimeout(()=>{if(event===speechSequence)caption.hidden=true},18000);
  try{synth.speak(speech)}catch{hide()}
 }
 window.announceOpenedAmount=announce;
 window.stopOpenedAmountAnnouncement=stop;
 // Pure helpers are also used by regression tests, never for hidden case values.
 window.DealModeratorAudio=Object.freeze({classify,formatAmount,selectLine,categories});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
})();
