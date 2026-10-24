/* Maulwurf Arena: transport bridge for the original offline artwork.
 * Server is authoritative for hit timing and scores. Does not launch until lobby integration is complete.
 */
export function mountMaulwurfOriginal({container,getRoom,request,acceptRoom,onError}){
 if(!container||!getRoom||!request||!acceptRoom)throw Error('Maulwurf bridge: missing dependency');
 const iframe=document.createElement('iframe');
 iframe.title='Maulwurf Arena – Online';iframe.src='maulwurf-original-online.html?v=2';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block';
 iframe.setAttribute('sandbox','allow-scripts allow-same-origin');
 container.replaceChildren(iframe);
 let active=true,lastKey='',timeoutPending=false,timeoutKey='',lastRevision=null,serverOffset=0,frameReady=false;
 const pendingHits=new Set();
 function estimatedServerNow(room){if(room?.revision!==lastRevision){lastRevision=room?.revision;serverOffset=(Number(room?.serverNow)||Date.now())-Date.now();}return Date.now()+serverOffset;}
 const expiryTimer=setInterval(()=>{if(!active)return;const r=getRoom(),ch=r?.match?.challenge;if(ch?.order?.[ch.index]!=='maulwurf-arena'||ch.phase!=='countdown')return;const now=estimatedServerNow(r);if(now>=ch.startAt+30000)sync();},300);
 function sync(){
  if(!active||!frameReady||!iframe.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='maulwurf-arena'||!ch.maulwurf)return;
  const seat=room.players?.find(p=>p.me)?.seat;
  const estimatedNow=estimatedServerNow(room);
  const roundKey=ch.id+':'+ch.index+':'+ch.startAt;
  if(roundKey!==timeoutKey){timeoutKey=roundKey;timeoutPending=false;}
  if(ch.phase==='countdown'&&estimatedNow>=ch.startAt+30000&&!timeoutPending){
   timeoutPending=true;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-maulwurf-timeout','POST',{challengeId:ch.id})
    .then(result=>{if(active&&getRoom()?.match?.challenge?.id===ch.id)acceptRoom(result.room);})
    .catch(err=>{onError?.(err);timeoutPending=false;});
  }
  const key=[ch.id,ch.index,ch.startAt,ch.phase,ch.maulwurf.hitCount,ch.maulwurf.score,JSON.stringify(ch.maulwurf.opponents||[]),seat].join(':');
  if(lastKey===key)return;lastKey=key;
  iframe.contentWindow.postMessage({type:'maulwurf:state',challengeId:ch.id,phase:ch.phase,startAt:ch.startAt,serverNow:room.serverNow,events:ch.maulwurf.events,hitCount:ch.maulwurf.hitCount,score:ch.maulwurf.score,hitTicks:ch.maulwurf.hitTicks,opponents:ch.maulwurf.opponents,mySeat:seat,players:(room.players||[]).filter(p=>p.participating).map(p=>({seat:p.seat,name:p.name}))},location.origin);
 }
 async function onMessage(event){
  if(!active||event.origin!==location.origin||event.source!==iframe.contentWindow||event.data?.type!=='maulwurf:hit')return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='maulwurf-arena'||ch.id!==event.data.challengeId||ch.phase!=='countdown')return;
  const {tick,hole}=event.data;
  if(!Number.isInteger(tick)||tick<0||tick>=30||!Number.isInteger(hole)||hole<0||hole>8)return;
  const hitKey=ch.id+':'+ch.index+':'+tick;
  if(pendingHits.has(hitKey))return;
  pendingHits.add(hitKey);
  try{const result=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-maulwurf-hit','POST',{challengeId:ch.id,tick,hole});if(active&&getRoom()?.match?.challenge?.id===ch.id)acceptRoom(result.room);}
  catch(err){onError?.(err);lastKey='';sync();}
  finally{pendingHits.delete(hitKey);}
 }
 iframe.addEventListener('load',()=>{frameReady=true;lastKey='';sync()});
 window.addEventListener('message',onMessage);
 return {sync,destroy(){active=false;clearInterval(expiryTimer);window.removeEventListener('message',onMessage);iframe.remove();}};
}
