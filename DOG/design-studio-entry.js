/* The studio is not initialized until Render verifies level >= 2. */
import {fetchDogPlayerLevel,dogLevelIdentity,DESIGNER_MIN_LEVEL} from './designer-level-access.js?v=3';
import {refreshVerifiedCosmetics} from './verified-cosmetics.js?v=1';
const $=id=>document.getElementById(id);
const state=()=>window.SpielOnline?.state?.()||{};
const message=$('studio-level-message');
const login=$('studio-level-login');
let generation=0,started=false;
try{
 const raw=new URLSearchParams(location.search).get('return');
 const target=raw?new URL(raw,location.href):null;
 if(target&&target.origin===location.origin&&!target.username&&!target.password&&
  ['hub-lobby.html','spielauswahl-lokal.html','index.html'].includes(target.pathname.split('/').pop()))
  $('back-link').href=target.href;
}catch{}
function lock(info,showLogin=false){
 document.body.dataset.designerAccess='locked';
 message.textContent=info;
 login.hidden=!showLogin;
}
async function check(force=false){
 const attempt=++generation;
 const profile=state();
 if(['initializing','loading'].includes(profile.status)){
  lock('Dein Spielerlevel wird überprüft …');return;
 }
 if(!dogLevelIdentity()){
  lock('🔒 Das Design-Studio wird mit Spielerlevel 2 freigeschaltet. Melde dich mit deinem Online-Profil an.',true);
  return;
 }
 message.textContent='🔐 Spielerlevel wird auf Render geprüft …';
 login.hidden=true;
 try{
  const level=await fetchDogPlayerLevel({force});
  if(attempt!==generation)return;
  if(level<DESIGNER_MIN_LEVEL){
   lock('🔒 Du bist aktuell Level '+level+'. Der Brettdesigner wird ab Level 2 freigeschaltet. Sammle weitere Erfahrungspunkte in DOG-Partien.');
   return;
  }
  // Collect the server-confirmed Rubbellos prizes before rendering any gallery.
  // If the check fails, the studio can open, but only standard items show.
  await refreshVerifiedCosmetics({force:true});
  if(attempt!==generation||dogLevelIdentity()?.uid!==profile.user?.uid)return;
  document.body.dataset.designerAccess='allowed';
  if(!started){
   started=true;
   try{await import('./design-studio.js?v=13');}
   catch(error){
    started=false;lock('⚠️ Das Design-Studio konnte nicht geladen werden. Bitte aktualisiere die Seite.');
    console.error('DOG Design-Studio',error);
   }
  }
 }catch(error){
  if(attempt!==generation)return;
  lock('⚠️ Dein Spielerlevel kann gerade nicht überprüft werden. Ohne bestätigtes Level 2 bleibt der Brettdesigner gesperrt.');
 }
}
login.addEventListener('click',()=>window.SpielOnline?.openLogin?.());
window.addEventListener('spielonline-change',()=>void check());
window.addEventListener('pageshow',()=>void check(true));
void check();
