/**
 * Mission-2-only reel cutscene. Reads already final engine outcomes.
 * Does not roll dice, grant prizes or mutate gameplay.
 */
const $=id=>document.getElementById(id);
const icons=['💥','🃏','❄️','🎭'];
const waits=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const reduced=()=>matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const decoys=Object.freeze([10,50,100].map(n=>({big:String(n),small:'ATTRAPPE',fake:true})));
let catalog=[],busy=false,skip=false,queue=Promise.resolve(),currentRound=null,dismissed=false;
let onDismiss=null;
export function setMission2SlotDismissHandler(handler){
 onDismiss=typeof handler==='function'?handler:null;
}
function dismissSlot(){
 const modal=$('m2-slot-modal');
 if(!modal?.open||busy)return;
 modal.close();
 if(dismissed)return;
 dismissed=true;
 const round=currentRound;
 currentRound=null;
 if(Number.isInteger(round))onDismiss?.(round);
}
async function getCatalog(){
 if(catalog.length)return;
 const res=await fetch('./manifest.json',{cache:'force-cache'});
 if(res.ok){const data=await res.json();if(Array.isArray(data.effects))catalog=data.effects;}
}
function itemFor(effect){
 const found=catalog.find(e=>e.id===effect.id);
 return {image:found?.image?'./'+found.image.split('/').pop():null,big:'😈',small:'#'+effect.id};
}
function slotFrame(item){
 const frame=document.createElement('div');frame.className='m2-frame'+(item.fake?' is-decoy':'');
 if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';frame.append(image);}
 else{const title=document.createElement('strong');title.textContent=item.big??'❄️';frame.append(title);}
 const sub=document.createElement('small');sub.textContent=item.small??'';frame.append(sub);
 return frame;
}
function cellHeight(index){
 return Math.max(1,$('m2-slot-reels').children[index].clientHeight);
}
function stationary(index,symbol){
 const reel=$('m2-slot-reels').children[index];reel.replaceChildren();
 reel.classList.remove('spinning','stopped','is-blank');
 if(!symbol){reel.classList.add('is-blank');return;}
 reel.append(slotFrame(symbol));reel.classList.add('stopped');
}
function fakeSelection(){
 const items=[...decoys,...catalog.map(e=>({image:'./'+e.image.split('/').pop(),small:'#'+e.id}))];
 return items[Math.floor(Math.random()*items.length)]||{big:'❄️',small:'GRINCH'};
}
async function run(index,finish,millis,frames=32){
 const reel=$('m2-slot-reels').children[index],height=cellHeight(index);
 if(skip||reduced()){stationary(index,finish);return;}
 const strip=document.createElement('div');strip.className='m2-strip';strip.style.setProperty('--m2-reel-height',height+'px');
 for(let i=0;i<frames;i++)strip.append(slotFrame(fakeSelection()));
 strip.append(slotFrame(finish));
 reel.replaceChildren(strip);reel.classList.remove('is-blank','stopped');reel.classList.add('spinning');
 const end=height*frames;
 if(strip.animate){
  const player=strip.animate([
   {transform:'translateY(0px)',offset:0,easing:'ease-in'},
   {transform:'translateY(-'+(end*.15)+'px)',offset:.18,easing:'linear'},
   {transform:'translateY(-'+(end*.86)+'px)',offset:.75,easing:'ease-out'},
   {transform:'translateY(-'+(end+height*.05)+'px)',offset:.97,easing:'ease-out'},
   {transform:'translateY(-'+end+'px)',offset:1}
  ],{duration:millis,fill:'forwards'});
  // Cancelling a running slot is visual only.
  while(player.playState!=='finished'&&!skip){
   await waits(45);
  }
  player.cancel();
 }else{await waits(millis);}
 stationary(index,finish);
}
async function presentOne(spin){
 const modal=$('m2-slot-modal');
 if(!modal||!Array.isArray(spin?.effects)||!spin.effects.length)return;
 await getCatalog().catch(()=>{});
 const first=spin.effects[0],second=spin.double?spin.effects[1]:null;
 if(!first)return;
 if(modal.open)modal.close();
 skip=false;busy=true;dismissed=false;currentRound=spin.round;
 $('m2-slot-continue').disabled=true;
 $('m2-slot-result').textContent='Kartenphase '+spin.round+': Der Grinch bereitet seine Gemeinheit vor …';
 $('m2-slot-label').textContent='DREHT ...';
 $('m2-slot-bonus-banner').hidden=true;
 stationary(0,{big:'💥',small:'START'});stationary(1,{big:'🃏',small:'START'});
 stationary(2,null); // bonus reel is permanently white before first result
 modal.showModal();
 const finalCategory={big:icons[first.category]||'😈',small:'KATEGORIE'};
 const firstStop=itemFor(first);
 const base=Promise.all([run(0,finalCategory,2100,28),run(1,firstStop,3000,38)]);
 await base;
 $('m2-slot-label').textContent=first.name.toUpperCase();
 $('m2-slot-result').textContent='🎰 '+first.name;
 if(second){
  await waits(skip?30:450);
  $('m2-slot-bonus-banner').hidden=false;
  $('m2-slot-result').textContent='🎰 '+first.name+' · DOPPELTES PECH! Zweite Walze startet …';
  await waits(skip?30:650);
  $('m2-slot-bonus-banner').hidden=true; // short, compact cameo
  await run(2,itemFor(second),2500,34); // only NOW the third reel ever spins
  $('m2-slot-label').textContent='2 GEMEINHEITEN';
  $('m2-slot-result').textContent='🎰 '+first.name+' + '+second.name+' · Beide Effekte sind im Spielstand vermerkt.';
 }
 $('m2-slot-continue').disabled=false;
 $('m2-slot-skip').textContent='Schließen';
 busy=false;
}
export function presentMission2Slot(spin){
 queue=queue.catch(()=>{}).then(()=>presentOne(spin));
 return queue;
}
export function wireMission2Slots(){
 const modal=$('m2-slot-modal'),continueButton=$('m2-slot-continue'),skipButton=$('m2-slot-skip');
 if(!modal)return;
 continueButton.addEventListener('click',()=>{if(busy){skip=true;return;}dismissSlot();});
 skipButton.addEventListener('click',()=>{
  if(busy)skip=true;
  else dismissSlot();
 });
 modal.addEventListener('cancel',event=>{event.preventDefault();if(busy)skip=true;else dismissSlot();});
}
