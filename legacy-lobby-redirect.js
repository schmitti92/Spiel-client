/* Compatibility entry: old game-selection URLs now lead to one main lobby.
 * No room creation, Firestore reads, or game actions occur during this redirect.
 */
(function(){
 'use strict';
 const script=document.currentScript;
 const from=new URL(location.href);
 const dest=new URL('hub-lobby.html',from);
 const q=from.searchParams;
 // The former index page remains available only as an optional updates/catalog
 // page. All normal entry points go to the actual shared main lobby.
 if(script?.dataset?.mode==='auto'&&q.get('catalog')==='1')return;
 // Only known navigation context goes forward; never carry arbitrary destinations.
 const room=q.get('room');
 if(room&&/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/i.test(room))
   dest.searchParams.set('room',room.toUpperCase());
 const invite=q.get('invite');
 if(invite&&/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/i.test(invite))
   dest.searchParams.set('invite',invite.toUpperCase());
 const stay=q.get('stayMatch');
 if(stay&&/^[A-Za-z0-9_-]{1,100}$/.test(stay))dest.searchParams.set('stayMatch',stay);
 if(q.get('choose')==='1')dest.searchParams.set('choose','1');
 // Stage is represented by the same main hub, never a different lobby.
 let savedMode='online';
 try{if(typeof sessionStorage!=='undefined'&&sessionStorage.getItem('spielportal:hub-view')==='local')savedMode='local';}catch(_e){}
 const mode=script?.dataset?.mode==='local'||(script?.dataset?.mode==='auto'&&(q.get('view')==='local'||(!q.has('view')&&savedMode==='local')))?'local':'online';
 dest.searchParams.set('view',mode);
 if(from.pathname!==dest.pathname){
  document.documentElement.style.visibility='hidden';
  location.replace(dest.href);
 }
})();
