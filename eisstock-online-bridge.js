export function mountEisstockOriginal({container,getRoom,request,acceptRoom,onError}){
 const iframe=document.createElement('iframe');iframe.src='eisstock-original-online.html?v=1';iframe.title='Eisstock';iframe.style.cssText='width:100%;height:100%;border:0;display:block';iframe.setAttribute('sandbox','allow-scripts allow-same-origin');container.replaceChildren(iframe);
 let active=true,ready=false,busy=false,lastKey='';
 function sync(){if(!active||!ready)return;const room=getRoom(),ch=room?.match?.challenge,g=ch?.eisstock;if(ch?.order?.[ch.index]!=='eisstock'||!g)return;const seat=room.players?.find(p=>p.me)?.seat;
 const players=(room.match.members||[]).map(m=>({seat:m.seat,name:m.name,score:g.stones.filter(s=>s.owner===m.seat).reduce((a,s)=>a+score(s),0)}));
 const key=[ch.id,ch.phase,g.shots,seat].join(':');if(key===lastKey)return;lastKey=key;
 iframe.contentWindow?.postMessage({type:'eisstock:state',challengeId:ch.id,seat,phase:ch.phase,turn:g.turn,stones:g.stones,players,myTurn:ch.phase==='countdown'&&g.phase==='ready'&&room.match.members[g.turn]?.seat===seat},location.origin);
 }
 function score(s){const d=Math.hypot(s.x-220,s.y-157);return d<47?3:d<86?2:d<125?1:0}
 async function onMessage(e){if(!active||e.origin!==location.origin||e.source!==iframe.contentWindow)return;
 if(e.data?.type==='eisstock:ready'){ready=true;lastKey='';sync();return}
 if(e.data?.type!=='eisstock:shoot'||busy)return;
 const room=getRoom(),ch=room?.match?.challenge;if(!ch||ch.id!==e.data.challengeId||ch.order[ch.index]!=='eisstock')return;
 busy=true;try{const r=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-eisstock-shoot','POST',{challengeId:ch.id,vx:e.data.vx,vy:e.data.vy});acceptRoom(r.room)}catch(err){onError?.(err);iframe.contentWindow?.postMessage({type:'eisstock:rejected'},location.origin)}finally{busy=false;lastKey='';sync()}
 }
 window.addEventListener('message',onMessage);iframe.addEventListener('load',()=>{ready=true;lastKey='';sync()});
 return {sync,destroy(){active=false;window.removeEventListener('message',onMessage);iframe.remove()}};
}