export function mountSnakeOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/snake-arena-online-adapter-v29.html?v=18&session='+Date.now();
 frame.title='Snake Arena Online';
 frame.style.cssText='width:100%;height:100%;border:0;display:block';
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,pending=false,lastSeq=0,lastSend=0,lastTimeout=false,offset=0,queuedState=null,activeChallengeId=null,lastTickRequest=0,tickPending=false,retryAfter=0;
 function current(){const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='snake-arena'?{room,ch}:null}
 function sync(){
  if(!alive||!ready)return;
  const c=current();if(!c)return;
  const {room,ch}=c;if(activeChallengeId!==ch.id){activeChallengeId=ch.id;configured=false;lastSeq=0;lastSend=0;lastTimeout=false;queuedState=null;lastTickRequest=0;tickPending=false;retryAfter=0;}const seats=(room.match?.members||room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me)?.seat,localSeat=seats.indexOf(mine);
  if(localSeat<0)return;
  if(!configured){const savedSeq=ch.snake?.players?.find(p=>p.seat===mine)?.seq||0;lastSeq=Math.max(lastSeq,savedSeq);frame.contentWindow.postMessage({type:'snake-arena:configure',challengeId:ch.id,startAt:ch.startAt,serverOffset:offset,initialSeq:savedSeq,localSeat,seats:seats.map(seat=>({name:room.players.find(p=>p.seat===seat)?.name||'Spieler'}))},location.origin);return;}
  if(ch.snake){const p=ch.snake.players?.find(p=>p.seat===mine);if(p&&Number.isSafeInteger(p.seq))lastSeq=Math.max(lastSeq,p.seq);
   frame.contentWindow.postMessage({type:'snake-arena:snapshot',challengeId:ch.id,phase:ch.phase,players:ch.snake.players,food:ch.snake.food},location.origin);}
  const serverTickAge=Date.now()+offset-(ch.snake?.lastTickAt||ch.startAt);const tickLeader=seats[0]===mine || serverTickAge>3000 && Math.floor((Date.now()+offset)/2500)%Math.max(1,seats.length)===localSeat;
  if(configured&&tickLeader&&ch.phase==='countdown'&&Date.now()+offset>=ch.startAt&&!tickPending&&Date.now()-lastTickRequest >=1200){
   tickPending=true;lastTickRequest=Date.now();const expectedId=ch.id;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-snake-timeout','POST',{challengeId:expectedId}).then(r=>{if(alive&&current()?.ch.id===expectedId&&r?.room)acceptRoom(r.room)}).catch(e=>{if(alive)onError(e)}).finally(()=>{tickPending=false});
  }
  if(configured&&tickLeader&&ch.phase==='countdown'&&Date.now()+offset>ch.startAt+180000&&!lastTimeout&&!tickPending){
   lastTimeout=true;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-snake-timeout','POST',{challengeId:ch.id}).then(r=>{if(alive&&current()?.ch.id===ch.id&&r?.room)acceptRoom(r.room)}).catch(e=>{lastTimeout=false;if(alive)onError(e)});
  }
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='snake-arena:configured'){configured=true;sync();return;}
  if(m.type!=='snake-arena:state'||c.ch.phase!=='countdown'||Date.now()+offset<c.ch.startAt||!Number.isSafeInteger(m.seq)||m.seq<=lastSeq)return;
  if(pending||Date.now()-lastSend<180||Date.now()<retryAfter){if(!queuedState||m.seq>=queuedState.seq)queuedState=m;if(!pending)setTimeout(()=>{if(!queuedState||!alive)return;const q=queuedState;queuedState=null;onMessage({origin:location.origin,source:frame.contentWindow,data:q});},Math.max(30,190-(Date.now()-lastSend),retryAfter-Date.now()));return;}
  const p=m.player;if(!p)return;
  pending=true;lastSend=Date.now();
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-snake-state','POST',{challengeId:c.ch.id,seq:m.seq,...p});if(r?.room&&alive&&current()?.ch.id===c.ch.id){lastSeq=Math.max(lastSeq,m.seq);acceptRoom(r.room)}}
  catch(error){if(alive){if(!queuedState||queuedState.seq<m.seq)queuedState=m;retryAfter=Date.now()+1200;onError(error)}}finally{pending=false;if(queuedState&&alive){const q=queuedState;queuedState=null;queueMicrotask(()=>onMessage({origin:location.origin,source:frame.contentWindow,data:q}));}}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;sync()});
 const timer=setInterval(()=>{const r=getRoom();if(Number.isFinite(r?.serverNow))offset=r.serverNow-Date.now();sync()},350);
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
