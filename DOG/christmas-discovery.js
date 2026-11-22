/** Display-only DOG Christmas discoveries. The server confirms every claim. */
const eligibleField=field=>Number.isInteger(field)&&field>=0&&field<64&&field%16!==0;
export function dogChristmasFoundMarkers(christmas){
 if(!christmas?.enabled)return [];
 const seen=new Set(),marks=[];
 // Older server snapshots may contain verified discoveries only in the
 // bounded activity log. Render's durable field list takes precedence once
 // deployed, but recorded legacy events are also safe to display immediately.
 const legacy=Array.isArray(christmas.activity)?christmas.activity:[];
 const known=[
  ['gift',christmas.foundGiftFields],
  ['scratch',christmas.foundScratchFields],
  ['gold',(Array.isArray(christmas.foundGoldFields)?christmas.foundGoldFields:[]).map(e=>e?.field)],
  ['gift',legacy.filter(e=>e?.type==='gift').map(e=>e.field)],
  ['scratch',legacy.filter(e=>e?.type==='scratch').map(e=>e.field)],
  ['gold',legacy.filter(e=>e?.type==='gold').map(e=>e.field)]
 ];
 for(const [kind,fields] of known){
  if(!Array.isArray(fields))continue;
  for(const field of fields){
   if(!eligibleField(field)||seen.has(kind+':'+field))continue;
   seen.add(kind+':'+field);marks.push({field,kind});
  }
 }
 const counts=new Map();
 for(const mark of marks)counts.set(mark.field,(counts.get(mark.field)||0)+1);
 const goldValues=new Map();
 for(const entry of Array.isArray(christmas.foundGoldFields)?christmas.foundGoldFields:[])
  if(eligibleField(entry?.field)&&[1,500,1000,2000].includes(entry?.amount))
   goldValues.set(entry.field,entry.amount);
 for(const entry of legacy){
  if(entry?.type==='gold'&&eligibleField(entry.field)&&
    [1,500,1000,2000].includes(entry.amount)&&!goldValues.has(entry.field))
   goldValues.set(entry.field,entry.amount);
 }
 return marks.map(mark=>({
  ...mark,both:counts.get(mark.field)>1,
  ...(mark.kind==='gold'&&goldValues.has(mark.field)?{amount:goldValues.get(mark.field)}:{})
 })).sort((a,b)=>a.field-b.field||(a.kind==='gift'?-1:1));
}
/** The first snapshot is only the baseline: never celebrate historical rewards
 * after loading a page, joining or reconnecting. Each accepted subsequent
 * Render snapshot may contain multiple confirmed rewards from one transaction.
 * Show every HUMAN player's gain to every person viewing the same game.
 */
export function newDogChristmasDiscoveries(previous,current,players){
 if(!previous?.enabled||!current?.enabled||!Array.isArray(players))return [];
 const last=Number.isSafeInteger(previous.eventSerial)?previous.eventSerial:0;
 const now=Number.isSafeInteger(current.eventSerial)?current.eventSerial:0;
 if(now<=last)return [];
 const seen=new Set();
 return (Array.isArray(current.activity)?current.activity:[]).filter(event=>{
  if(!Number.isSafeInteger(event?.id)||event.id<=last||event.id>now||
     seen.has(event.id)||!eligibleField(event.field)||
     !['gift','scratch','gold'].includes(event.type)||
     !Number.isInteger(event.seat))return false;
  const winner=players.find(p=>p?.seat===event.seat);
  if(!winner||winner.bot===true||winner.inactive===true)return false;
  seen.add(event.id);
  return true;
 }).sort((a,b)=>a.id-b.id);
}

