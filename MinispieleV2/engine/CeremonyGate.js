/** Shared, pure gate for revealing a multiplayer ceremony.
 * The authoritative host owns match membership, result submission and transport.
 * Never reveal scores until one valid result per expected participant exists.
 */
export function ceremonyReadiness(participants,results){
 if(!Array.isArray(participants)||participants.length<1||participants.length>4)throw Error('PLAYER_COUNT_1_TO_4');
 const ids=participants.map(p=>typeof p==='string'?p:p?.id);
 if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('INVALID_CEREMONY_PLAYERS');
 if(!Array.isArray(results))results=[];
 const received=new Set();
 for(const result of results){
  const id=result?.playerId;
  if(typeof id==='string'&&ids.includes(id)&&Number.isFinite(result.score))received.add(id);
 }
 return Object.freeze({ready:received.size===ids.length,received:received.size,expected:ids.length,missing:Object.freeze(ids.filter(id=>!received.has(id)))});
}
export function ceremonySeatReadiness(playerCount,results){
 if(!Number.isInteger(playerCount)||playerCount<1||playerCount>4)throw Error('PLAYER_COUNT_1_TO_4');
 const seats=Array.isArray(results)?results.map(r=>r?.seat):[];
 const base=seats.length>0&&seats.every(seat=>Number.isInteger(seat)&&seat>=1&&seat<=playerCount)?1:0;
 return ceremonyReadiness(Array.from({length:playerCount},(_,i)=>String(i+base)),Array.isArray(results)?results.map(r=>({...r,playerId:String(r?.seat)})):[]);
}
