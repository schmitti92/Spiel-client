'use strict';
/* Visual-only Monster Wheel. The server determines prize and debits a ticket
   before this component is allowed to animate. No local RNG influences credit. */
(()=>{
 let catalog=[],currentDegrees=0,rotating=false,lastWinningIndex=-1;
 const $=id=>document.getElementById(id);
 const palette=['#9b30bd','#1364b8','#ee5f3a','#ab2672','#18a89e','#cc7829','#424fcd'];
 const colorFor=(slot,i)=>{
  if(slot.featured==='character')return '#3cba58';
  if(slot.featured==='premium')return '#c52e80';
  if(slot.featured==='goldpack')return '#e4a12c';
  if(slot.id==='cash-10m')return '#ffd052';
  if(slot.kind==='randomCash')return '#6c37c5';
  return palette[i%palette.length];
 };
 function paint(){
  const disc=$('monster-wheel-disc'),list=$('monster-prize-list');
  if(!disc||!list||!catalog.length)return;
  const step=360/catalog.length;
  // Both wedge colors and divider lines follow the exact server catalog order.
  const colors=catalog.flatMap((slot,i)=>{
   const start=(i*step).toFixed(4),edge=((i+1)*step-.55).toFixed(4),end=((i+1)*step).toFixed(4);
   return [colorFor(slot,i)+' '+start+'deg '+edge+'deg','#ffe8ab '+edge+'deg '+end+'deg'];
  });
  disc.style.background='conic-gradient('+colors.join(',')+')';
  disc.replaceChildren();
  list.replaceChildren();
  const radius=(disc.clientWidth||350)*.378;
  for(let i=0;i<catalog.length;i++){
   const slot=catalog[i],deg=(i+.5)*step;
   const mark=document.createElement('span');
   mark.className='monster-wheel-segment';
   mark.dataset.featured=slot.featured||'';
   mark.dataset.monsterKind=slot.kind;
   mark.dataset.monsterSlot=String(i);
   const symbol=document.createElement('span');
   symbol.className='monster-wheel-icon';
   symbol.textContent=slot.icon||'✦';
   const label=document.createElement('span');
   label.className='monster-wheel-short';
   label.textContent=slot.short||slot.label;
   mark.append(symbol,label);
   mark.title=slot.label;
   mark.style.transform='rotate('+deg+'deg) translateY(-'+radius+'px) rotate(-'+deg+'deg)';
   disc.append(mark);
   const row=document.createElement('span');
   row.dataset.monsterSlot=String(i);
   row.dataset.featured=slot.featured||'';
   row.textContent=(slot.featured?'✦ ':'')+(slot.icon||'✦')+' '+slot.label;
   list.append(row);
  }
  highlight(lastWinningIndex);
 }
 function highlight(index){
  lastWinningIndex=index;
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
