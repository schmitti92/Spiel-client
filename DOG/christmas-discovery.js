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
  return {name,kind:'gold',icon:'🪙',title:'Gold gewonnen!',
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
export function createDogChristmasDiscoveryPopup(doc=document){
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
  if(icon)icon.textContent=event.icon;
  if(heading)heading.textContent=event.title;
  if(winner)winner.textContent='🏆 '+event.name;
  if(message)message.textContent=event.message;
  popup.hidden=false;
  if(typeof popup.showModal==='function'&&!popup.open)popup.showModal();
  confirm?.focus?.();
 }
 function dismiss(){
  if(!active)return;
  active=false;
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
   if(popup?.open&&typeof popup.close==='function')popup.close();
   if(popup)popup.hidden=true;
  }
 };
}
