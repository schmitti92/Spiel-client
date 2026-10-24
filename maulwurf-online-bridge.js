/* Maulwurf Arena: transport bridge for the original offline artwork.
 * Server is authoritative for hit timing and scores. Does not launch until lobby integration is complete.
 */
export function mountMaulwurfOriginal({container,getRoom,request,acceptRoom,onError}){
 if(!container||!getRoom||!request||!acceptRoom)throw Error('Maulwurf bridge: missing dependency');
 const iframe=document.createElement('iframe');
 iframe.title='Maulwurf Arena – Online';iframe.src='maulwurf-original-online.html?v=1';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block';
 iframe.setAttribute('sandbox','allow-scripts allow-same-origin');
 container.replaceChildren(iframe);
 let active=true,lastKey='',busy=false,timeoutPending=false;
 function sync(){
  if(!active||!iframe.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='maulwurf-arena'||!ch.maulwurf)return;
  const seat=room.players?.find(p=>p.me)?.seat;
  if(ch.phase==='countdown'&&room.serverNow>=ch.startAt+30000&&!timeoutPending){
   timeoutPending=true;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-maulwurf-timeout','POST',{challengeId:ch.id})
    .then(result=>{if(active&&getRoom()?.match?.challenge?.id===ch.id)acceptRoom(result.room);})
    .catch(err=>{onError?.(err);timeoutPending=false;});
  }
  const key=[ch.id,ch.index,ch.startAt,ch.phase,ch.maulwurf.hitCount,seat].join(':');
  if(lastKey===key)return;lastKey=key;
  iframe.contentWindow.postMessage({type:'maulwurf:state',challengeId:ch.id,phase:ch.phase,startAt:ch.startAt,serverNow:room.serverNow,events:ch.maulwurf.events,hitCount:ch.maulwurf.hitCount,mySeat:seat,players:(room.players||[]).filter(p=>p.participating).map(p=>({seat:p.seat,name:p.name}))},location.origin);
 }
 async function onMessage(event){
  if(!active||busy||event.origin!==location.origin||event.source!==iframe.contentWindow||event.data?.type!=='maulwurf:hit')return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='maulwurf-arena'||ch.id!==event.data.challengeId||ch.phase!=='countdown')return;
  const {tick,hole}=event.data;
  if(!Number.isInteger(tick)||!Number.isInteger(hole))return;
  busy=true;
  try{const result=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-maulwurf-hit','POST',{challengeId:ch.id,tick,hole});if(active&&getRoom()?.match?.challenge?.id===ch.id)acceptRoom(result.room);}
  catch(err){onError?.(err);lastKey='';sync();}
  finally{busy=false;}
 }
 iframe.addEventListener('load',()=>{lastKey='';sync()});
 window.addEventListener('message',onMessage);
 return {sync,destroy(){active=false;window.removeEventListener('message',onMessage);iframe.remove();}};
}
