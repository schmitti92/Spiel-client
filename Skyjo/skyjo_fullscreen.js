(()=>{'use strict';
const button=document.getElementById('fullscreen-toggle');
if(!button)return;
const supported=typeof document.documentElement.requestFullscreen==='function'&&typeof document.exitFullscreen==='function';
const sync=()=>{
 const active=!!document.fullscreenElement;
 document.body.classList.toggle('skyjo-fullscreen',active);
 button.setAttribute('aria-pressed',String(active));
 button.setAttribute('aria-label',active?'Vollbild verlassen':'Vollbild aktivieren');
 button.textContent=active?'⤢ Vollbild verlassen':supported?'⛶ Vollbild':'Vollbild nicht verfügbar';
 button.disabled=!supported;
 button.title=supported?'Vollbild ein- oder ausschalten':'Vollbild wird von diesem Browser nicht unterstützt';
};
button.addEventListener('click',async()=>{
 if(!supported)return;
 button.disabled=true;
 try{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen({navigationUI:'hide'});
 }catch(error){
  const message=error?.name==='NotAllowedError'?'Vollbild vom Browser abgelehnt':'Vollbild konnte nicht aktiviert werden';
  button.title=message;
  const status=document.getElementById('guard');
  if(status&&status.textContent.includes('Host bestätigt'))status.textContent='✔ Host bestätigt · '+message;
 }finally{sync()}
});
document.addEventListener('fullscreenchange',sync);
document.addEventListener('fullscreenerror',sync);
sync();
})();