/* CHRISTMAS SPECTACLE V2 – local rendering options only.
 * Quality setting never reaches Firebase, Render or any purchase endpoint.
 * No clock loops, forced relayout, network requests or heavy graphics libraries.
 */
(()=>{
 'use strict';
 const key='spielportal.christmas.visualEffects.v2';
 const levels=Object.freeze(['full','soft','off']);
 const labels=Object.freeze({
  full:'✨ Effekte: Legendär',
  soft:'❄️ Effekte: Sanft',
  off:'○ Effekte: Aus'
 });
 const button=()=>document.getElementById('christmas-effects-toggle');
 const media=()=>Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
 const lowPower=()=>{
  try{
   return Boolean(navigator.connection?.saveData)||(
    Number.isFinite(navigator.deviceMemory)&&navigator.deviceMemory<=3
   );
  }catch(_){return false}
 };
 const read=()=>{
  try{
   const stored=window.localStorage?.getItem(key);
   return levels.includes(stored)?stored:null;
  }catch(_){return null}
 };
 let level=read()||(lowPower()?'soft':'full');

 function update(){
  document.body.dataset.xmasEffects=level;
  const control=button();
  if(control){
   control.textContent=labels[level];
   control.dataset.level=level;
   control.setAttribute('aria-label',labels[level]+'. Antippen, um Effektstärke zu ändern.');
   control.setAttribute('aria-description','Legendär, Sanft oder Aus. Die Einstellung betrifft nur Animationen, nicht Gewinne.');
   control.title='Grafikeffekte wählen: Legendär → Sanft → Aus. Deine Hammer und Karten bleiben unverändert.';
  }
 }
 function setLevel(value){
  if(!levels.includes(value))return false;
  level=value;
  try{window.localStorage?.setItem(key,level)}catch(_){}
  update();
  document.dispatchEvent(new Event('christmas-effects-changed'));
  return true;
 }
 function next(){
  const current=levels.indexOf(level);
  setLevel(levels[(current+1)%levels.length]);
 }
 function visibility(){
  document.body.classList.toggle('xmas-cinema-paused',Boolean(document.hidden));
 }
 function minimal(){return level==='off'||media()}
 function particleLimit(fullCount){
  const count=Math.max(0,Math.floor(Number(fullCount)||0));
  return minimal()?0:level==='soft'?Math.min(8,count):count;
 }
 function initialize(){
  update();visibility();
  button()?.addEventListener('click',next);
  document.addEventListener('visibilitychange',visibility);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
 else initialize();
 window.ChristmasSpectacle=Object.freeze({
  currentLevel:()=>level,
  minimal,
  particleLimit,
  setLevel
 });
})();
