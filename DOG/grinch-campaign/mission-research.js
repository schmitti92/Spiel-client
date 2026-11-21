/** Account-owned, server-verified Grinch mission research buttons. */
export function createGrinchResearch({online,getState,getBridge,getBusy,rerender,showMessage}){
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const currentUser=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.getIdToken?s.user:null;};
 let levels={},extra={},working=false,profileUid=null;
 async function load(){
  const u=currentUser();
  if(!online||!u){levels={};rerender();return}
  const uid=u.uid;profileUid=uid;
  try{
   const token=await u.getIdToken();
   const response=await fetch(base+'/api/hub/dog/research',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
   const result=await response.json();
   if(response.ok&&result?.ok&&currentUser()?.uid===uid){
    levels=result.research?.levels||{};
   }
  }catch(e){showMessage('🔬 Forschungen konnten nicht geladen werden.')}
  if(currentUser()?.uid===uid)rerender();
 }
 function update(room){extra=room?.match?.grinchResearch||{};}
 function remaining(id){return Math.max(0,(levels[id]||0)-(extra[id]||0));}
 function canThaw(id){
  if(!online||getBusy()||working||!remaining('thaw'))return false;
  const state=getState();
  return Boolean(state?.m2?.frozen?.[id]&&state.pieces?.some(p=>p.id===id&&p.place==='track'));
 }
 async function act(type,detail={}){
  const state=getState(),bridge=getBridge();
  if(!online||!state||!bridge||working||getBusy())return;
  working=true;
  try{
   const next=await bridge.action({type,...detail},state);
   if(next)showMessage(type==='research-thaw'?'🛡️ Die eingefrorene Figur wurde befreit!':
     type==='research-fog'?'🏮 Der Nebel ist für dich verschwunden!':'🧭 Dein Grinch-Kompass hat eine verdeckte Gefahr untersucht.');
  }catch(e){showMessage('⚠️ '+e.message);}
  finally{working=false;rerender()}
 }
 function render(){
  if(!online||!getState())return;
  const host=document.getElementById('actions');if(!host)return;
  const active=Object.entries(levels).some(([id,n])=>['thaw','fog_lantern','grinch_compass'].includes(id)&&n>0);
  if(!active)return;
  const panel=document.createElement('div');panel.className='grinch-research-panel';
  panel.style.cssText='margin:12px 0;padding:11px;border:1px solid #d3ae75;border-radius:13px;background:linear-gradient(115deg,#124a39,#052a23);color:#fff0ce;display:flex;flex-wrap:wrap;gap:8px;align-items:center';
  const header=document.createElement('strong');header.textContent='🔬 Deine Weihnachtsforschung';header.style.cssText='display:block;flex-basis:100%';panel.append(header);
  const make=(label,type,enabled)=>{const btn=document.createElement('button');btn.type='button';btn.textContent=label;btn.disabled=!enabled||working||getBusy();btn.style.cssText='border:1px solid #ffdaa0;border-radius:9px;background:#e5c78b;color:#163a2b;padding:8px 10px;font-weight:bold;cursor:pointer';btn.addEventListener('click',()=>void act(type));panel.append(btn)};
  if(levels.thaw){
   const n=Object.entries(getState().m2?.frozen||{}).filter(([id,v])=>v&&getState().pieces.some(p=>p.id===id&&p.place==='track')).length;
   const line=document.createElement('span');
   line.textContent='🛡️ Weihnachtsschutz: '+remaining('thaw')+' Befreiung(en) · '+n+' gefrorene Figur(en). '+(n?'Tippe eine eingefrorene Figur an.':'Keine eingefrorene Figur.');
   line.style.cssText='flex-basis:100%;font-size:.85rem';panel.append(line);
  }
  if(levels.fog_lantern&&getState().lastEvent?.type==='fog'&&!extra.fogCleared)
   make('🏮 Nebel vertreiben ('+remaining('fog_lantern')+')','research-fog',remaining('fog_lantern')>0);
  if(levels.grinch_compass)make('🧭 Grinch-Kompass ('+remaining('grinch_compass')+')','research-compass',remaining('grinch_compass')>0);
  if(Number.isInteger(extra.compass)){
   const msg=document.createElement('span');msg.textContent='🧭 Verdeckte Grinch-Falle: ca. '+extra.compass+' weitere gültige Landungen bis zur Gefahr (bei Rettungszwang auch früher).';msg.style.cssText='flex-basis:100%;font-size:.85rem';panel.append(msg);
  }
  host.append(panel);
  if(extra.fogCleared){document.querySelector('.foggy')?.classList.remove('foggy');}
 }
 function thaw(id){if(canThaw(id))void act('research-thaw',{pieceId:id});}
 if(online){window.addEventListener('spielonline-change',()=>{levels={};profileUid=null;void load()});void load();}
 return {load,update,render,canThaw,thaw};
}
