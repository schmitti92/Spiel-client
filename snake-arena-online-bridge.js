export function mountSnakeOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/snake-arena-online-adapter-v29.html?v=4';
 frame.title='Snake Arena Online';
 frame.style.cssText='width:100%;height:100%;border:0;display:block';
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,pending=false,lastSeq=0,lastSend=0,lastTimeout=false,offset=0,queuedState=null;
 function current(){const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='snake-arena'?{room,ch}:null}
 function sync(){
  if(!alive||!ready)return;
  const c=current();if(!c)return;
  const {room,ch}=c,seats=(room.match?.members||room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me)?.seat,localSeat=seats.indexOf(mine);
  if(localSeat<0)return;
  if(!configured){frame.contentWindow.postMessage({type:'snake-arena:configure',challengeId:ch.id,localSeat,seats:seats.map(seat=>({name:room.players.find(p=>p.seat===seat)?.name||'Spieler'}))},location.origin);return;}
  if(ch.snake){const p=ch.snake.players?.find(p=>p.seat===mine);if(p&&Number.isSafeInteger(p.seq))lastSeq=Math.max(lastSeq,p.seq);
   frame.contentWindow.postMessage({type:'snake-arena:snapshot',challengeId:ch.id,phase:ch.phase,players:ch.snake.players},location.origin);}
  if(ch.phase==='countdown'&&Date.now()+offset>ch.startAt+180000&&!lastTimeout){
   lastTimeout=true;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-snake-timeout','POST',{challengeId:ch.id}).then(r=>{if(r?.room)acceptRoom(r.room)}).catch(e=>{lastTimeout=false;onError(e)});
  }
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='snake-arena:configured'){configured=true;sync();return;}
  if(m.type!=='snake-arena:state'||c.ch.phase!=='countdown'||Date.now()+offset<c.ch.startAt||!Number.isSafeInteger(m.seq)||m.seq<=lastSeq)return;
  if(pending||Date.now()-lastSend<180){if(m.player?.finished)queuedState=m;return;}
  const p=m.player;if(!p)return;
  pending=true;lastSend=Date.now();lastSeq=m.seq;
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-snake-state','POST',{challengeId:c.ch.id,seq:m.seq,...p});if(r?.room)acceptRoom(r.room)}
  catch(error){onError(error)}finally{pending=false;if(queuedState&&alive){const q=queuedState;queuedState=null;queueMicrotask(()=>onMessage({origin:location.origin,source:frame.contentWindow,data:q}));}}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;sync()});
 const timer=setInterval(()=>{const r=getRoom();if(Number.isFinite(r?.serverNow))offset=r.serverNow-Date.now();sync()},350);
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
