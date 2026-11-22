/** Read-only DOG event dock: render only confirmed fields from the existing
 * Render room snapshot. Never request data or expose unrevealed positions.
 */
const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
const number=n=>integer(n).toLocaleString('de-DE');
const kinds=Object.freeze({
 gift:{icon:'⭐',label:'Lichtfeld'},
 scratch:{icon:'🎟️',label:'Rubbellos'},
 gold:{icon:'🪙',label:'Goldfeld'}
});
export function summarizeDogEventOverview(christmas,players=[]){
 if(!christmas?.enabled)return null;
 const people=new Map((Array.isArray(players)?players:[])
  .filter(p=>Number.isInteger(p?.seat)&&p.bot!==true&&p.inactive!==true)
  .map(p=>[p.seat,String(p.name||'Spieler '+(p.seat+1)).slice(0,60)]));
 const types=[
  {type:'gift',title:'Weihnachtslichter',icon:'⭐',total:integer(christmas.giftFieldCount),
   found:integer(christmas.roundGiftCollected),scope:'Aktuelle Kartenphase'},
  {type:'scratch',title:'Rubbellos-Felder',icon:'🎟️',total:integer(christmas.scratchFieldCount),
   found:integer(christmas.roundScratchCollected),scope:'Aktuelle Kartenphase'},
  {type:'gold',title:'Goldfelder',icon:'🪙',total:integer(christmas.goldFieldCount),
   found:Array.isArray(christmas.foundGoldFields)?christmas.foundGoldFields.length:0,scope:'Gesamte Partie'}
 ].map(row=>({...row,found:Math.min(row.total,row.found),remaining:Math.max(0,row.total-row.found)}));
 // Light/scratch names are retained for the CURRENT card deal. Gold is
 // one-time for the full match, so its winner list survives new deals.
 const source=[
  ...(Array.isArray(christmas.roundFinds)?christmas.roundFinds:[]),
  ...(Array.isArray(christmas.goldFinds)?christmas.goldFinds:[])
 ];
 const seen=new Set(),finds=[];
 for(const event of source){
  if(!kinds[event?.type]||!Number.isInteger(event.seat)||!people.has(event.seat)||
     !Number.isInteger(event.field)||event.field<0||event.field>63||event.field%16===0||
     !Number.isSafeInteger(event.id)||seen.has(event.id))continue;
  seen.add(event.id);
  const prize=event.type==='gold'?
   number(event.amount)+' Gold':
   event.type==='gift'?
    ((Number.isSafeInteger(event.earnedTenths)&&event.earnedTenths>=0)?
      (event.earnedTenths/10).toLocaleString('de-DE')+' ⭐':'Weihnachtslichter'):
   ({simple:'Einfaches Los',medium:'Mittleres Los',premium:'Premium-Los',double:'Doppellos'}[event.tier]||'Rubbellos');
  finds.push({id:event.id,type:event.type,icon:kinds[event.type].icon,
   label:kinds[event.type].label,player:people.get(event.seat),field:event.field,
   prize});
 }
 finds.sort((a,b)=>b.id-a.id);
 const knownByType={gift:0,scratch:0,gold:0};
 for(const entry of finds)knownByType[entry.type]++;
 const unknown=types.reduce((sum,t)=>sum+Math.max(0,t.found-knownByType[t.type]),0);
 return {round:integer(christmas.round)||1,types,finds,unknown};
}
function element(doc,tag,cls,text){
 const node=doc.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
/** Pure DOM rendering into the existing extension dock. The parent decides
 * when the panel opens; new snapshots never change its open/closed status.
 */
export function renderDogEventOverview(root,christmas,players=[]){
 if(!root)return;
 const doc=root.ownerDocument||document;
 root.replaceChildren();
 const overview=summarizeDogEventOverview(christmas,players);
 if(!overview){
  root.append(element(doc,'p','dog-event-empty',
   'Hier erscheint der Fortschritt, sobald das Weihnachts-DOG-Event in der aktuellen Partie aktiv ist.'));
  return;
 }
 const heading=element(doc,'div','dog-event-round','🎄 Kartenphase '+overview.round+' · Live-Eventfortschritt');
 root.append(heading);
 const summary=element(doc,'div','dog-event-summary');
 for(const row of overview.types){
  const card=element(doc,'div','dog-event-summary-card');
  const top=element(doc,'div','dog-event-summary-title');
  top.append(element(doc,'span','',row.icon+' '+row.title),
   element(doc,'strong','',row.found+' / '+row.total));
  card.append(top);
  const bar=element(doc,'div','dog-event-progress-track');
  const fill=element(doc,'span','dog-event-progress-fill');
  fill.style.width=(row.total?Math.min(100,100*row.found/row.total):0)+'%';
  bar.append(fill);
  card.append(bar,element(doc,'small','',
   row.remaining+' noch verborgen · '+row.scope));
  summary.append(card);
 }
 root.append(summary,element(doc,'div','dog-event-findings-heading','🔎 Wer hat was gefunden?'));
 if(!overview.finds.length){
  root.append(element(doc,'p','dog-event-empty','Noch keine bestätigten Funde mit Spielerzuordnung.'));
 }else{
  const wrap=element(doc,'div','dog-event-table-scroll');
  const table=element(doc,'table','dog-event-table');
  const thead=element(doc,'thead');
  const headrow=element(doc,'tr');
  for(const label of ['Fund','Spieler','Gewinn','Feld'])headrow.append(element(doc,'th','',label));
  thead.append(headrow);
  const tbody=element(doc,'tbody');
  for(const item of overview.finds){
   const tr=element(doc,'tr');
   for(const cell of [item.icon+' '+item.label,item.player,item.prize,String(item.field+1)])
    tr.append(element(doc,'td','',cell));
   tbody.append(tr);
  }
  table.append(thead,tbody);wrap.append(table);root.append(wrap);
 }
 if(overview.unknown>0){
  root.append(element(doc,'p','dog-event-legacy',
   overview.unknown+' bereits gefundene Felder stammen aus einem älteren Spielstand ohne vollständige Gewinnerliste.'));
 }
 root.append(element(doc,'p','dog-event-footnote',
  'Nur bereits aufgedeckte Felder werden angezeigt. Die übrigen Positionen bleiben geheim. Diese Übersicht nutzt die vorhandenen Live-Spieldaten.'));
}
