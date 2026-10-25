/* Spielesammlung global update notifier · no automatic reload */
(()=>{'use strict';
const script=document.currentScript;
const current=script?.dataset?.build||'20261025-global-1';
const root=new URL(script?.src||location.href,location.href);
const endpoint=new URL('site-version.json',root);
let dismissed='',pending=false;
function show(version,notes){
 if(document.getElementById('spiel-global-update')||dismissed===version)return;
 const box=document.createElement('aside');box.id='spiel-global-update';
 box.setAttribute('role','status');box.setAttribute('aria-live','polite');
 Object.assign(box.style,{position:'fixed',zIndex:'2147483647',bottom:'max(16px, env(safe-area-inset-bottom))',left:'50%',transform:'translateX(-50%)',width:'min(570px,calc(100vw - 24px))',background:'linear-gradient(125deg,#102b49,#071a2d)',border:'2px solid #ffd275',boxShadow:'0 12px 45px #0009',borderRadius:'18px',padding:'16px',color:'#fff',font:'14px/1.45 system-ui,sans-serif',display:'flex',flexWrap:'wrap',alignItems:'center',gap:'10px'});
 const message=document.createElement('div');message.style.cssText='flex:1 1 230px;min-width:0';
 const title=document.createElement('strong');title.textContent='✨ Neue Version verfügbar!';title.style.cssText='display:block;font-size:17px;color:#ffdb8a;margin-bottom:4px';
 const detail=document.createElement('span');detail.textContent=notes||'Es gibt Verbesserungen. Aktualisiere die Seite, sobald du dein Spiel beendet hast.';
 message.append(title,detail);
 const update=document.createElement('button');update.type='button';update.textContent='↻ Jetzt aktualisieren';
 update.style.cssText='border:0;border-radius:12px;background:#ffcb61;color:#152940;font-weight:800;padding:12px 15px;cursor:pointer';
 update.addEventListener('click',()=>{const url=new URL(location.href);url.searchParams.set('_update',String(Date.now()));location.replace(url.href)});
 const later=document.createElement('button');later.type='button';later.textContent='Später';
 later.style.cssText='border:1px solid #7295b0;border-radius:12px;background:#173d5b;color:white;font-weight:700;padding:12px;cursor:pointer';
 later.addEventListener('click',()=>{dismissed=version;box.remove()});
 box.append(message,update,later);document.body.append(box);
}
async function check(){
 if(pending||document.visibilityState==='hidden'||!navigator.onLine)return;
 pending=true;
 try{
  const response=await fetch(endpoint.href+'?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)return;
  const data=await response.json();
  if(typeof data.version!=='string'||!/^[a-zA-Z0-9._-]{4,80}$/.test(data.version))return;
  if(data.version!==current)show(data.version,typeof data.notes==='string'?data.notes.slice(0,180):'');
 }catch(_){/* offline games continue */}finally{pending=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
setInterval(check,90000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
window.addEventListener('online',check);
})();
