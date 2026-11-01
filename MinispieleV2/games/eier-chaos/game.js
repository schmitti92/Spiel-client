/** Eier-Chaos: pure, deterministic rules. No UI, timers, storage or network. */
export const id='eier-chaos';
export const DURATION_MS=60000;
export const EGG_VALUES=Object.freeze({normal:1,gold:5,rotten:-3,rainbow:10});
const TYPES=['normal','normal','normal','normal','gold','normal','rotten','normal','normal','rainbow'];
const SPEEDS=[2400,1750,1250];
const COUNTS=[12,18,24];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
/** Every participant gets the same immutable schedule, including positions and speeds. */
export function makeSchedule(){
 const events=[];
 let serial=0;
 for(let phase=0;phase<3;phase++){
  const count=COUNTS[phase];
  for(let i=0;i<count;i++){
   const spawnMs=phase*20000+Math.floor((i+.35)*19500/count);
   const type=TYPES[(i*7+phase*3)%TYPES.length];
   const x=.12+(((i*37+phase*23)%77)/100);
   events.push(Object.freeze({id:serial++,spawnMs,landMs:spawnMs+SPEEDS[phase],x,type,phase}));
  }
 }
 return Object.freeze(events);
}
export const SCHEDULE=makeSchedule();
export const MAX_SCORE=SCHEDULE.reduce((sum,e)=>sum+Math.max(0,EGG_VALUES[e.type]),0);
export const eierChaos={
 id,minPlayers:1,maxPlayers:4,scoreDirection:'higher',
 capabilities:['timed','simultaneous'],timeLimitMs:DURATION_MS,
 initialState(players){
  return {elapsedMs:0,finished:false,scores:Object.fromEntries(players.map(p=>[p.id,0])),
   caught:Object.fromEntries(players.map(p=>[p.id,[]])),
   baskets:Object.fromEntries(players.map(p=>[p.id,.5])),
   maxScore:MAX_SCORE};
 },
 applyAction(state,{playerId,action,players}){
  if(state.finished)throw Error('GAME_FINISHED');
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  if(!action||typeof action!=='object')throw Error('INVALID_ACTION');
  if(action.type==='move'){
   if(!Number.isFinite(action.x)||action.x<0||action.x>1)throw Error('INVALID_POSITION');
   return {...state,baskets:{...state.baskets,[playerId]:action.x}};
  }
  if(action.type==='catch'){
   const egg=SCHEDULE[action.eggId];
   if(!egg||state.caught[playerId].includes(egg.id))throw Error('INVALID_EGG');
   if(egg.landMs>state.elapsedMs||egg.landMs<state.elapsedMs-150)throw Error('EGG_NOT_LANDING');
   if(Math.abs(state.baskets[playerId]-egg.x)>.105)throw Error('BASKET_MISSED');
   return {...state,scores:{...state.scores,[playerId]:state.scores[playerId]+EGG_VALUES[egg.type]},
    caught:{...state.caught,[playerId]:[...state.caught[playerId],egg.id]}};
  }
  if(action.type==='advance'){
   if(!Number.isSafeInteger(action.elapsedMs)||action.elapsedMs<state.elapsedMs||action.elapsedMs>DURATION_MS)throw Error('INVALID_ELAPSED');
   return {...state,elapsedMs:action.elapsedMs,finished:action.elapsedMs===DURATION_MS};
  }
  throw Error('UNKNOWN_ACTION');
 },
 getResult(state){
  if(!state.finished)return null;
  return {resultVersion:2,finished:true,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))};
 },
 botAction(state,playerId,players){
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  const egg=SCHEDULE.find(e=>e.landMs>=state.elapsedMs&&e.landMs<state.elapsedMs+200&&EGG_VALUES[e.type]>0);
  return {type:'move',x:egg?egg.x:.5};
 }
};
export const initialState=eierChaos.initialState;
export const applyAction=eierChaos.applyAction;
export const getResult=eierChaos.getResult;
export const botAction=eierChaos.botAction;
