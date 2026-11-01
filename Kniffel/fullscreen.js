(function(){
'use strict';
const button=document.getElementById('fullscreen');
const status=document.getElementById('fullscreen-hint');
if(!button||!status)return;
function active(){return Boolean(document.fullscreenElement||document.webkitFullscreenElement);}
function report(message){status.hidden=false;status.textContent=message;}
function sync(){const on=active();button.textContent=on?'⛶ Vollbild verlassen':'⛶ Vollbild';button.setAttribute('aria-pressed',String(on));if(on)status.hidden=true;}
button.addEventListener('click',function(){
 report('Vollbild-Schaltfläche erkannt – Anfrage läuft …');
 if(active()){
  const exit=document.exitFullscreen||document.webkitExitFullscreen;
  if(!exit){report('Der Browser bietet keine Funktion zum Beenden von Vollbild.');return;}
  try{Promise.resolve(exit.call(document)).then(sync).catch(e=>report('Beenden fehlgeschlagen: '+e.name));}catch(e){report('Beenden fehlgeschlagen: '+e.name);}
  return;
 }
 const element=document.documentElement;
 const enter=element.requestFullscreen||element.webkitRequestFullscreen;
 if(!enter){report('Fullscreen API nicht verfügbar. Samsung Internet: Menü → Zum Startbildschirm hinzufügen und von dort starten.');return;}
 try{
  Promise.resolve(enter.call(element)).then(function(){
   if(active())sync();else report('Browser meldet Erfolg, zeigt aber keinen Vollbildmodus. Browser-Einschränkung.');
  }).catch(function(e){report('Browser verweigert Vollbild: '+(e.name||'Unbekannt')+'. Nutze ggf. die Startbildschirm-App.');});
 }catch(e){report('Vollbildfehler: '+(e.name||'Unbekannt'));}
});
document.addEventListener('fullscreenchange',sync);
document.addEventListener('webkitfullscreenchange',sync);
})();
