/* A-02: opt-in, local-only Boss network diagnostics.
 * Enable per page with ?netdiag=1 (or &netdiag=1 if a room/gate exists).
 * NO extra requests, Firestore operations, sensitive payloads or persistent data.
 */
(()=>{'use strict';
 if(new URLSearchParams(window.location?.search||'').get('netdiag')!=='1')return;
 const MAX_REQUESTS=2500,MAX_EVENTS=700;
 const kinds=new Set(['ready','start','react','minigame','finish']);
 const now=()=>typeof performance!=='undefined'&&typeof performance.now==='function'?
  performance.now():Date.now();
 let started=Date.now(),requests=[],events=[],seen=new Set();
 const rounded=n=>Math.round(Math.max(0,Number(n)||0));
 const percentile=(arr,p)=>{
  if(!arr.length)return null;
  const sorted=[...arr].sort((a,b)=>a-b);
  return rounded(sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]);
 };
 const arenaName=name=>name==='boss10'?'boss10':'group';
 const actionName=(method,route)=>{
  if(method==='GET')return 'status';
  const name=String(route||'').replace(/^\//,'');
  return kinds.has(name)?name:'other';
 };
 const push=(array,item,limit)=>{if(array.length<limit)array.push(item)};
 function begin(arena,method,route){
  const t=now(),kind=actionName(method,route),area=arenaName(arena);
  let finished=false;
  return {finish(outcome='failed',httpStatus=0){
   if(finished)return;
   finished=true;
   const status=['ok','failed','aborted'].includes(outcome)?outcome:'failed';
   const code=Number.isInteger(httpStatus)&&httpStatus>=100&&httpStatus<=599?
    httpStatus:0;
   push(requests,{arena:area,kind,outcome:status,httpStatus:code,
    durationMs:rounded(now()-t),atMs:rounded(Date.now()-started)},MAX_REQUESTS);
   updatePanel();
  }};
 }
 function observe(arena,snapshot){
  if(!snapshot||typeof snapshot!=='object')return;
  const start=Number(snapshot.startedAt);
  const serverTime=Number(snapshot.serverNow);
  if(!Number.isFinite(start)||start<=0||!Number.isFinite(serverTime))return;
  const area=arenaName(arena);
  // Only numeric timestamps and indexes are retained; no UID, player name,
  // room, request ID, auth token, HTTP URL, error message or response body.
  const elapsed=Math.max(0,serverTime-start);
  const signature=area+':'+start;
  function mark(kind,index,expectedMs){
   if(!Number.isFinite(expectedMs)||elapsed<expectedMs)return;
   const id=signature+':'+kind+':'+index;
   if(seen.has(id))return;
   seen.add(id);
   push(events,{arena:area,kind,index:rounded(index),
    delayMs:rounded(elapsed-expectedMs),atMs:rounded(Date.now()-started)},
   MAX_EVENTS);
   updatePanel();
  }
  if(snapshot.phase==='fighting'||snapshot.phase==='victory'||snapshot.phase==='cooldown')
   mark('fight-start',0,0);
  const rounds=Array.isArray(snapshot.miniGames?.rounds)?snapshot.miniGames.rounds:[];
  if(snapshot.phase==='fighting')rounds.forEach((round,i)=>{
   if(Number.isFinite(round?.startMs)&&elapsed>=round.startMs&&elapsed<round.endMs)
    mark('round-start',i,round.startMs);
  });
  const hits=snapshot.miniGames?.exchange?.strikes;
  if(Array.isArray(hits))for(const strike of hits){
   const slot=Number(strike?.slot),round=Number(strike?.round),at=Number(strike?.atMs);
   if(!Number.isInteger(slot)||slot<0||slot>2||!Number.isInteger(round)||
      round<0||round>8||!Number.isFinite(at)||at<0||at>500000)continue;
   const kind=strike.kind==='hero-strike'?'hero-hit':
    strike.kind==='boss-strike'?'boss-hit':null;
   if(kind)mark(kind,round*3+slot,at);
  }
  if(snapshot.phase==='victory'||snapshot.phase==='cooldown'){
   const ends=Number(snapshot.endsAt);
   if(Number.isFinite(ends)&&ends>=start)
    mark('result-after-end',0,ends-start);
  }
 }
 function report(){
  const elapsedMs=Math.max(1,Date.now()-started);
  const summaries=[];
  for(const area of ['boss10','group'])for(const kind of
   ['status','ready','start','react','minigame','finish','other']){
   const rows=requests.filter(r=>r.arena===area&&r.kind===kind);
   if(!rows.length)continue;
   const durations=rows.map(r=>r.durationMs);
   summaries.push({arena:area,kind,requests:rows.length,
    requestsPerMinute:Math.round(rows.length*600000/elapsedMs)/10,
    p50Ms:percentile(durations,.5),p95Ms:percentile(durations,.95),
    failures:rows.filter(r=>r.outcome==='failed').length,
    aborted:rows.filter(r=>r.outcome==='aborted').length});
  }
  const eventSummary=[];
  for(const area of ['boss10','group'])for(const kind of
   ['fight-start','round-start','hero-hit','boss-hit','result-after-end']){
   const rows=events.filter(e=>e.arena===area&&e.kind===kind);
   if(rows.length)eventSummary.push({arena:area,kind,observations:rows.length,
    p50DelayMs:percentile(rows.map(r=>r.delayMs),.5),
    p95DelayMs:percentile(rows.map(r=>r.delayMs),.95)});
  }
  return {durationSec:Math.round(elapsedMs/1000),totalRequests:requests.length,
   failedRequests:requests.filter(r=>r.outcome==='failed').length,
   abortedRequests:requests.filter(r=>r.outcome==='aborted').length,
   requestGroups:summaries,eventGroups:eventSummary,
   truncated:requests.length>=MAX_REQUESTS||events.length>=MAX_EVENTS};
 }
 const csvCell=x=>String(x??'').replace(/[\r\n]/g,' ').replace(/"/g,'""');
 const csvRow=values=>values.map(v=>'"'+csvCell(v)+'"').join(';');
 function csv(){
  const lines=[csvRow(['type','arena','kind','index','offset_ms','duration_ms',
   'delay_ms','outcome','http_status'])];
  for(const item of requests)lines.push(csvRow(['request',item.arena,item.kind,'',
   item.atMs,item.durationMs,'',item.outcome,item.httpStatus]));
  for(const item of events)lines.push(csvRow(['observation',item.arena,item.kind,
   item.index,item.atMs,'',item.delayMs,'','']));
  return lines.join('\n')+'\n';
 }
 function reset(){started=Date.now();requests=[];events=[];seen=new Set();updatePanel()}
 let output=null;
 function updatePanel(){
  if(!output||!output.parentNode?.open)return;
  const r=report();
  output.textContent='HTTP: '+r.totalRequests+' | Fehler: '+r.failedRequests+
   ' | Abbrüche: '+r.abortedRequests+' | '+r.durationSec+' s\n'+
   r.requestGroups.map(x=>x.arena+' / '+x.kind+': '+x.requests+' ('+
    x.requestsPerMinute+'/min), p95 '+x.p95Ms+' ms').join('\n')+'\n'+
   r.eventGroups.map(x=>x.kind+': '+x.observations+
    ' Beobachtungen, p95 '+x.p95DelayMs+' ms').join('\n');
 }
 function installPanel(){
  if(!document.body||document.getElementById('dog-netdiag'))return;
  const panel=document.createElement('details');panel.id='dog-netdiag';
  panel.style.cssText='position:fixed;right:6px;bottom:6px;z-index:2147483000;'+
   'max-width:min(94vw,380px);background:#122135;color:#fff;'+
   'font:12px/1.4 sans-serif;padding:8px;border:1px solid #759;'+
   'border-radius:8px;box-shadow:0 2px 12px #0008';
  const summary=document.createElement('summary');
  summary.textContent='📊 Netzwerk-Messung (lokal)';
  panel.append(summary);
  output=document.createElement('pre');
  output.style.cssText='white-space:pre-wrap;max-height:35vh;overflow:auto';
  panel.append(output);
  const exportButton=document.createElement('button');
  exportButton.type='button';exportButton.textContent='CSV herunterladen';
  exportButton.addEventListener('click',()=>{
   const blob=new Blob([csv()],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='100-tore-a02-netzwerk.csv';
   document.body.append(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const resetButton=document.createElement('button');
  resetButton.type='button';resetButton.textContent='Neue Messung';
  resetButton.addEventListener('click',reset);
  for(const b of [exportButton,resetButton]){
   b.style.cssText='margin:3px;padding:6px;border-radius:4px;cursor:pointer';
   panel.append(b);
  }
  panel.addEventListener('toggle',updatePanel);
  document.body.append(panel);
 }
 window.DogBossNetDiag=Object.freeze({begin,observe,report,csv,reset});
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',installPanel,{once:true});
 else installPanel();
})();
