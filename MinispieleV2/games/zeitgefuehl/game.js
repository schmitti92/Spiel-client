export const id='zeitgefuehl';
export function initialState(players,options={}){
 const target=Number.isFinite(options.targetSeconds)?options.targetSeconds:14;
 if(target<10||target>20)throw Error('INVALID_TARGET');
 return {targetSeconds:target,order:players.map(p=>p.id),submissions:{},finished:false};
}
export function applyAction(state,{playerId,action}){
 if(state.finished)throw Error('GAME_FINISHED');
 if(!state.order.includes(playerId))throw Error('UNKNOWN_PLAYER');
 if(Object.hasOwn(state.submissions,playerId))throw Error('ALREADY_SUBMITTED');
 if(action.type!=='submitTime'||!Number.isFinite(action.seconds)||action.seconds<0||action.seconds>120)throw Error('INVALID_TIME');
 state.submissions[playerId]=action.seconds;
 state.finished=state.order.every(id=>Object.hasOwn(state.submissions,id));
 return state;
}
export function getResult(state){
 if(!state.finished)return null;
 const ranking=state.order.map(id=>({id,seconds:state.submissions[id],difference:Math.abs(state.submissions[id]-state.targetSeconds)})).sort((a,b)=>a.difference-b.difference||state.order.indexOf(a.id)-state.order.indexOf(b.id));
 return {targetSeconds:state.targetSeconds,ranking:ranking.map((p,i)=>({...p,rank:i+1,points:[10,7,4,2][i]}))};
}
export function botAction(state,playerId){
 if(!state.order.includes(playerId))throw Error('UNKNOWN_PLAYER');
 const index=state.order.indexOf(playerId);
 return {type:'submitTime',seconds:Math.round((state.targetSeconds+(index%2===0?.18:-.21))*100)/100};
}