/** Pure text for an already server-confirmed finding. Never invent a win. */
export function describeDogChristmasDiscovery(event,players){
 if(!event||!Array.isArray(players))return null;
 const winner=players.find(p=>p?.seat===event.seat&&p.bot!==true&&p.inactive!==true);
 if(!winner)return null;
 const name=String(winner.name||'Spieler '+(event.seat+1)).slice(0,60);
 const amount=n=>Number.isSafeInteger(n)&&n>=0?n.toLocaleString('de-DE'):null;
 const tiers={simple:'ein einfaches Rubbellos',medium:'ein mittleres Rubbellos',premium:'ein Premium-Rubbellos',double:'ein Doppellos'};
 if(event.type==='gift'){
  const earned=Number.isSafeInteger(event.earnedTenths)&&event.earnedTenths>=0?
   (event.earnedTenths/10).toLocaleString('de-DE'):null;
  return {name,kind:'gift',icon:'⭐',title:'Weihnachtslichter gewonnen!',
   message:earned!==null?name+' hat '+earned+' Weihnachtslichter für Lichtertal gewonnen!':
    name+' hat ein Weihnachtslicht-Feld entdeckt!'};
 }
 if(event.type==='gold')
  return {name,kind:'gold',amount:event.amount,icon:'🪙',
   title:event.amount===2000?'🎉 Gold-Jackpot!':'Gold gewonnen!',
   message:name+' hat '+(amount(event.amount)||'Gold')+
    (amount(event.amount)!==null?' Goldmünzen':'')+' gewonnen! Das Gold wurde dem Spielerkonto gutgeschrieben.'};
 if(event.type==='scratch'){
  const tier=tiers[event.tier]||'ein Rubbellos';
  const count=Number.isSafeInteger(event.count)&&event.count>1&&event.count<20?event.count:1;
  return {name,kind:'scratch',icon:'🎟️',title:'Rubbellos gewonnen!',
   message:name+' hat '+(count>1?count+' Rubbellose':tier)+
    ' gewonnen! '+(count>1?'Die Lose wurden':'Das Los wurde')+' dem Spielerkonto gutgeschrieben.'};
 }
 return null;
}

/** Only a local, acknowledgement-required UI. Nothing writes to Firebase or
 * to the room, and confirming does not grant or claim a reward.
 */
export function createDogChristmasDiscoveryPopup(doc=document,{onReveal=null,onDismiss=null}={}){
 const popup=doc.getElementById('dog-christmas-find-popup');
 const icon=doc.getElementById('dog-christmas-find-icon');
 const heading=doc.getElementById('dog-christmas-find-title');
 const winner=doc.getElementById('dog-christmas-find-winner');
 const message=doc.getElementById('dog-christmas-find-message');
 const confirm=doc.getElementById('dog-christmas-find-confirm');
 let queue=[],active=false;
 function next(){
  if(active||!popup||!queue.length)return;
  const event=queue.shift();
  active=true;
  popup.dataset.kind=event.kind;
  popup.classList?.toggle?.('dog-gold-2000',event.kind==='gold'&&event.amount===2000);
  if(icon)icon.textContent=event.icon;
  if(heading)heading.textContent=event.title;
  if(winner)winner.textContent='🏆 '+event.name;
  if(message)message.textContent=event.message;
  popup.hidden=false;
  if(typeof popup.showModal==='function'&&!popup.open)popup.showModal();
  onReveal?.(event);
  confirm?.focus?.();
 }
 function dismiss(){
  if(!active)return;
  active=false;
  onDismiss?.();
  if(popup?.open&&typeof popup.close==='function')popup.close();
  if(popup)popup.hidden=true;
  next();
 }
 confirm?.addEventListener('click',dismiss);
 // A stray Escape key must not acknowledge someone else's prize.
 popup?.addEventListener('cancel',event=>event.preventDefault());
 return {
  show(events,players){
   if(!Array.isArray(events)||!events.length)return;
   const incoming=events.map(event=>describeDogChristmasDiscovery(event,players)).filter(Boolean);
   if(!incoming.length)return;
   queue.push(...incoming);
   next();
  },
  reset(){
   queue=[];active=false;
   onDismiss?.();
   if(popup?.open&&typeof popup.close==='function')popup.close();
   if(popup)popup.hidden=true;
  }
 };
}

