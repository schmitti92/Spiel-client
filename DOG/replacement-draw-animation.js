// Pure visual replay: no draws, turns or game data are changed here.
const CARD_TYPES=new Set(['1/11','2','3','4','5','6','7','8','9','10','12','13','swap','joker']);

/** Only animate public draw events created after the last observed revision.
 * A first snapshot/reconnect must never replay old draws. */
export function newReplacementDraws(before,after){
 if(!before||!after||!Number.isSafeInteger(before.revision)||
    !Number.isSafeInteger(after.revision)||after.revision<=before.revision||
    !Array.isArray(after.drawEvents))return [];
 return after.drawEvents.filter(event=>event&&
   Number.isSafeInteger(event.revision)&&event.revision>before.revision&&
   event.revision<=after.revision&&Number.isInteger(event.seat)&&
   event.seat>=0&&event.seat<4&&CARD_TYPES.has(event.cardType)&&
   typeof event.canExit==='boolean').slice(-12);
}

/** A large card reveal, followed by a visible flight to the discard pile.
 * Presentation consumes only the game state already delivered by Render. */
export function createReplacementDrawAnimator(doc,{cardMarkup}){
 let queue=[],running=false,generation=0,animation=null,overlay=null;
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const win=doc.defaultView;
 const motionReduced=()=>Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
 function positionOf(id){
  const rect=doc.getElementById(id)?.getBoundingClientRect();
  if(!rect)return {x:0,y:0};
  const w=win?.innerWidth||doc.documentElement.clientWidth;
  const h=win?.innerHeight||doc.documentElement.clientHeight;
  return {x:rect.left+rect.width/2-w/2,y:rect.top+rect.height/2-h/2};
 }
 async function animate(node,frames,duration){
  if(motionReduced()||!node.animate){await wait(Math.min(duration,190));return;}
  const effect=node.animate(frames,{duration,easing:'cubic-bezier(.2,.75,.25,1)',fill:'forwards'});
  animation=effect;
  try{await effect.finished;}catch{/* A new game or hidden tab cancelled the effect. */}
  if(animation===effect)animation=null;
 }
 async function reveal(event,token){
  const panel=doc.createElement('div');
  panel.className='dog-replacement-reveal';
  panel.setAttribute('role','status');
  panel.setAttribute('aria-live','polite');
  panel.setAttribute('aria-label',event.name+' zieht '+event.cardType);
  const heading=doc.createElement('div');
  heading.className='dog-replacement-heading';
  heading.textContent='🃏 '+event.name+' zieht eine Ersatzkarte';
  const shell=doc.createElement('div');
  shell.className='dog-replacement-card';
  shell.innerHTML=cardMarkup(event.cardType,{tag:'div'});
  const result=doc.createElement('div');
  result.className='dog-replacement-result';
  result.textContent=event.canExit?'🚀 Startkarte! Figur darf herausgesetzt werden.':'🗑 Kein Heraussetzen möglich – auf den Ablagestapel!';
  panel.append(heading,shell,result);
  doc.body.appendChild(panel);
  overlay=panel;
  try{
   const source=positionOf('dog-deck-art');
   await animate(shell,[
    {transform:'translate('+source.x+'px,'+source.y+'px) scale(.25) rotate(-12deg)',opacity:0.75},
    {transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1}
   ],550);
   if(token!==generation)return;
   panel.classList.add('is-revealed');
   await wait(motionReduced()?800:1250);
   if(token!==generation)return;
   if(event.canExit){
    await animate(shell,[
     {transform:'translate(0,0) scale(1)',opacity:1},
     {transform:'translate(0,45px) scale(.75)',opacity:0}
    ],500);
   }else{
    const discard=positionOf('dog-discard-art');
    panel.classList.add('is-discarding');
    await animate(shell,[
     {transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1},
     {transform:'translate('+discard.x+'px,'+discard.y+'px) scale(.25) rotate(12deg)',opacity:0.85}
    ],680);
   }
  }finally{
   panel.remove();
   if(overlay===panel)overlay=null;
  }
 }
 async function drain(){
  if(running)return;
  running=true;
  const token=generation;
  while(token===generation&&queue.length){
   const event=queue.shift();
   try{await reveal(event,token);}catch(error){console.warn('DOG Kartenanimation:',error);}
  }
  if(token===generation)running=false;
 }
 function reset(){
  generation++;
  queue=[];
  animation?.cancel();
  animation=null;
  overlay?.remove();
  overlay=null;
  running=false;
 }
 function show(events,players=[]){
  if(!Array.isArray(events)||!events.length||doc.hidden)return;
  for(const event of events){
   if(queue.length>=12)break;
   queue.push({...event,name:String(players[event.seat]?.name||'Spieler').slice(0,28)});
  }
  void drain();
 }
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)reset();});
 return {show,reset,isActive:()=>running||queue.length>0};
}
