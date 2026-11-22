/**
 * DOG player actions over the already authenticated Render hub WebSocket.
 * This module NEVER trusts a local board state as proof of a completed move.
 *
 * A lost WebSocket ACK is a transport error. Callers must retry the SAME
 * immutable actionId over the existing authenticated HTTP route, where
 * Render's Firestore CAS/transaction handles idempotency and payouts.
 *
 * No Firebase client SDK calls, timers for polling, or local persistence.
 */
export const DOG_SOCKET_ACTION_TIMEOUT_MS=12000;

export function createDogSocketActionDispatcher({timeoutMs=DOG_SOCKET_ACTION_TIMEOUT_MS,
 setTimer=setTimeout,clearTimer=clearTimeout}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>60000)
  throw new RangeError('DOG_SOCKET_ACTION_INVALID_TIMEOUT');
 const pending=new Map();
 function transportError(code){
  const err=new Error(code);
  err.dogSocketTransport=true;
  return err;
 }
 function rejectPending(actionId,reason){
  const current=pending.get(actionId);
  if(!current)return;
  pending.delete(actionId);clearTimer(current.timer);
  current.reject(transportError(reason));
 }
 function request(socket,payload){
  if(socket?.readyState!==1)return Promise.reject(transportError('DOG_SOCKET_OFFLINE'));
  const actionId=payload?.actionId;
  if(typeof actionId!=='string'||!/^[-a-zA-Z0-9_:]{8,90}$/.test(actionId))
   return Promise.reject(transportError('DOG_SOCKET_BAD_ACTION_ID'));
  if(pending.has(actionId))
   return Promise.reject(transportError('DOG_SOCKET_ACTION_DUPLICATE'));
  return new Promise((resolve,reject)=>{
   const timer=setTimer(()=>rejectPending(actionId,'DOG_SOCKET_ACTION_TIMEOUT'),timeoutMs);
   pending.set(actionId,{socket,timer,resolve,reject});
   try{socket.send(JSON.stringify({type:'dog_action',...payload}));}
   catch(_e){rejectPending(actionId,'DOG_SOCKET_SEND_FAILED');}
  });
 }
 function receive(message,socket){
  if(message?.type!=='dog_action_result'&&message?.type!=='dog_action_error')
   return false;
  const current=pending.get(message.actionId);
  if(!current||current.socket!==socket)return true;
  pending.delete(message.actionId);clearTimer(current.timer);
  if(message.type==='dog_action_result'){
   if(!message.room||typeof message.room!=='object'){
    current.reject(transportError('DOG_SOCKET_INVALID_RESULT'));
   }else current.resolve(message.room);
  }else{
   const status=Number(message.status);
   const reason=String(message.error||'DOG_ACTION_REJECTED');
   // Failure to recognize the authenticated subscription is equivalent to
   // a broken WebSocket: the verified HTTP fallback may still work.
   if(reason==='NOT_CONNECTED'||reason==='STREAM_UNAVAILABLE'){
    current.reject(transportError('DOG_SOCKET_NOT_CONNECTED'));
   }else{
    const err=new Error(reason);
    err.status=Number.isInteger(status)&&status>=400&&status<=599?status:409;
    current.reject(err);
   }
  }
  return true;
 }
 function disconnected(socket){
  for(const [actionId,item] of pending){
   if(item.socket===socket)rejectPending(actionId,'DOG_SOCKET_DISCONNECTED');
  }
 }
 function stats(){return {outstanding:pending.size};}
 return {request,receive,disconnected,stats};
}
