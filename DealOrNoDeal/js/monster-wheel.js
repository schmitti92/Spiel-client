'use strict';
/* Visual-only Monster Wheel. The server determines prize and debits a ticket
   before this component is allowed to animate. No local RNG influences credit. */
(()=>{
 let catalog=[],currentDegrees=0,rotating=false;
 const $=id=>document.getElementById(id);
 const palette=['#933e9b','#225e93','#b63c67','#b18336','#268273','#7643b2','#c65f30'];
 function paint(){
  const disc=$('monster-wheel-disc'),list=$('monster-prize-list');
  if(!disc||!list||!catalog.length)return;
  const step=360/catalog.length;
  const colors=catalog.map((_,i)=>palette[i%palette.length]+' '+(i*step).toFixed(4)+'deg '+((i+1)*step).toFixed(4)+'deg');
  disc.style.background='conic-gradient('+colors.join(',')+')';
  disc.replaceChildren();
  list.replaceChildren();
  const radius=(disc.clientWidth||350)*.378;
  for(let i=0;i<catalog.length;i++){
   const slot=catalog[i],deg=(i+.5)*step;
   const mark=document.createElement('span');
   mark.className='monster-wheel-segment';
   mark.textContent=slot.icon||'✦';
   mark.title=slot.label;
   mark.style.transform='rotate('+deg+'deg) translateY(-'+radius+'px) rotate(-'+deg+'deg)';
   disc.append(mark);
   const row=document.createElement('span');
   row.dataset.monsterSlot=String(i);
   row.textContent=(slot.icon||'✦')+' '+slot.label;
   list.append(row);
  }
 }
 function highlight(index){
  document.querySelectorAll('[data-monster-slot]').forEach(el=>el.classList.toggle('won',Number(el.dataset.monsterSlot)===index));
 }
 async function spin(index,duration=8000){
  if(rotating)throw Error('WHEEL_ALREADY_SPINNING');
  if(!Number.isInteger(index)||index<0||index>=catalog.length)throw Error('INVALID_WHEEL_POSITION');
  const disc=$('monster-wheel-disc'),stage=$('monster-stage');
  if(!disc)throw Error('WHEEL_UNAVAILABLE');
  const step=360/catalog.length;
  const target=(360-((index+.5)*step)%360)%360;
  const from=((currentDegrees%360)+360)%360;
  const forward=(target-from+360)%360;
  currentDegrees+=360*7+forward;
  rotating=true;highlight(-1);
  if(stage)stage.classList.add('is-spinning');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const elapsed=reduced?0:duration;
  disc.style.transition='transform '+elapsed+'ms cubic-bezier(.10,.72,.09,1)';
  // Trigger layout before setting the new absolute rotation.
  void disc.offsetWidth;
  disc.style.transform='rotate('+currentDegrees+'deg)';
  await new Promise(resolve=>setTimeout(resolve,elapsed+60));
  if(stage)stage.classList.remove('is-spinning');
  rotating=false;highlight(index);
 }
 function setCatalog(slots){
  if(rotating)return;
  catalog=Array.isArray(slots)?slots:[];
  paint();
 }
 function reset(){
  if(rotating)return;
  const disc=$('monster-wheel-disc');
  if(disc){disc.style.transition='none';disc.style.transform='rotate(0deg)'}
  currentDegrees=0;
  highlight(-1);
 }
 window.ChristmasMonsterVisuals={setCatalog,spin,reset,highlight,isSpinning:()=>rotating};
 window.addEventListener('resize',()=>{if(!rotating&&catalog.length)paint()},{passive:true});
})();
