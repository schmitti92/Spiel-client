export function mountFlusssprungOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.title='Flusssprung – Online';frame.src='minispiele/flusssprung-online-adapter-v41.html?v=7';
 frame.style.cssText='width:100%;height:100%;border:0;display:block';
 frame.setAttribute('sandbox','allow-scripts allow-same-origin');
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,lastMove=0,timeoutPending=false,serverOffset=0,lastRevision=null;
 let lastKey='',lastError=0,resultSent=false,lastSnapshot='',lastSyncRevision=null,pendingJump=false;
 const timer=setInterval(()=>{if(alive)sync()},500);
 function sync(){
  if(!alive||!ready||!frame.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge,f=ch?.flusssprung;
  if(!f||ch.order?.[ch.index]!=='flusssprung')return;
  const seat=room.players?.find(p=>p.me)?.seat;
  const memberSeats=(room.match?.members||[]).map(p=>p.seat);const players=memberSeats.length?memberSeats.map(seat=>(room.players||[]).find(p=>p.seat===seat)).filter(Boolean):(room.players||[]).filter(p=>p.participating);
  const localSeat=players.findIndex(p=>p.seat===seat);
  if(localSeat<0)return;
  const key=ch.id+':'+ch.index;
  if(key!==lastKey){lastKey=key;configured=false;lastMove=0;timeoutPending=false;resultSent=false;lastSnapshot='';lastSyncRevision=null;pendingJump=false;}
  if(ch.phase!=='countdown'&&configured){
   if(!resultSent&&ch.results?.some(r=>r.game==='flusssprung'&&r.index===ch.index)){
    resultSent=true;
    const result=ch.results.find(r=>r.game==='flusssprung'&&r.index===ch.index);
    frame.contentWindow.postMessage({type:'flusssprung:result',standings:result.standings},location.origin);
   }
   return;
  }
  if(!configured){
   frame.contentWindow.postMessage({type:'flusssprung:configure',challengeId:key,path:f.path,localSeat,startAt:ch.startAt,serverNow:room.serverNow,seats:players.map(p=>({name:p.name}))},location.origin);
   return;
  }
  if(ch.phase!=='countdown')return;
  const moves=Array.isArray(f.moves)?f.moves:[];
  const total=Number.isInteger(f.moveCount)?f.moveCount:moves.length;
  const offset=Math.max(0,total-moves.length);
  if(lastMove<offset)lastMove=offset; // Older moves were compacted; the authoritative snapshot below restores their state.
  while(lastMove<total){
   const m=moves[lastMove++-offset];
   if(!m)continue;
   const idx=players.findIndex(p=>p.seat===m.seat);
   if(idx>=0&&idx!==localSeat&&Number.isInteger(m.row)&&Number.isInteger(m.col))frame.contentWindow.postMessage({type:'flusssprung:remote-jump',seat:idx,row:m.row,col:m.col},location.origin);
  }
  const snapshot=JSON.stringify((f.players||[]).map(p=>({index:players.findIndex(x=>x.seat===p.seat),row:p.row,falls:p.falls,finishedAt:p.finishedAt})));
  // Always re-send the authoritative snapshot: the iframe may have skipped an update while an actor was mid-jump.
  // 500 ms postMessage retries are local-only; this does not add network polling.
  {
   lastSnapshot=snapshot;lastSyncRevision=room.revision;
   frame.contentWindow.postMessage({type:'flusssprung:server-state',players:JSON.parse(snapshot),moves:moves.map(m=>({index:players.findIndex(p=>p.seat===m.seat),row:m.row,col:m.col}))},location.origin);
  }
  if(Number.isFinite(room.serverNow)&&room.serverNow!==lastRevision){lastRevision=room.serverNow;serverOffset=room.serverNow-Date.now();}
  const serverNow=Date.now()+serverOffset;
  if(ch.phase==='countdown'&&serverNow>=ch.startAt+60000&&!timeoutPending){
   timeoutPending=true;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-flusssprung-timeout','POST',{challengeId:ch.id})
    .then(r=>{if(alive&&r?.room)acceptRoom(r.room)})
    .catch(e=>{timeoutPending=false;if(Date.now()-lastError>12000){lastError=Date.now();onError?.(e)}});
  }
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  if(e.data?.type==='flusssprung:configured'){if(e.data.challengeId!==lastKey)return;configured=true;sync();return;}
  if(e.data?.type!=='flusssprung:jump')return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.phase!=='countdown'||ch.order?.[ch.index]!=='flusssprung'){frame.contentWindow?.postMessage({type:'flusssprung:jump-rejected'},location.origin);return;}
  const {row,col}=e.data;
  if(!Number.isInteger(row)||row<0||row>=5||!Number.isInteger(col)||col<0||col>=6){frame.contentWindow?.postMessage({type:'flusssprung:jump-rejected'},location.origin);return;}
  if(pendingJump){return;}
  pendingJump=true;
  try{
   const r=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-flusssprung-jump','POST',{challengeId:ch.id,row,col});
   if(!alive||getRoom()?.match?.challenge?.id!==ch.id||getRoom()?.match?.challenge?.index!==ch.index){return;}
   // The final valid jump can finish the round on the server immediately.
   // Accept that authoritative result before checking whether play is still active.
   if(r?.room)acceptRoom(r.room);
   frame.contentWindow?.postMessage({type:'flusssprung:jump-accepted',col},location.origin);
   sync();
  }catch(err){
   if(alive)frame.contentWindow?.postMessage({type:'flusssprung:jump-rejected'},location.origin);
   if(Date.now()-lastError>12000){lastError=Date.now();onError?.(err)}
  }finally{pendingJump=false}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;lastMove=0;lastSnapshot='';lastSyncRevision=null;resultSent=false;pendingJump=false;sync()});
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
