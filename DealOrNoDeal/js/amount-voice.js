'use strict';
/* Optional German announcer for newly opened Deal or No Deal briefcases.
   Only the local browser speaks; no audio files, server calls or database writes. */
(()=>{
 const key='dealAmountVoiceEnabled';
 const supported='speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
 let enabled=false;
 let preferredVoice=null;
 try{enabled=localStorage.getItem(key)==='true'}catch{}
 // Browser voice labels differ by platform. Prefer explicitly male German voices.
 // Never pretend a male voice is installed when the device provides none.
 const maleNames=/\b(male|mann|männlich|masculine|markus|stefan|stefan|thomas|daniel|florian|klaus|hans|martin|christoph|conrad|ralf|ralph|benjamin|bernd|andreas|peter|jan|jonas|moritz|max|tim|thorsten|oliver|rolf|georg|wolfgang)\b/i;
 const femaleNames=/\b(female|frau|weiblich|feminine|anna|petra|helena|hedda|katja|vicki|viktoria|sandra|sabine|marlene|monika|maria|amelie|lea|lara|lena|siri)\b/i;
 function selectVoice(){
  if(!supported)return null;
  const german=speechSynthesis.getVoices().filter(v=>String(v.lang||'').toLowerCase().startsWith('de'));
  const ranked=german.map(v=>{
   const name=String(v.name||'');
   let score=String(v.lang||'').toLowerCase()==='de-de'?5:0;
   if(maleNames.test(name))score+=100;
   if(femaleNames.test(name))score-=100;
   if(/natural|neural|premium|enhanced/i.test(name))score+=3;
   return {v,score};
  }).sort((a,b)=>b.score-a.score);
  preferredVoice=ranked[0]?.v||null;
  return preferredVoice;
 }
 if(supported){
  selectVoice();
  speechSynthesis.addEventListener?.('voiceschanged',selectVoice);
 }
 const btn=document.createElement('button');
 btn.type='button';btn.id='deal-amount-voice';btn.title='Geldbeträge beim Aufdecken sofort vorlesen (männliche Stimme bevorzugt)';
 btn.setAttribute('aria-label','Sprachausgabe für aufgedeckte Geldbeträge');
 btn.className='studio-tool';btn.style.cssText='white-space:nowrap;min-width:40px;cursor:pointer';
 const update=()=>{btn.textContent=enabled?'🔊 Zahlen an':'🔇 Zahlen aus';btn.setAttribute('aria-pressed',String(enabled));};
 update();
 if(!supported){btn.disabled=true;btn.textContent='🔇 Sprache nicht verfügbar';btn.title='Dein Browser unterstützt keine Sprachausgabe'}
 btn.addEventListener('click',()=>{
  if(!supported)return;
  enabled=!enabled;
  try{localStorage.setItem(key,String(enabled))}catch{}
  if(!enabled)speechSynthesis.cancel();
  else selectVoice();
  update();
 });
 (document.querySelector('.studio-header-controls')||document.body).append(btn);
 window.announceOpenedAmount=(cents)=>{
  if(!enabled||!supported||document.hidden)return;
  const amount=Math.round(Number(cents))/100;
  if(!Number.isFinite(amount)||amount<0)return;
  // No timer: the event is raised when the amount appears on screen.
  speechSynthesis.cancel();
  const euros=Math.floor(amount),cent=Math.round((amount-euros)*100);
  const words=cent?euros+' Euro und '+cent+' Cent':euros+' Euro';
  const speech=new SpeechSynthesisUtterance(words);
  speech.lang='de-DE';speech.rate=.92;speech.pitch=.82;speech.volume=1;
  const voice=selectVoice();if(voice)speech.voice=voice;
  speechSynthesis.speak(speech);
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&supported)speechSynthesis.cancel()});
})();
