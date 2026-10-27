/* Extracted from SKYJO entry pages; execution order preserved. */
/* Shared hub is authoritative: skip SKYJO's obsolete second start confirmation. */
(function(){
 const q=new URLSearchParams(location.search);
 if(!/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(q.get('hub')||'')||!q.get('match')||!/^S[A-HJ-NP-Z2-9]{9}$/.test(q.get('room')||''))return;
 let started=false;
 const begin=()=>{
   if(started)return;
   const button=document.querySelector('button[onclick="Game.startOnlineGame()"]');
   if(!button||button.disabled)return;
   started=true;
   button.click();
 };
 const watcher=new MutationObserver(begin);
 const start=()=>{watcher.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});begin();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('pagehide',()=>watcher.disconnect(),{once:true});
})();
