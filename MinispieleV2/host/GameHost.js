import {createSession} from '../engine/MiniGameEngine.js';
export async function mountGame({entry,players,container,onExit}){
 if(!entry||!container||!Array.isArray(players))throw Error('INVALID_HOST_OPTIONS');
 const [rules,view]=await Promise.all([import(entry.module),import(entry.module.replace(/game\.js$/,'view.js'))]);
 if(rules.id!==entry.id||typeof view.mount!=='function')throw Error('INVALID_GAME_MODULE');
 let session=createSession(rules,players);
 let disposed=false;
 const host={
  snapshot:()=>session.snapshot(),
  dispatch:(playerId,action)=>{if(disposed)throw Error('HOST_DISPOSED');const next=session.dispatch(playerId,action);render();return next;},
  botTurn:(playerId)=>{if(disposed)throw Error('HOST_DISPOSED');const next=session.botTurn(playerId);render();return next;},
  restart:()=>{if(disposed)throw Error('HOST_DISPOSED');session.restart();render();},
  exit:()=>{if(disposed)return;disposed=true;container.replaceChildren();onExit?.();}
 };
 container.replaceChildren();
 const ui=view.mount(container,host);
 if(!ui||typeof ui.render!=='function')throw Error('INVALID_GAME_VIEW');
 function render(){if(!disposed)ui.render(session.snapshot());}
 render();
 return host;
}
