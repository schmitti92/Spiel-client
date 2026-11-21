/**
 * DOG Lichtertal – read-only player statistic comparison.
 * Only verified room participants receive totals, directly from Render.
 * Not a global leaderboard: no public profile listing, no guessed prizes.
 */
// Room comparisons are expensive (up to 1 room + 3 documents per player).
// Keep only a short, personal DISPLAY snapshot for rapid tab switches.
// Manual refresh and every first read after account/room changes stay live.
export const PLAYER_STATISTICS_TAB_REUSE_MS=30000;
export function reuseRecentPlayerStatistics({uid,roomCode,loadedUid,loadedRoomCode,loadedAt,hasData,force=false,now=Date.now()}){
 const age=now-loadedAt;
 return Boolean(uid)&&Boolean(roomCode)&&!force&&Boolean(hasData)&&
  uid===loadedUid&&roomCode===loadedRoomCode&&
  Number.isFinite(age)&&age>=0&&age<PLAYER_STATISTICS_TAB_REUSE_MS;
}
export function initChristmasPlayerStatistics(){
 const $=id=>document.getElementById(id);
 const root=$('christmas-player-statistics');
 if(!root)return {load:async()=>{}};
 const status=$('christmas-stat-status');
 const codeInput=$('christmas-stat-room-code');
 const roomLabel=$('christmas-stat-room-label');
 const view=$('christmas-stat-content');
 const sort=$('christmas-stat-sort');
 const refresh=$('christmas-stat-refresh');
 const connect=$('christmas-stat-connect');
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||
  'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const initialCode=new URLSearchParams(window.location.search).get('room')||'';
 const validCode=value=>/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(String(value||'').toUpperCase());
 const fmt=value=>new Intl.NumberFormat('de-DE').format(Number(value)||0);
 let code=String(initialCode).toUpperCase();
 let data=null,loading=null,requestId=0;
 let lastLoadedAt=0,lastLoadedUid=null,lastLoadedCode=null;
 let activeUid=user()?.uid||null;
 codeInput.value=validCode(code)?code:'';
 function user(){
  const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.getIdToken?state.user:null;
 }
 function el(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 }
 function setStatus(message,error=false){
  status.textContent=message;
  status.classList.toggle('has-error',error);
  status.hidden=false;
 }
 function panelKpi(label,value,icon){
  const node=el('div','cs-stat-kpi');
  node.append(el('span','cs-stat-kpi-icon',icon),
   el('span','cs-stat-kpi-label',label),
   el('strong','cs-stat-kpi-value',fmt(value)));
  return node;
 }
 const getVal=(row,key)=>{
  if(key==='scratch')return row.scratch.winTickets;
  if(key==='rewards')return row.rewards.total;
  if(key==='coins')return row.scratch.coinsWon;
  if(key==='quote')return row.dog.winRate;
  return row.dog.wins;
 };
 function order(){
  if(!data)return [];
  const key=sort.value;
  return [...data.players].sort((a,b)=>getVal(b,key)-getVal(a,key)||
   b.dog.wins-a.dog.wins||a.name.localeCompare(b.name,'de'));
 }
 function makeTable(target,heads,rows){
  const table=el('table','cs-stat-table');
  const head=el('thead');const htr=el('tr');
  for(const text of heads)htr.append(el('th','',text));
  head.append(htr);table.append(head);
  const body=el('tbody');
  for(const row of rows){
   const tr=el('tr',row.you?'is-current-player':'');
   row.cells.forEach((cell,i)=>{
    const td=el('td',i===0?'cs-name':'',cell);
    if(i===0&&row.you)td.append(el('span','cs-you',' · du'));
    tr.append(td);
   });
   body.append(tr);
  }
  table.append(body);
  const wrap=el('div','cs-stat-table-scroll');
  wrap.append(table);target.append(wrap);
 }
 function render(){
  if(!data){view.hidden=true;return;}
  view.hidden=false;
  roomLabel.textContent='Raum '+code+' · '+data.players.length+' Spieler';
  const ranked=order();
  const kpi=$('christmas-stat-kpis');
  kpi.replaceChildren(
   panelKpi('Mitspieler',data.totals.participants,'👥'),
   panelKpi('DOG-Siege',data.totals.wins,'🏆'),
   panelKpi('Gewinnlose erfasst',data.totals.winningTickets,'🎟️'),
   panelKpi('Belohnungen erfasst',data.totals.rewards,'🎁')
  );
  const podium=$('christmas-stat-podium');podium.replaceChildren();
  for(let i=0;i<Math.min(3,ranked.length);i++){
   const p=ranked[i],card=el('div','cs-stat-podium-card'+(i===0?' is-leader':''));
   card.append(el('span','cs-stat-medal',['🥇','🥈','🥉'][i]),
    el('strong','cs-stat-name',p.name+(p.you?' · du':'')),
    el('span','cs-stat-score',sort.value==='quote'
     ?p.dog.winRate.toLocaleString('de-DE')+' %'
     :fmt(getVal(p,sort.value))+' '+({wins:'Siege',scratch:'Gewinnlose',
      rewards:'Belohnungen',coins:'Münzen',quote:'Siegesquote'}[sort.value]||'Siege')));
   podium.append(card);
  }
  const dog=$('christmas-stat-dog-table');dog.replaceChildren();
  makeTable(dog,['Rang','Spieler','DOG-Partien','Siege','Siegesquote',
   'Figuren geschlagen','Eigene geschlagen'],ranked.map((p,i)=>({
    you:p.you,cells:[String(i+1),p.name,fmt(p.dog.played),
    fmt(p.dog.wins),p.dog.winRate.toLocaleString('de-DE')+' %',
    fmt(p.dog.knockedOut),fmt(p.dog.wasKnockedOut)]
  })));
  const scratch=$('christmas-stat-scratch-table');scratch.replaceChildren();
  makeTable(scratch,['Spieler','Lose geöffnet','Gewinnlose','Nieten',
   'Münzen gewonnen','Weihnachtslichter','Ältere Lose'],ranked.map(p=>({
    you:p.you,cells:[p.name,fmt(p.scratch.opened),
     fmt(p.scratch.winTickets)+(p.scratch.incomplete?' +':''),
     fmt(p.scratch.losingTickets)+(p.scratch.incomplete?' +':''),
     fmt(p.scratch.coinsWon)+(p.scratch.incomplete?' +':''),
     fmt(p.scratch.lightsWon)+(p.scratch.incomplete?' +':''),
     p.scratch.olderUnclassified?fmt(p.scratch.olderUnclassified)+' nicht klassifiziert':'–']
  })));
  const rewards=$('christmas-stat-reward-table');rewards.replaceChildren();
  makeTable(rewards,['Spieler','Baum-Belohnungen','Los-Freischaltungen',
   'Level-Belohnungen','Gesamt erfasst'],ranked.map(p=>({
    you:p.you,cells:[p.name,fmt(p.rewards.treeClaims),
    fmt(p.rewards.scratchUnlocks)+(p.rewards.incomplete?' +':''),
    fmt(p.rewards.levelClaims),fmt(p.rewards.total)+(p.rewards.incomplete?' +':'')]
  })));
  const incomplete=data.players.some(p=>p.scratch.incomplete);
  $('christmas-stat-history-note').textContent=incomplete
   ?'Ein „+“ bedeutet: mindestens dieser Wert. Ältere Rubbellose sind teilweise nicht einzeln erfasst; die Rangliste erfindet dafür keine Gewinne.'
   :'Alle hier aufgeführten Rubbellose sind anhand vorhandener serverseitiger Zähler erfasst.';
  setStatus('✓ Bestätigte Spielergebnisse für Raum '+code+' geladen.');
 }
 async function load(force=false){
  if(!validCode(code)){
   data=null;view.hidden=true;
   setStatus('Bitte gib den Raumcode ein, um die Statistik deiner Mitspieler zu sehen.');
   return;
  }
  const account=user();
  if(!account){
   data=null;view.hidden=true;
   setStatus('Bitte melde dich zuerst mit deinem Online-Spielerprofil an.',true);return;
  }
  if(reuseRecentPlayerStatistics({uid:account.uid,roomCode:code,
     loadedUid:lastLoadedUid,loadedRoomCode:lastLoadedCode,
     loadedAt:lastLoadedAt,hasData:Boolean(data),force}))return;
  if(loading&&!force)return loading;
  const id=++requestId;
  setStatus('Spielerstatistik wird vom Server geladen …');
  connect.disabled=true;refresh.disabled=true;
  const task=(async()=>{
   try{
    const token=await account.getIdToken();
    if(id!==requestId||user()?.uid!==account.uid)return;
    const reply=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+'/dog/player-statistics',{
     headers:{Authorization:'Bearer '+token},cache:'no-store'});
    const payload=await reply.json().catch(()=>({}));
    if(!reply.ok||payload.ok!==true)throw Error(payload.error||('HTTP_'+reply.status));
    if(id!==requestId||user()?.uid!==account.uid)return;
    data=payload;lastLoadedAt=Date.now();lastLoadedUid=account.uid;lastLoadedCode=code;
    render();
   }catch(err){
    if(id!==requestId)return;
    data=null;lastLoadedAt=0;lastLoadedUid=null;lastLoadedCode=null;view.hidden=true;
    const text=String(err?.message||'UNAVAILABLE');
    if(replyErrorIsAccess(text))setStatus('Dieser Raum ist nicht zugänglich. Du musst selbst Mitglied des Raums sein.',true);
    else if(text==='ROOM_NOT_FOUND')
     setStatus('Raum '+code+' ist nicht mehr verfügbar. Bitte prüfe, ob er noch in der Spiellobby besteht.',true);
    else if(text==='HTTP_404')
     setStatus('Die Statistik ist auf Render noch nicht veröffentlicht. Ob Raum '+code+' existiert, wurde dadurch nicht geprüft. Bitte den Server-Deploy prüfen und danach aktualisieren.',true);
    else if(/503|502|504|SERVER_UNAVAILABLE/.test(text))
     setStatus('Der Spielserver ist vorübergehend nicht erreichbar. Bitte den Render-Status prüfen.',true);
    else setStatus('Statistik konnte nicht geladen werden: '+text,true);
   }finally{
    if(id===requestId){connect.disabled=false;refresh.disabled=false;loading=null;}
   }
  })();
  loading=task;
  return task;
 }
 function replyErrorIsAccess(msg){return /FORBIDDEN|NOT_MEMBER|UNAUTHORIZED|MEMBER|ACCESS|LOGIN_REQUIRED/.test(msg);}
 function submitRoom(){
  const next=String(codeInput.value||'').trim().toUpperCase();
  if(!validCode(next)){
   setStatus('Ungültiger Raumcode: 3 Ziffern oder 6 zulässige Zeichen verwenden.',true);
   return;
  }
  code=next;data=null;lastLoadedAt=0;lastLoadedUid=null;lastLoadedCode=null;
  void load(true);
 }
 connect.addEventListener('click',submitRoom);
 codeInput.addEventListener('keydown',e=>{if(e.key==='Enter')submitRoom();});
 refresh.addEventListener('click',()=>void load(true));
 sort.addEventListener('change',render);
 window.addEventListener('spielonline-change',()=>{
  const nextUid=user()?.uid||null;
  // Auth state updates that retain the SAME verified account do not
  // invalidate a recent comparison or force up to 19 Firestore reads.
  if(nextUid===activeUid)return;
  activeUid=nextUid;
  requestId++;loading=null;data=null;lastLoadedAt=0;lastLoadedUid=null;lastLoadedCode=null;
  view.hidden=true;
  if(nextUid&&document.getElementById('tab-statistics')?.getAttribute('aria-selected')==='true')
   void load(true);
 });
 if(!validCode(code))setStatus('Gib deinen Raumcode ein, um die Spieler miteinander zu vergleichen.');
 else setStatus('Raum '+code+' erkannt. Statistik beim Öffnen laden.');
 return {load};
}
