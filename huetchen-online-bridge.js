/* Original Huetchen Premium iframe bridge. Activate only when original HTML is deployed. */
export function mountHuetchenOriginal({container,getRoom,request,acceptRoom,onError}){
 const iframe=document.createElement('iframe');iframe.title='Hütchen Challenge Original';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block';iframe.setAttribute('sandbox','allow-scripts allow-same-origin');container.replaceChildren(iframe);
 let active=true,lastKey='',busy=false,timeoutKey='',ready=false;
 iframe.src='huetchen-original-online.html?v=5';

 function sync(){
  if(!active||!ready||!iframe.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge,h=ch?.huetchen;
  if(ch?.order?.[ch.index]!=='huetchen-challenge'||!h)return;
  const seat=room.players?.find(p=>p.me)?.seat;
  const key=[ch.id,ch.index,h.round,ch.startAt,seat,(h.answered||[]).join(',')].join(':');
  const deadline=Number(ch.startAt)+[7160,7390,7140][h.round-1]+12000;
  if(ch.phase==='countdown'&&Number(room.serverNow)>=deadline){
   const token=ch.id+':'+ch.index+':'+h.round;
   if(timeoutKey!==token){timeoutKey=token;
    request('/rooms/'+encodeURIComponent(room.code)+'/challenge-huetchen-timeout','POST',{challengeId:ch.id,round:h.round})
     .then(response=>{if(active)acceptRoom(response.room)})
     .catch(error=>{timeoutKey='';onError?.(error)});
   }
  }
  if(key===lastKey)return;lastKey=key;
  iframe.contentWindow.postMessage({type:'huetchen:state',challengeId:ch.id,round:h.round,secret:h.secret,swaps:h.swaps,submitted:h.answered?.includes(seat)||false,startAt:ch.startAt,serverNow:room.serverNow,players:(room.players||[]).filter(p=>p.participating).map(p=>({seat:p.seat,name:p.name}))},location.origin);
 }
 async function onMessage(event){
  if(!active||event.source!==iframe.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type==='huetchen:ready'){lastKey='';sync();return;}
  if(busy||event.data?.type!=='huetchen:answer')return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(ch?.order?.[ch.index]!=='huetchen-challenge'||ch.phase!=='countdown'||ch.id!==event.data.challengeId||ch.huetchen?.round!==event.data.round)return;
  const slot=event.data.slot;if(!Number.isInteger(slot)||slot<0||slot>=ch.huetchen.round+2)return;
  busy=true;try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-huetchen-answer','POST',{challengeId:ch.id,round:event.data.round,slot});acceptRoom(response.room);}
  catch(error){onError?.(error);lastKey='';sync()}finally{busy=false}
 }
 iframe.addEventListener('load',()=>{ready=true;lastKey='';sync()});window.addEventListener('message',onMessage);
 return {sync,destroy(){active=false;window.removeEventListener('message',onMessage);iframe.remove()}};
}
