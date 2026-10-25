/* Original Zeitgefuehl – online iframe bridge. The server measures all stop timestamps. */
export function mountZeitgefuehlOriginal({container,getRoom,request,acceptRoom,onError}){
 const iframe=document.createElement('iframe');iframe.src='zeitgefuehl-original.html?v=4';iframe.title='Zeitgefühl Original – Online';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block';iframe.setAttribute('sandbox','allow-scripts allow-same-origin');
 container.replaceChildren(iframe);let active=true,lastKey='';
 function sync(){
  if(!active||!iframe.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='zeitgefuehl')return;
  const seat=room.players?.find(p=>p.me)?.seat,stopped=(ch.stopped||[]).includes(seat);
  const key=[ch.id,ch.index,ch.startAt,ch.targetSeconds,seat,(ch.stopped||[]).join(',')].join(':');
  if(lastKey===key)return;lastKey=key;
  iframe.contentWindow.postMessage({type:'zeitgefuehl:state',challengeId:ch.id,mySeat:seat,startAt:ch.startAt,serverNow:room.serverNow,targetSeconds:ch.targetSeconds,stopped,players:(room.players||[]).filter(p=>p.participating).map(p=>({seat:p.seat,name:p.name,stopped:(ch.stopped||[]).includes(p.seat)}))},location.origin);
 }
 let busy=false;
 async function onMessage(event){
  if(!active||event.source!==iframe.contentWindow||event.origin!==location.origin||event.data?.type!=='zeitgefuehl:stop'||busy)return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='zeitgefuehl'||ch.id!==event.data.challengeId||ch.phase!=='countdown')return;
  busy=true;
  try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-time-stop','POST',{challengeId:ch.id});acceptRoom(response.room);}
  catch(error){
   onError?.(error);
   iframe.contentWindow?.postMessage({type:'zeitgefuehl:stop-rejected',challengeId:ch.id},location.origin);
   lastKey='';sync();
  }
  finally{busy=false;}
 }
 iframe.addEventListener('load',()=>{lastKey='';sync()});window.addEventListener('message',onMessage);
 return {sync,destroy(){active=false;window.removeEventListener('message',onMessage);iframe.remove()}};
}
