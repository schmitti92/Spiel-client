/** Eier-Chaos: pure deterministic 60s catch game. No DOM, timers, network or storage. */
export const id='eier-chaos';
export const minPlayers=1,maxPlayers=4,capabilities=['timed','simultaneous'],timeLimitMs=60000,scoreDirection='higher';
const DURATION=60000;
const clamp=x=>Math.max(0,Math.min(1,x));
const STAGES=Object.freeze([{start:0,count:40,interval:460,fall:1600},{start:20000,count:70,interval:260,fall:1250},{start:40000,count:90,interval:205,fall:950}]);
export const EGG_COUNT=STAGES.reduce((sum,stage)=>sum+stage.count,0);
export function eggAt(index){
 if(!Number.isSafeInteger(index)||index<0)throw Error('INVALID_EGG_INDEX');
 if(index>=EGG_COUNT)throw Error('INVALID_EGG_INDEX');
 let offset=index,spawnMs,speed;
 for(const stage of STAGES){
  if(offset<stage.count){spawnMs=stage.start+offset*stage.interval;speed=stage.fall;break;}
  offset-=stage.count;
 }
 const lane=((index*37+11)%91+4)/100;
 const special=index%10===3; // 20 goldene Eier
 const rotten=index%10===7; // 20 faule Eier, keine Überschneidung
 return {index,spawnMs,landMs:spawnMs+speed,x:lane,special,rotten,points:special?3:rotten?-1:1};
}
export function initialState(players){
 return {elapsedMs:0,finished:false,scores:Object.fromEntries(players.map(p=>[p.id,0])),baskets:Object.fromEntries(players.map(p=>[p.id,.5])),caught:Object.fromEntries(players.map(p=>[p.id,[]]))};
}
export function applyAction(state,{playerId,action,players}){
 if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
 if(state.finished)throw Error('GAME_FINISHED');
 if(!action||typeof action!=='object')throw Error('INVALID_ACTION');
 if(action.type==='move'){
  if(!Number.isFinite(action.x)||action.x<0||action.x>1)throw Error('INVALID_POSITION');
  return {...state,baskets:{...state.baskets,[playerId]:clamp(action.x)}};
 }
 if(action.type!=='tick'||!Number.isSafeInteger(action.ms)||action.ms<1||action.ms>1000)throw Error('INVALID_TICK');
 // The host advances the shared clock using its first player only.
 if(playerId!==players[0].id)throw Error('CLOCK_OWNER_REQUIRED');
 const end=Math.min(DURATION,state.elapsedMs+action.ms);
 const scores={...state.scores},caught=Object.fromEntries(Object.entries(state.caught).map(([k,v])=>[k,[...v]]));
 for(let i=0;i<EGG_COUNT;i++){
  const egg=eggAt(i);
  if(egg.landMs<=state.elapsedMs||egg.landMs>end||egg.spawnMs>=DURATION)continue;
  for(const p of players){
   if(Math.abs(state.baskets[p.id]-egg.x)<=.115){scores[p.id]+=egg.points;caught[p.id].push(i);}
  }
 }
 return {...state,elapsedMs:end,scores,caught,finished:end===DURATION};
}
export function getResult(state){
 if(!state.finished)return null;
 return {finished:true,resultVersion:2,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))};
}
export function botAction(state,playerId){
 const active=Array.from({length:EGG_COUNT},(_,i)=>eggAt(i)).find(e=>e.landMs>state.elapsedMs&&e.spawnMs<=state.elapsedMs+1200);
 return {type:'move',x:active?.x??.5};
}
