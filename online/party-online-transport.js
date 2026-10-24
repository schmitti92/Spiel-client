/* Spielesammlung online · reusable authenticated room transport (V1).
 * Never assumes client authority for scores or game state.
 * Import from online adapters only; original offline games remain untouched.
 */
export class PartyOnlineTransport {
  constructor({server='https://serverfinal-ynbe.onrender.com',getToken,onRoom,onError}={}) {
    if(typeof getToken!=='function')throw new TypeError('getToken must be a function');
    this.base=server.replace(/\/$/,'')+'/api/hub';
    this.getToken=getToken;this.onRoom=onRoom||(()=>{});this.onError=onError||(()=>{});
    this.code=null;this.room=null;this.controller=null;this.sequence=-1;
  }
  async request(path,method='GET',body) {
    const token=await this.getToken();
    if(!token)throw new Error('LOGIN_REQUIRED');
    const response=await fetch(this.base+path,{method,headers:{authorization:'Bearer '+token,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(result.error||'HTTP_'+response.status),{status:response.status});
    return result;
  }
  async attach(code) {
    if(!/^[A-HJ-NP-Z2-9]{6}$/i.test(code))throw new Error('INVALID_ROOM_CODE');
    this.stop();this.code=code.toUpperCase();this.room=null;this.sequence=-1;return this.refresh();
  }
  async refresh() {
    if(!this.code)throw new Error('ROOM_NOT_ATTACHED');
    const code=this.code;
    const result=await this.request('/rooms/'+encodeURIComponent(code));
    if(code===this.code&&result.room)this.accept(result.room);
    return result;
  }
  accept(room) {
    if(!room||room.code!==this.code)return false;
    const version=room.revision==null?NaN:Number(room.revision);
    if(Number.isFinite(version)&&version<this.sequence)return false;
    if(Number.isFinite(version))this.sequence=version;
    this.room=room;this.onRoom(room);return true;
  }
  async action(endpoint,body={}) {
    if(!this.code)throw new Error('ROOM_NOT_ATTACHED');
    const code=this.code;
    const result=await this.request('/rooms/'+encodeURIComponent(code)+'/'+endpoint,'POST',body);
    if(code===this.code&&result.room)this.accept(result.room);
    return result;
  }
  watch(intervalMs=1500) {
    this.stop();
    const controller=new AbortController();this.controller=controller;
    const loop=async()=>{
      while(!controller.signal.aborted){
        try{if(typeof document==='undefined'||!document.hidden)await this.refresh();}
        catch(e){if(!controller.signal.aborted)this.onError(e);}
        await new Promise(resolve=>{const timer=setTimeout(resolve,intervalMs);controller.signal.addEventListener('abort',()=>{clearTimeout(timer);resolve();},{once:true});});
      }
    };
    void loop();return ()=>this.stop();
  }
  stop(){this.controller?.abort();this.controller=null;}
  destroy(){this.stop();this.room=null;this.code=null;this.sequence=0;}
}
