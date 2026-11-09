'use strict';
/* Optional German announcer for newly opened Deal or No Deal briefcases.
   Only the local browser speaks; no audio files, server calls or database writes. */
(()=>{
 const key='dealAmountVoiceEnabled';
 const supported='speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
 let enabled=false, timer=null;
 try{enabled=localStorage.getItem(key)==='true'}catch{}
 const btn=document.createElement('button');
 btn.type='button';btn.id='deal-amount-voice';btn.title='Aufgedeckte Geldbeträge vorlesen';
 btn.setAttribute('aria-label','Sprachausgabe für aufgedeckte Geldbeträge');
 btn.style.cssText='position:fixed;right:12px;bottom:12px;z-index:900;min-width:46px;padding:9px 12px;border:1px solid #e4bd73;border-radius:12px;background:#172d3eea;color:#ffe6ae;font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 3px 12px #0008';
 const update=()=>{btn.textContent=enabled?'🔊 Zahlen an':'🔇 Zahlen aus';btn.setAttribute('aria-pressed',String(enabled));};
 update();
 if(!supported){btn.disabled=true;btn.textContent='🔇 Sprache nicht verfügbar';btn.title='Dein Browser unterstützt keine Sprachausgabe'}
 btn.addEventListener('click',()=>{
  if(!supported)return;
  enabled=!enabled;
  try{localStorage.setItem(key,String(enabled))}catch{}
  if(!enabled){clearTimeout(timer);speechSynthesis.cancel()}
  update();
 });
 document.body.append(btn);
 window.announceOpenedAmount=(cents)=>{
  if(!enabled||!supported||document.hidden)return;
  const amount=Math.round(Number(cents||0))/100;
  if(!Number.isFinite(amount))return;
  clearTimeout(timer);
  speechSynthesis.cancel();
  timer=setTimeout(()=>{
   if(!enabled||document.hidden)return;
   const euros=Math.floor(amount),cent=Math.round((amount-euros)*100);
   const words=cent?euros+' Euro und '+cent+' Cent':euros+' Euro';
   const speech=new SpeechSynthesisUtterance(words);
   speech.lang='de-DE';speech.rate=.88;speech.pitch=1;speech.volume=1;
   const voices=speechSynthesis.getVoices();
   const german=voices.find(v=>v.lang.toLowerCase()==='de-de')||voices.find(v=>v.lang.toLowerCase().startsWith('de'));
   if(german)speech.voice=german;
   speechSynthesis.speak(speech);
  },1100);
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);if(supported)speechSynthesis.cancel()}});
})();
