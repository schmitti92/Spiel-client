/* Christmas Pack Cinema · presentation only.
   All cards, prices, purchase receipts and awards are exclusively server-provided.
   This file contains no network calls and never changes a wallet or collection.
*/
(()=>{
 'use strict';
 const rarities=Object.freeze({
  common:{name:'Gewöhnlich',label:'❄ Gewöhnliche Karte',color:'#cde4e6'},
  rare:{name:'Selten',label:'💎 Seltene Karte',color:'#9ddafe'},
  epic:{name:'Episch',label:'✨ EPISCHE KARTE',color:'#d4acff'},
  legendary:{name:'Legendär',label:'🌟 LEGENDÄRE KARTE',color:'#ffe49b'}
 });
 const packs=Object.freeze({
  small:{label:'Kleines Weihnachtspaket',caption:'DIE WEIHNACHTSWERKSTATT'},
  large:{label:'Großes Weihnachtspaket',caption:'DIE FESTLICHE SCHATZKAMMER'},
  premium:{label:'Premium-Weihnachtspaket',caption:'DIE GOLDENE WEIHNACHTSWELT'}
 });
 const byId=id=>document.getElementById(id);
 const reduced=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||window.ChristmasSpectacle?.minimal?.());
 const getRarity=card=>rarities[String(card?.rarity||'').toLowerCase()]||rarities.common;
 let enabledSound=false, audioContext=null, triggerElement=null;
 const safeCount=cards=>Array.isArray(cards)?cards.length:0;
 const safeMode=mode=>mode==='demo'?'demo':'real';

 function setText(id,value){const el=byId(id);if(el)el.textContent=value;}
 function saveTrigger(){
  const el=document.activeElement;
  if(el instanceof HTMLElement&&el!==byId('reveal-next')&&el!==byId('reveal-skip'))triggerElement=el;
 }
 function restoreFocus(){
  const target=triggerElement;triggerElement=null;
  if(target?.isConnected){try{target.focus({preventScroll:true})}catch(_){}}
 }
 function animateSound(legendary=false){
  if(!enabledSound)return;
  try{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)return;
   audioContext ||=new Context();
   if(audioContext.state==='suspended')void audioContext.resume().catch(()=>{});
   const t=audioContext.currentTime;
   const tones=legendary?[392,523,659,783,1046]:[523,659,784];
   for(let i=0;i<tones.length;i++){
    const start=t+i*(legendary?.15:.105);
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(tones[i],start);
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.055,start+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,start+(legendary?.6:.35));
    osc.connect(gain);gain.connect(audioContext.destination);
    osc.start(start);osc.stop(start+(legendary?.63:.38));
   }
  }catch(_){/* Optional sound must not block the reveal. */}
 }
 function setSoundButton(){
  const button=byId('pack-cinema-sound');if(!button)return;
  button.textContent=enabledSound?'🔊 Ton an':'🔇 Ton aus';
  button.setAttribute('aria-pressed',String(enabledSound));
 }
 function updateProgress(index,total){
  const progress=byId('pack-cinema-progress'),bar=byId('pack-cinema-progress-fill');
  if(progress){
   progress.setAttribute('aria-valuemax',String(Math.max(1,total)));
   progress.setAttribute('aria-valuenow',String(Math.max(0,index)));
  }
  if(bar)bar.style.width=(total?Math.max(0,index)/total*100:0)+'%';
 }
 function makeParticles(){
  const root=byId('pack-cinema-particles');if(!root)return;
  root.replaceChildren();
  const particleLimit=window.ChristmasSpectacle?.particleLimit?.(27)??(reduced()?0:27);
  if(!particleLimit)return;
  const colors=['#ffe8aa','#b8dfff','#d5b2ff','#ffbd83','#fff','#b4f3dc'];
  for(let i=0;i<particleLimit;i++){
   const particle=document.createElement('i');
   particle.style.setProperty('--x',(5+i*41%91)+'%');
   particle.style.setProperty('--y',(9+i*29%82)+'%');
   particle.style.setProperty('--delay',i%8*.13+'s');
   particle.style.setProperty('--size',(3+i%4*2)+'px');
   particle.style.setProperty('--tone',colors[i%colors.length]);
   root.append(particle);
  }
 }
 function open(cards,mode='real',packId='small'){
  saveTrigger();
  const root=byId('reveal-overlay');if(!root)return;
  const pack=packs[packId]||packs.small;
  root.dataset.pack=packs[packId]?packId:'small';
  root.dataset.mode=safeMode(mode);
  root.dataset.stage='ready';
  root.dataset.rarity='common';
  root.classList.remove('is-legendary-reveal','is-epic-reveal');
  setText('pack-cinema-kicker',mode==='demo'?'✨ DEMO · KEINE GUTSCHRIFT':pack.caption);
  setText('reveal-title',mode==='demo'?'🎬 Magische Paket-Vorschau':'🎁 '+pack.label);
  setText('pack-cinema-subtitle',mode==='demo'
   ?'Eine kostenlose Vorschau der Animation – dein Konto bleibt unverändert.'
   :'Ein magisches Geschenk mit '+safeCount(cards)+' geheimnisvollen Karten wartet auf dich.');
  setText('pack-cinema-rarity-title','');
  setText('pack-cinema-summary-stats','');
  setText('pack-cinema-note',mode==='demo'
   ?'🎬 Demo · keine Buchung, keine Karten und kein Spielgeld verändert.'
   :'✓ Der Kauf wurde vom Server bestätigt. Die Animation verändert deine Gutschrift nicht.');
  updateProgress(0,safeCount(cards));
  makeParticles();setSoundButton();
  const next=byId('reveal-next');
  if(next){next.disabled=false;next.hidden=false;next.textContent='🎁 Geschenk öffnen';}
  const skip=byId('reveal-skip');if(skip){skip.hidden=false;skip.disabled=false;}
  const gift=byId('reveal-present');gift?.classList.remove('opened');
 }
 function startCard(card,index,total){
  const root=byId('reveal-overlay');if(!root)return Promise.resolve();
  const rarity=String(card?.rarity||'common');
  const label=getRarity(card).name;
  root.dataset.stage='opening';
  root.dataset.rarity=rarities[rarity]?rarity:'common';
  root.classList.remove('is-legendary-reveal','is-epic-reveal');
  setText('pack-cinema-rarity-title','✦ MAGISCHE ENTHÜLLUNG ✦');
  setText('pack-cinema-subtitle','Die Karte '+(index+1)+' von '+total+' wird enthüllt …');
  setText('reveal-title','🎁 Die Überraschung!');
  byId('reveal-present')?.classList.add('opened');
  // The short delay is purely cosmetic. Skip/Close can always cancel it from
  // the parent script. No account state is mutated during this Promise.
  return new Promise(resolve=>setTimeout(resolve,reduced()?50:850));
 }
 function showCard(card,index,total){
  const root=byId('reveal-overlay');if(!root)return;
  const rarity=String(card?.rarity||'common').toLowerCase();
  const tier=rarities[rarity]?rarity:'common';
  root.dataset.stage='card';root.dataset.rarity=tier;
  root.classList.toggle('is-legendary-reveal',tier==='legendary');
  root.classList.toggle('is-epic-reveal',tier==='epic');
  setText('pack-cinema-kicker',
   root.dataset.mode==='demo'?'✨ DEMO · KEINE GUTSCHRIFT':packs[root.dataset.pack]?.caption||packs.small.caption);
  setText('pack-cinema-rarity-title',rarities[tier].label);
  setText('reveal-title',tier==='legendary'?'🌟 LEGENDÄR!':tier==='epic'?'✨ EPISCH!':'🎁 Karte entdeckt!');
  setText('pack-cinema-subtitle',card?.isNew===true
   ?'✨ NEU! Diese Karte war bisher noch nicht in deiner Sammlung.'
   :'Ein neues Motiv aus deinem Weihnachtspaket ist enthüllt.');
  updateProgress(index+1,total);
  animateSound(tier==='legendary');
 }
 function summarise(cards,mode='real'){
  const root=byId('reveal-overlay');if(!root)return;
  root.dataset.stage='summary';root.dataset.rarity='common';
  root.classList.remove('is-legendary-reveal','is-epic-reveal');
  const count=safeCount(cards);
  const newCount=cards.filter(card=>card?.isNew===true).length;
  const legendary=cards.filter(card=>card?.rarity==='legendary').length;
  const epic=cards.filter(card=>card?.rarity==='epic').length;
  setText('reveal-title',mode==='demo'?'✨ So sieht das Paketfinale aus!':'🏆 Deine Weihnachtskarten');
  setText('pack-cinema-rarity-title','✦ GESCHENKE GEÖFFNET ✦');
  setText('pack-cinema-subtitle',
   mode==='demo'?'Das war nur eine Vorschau – keine Karten wurden gutgeschrieben.'
   :'Alle '+count+' Karten wurden enthüllt. Deine Sammlung wurde serverseitig gespeichert.');
  setText('pack-cinema-summary-stats',
   count+' Karten · '+newCount+' neu · '+epic+' episch · '+legendary+' legendär');
  setText('pack-cinema-note',mode==='demo'
   ?'🎬 VORSCHAU · Es wurde kein Paket gekauft und nichts gutgeschrieben.'
   :'✓ Paketkauf bestätigt. Deine Karten wurden dem Online-Profil gutgeschrieben.');
  updateProgress(count,count);
 }
 function close(){const root=byId('reveal-overlay');if(root){root.dataset.stage='closed';root.classList.remove('is-legendary-reveal','is-epic-reveal');}
  restoreFocus();
 }
 function init(){
  byId('pack-cinema-sound')?.addEventListener('click',()=>{
   enabledSound=!enabledSound;setSoundButton();
   if(enabledSound){try{const Context=window.AudioContext||window.webkitAudioContext;if(Context){audioContext ||=new Context();void audioContext.resume().catch(()=>{});}}catch(_){}}
  });
  setSoundButton();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.ChristmasPackCinema=Object.freeze({open,startCard,showCard,summarise,close});
})();
