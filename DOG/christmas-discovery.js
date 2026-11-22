/** Display-only DOG Christmas discoveries. The server confirms every claim. */
const eligibleField=field=>Number.isInteger(field)&&field>=0&&field<64&&field%16!==0;
export function dogChristmasFoundMarkers(christmas){
 if(!christmas?.enabled)return [];
 const seen=new Set(),marks=[];
 for(const [kind,fields] of [['gift',christmas.foundGiftFields],['scratch',christmas.foundScratchFields]]){
  if(!Array.isArray(fields))continue;
  for(const field of fields){
   if(!eligibleField(field)||seen.has(kind+':'+field))continue;
   seen.add(kind+':'+field);marks.push({field,kind});
  }
 }
 const counts=new Map();
 for(const mark of marks)counts.set(mark.field,(counts.get(mark.field)||0)+1);
 return marks.map(mark=>({...mark,both:counts.get(mark.field)>1})).sort((a,b)=>a.field-b.field||(a.kind==='gift'?-1:1));
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
  (event.type==='gift'||event.type==='scratch')
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
  const gift=event.type==='gift';
  popup.dataset.kind=gift?'gift':'scratch';
  icon.textContent=gift?'⭐':'🎟️';
  const tiers={simple:'Ein einfaches Rubbellos',medium:'Ein mittleres Rubbellos',premium:'Ein Premium-Rubbellos'};
  message.textContent=gift?
   'Du hast ein Lichtfeld gefunden! '+(Number.isInteger(event.earnedTenths)?(event.earnedTenths/10).toLocaleString('de-DE')+' Weihnachtslichter für Lichtertal gesammelt.':'Ein Weihnachtslicht für Lichtertal entdeckt!'):
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
