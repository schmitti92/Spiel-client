/* Einmalige grafische Hilfe für die 100 Tore.
 * Pro Spieler, Browser und Tab; ohne Server- oder Firestore-Anfragen.
 */
(()=>{
 'use strict';
 const guides={
  'dog-start.html':{id:'start',name:'Start – Rettet DOG',image:'./dog-forge-art/a_highly_detailed_cinematic_game_promo_overview_b.png'},
  'dog-expedition.html':{id:'kisten',name:'Kisten – Sammeln und Öffnen',image:'./dog-forge-art/spielanleitung_kisten%25C3%25BCbersicht.png'},
  'dog-forge.html':{id:'schmiede',name:'Die Schmiede – Helden und Rohstoffe verbessern',image:'./dog-forge-art/1000030258.png'}
 };
 const current=guides[(location.pathname.split('/').pop()||'').toLowerCase()];
 if(!current)return;
 let dialog=null,button=null,activeKey='',previousFocus=null;
 const make=(tag,cls,value)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(value!==undefined)el.textContent=value;return el;
 };
 const storageKey=state=>'rettet-dog-guide-v1:'+(state?.user?.uid||'guest')+':'+current.id;
 const force=new URLSearchParams(location.search).get('guide')==='1';
 function seen(key){
  if(force)return false;
  try{if(localStorage.getItem(key)==='1')return true;}catch{}
  try{if(sessionStorage.getItem(key)==='1')return true;}catch{}
  return false;
 }
 function build(){
  dialog=make('dialog','dog-guide-dialog');
  dialog.id='dog-guide-'+current.id;
  dialog.setAttribute('aria-labelledby','dog-guide-heading');
  dialog.addEventListener('cancel',e=>e.preventDefault());
  const content=make('div','dog-guide-content');
  const heading=make('h2','dog-guide-heading',current.name);heading.id='dog-guide-heading';
  const hint=make('p','dog-guide-hint','Lies dir die Spielanleitung durch und bestätige, um fortzufahren.');
  const image=make('img','dog-guide-image');
  image.src=current.image;image.alt='Grafische Spielanleitung: '+current.name;
  image.loading='eager';image.decoding='async';
  const error=make('p','dog-guide-error','Das Bild konnte nicht geladen werden. Du kannst trotzdem fortfahren.');
  error.hidden=true;image.addEventListener('error',()=>{image.hidden=true;error.hidden=false});
  button=make('button','dog-guide-accept','✓ Verstanden – Weiter');
  button.type='button';button.addEventListener('click',()=>{
   try{localStorage.setItem(activeKey,'1')}catch{
    try{sessionStorage.setItem(activeKey,'1')}catch{}
   }
   close();
  });
  content.append(heading,hint,image,error,button);dialog.append(content);document.body.append(dialog);
 }
 function close(){
  if(!dialog)return;
  if(dialog.open)dialog.close();
  dialog.classList.remove('dog-guide-fallback');
  document.body.classList.remove('dog-guide-open');
  if(previousFocus?.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus();
 }
 function show(key){
  if(!dialog)build();
  if(dialog.open&&activeKey===key)return;
  if(dialog.open||dialog.classList.contains('dog-guide-fallback'))close();
  activeKey=key;previousFocus=document.activeElement;
  document.body.classList.add('dog-guide-open');
  try{dialog.showModal()}catch{
   dialog.classList.add('dog-guide-fallback');
   dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  }
  button.focus({preventScroll:true});
 }
 function check(){
  const state=window.SpielOnline?.state?.()||null;
  if(state&&['initializing','loading'].includes(state.status))return;
  const key=storageKey(state);
  if(seen(key)){if(dialog?.open&&activeKey!==key)close();return;}
  show(key);
 }
 function init(){
  check();
  window.addEventListener('spielonline-change',check);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
