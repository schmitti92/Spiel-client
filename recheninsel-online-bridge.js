/* Original-Recheninsel adapter. Mount only after the original HTML is hosted at the same origin.
 * The server remains authoritative for answers, time, points and game transitions.
 */
export function mountRecheninselOriginal({container,src,getRoom,request,acceptRoom,onError}){
 if(!container||!src||!getRoom||!request||!acceptRoom)throw Error('Recheninsel bridge: missing dependency');
 const iframe=document.createElement('iframe');
 iframe.title='Recheninsel – Originalspiel';
 iframe.src=src;
 iframe.allow='fullscreen';
 iframe.style.cssText='width:100%;height:100%;border:0;display:block';
 iframe.setAttribute('sandbox','allow-scripts allow-same-origin');
 container.replaceChildren(iframe);
 let active=true,latestKey='',answerBusy=false;
 function sync(){
  if(!active||!iframe.contentWindow)return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='recheninsel'||!ch.math)return;
  const math=ch.math;
  const mySeat=room.players?.find(p=>p.me)?.seat;
  const a=Number(math.a),b=Number(math.b),op=math.operator;
  const correct=op==='+'?a+b:op==='−'||op==='-'?a-b:op==='×'?a*b:op==='÷'?a/b:NaN;
  const candidates=new Set([correct]);
  const step=correct<30?1:correct<100?2:5;
  for(let i=1;candidates.size<15&&i<200;i++){const delta=Math.ceil(i/2)*(i%2?-1:1)*step;if(correct+delta>=0&&correct+delta<=1000)candidates.add(correct+delta);}
  const options=[...candidates].sort((x,y)=>{const hash=n=>(Math.imul(n+17,2654435761)^Math.imul(a+31,2246822519)^Math.imul(b+29,3266489917)^Math.imul(math.round,668265263))>>>0;return hash(x)-hash(y);});
  const key=ch.id+':'+ch.index+':'+math.round+':'+(math.answered||[]).join(',');
  if(latestKey===key)return;latestKey=key;
  iframe.contentWindow.postMessage({type:'recheninsel:state',challengeId:ch.id,round:math.round,mySeat,a,b,operator:op,options,answered:math.answered||[],phase:ch.phase,startAt:ch.startAt,serverNow:room.serverNow,players:(room.players||[]).filter(p=>p.participating).map(p=>({seat:p.seat,name:p.name}))},location.origin);
 }
 async function onMessage(event){
  if(!active||answerBusy||event.origin!==location.origin||event.source!==iframe.contentWindow||event.data?.type!=='recheninsel:answer')return;
  const room=getRoom(),ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='recheninsel'||ch.phase!=='countdown'||ch.id!==event.data.challengeId||ch.math?.round!==event.data.round)return;
  const answer=event.data.answer;
  if(!Number.isInteger(answer)||answer<0||answer>1000)return;
  answerBusy=true;
  try{const result=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-math-answer','POST',{challengeId:ch.id,answer});acceptRoom(result.room);}
  catch(err){if(onError)onError(err);latestKey='';sync();}
  finally{answerBusy=false;}
 }
 iframe.addEventListener('load',()=>{latestKey='';sync();});
 window.addEventListener('message',onMessage);
 return {sync,destroy(){active=false;window.removeEventListener('message',onMessage);iframe.remove();}};
}
