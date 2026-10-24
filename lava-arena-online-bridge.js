export function mountLavaOriginal({container,getRoom,request,acceptRoom,onError}){
 const frame=document.createElement('iframe');
 frame.src='./minispiele/lava-arena-online-adapter-v28.html?v=2';
 frame.title='Lava Arena Online';frame.style.cssText='width:100%;height:100%;border:0;display:block';frame.setAttribute('allow','fullscreen');
 container.replaceChildren(frame);
 let alive=true,ready=false,configured=false,pending=false,lastSeq=0,lastSend=0,lastTimeout=false;
 function current(){const room=getRoom(),ch=room?.match?.challenge;return ch?.order?.[ch.index]==='lava-arena'?{room,ch}:null}
 function sync(){
  if(!alive||!ready)return;const c=current();if(!c)return;
  const {room,ch}=c;const seats=(room.match?.members||room.players.filter(p=>p.participating)).map(p=>p.seat);
  const mine=room.players.find(p=>p.me)?.seat;const localSeat=seats.indexOf(mine);
  if(localSeat<0)return;
  if(!configured){frame.contentWindow.postMessage({type:'lava-arena:configure',challengeId:ch.id,localSeat,seats},location.origin);return}
  if(ch.lava)frame.contentWindow.postMessage({type:'lava-arena:snapshot',challengeId:ch.id,players:ch.lava.players.map(p=>({...p,id:seats.indexOf(p.seat)})),tiles:ch.lava.tiles},location.origin);
  if(ch.phase==='countdown'&&Date.now()>ch.startAt+90000&&!lastTimeout){lastTimeout=true;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-lava-timeout','POST',{challengeId:ch.id}).then(r=>{if(r?.room)acceptRoom(r.room)}).catch(onError)}
 }
 async function onMessage(e){
  if(!alive||e.origin!==location.origin||e.source!==frame.contentWindow)return;
  const m=e.data,c=current();if(!c||m?.challengeId!==c.ch.id)return;
  if(m.type==='lava-arena:configured'){configured=true;sync();return}
  if(m.type!=='lava-arena:state'||pending||!Number.isSafeInteger(m.seq)||m.seq<=lastSeq||Date.now()-lastSend<90||c.ch.phase!=='countdown'||Date.now()<c.ch.startAt)return;
  const p=m.player;if(!p||![p.x,p.y,p.jump].every(Number.isFinite))return;
  pending=true;lastSend=Date.now();lastSeq=m.seq;
  try{const r=await request('/rooms/'+encodeURIComponent(c.room.code)+'/challenge-lava-state','POST',{challengeId:c.ch.id,seq:m.seq,x:p.x,y:p.y,jump:p.jump});if(r?.room)acceptRoom(r.room)}
  catch(error){onError(error)}finally{pending=false}
 }
 window.addEventListener('message',onMessage);
 frame.addEventListener('load',()=>{ready=true;configured=false;sync()});
 const timer=setInterval(sync,350);
 return {sync,destroy(){alive=false;clearInterval(timer);window.removeEventListener('message',onMessage);frame.remove()}};
}
