/** Offline-only flow coordinator. UI renders snapshots; shared lobby owns rooms/navigation.
 * No game rules, network connections, storage or room creation live here.
 */
export function createMiniGameFlow(bridge, ledger) {
 if (!bridge || typeof bridge.prepare !== 'function') throw Error('INVALID_LOBBY_BRIDGE');
 if (!ledger || typeof ledger.accept !== 'function' || typeof ledger.snapshot !== 'function') throw Error('INVALID_RESULT_LEDGER');
 let stage='selection';
 let active=null;
 let last=null;
 const snapshot=()=>structuredClone({
  stage,
  identity:active?active.identity:null,
  session:active?active.snapshot():null,
  completion:last,
  standings:active?ledger.snapshot(active.identity.roomId):null
 });
 const capture=()=>{
  if(active.snapshot().phase!=='finished')return;
  const completed=active.completion();
  if(!completed)throw Error('MISSING_COMPLETION');
  ledger.accept(completed);
  last=completed;
  stage='result';
 };
 return Object.freeze({
  snapshot,
  select(command) {
   if(stage!=='selection')throw Error('FLOW_NOT_IN_SELECTION');
   const prepared=bridge.prepare(command);
   active=prepared;
   last=null;
   stage='ready';
   return snapshot();
  },
  start() {
   if(stage!=='ready')throw Error('FLOW_NOT_READY');
   active.start();
   stage='playing';
   capture();
   return snapshot();
  },
  dispatch(playerId,action,meta) {
   if(stage!=='playing')throw Error('FLOW_NOT_PLAYING');
   active.dispatch(playerId,action,meta);
   capture();
   return snapshot();
  },
  botTurn(playerId) {
   if(stage!=='playing')throw Error('FLOW_NOT_PLAYING');
   active.botTurn(playerId);
   capture();
   return snapshot();
  },
  replay() {
   if(stage!=='result')throw Error('FLOW_NOT_IN_RESULT');
   active.restart();
   last=null;
   stage='ready';
   return snapshot();
  },
  returnToSelection() {
   if(stage!=='result' && stage!=='ready')throw Error('FLOW_CANNOT_RETURN');
   active=null;
   last=null;
   stage='selection';
   return snapshot();
  }
 });
}