/**
 * One screen-wide celebratory burst for a NEW, verified 2,000-gold discovery.
 * Canvas is inside the prize's modal top-layer dialog so it can cover the
 * viewport without clipping to the board. No game state or network changes.
 */
export function createDogGoldConfetti(doc=document){
 const win=doc.defaultView;
 const popup=doc.getElementById('dog-christmas-find-popup');
 let canvas=null,frame=null;
 function stop(){
  if(frame!==null){win?.cancelAnimationFrame?.(frame);frame=null;}
  canvas?.remove?.();canvas=null;
 }
 function fire(){
  stop();
  if(!win||!popup||!doc.createElement||!win.requestAnimationFrame||
     win.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||
     doc.documentElement?.dataset?.dogMotion==='off')return;
  const layer=doc.createElement('canvas');
  layer.className='dog-gold-confetti-canvas';
  layer.setAttribute('aria-hidden','true');
  const ctx=layer.getContext?.('2d');
  if(!ctx)return;
  const width=Math.max(320,win.innerWidth||doc.documentElement?.clientWidth||320);
  const height=Math.max(320,win.innerHeight||doc.documentElement?.clientHeight||600);
  const ratio=Math.min(2,Math.max(1,win.devicePixelRatio||1));
  layer.width=Math.round(width*ratio);layer.height=Math.round(height*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
  popup.appendChild(layer);canvas=layer;
  const palette=['#f9d75c','#ffedb4','#f3a0bd','#71d5f2','#b4f69c','#ba9bff','#ffffff'];
  const pieces=[];
  // Two fan-shaped confetti cannons erupt from the lower corners.
  for(let i=0;i<85;i++){
   const side=i%2===0?1:-1;
   pieces.push({burst:true,x:side===1?width*.07:width*.93,y:height-35,
    vx:side*(width*(.09+Math.random()*.41)),vy:-height*(.52+Math.random()*.48),
    gravity:height*(.34+Math.random()*.12),delay:Math.random()*.25,
    size:4+Math.random()*6,angle:Math.random()*6.28,spin:3+Math.random()*8,
    color:palette[i%palette.length]});
  }
  // Continuous glittering rain across the full screen, not just the popup.
  for(let i=0;i<160;i++)pieces.push({
   burst:false,x:Math.random()*width,y:-height*(.1+Math.random()*.75),
   speed:height*(.33+Math.random()*.3),drift:18+Math.random()*55,
   delay:Math.random()*1.8,size:3+Math.random()*6,
   angle:Math.random()*6.28,spin:2+Math.random()*6,
   color:palette[i%palette.length]
  });
  const start=win.performance?.now?.()??Date.now();
  function paint(now){
   if(!canvas||doc.hidden){stop();return;}
   const elapsed=Math.max(0,(now-start)/1000);
   if(elapsed>=5.5){stop();return;}
   ctx.clearRect(0,0,width,height);
   ctx.globalAlpha=Math.min(1,Math.max(0,(5.5-elapsed)/.7));
   for(const p of pieces){
    const t=elapsed-p.delay;
    if(t<0)continue;
    const x=p.burst?p.x+p.vx*t:p.x+Math.sin(t*2.2+p.angle)*p.drift;
    const y=p.burst?p.y+p.vy*t+.5*p.gravity*t*t:p.y+p.speed*t;
    if(x<-15||x>width+15||y<-20||y>height+25)continue;
    ctx.save();ctx.translate(x,y);
    ctx.rotate(p.angle+p.spin*t);
    ctx.fillStyle=p.color;
    ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.64);
    ctx.restore();
   }
   ctx.globalAlpha=1;
   if(elapsed<1.4){
    ctx.textAlign='center';
    ctx.font=Math.max(35,Math.min(64,width*.065))+'px system-ui, sans-serif';
    ctx.fillText('🎉',width*.06,height-18);
    ctx.fillText('🎉',width*.94,height-18);
   }
   frame=win.requestAnimationFrame(paint);
  }
  frame=win.requestAnimationFrame(paint);
 }
 return {fire,stop};
}
