/* 100 Tore: first-time authenticated visitors choose their permanent hero
 * before accessing the event. One authenticated map GET, no recurring poll. */
(()=>{'use strict';
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||
  'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 let checking=false,lastUid=null;
 const identity=()=>{
  const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&
   state.profile?.setupComplete!==false?state:null;
 };
 async function enforceFirstChoice(){
  const state=identity();
  if(!state||checking||lastUid===state.user.uid)return;
  checking=true;
  const uid=state.user.uid;
  try{
   const token=await state.user.getIdToken();
   if(identity()?.user?.uid!==uid)return;
   const controller=typeof AbortController==='function'?new AbortController():null;
   const timeout=controller?setTimeout(()=>controller.abort(),15000):null;
   let response;
   try{
    response=await fetch(API+'/api/dog/gates/map',{
     method:'GET',cache:'no-store',
     headers:{Authorization:'Bearer '+token},
     ...(controller?{signal:controller.signal}:{})
    });
   }finally{if(timeout!==null)clearTimeout(timeout)}
   if(!response.ok)return;
   const map=await response.json();
   if(map.ok!==true||identity()?.user?.uid!==uid)return;
   lastUid=uid;
   const locked=map.members?.find(m=>m.isMe)?.heroLocked===true;
   if(locked)return;
   if(map.isMember||map.canJoin){
    // URL parameters such as the room code are preserved for the map.
    location.replace('./dog-tor-map.html'+location.search);
   }
  }catch{
   // Network failure must never invent a choice or silently save one.
  }finally{checking=false}
 }
 window.addEventListener('spielonline-change',()=>void enforceFirstChoice());
 if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',()=>void enforceFirstChoice(),{once:true});
 else void enforceFirstChoice();
})();