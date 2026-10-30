export function mountFallingOriginal({container,getRoom,request,acceptRoom,onError}){
 const iframe=document.createElement('iframe');iframe.title='Fallende Gegenstände Online';iframe.src='fallende-original-online.html?v=1';iframe.style.cssText='width:100%;height:100%;border:0;display:block';iframe.setAttribute('sandbox','allow-scripts allow-same-origin');container.replaceChildren(iframe);
 let active=true,busy=false,key='',tickKey='',ready=false;
 const send=m=>{if(ready&&iframe.contentWindow)iframe.contentWindow.postMessage(m,location.origin)};
 function sync(){
  if(!active)return;const room=getRoom(),ch=room?.match?.challenge,f=ch?.falling;
  if(ch?.order?.[ch.index]!=='fallende-gegenstaende'||!f)return;
  const seat=room.players?.find(p=>p.me)?.seat,now=Number(room.serverNow)||Date.now();
  const k=[ch.id,ch.index,f.round,f.startAt,JSON.stringify(f.stops),ch.phase].join(':');
  if(k!==key){key=k;send({type:'falling:state',challengeId:ch.id,round:f.round,startAt:f.startAt,duration:[4000,3400,3800,3100,3600][f.round-1],serverNow:now,seat,players:(room.match.members||[]).map(m=>({seat:m.seat,name:m.name,stopped:!!Object.hasOwn(f.stops,m.uid),cm:f.stops[m.uid]??null,total:f.totals[m.uid]??0})),phase:ch.phase,results:ch.results});}
  if(ch.phase==='countdown'&&now>=f.startAt+[4000,3400,3800,3100,3600][f.round-1]+700){
   const t=ch.id+':'+f.round;if(t!==tickKey){tickKey=t;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-falling-tick','POST',{challengeId:ch.id}).then(r=>{if(active)acceptRoom(r.room)}).catch(e=>{tickKey='';onError?.(e)})}
  }
 }
 async function onMessage(event){
  if(!active||event.origin!==location.origin||event.source!==iframe.contentWindow)return;
  if(event.data?.type==='falling:ready'){ready=true;key='';sync();return}
  if(event.data?.type!=='falling:stop'||busy)return;
  const room=getRoom(),ch=room?.match?.challenge;if(!ch||ch.id!==event.data.challengeId||ch.order[ch.index]!=='fallende-gegenstaende')return;
  busy=true;try{const result=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-falling-stop','POST',{challengeId:ch.id});acceptRoom(result.room)}
  catch(e){onError?.(e);send({type:'falling:rejected'});key='';sync()}finally{busy=false}
 }
 window.addEventListener('message',onMessage);iframe.addEventListener('load',()=>{ready=true;key='';sync()});
 const interval=setInterval(sync,600);
 return {sync,destroy(){active=false;clearInterval(interval);window.removeEventListener('message',onMessage);iframe.remove()}};
}