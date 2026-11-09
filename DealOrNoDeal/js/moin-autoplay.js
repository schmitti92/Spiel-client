'use strict';
/* Optional local auto-open for the named participants moin and Vanessa.
   Never decides on banker deals or personal cases; no additional database reads.
   Settings are isolated so enabling one player never enables another player. */
(()=>{
 const storageKeys=new Map([
  ['moin','deal-moin-autoplay-open-v1'],
  ['vanessa','deal-vanessa-autoplay-open-v1']
 ]);
 let enabled=false,timer=null,scheduledKey='',lastAttemptKey='',stoppedForError=false;
 let activeStorageKey=null;
 const button=document.createElement('button');
 button.type='button';button.id='player-autoplay-toggle';button.className='studio-tool';
 button.setAttribute('aria-label','Automatisches Kofferöffnen ein- oder ausschalten');
 const mine=()=>typeof g!=='undefined'&&g?.players?.find(p=>p.id===myId());
 function cancel(){clearTimeout(timer);timer=null;scheduledKey=''}
 function syncPlayer(){
  const name=mine()?.name?.trim().toLocaleLowerCase('de-DE')||'';
  const nextKey=storageKeys.get(name)||null;
  if(nextKey!==activeStorageKey){
   cancel();
   activeStorageKey=nextKey;
   enabled=false;stoppedForError=false;lastAttemptKey='';
   if(nextKey){try{enabled=localStorage.getItem(nextKey)==='true'}catch{}}
  }
  return !!activeStorageKey;
 }
 const allowed=()=>syncPlayer();
 const update=()=>{
  const visible=allowed();button.hidden=!visible;
  button.textContent=enabled?'⏸ Autoplay AN':'▶ Autoplay AUS';
  button.title=enabled?'Automatisches Kofferöffnen ausschalten':'Automatisches Kofferöffnen einschalten';
  button.setAttribute('aria-pressed',String(enabled));
 };
 function schedule(){
  update();
  if(!enabled||!allowed()||document.hidden||busy||stoppedForError||!g||g.phase!=='open'||turn()!==myId()){cancel();return}
  const available=Array.from({length:g.caseCount||g.values?.length||26},(_,i)=>i).filter(i=>free(i));
  if(!available.length){cancel();return}
  const key=String(g.id)+':'+String(g.revision)+':'+String(myId());
  if(lastAttemptKey===key||scheduledKey===key)return;
  cancel();scheduledKey=key;
  timer=setTimeout(async()=>{
   timer=null;scheduledKey='';
   if(!enabled||!allowed()||document.hidden||busy||!g||g.phase!=='open'||turn()!==myId())return;
   if(String(g.id)+':'+String(g.revision)+':'+String(myId())!==key)return;
   const freeCases=Array.from({length:g.caseCount||g.values?.length||26},(_,i)=>i).filter(i=>free(i));
   if(!freeCases.length)return;
   lastAttemptKey=key;
   const selected=freeCases[Math.floor(Math.random()*freeCases.length)];
   await action('open',{case:selected});
   if(lastError){stoppedForError=true;enabled=false;try{if(activeStorageKey)localStorage.setItem(activeStorageKey,'false')}catch{};update()}
  },1400);
 }
 button.addEventListener('click',()=>{
  if(!allowed())return;
  enabled=!enabled;stoppedForError=false;
  try{if(activeStorageKey)localStorage.setItem(activeStorageKey,String(enabled))}catch{}
  if(!enabled)cancel();
  schedule();
 });
 const refreshButton=document.getElementById('studio-refresh');
 if(refreshButton?.parentElement)refreshButton.insertAdjacentElement('afterend',button);
 else (document.querySelector('.studio-header-controls')||document.body).append(button);
 update();
 window.addEventListener('deal-game-state-change',schedule);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else schedule()});
 // State updates may also happen through render() without a dispatched event.
 // A local timer does not access the server or database.
 setInterval(schedule,700);
})();
