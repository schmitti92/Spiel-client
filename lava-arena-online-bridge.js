export function mountLavaOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/lava-arena-online-adapter-v28.html?v=24';
 frame.title='Lava Arena Online';frame.style.cssText='width:100%;height:100%;border:0;display:block';frame.setAttribute('allow','fullscreen');
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,pending=false,lastSeq=0,lastSend=0,lastTimeout=false,seqOffset=null,challengeKey='',clockOffset=0,requestEpoch=0,configuredSeat=-1,configuredSeatsKey='',lastServerNow=null,lastTick=0,tickPending=false;
 function current(){const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='lava-arena'?{room,ch}:null}
 function sync(){
  if(!alive||!ready)return;const c=current();if(!c)return;
  const {room,ch}=c;if(Number.isFinite(room.serverNow)&&room.serverNow!==lastServerNow){lastServerNow=room.serverNow;clockOffset=room.serverNow-Date.now();}const nextKey=ch.id+':'+ch.index;if(nextKey!==challengeKey){challengeKey=nextKey;requestEpoch++;configured=false;pending=false;tickPending=false;lastTick=0;lastSeq=0;seqOffset=null;lastTimeout=false;}const seats=(room.match?.members||room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me)?.seat;const localSeat=seats.indexOf(mine);
  if(localSeat<0)return;
  const seatsKey=seats.join(',');
  if(configuredSeat!==localSeat||configuredSeatsKey!==seatsKey){configuredSeat=localSeat;configuredSeatsKey=seatsKey;configured=false;}
  if(!configured){frame.contentWindow.postMessage({type:'lava-arena:configure',challengeId:ch.id,localSeat,seats,botSeats:room.players.filter(p=>p.testBot).map(p=>p.seat),startAt:ch.startAt,serverOffset:clockOffset},location.origin);return}
  if(ch.lava&&Array.isArray(ch.lava.players)){const mineState=ch.lava.players.find(p=>p.seat===mine);if(mineState&&Number.isSafeInteger(mineState.seq)){lastSeq=Math.max(lastSeq,mineState.seq);if(seqOffset===null)seqOffset=mineState.seq;}frame.contentWindow.postMessage({type:'lava-arena:snapshot',challengeId:ch.id,players:ch.lava.players.map(p=>({...p,id:seats.indexOf(p.seat),testBot:p.testBot===true||room.players.some(member=>member.seat===p.seat&&member.testBot===true)})).filter(p=>p.id>=0),tiles:ch.lava.tiles,phase:ch.phase,startAt:ch.startAt,serverOffset:clockOffset},location.origin);}
  // Keep the authoritative arena alive even when no device sends movement packets.
  if(ch.phase==='countdown'&&Number.isFinite(ch.startAt)&&Date.now()+clockOffset>=ch.startAt&&!tickPending&&Date.now()-lastTick>=750){
   const tickEpoch=requestEpoch;lastTick=Date.now();tickPending=true;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-lava-tick','POST',{challengeId:ch.id})
    .then(r=>{if(alive&&tickEpoch===requestEpoch&&r?.room)acceptRoom(r.room)})
    .catch(error=>{if(alive&&tickEpoch===requestEpoch)onError(error)})
    .finally(()=>{if(tickEpoch===requestEpoch)tickPending=false});
  }
  if(ch.phase==='countdown'&&Number.isFinite(ch.startAt)&&Date.now()+clockOffset>ch.startAt+90000&&!lastTimeout){const timeoutEpoch=requestEpoch;lastTimeout=true;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-lava-timeout','POST',{challengeId:ch.id}).then(r=>{if(alive&&timeoutEpoch===requestEpoch&&r?.room)acceptRoom(r.room)}).catch(error=>{if(alive&&timeoutEpoch===requestEpoch){lastTimeout=false;onError(error)}})}
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='lava-arena:configured'){configured=true;sync();return}
  if(m.type!=='lava-arena:state'||pending||!Number.isSafeInteger(m.seq)||m.seq+(seqOffset||0)<=lastSeq||Date.now()-lastSend<90||c.ch.phase!=='countdown'||Date.now()+clockOffset<c.ch.startAt)return;
  const p=m.player;if(!p||![p.x,p.y,p.jump].every(Number.isFinite)||p.x<0||p.x>600||p.y<0||p.y>600||p.jump<0||p.jump>1.3)return;
  const epoch=requestEpoch, sentSeq=m.seq+(seqOffset||0);pending=true;lastSend=Date.now();lastSeq=Math.max(lastSeq,sentSeq);
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-lava-state','POST',{challengeId:c.ch.id,seq:sentSeq,x:p.x,y:p.y,jump:p.jump});if(alive&&epoch===requestEpoch&&r?.room)acceptRoom(r.room)}
  catch(error){if(alive&&epoch===requestEpoch){lastSeq=Math.min(lastSeq,sentSeq-1);onError(error)}}finally{if(epoch===requestEpoch)pending=false}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;requestEpoch++;configured=false;seqOffset=null;lastSeq=0;pending=false;sync()});
 const timer=setInterval(sync,350);
 return {sync,destroy(){alive=false;requestEpoch++;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
