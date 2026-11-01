/** Eier-Chaos: deterministic 1–4 player rules, independent of UI, network and storage. */
export const id='eier-chaos';
export const DURATION_MS=60000;
export const EGG_VALUES=Object.freeze({normal:1,gold:5,rotten:-3,rainbow:10});
export const BASKET_SPEED=1.8; // normalized field widths per second
export const CATCH_RADIUS=.105;
const PHASE_COUNTS=[12,18,24];
const FALL_MS=[2400,1750,1250];
const TYPES=['normal','normal','gold','normal','rotten','normal','rainbow','normal','normal','normal'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function makeSchedule(){
 const eggs=[];let id=0;
 for(let phase=0;phase<3;phase++){
  const count=PHASE_COUNTS[phase];
  const window=20000-FALL_MS[phase]-600;
  for(let i=0;i<count;i++){
   const spawnMs=phase*20000+Math.round((i+.25)*window/count);
   eggs.push(Object.freeze({
    id:id++,phase,spawnMs,landMs:spawnMs+FALL_MS[phase],
    x:.12+((i*37+phase*23)%77)/100,
    type:TYPES[(i*7+phase*3)%TYPES.length]
   }));
  }
 }
 return Object.freeze(eggs);
}
export const SCHEDULE=makeSchedule();
export const MAX_SCORE=SCHEDULE.reduce((sum,e)=>sum+Math.max(0,EGG_VALUES[e.type]),0);
const scores=players=>Object.fromEntries(players.map(p=>[p.id,0]));
export const eierChaos={
 id,contractVersion:1,minPlayers:1,maxPlayers:4,scoreDirection:'higher',
 capabilities:['timed','simultaneous'],timeLimitMs:DURATION_MS,
 initialState(players){
  return {finished:false,maxScore:MAX_SCORE,scores:scores(players),
   participants:Object.fromEntries(players.map(p=>[p.id,{elapsedMs:0,x:.5,caught:[],done:false}]))};
 },
 applyAction(state,{playerId,action,players}){
  if(state.finished)throw Error('GAME_FINISHED');
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  if(!action||action.type!=='step'||!Number.isSafeInteger(action.elapsedMs)||
   !Number.isFinite(action.x)||action.x<0||action.x>1)throw Error('INVALID_STEP');
  const previous=state.participants[playerId];
  if(previous.done||action.elapsedMs<=previous.elapsedMs||action.elapsedMs>DURATION_MS)throw Error('INVALID_TIME');
  const dt=action.elapsedMs-previous.elapsedMs;
  const x=clamp(action.x,previous.x-BASKET_SPEED*dt/1000,previous.x+BASKET_SPEED*dt/1000);
  let score=state.scores[playerId];
  const caught=[...previous.caught];
  for(const egg of SCHEDULE){
   if(egg.landMs<=previous.elapsedMs||egg.landMs>action.elapsedMs)continue;
   const fraction=(egg.landMs-previous.elapsedMs)/dt;
   const atLanding=previous.x+(x-previous.x)*fraction;
   if(Math.abs(atLanding-egg.x)<=CATCH_RADIUS){
    score+=EGG_VALUES[egg.type];
    caught.push(egg.id);
   }
  }
  const participants={...state.participants,[playerId]:{elapsedMs:action.elapsedMs,x,caught,done:action.elapsedMs===DURATION_MS}};
  return {...state,participants,scores:{...state.scores,[playerId]:score},
   finished:players.every(p=>participants[p.id].done)};
 },
 getResult(state){
  if(!state.finished)return null;
  return {resultVersion:2,finished:true,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))};
 },
 botAction(state,playerId,players){
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  const p=state.participants[playerId];
  const elapsedMs=Math.min(DURATION_MS,p.elapsedMs+50);
  const upcoming=SCHEDULE.find(e=>e.landMs>p.elapsedMs&&EGG_VALUES[e.type]>0);
  return {type:'step',elapsedMs,x:upcoming?.x??.5};
 }
};
export const initialState=eierChaos.initialState;
export const applyAction=eierChaos.applyAction;
export const getResult=eierChaos.getResult;
export const botAction=eierChaos.botAction;
