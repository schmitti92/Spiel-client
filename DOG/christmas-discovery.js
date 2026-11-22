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
/** The first snapshot establishes the baseline; replayed WebSocket/HTTP
 * snapshots and reconnects never celebrate an already-known discovery.
 */
export function newDogChristmasDiscoveries(previous,current,seat){
 if(!previous?.enabled||!current?.enabled||!Number.isInteger(seat))return [];
 const last=Number.isSafeInteger(previous.eventSerial)?previous.eventSerial:0;
 const now=Number.isSafeInteger(current.eventSerial)?current.eventSerial:0;
 if(now<=last)return [];
 return (Array.isArray(current.activity)?current.activity:[]).filter(event=>
  Number.isSafeInteger(event?.id)&&event.id>last&&event.id<=now&&
  event.seat===seat&&eligibleField(event.field)&&
  (event.type==='gift'||event.type==='scratch'||event.type==='gold')
 ).sort((a,b)=>a.id-b.id);
}
export function createDogChristmasDiscoveryPopup(doc=document){
 const popup=doc.getElementById('dog-christmas-find-popup');
 const icon=doc.getElementById('dog-christmas-find-icon');
 const message=doc.getElementById('dog-christmas-find-message');
 const close=doc.getElementById('dog-christmas-find-close');
 let queue=[],timer=null;
 function dismiss(){
  if(timer!==null){clearTimeout(timer);timer=null;}
  if(popup)popup.hidden=true;
  next();
 }
 function next(){
  if(!popup||!popup.hidden||!queue.length)return;
  const event=queue.shift();
  const gift=event.type==='gift',gold=event.type==='gold';
  popup.dataset.kind=gift?'gift':gold?'gold':'scratch';
  icon.textContent=gift?'⭐':gold?'🪙':'🎟️';
  const tiers={simple:'Ein einfaches Rubbellos',medium:'Ein mittleres Rubbellos',premium:'Ein Premium-Rubbellos'};
  message.textContent=gift?
   'Du hast ein Lichtfeld gefunden! '+(Number.isInteger(event.earnedTenths)?(event.earnedTenths/10).toLocaleString('de-DE')+' Weihnachtslichter für Lichtertal gesammelt.':'Ein Weihnachtslicht für Lichtertal entdeckt!'):
   gold?'Du hast '+(Number.isInteger(event.amount)?event.amount.toLocaleString('de-DE'):'einige')+
    ' Goldmünzen entdeckt! Sie wurden deinem Rubbellos-Guthaben gutgeschrieben.':
   'Du hast ein Rubbellos-Feld gefunden! '+(tiers[event.tier]||'Ein Rubbellos')+' wartet im Weihnachtsevent auf dich.';
  popup.hidden=false;
  timer=setTimeout(dismiss,5200);
 }
 close?.addEventListener('click',dismiss);
 return {
  show(events){if(!Array.isArray(events)||!events.length)return;queue.push(...events.slice(-5));next();},
  reset(){queue=[];if(timer!==null)clearTimeout(timer);timer=null;if(popup)popup.hidden=true;}
 };
}
