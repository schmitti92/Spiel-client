export function mountLavaOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/lava-arena-online-adapter-v28.html?v=9';
 frame.title='Lava Arena Online';frame.style.cssText='width:100%;height:100%;border:0;display:block';frame.setAttribute('allow','fullscreen');
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,pending=false,lastSeq=0,lastSend=0,lastTimeout=false,seqOffset=null,challengeKey='',clockOffset=0;
 function current(){const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='lava-arena'?{room,ch}:null}
 function sync(){
  if(!alive||!ready)return;const c=current();if(!c)return;
  const {room,ch}=c;clockOffset=Number.isFinite(room.serverNow)?room.serverNow-Date.now():clockOffset;const nextKey=ch.id+':'+ch.index;if(nextKey!==challengeKey){challengeKey=nextKey;configured=false;pending=false;lastSeq=0;seqOffset=null;lastTimeout=false;}const seats=(room.match?.members||room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me)?.seat;const localSeat=seats.indexOf(mine);
  if(localSeat<0)return;
  if(!configured){frame.contentWindow.postMessage({type:'lava-arena:configure',challengeId:ch.id,localSeat,seats},location.origin);return}
  if(ch.lava&&Array.isArray(ch.lava.players)){const mineState=ch.lava.players.find(p=>p.seat===mine);if(mineState&&Number.isSafeInteger(mineState.seq)){lastSeq=Math.max(lastSeq,mineState.seq);if(seqOffset===null)seqOffset=mineState.seq;}frame.contentWindow.postMessage({type:'lava-arena:snapshot',challengeId:ch.id,players:ch.lava.players.map(p=>({...p,id:seats.indexOf(p.seat)})).filter(p=>p.id>=0),tiles:ch.lava.tiles,phase:ch.phase},location.origin);}
  if(ch.phase==='countdown'&&Date.now()+clockOffset>ch.startAt+90000&&!lastTimeout){lastTimeout=true;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-lava-timeout','POST',{challengeId:ch.id}).then(r=>{if(r?.room)acceptRoom(r.room)}).catch(error=>{lastTimeout=false;onError(error)})}
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='lava-arena:configured'){configured=true;sync();return}
  if(m.type!=='lava-arena:state'||pending||!Number.isSafeInteger(m.seq)||m.seq+(seqOffset||0)<=lastSeq||Date.now()-lastSend<90||c.ch.phase!=='countdown'||Date.now()+clockOffset<c.ch.startAt)return;
  const p=m.player;if(!p||![p.x,p.y,p.jump].every(Number.isFinite))return;
  pending=true;lastSend=Date.now();lastSeq=Math.max(lastSeq,m.seq+(seqOffset||0));
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-lava-state','POST',{challengeId:c.ch.id,seq:m.seq+(seqOffset||0),x:p.x,y:p.y,jump:p.jump});if(r?.room)acceptRoom(r.room)}
  catch(error){onError(error)}finally{pending=false}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;seqOffset=null;lastSeq=0;pending=false;sync()});
 const timer=setInterval(sync,350);
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
