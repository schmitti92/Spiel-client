import {DOG_UI_FEATURES,dogFeatureById} from './ui-features.js?v=2';
import {renderDogEventOverview} from './christmas-event-overview.js?v=1';
import {initDogVideoLibrary} from './video-library.js?v=2';

/** Cosmetic cockpit shell: never writes DOG game state or online messages. */
const $=id=>document.getElementById(id);
/* Compact floating menu – all original controls retain their IDs and handlers. */
const menuRoot=$('dog-floating-menu');
const menuToggle=$('dog-menu-toggle');
const menuPanel=$('dog-menu-panel');
function setMenuOpen(open){
  if(!menuToggle||!menuPanel)return;
  menuPanel.hidden=!open;
  menuToggle.setAttribute('aria-expanded',String(open));
  menuToggle.setAttribute('aria-label',open?'DOG-Menü schließen':'DOG-Menü öffnen');
}
menuToggle?.addEventListener('click',()=>setMenuOpen(menuPanel?.hidden));
menuPanel?.addEventListener('click',event=>{
  if(event.target.closest('button, a'))setMenuOpen(false);
});
document.addEventListener('pointerdown',event=>{
  if(menuPanel&&!menuPanel.hidden&&menuRoot&&!menuRoot.contains(event.target))setMenuOpen(false);
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menuPanel&&!menuPanel.hidden){
    setMenuOpen(false);
    menuToggle?.focus();
  }
});
$('dog-refresh-button')?.addEventListener('click',()=>location.reload());
initDogVideoLibrary();

const boardButton=$('board-choice-button');
boardButton?.addEventListener('click',()=>{
 const dialog=$('appearance-dialog');
 if(dialog&&!dialog.open)dialog.showModal();
 const select=$('appearance-board');
 select?.focus();
});
const tools=$('dog-local-tools');
const newGame=$('new-game');
const room=new URL(location.href).searchParams.get('room')||'';
const online=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(room);
const christmasUrl=new URL('./christmas-event.html',location.href);
christmasUrl.searchParams.set('return','index.html'+location.search);
const christmasMenuLink=$('dog-christmas-event-link');
if(christmasMenuLink)christmasMenuLink.href=christmasUrl.href;
if(online){
 if(tools)tools.hidden=true;
 if(newGame)newGame.hidden=true;
}
const extraGrid=$('dog-extra-buttons');
const extension=$('dog-extension-panel');
const extensionTitle=$('dog-extension-title');
const emojiBody=$('dog-emoji-panel-root');
const eventBody=$('dog-event-overview');
const placeholder=$('dog-extension-placeholder');
let activeExtension=null;
let lastEventSnapshot=window.DOGEventOverviewSnapshot||null;
window.addEventListener('dog-christmas-snapshot',event=>{
 lastEventSnapshot=event.detail||null;
 if(activeExtension==='events')renderDogEventOverview(eventBody,lastEventSnapshot?.christmas,lastEventSnapshot?.players);
});
// Only one extension can be open at a time. Never unmount the active game.
function setExtension(id){
 const feature=dogFeatureById(id);
 activeExtension=feature?.id===activeExtension?null:feature?.id||null;
 if(extension){
  extension.hidden=!activeExtension;
  extension.dataset.activeFeature=activeExtension||'';
 }
 if(extensionTitle)extensionTitle.textContent=activeExtension?(dogFeatureById(activeExtension).icon+' '+dogFeatureById(activeExtension).title):'';
 if(emojiBody)emojiBody.hidden=activeExtension!=='emojis';
 if(eventBody){
  eventBody.hidden=activeExtension!=='events';
  if(activeExtension==='events')renderDogEventOverview(eventBody,lastEventSnapshot?.christmas,lastEventSnapshot?.players);
 }
 if(placeholder){
  placeholder.hidden=!activeExtension||activeExtension==='emojis'||activeExtension==='events';
  placeholder.textContent=activeExtension&&!['emojis','events'].includes(activeExtension)?dogFeatureById(activeExtension).description:'';
 }
 extraGrid?.querySelectorAll('[data-dog-extra]').forEach(button=>{
  const isCurrent=button.dataset.dogExtra===activeExtension;
  button.setAttribute('aria-expanded',String(isCurrent));
  button.setAttribute('aria-pressed',String(isCurrent));
  button.classList.toggle('is-active',isCurrent);
 });
 window.dispatchEvent(new CustomEvent('dog-extension-change',{detail:{id:activeExtension}}));
 // On short tablet landscape screens, scroll the right column only,
 // leaving the large board in place.
 if(activeExtension&&extension&&extension.getBoundingClientRect().bottom>innerHeight-6){
  const sidebar=extension.closest('.dog-modules');
  if(sidebar&&getComputedStyle(sidebar).overflowY!=='visible'){
   const by=extension.getBoundingClientRect().bottom-sidebar.getBoundingClientRect().bottom+12;
   if(by>0)sidebar.scrollBy({top:by,behavior:'smooth'});
  }
 }
}
if(extraGrid){
 for(const feature of DOG_UI_FEATURES){
  const button=document.createElement('button');
  button.type='button';
  button.className='dog-extra-button';
  button.dataset.dogExtra=feature.id;
  button.setAttribute('aria-label',feature.id==='events'?'Aktuellen DOG-Eventfortschritt öffnen oder schließen':feature.id==='emojis'?'Emoji-Leiste öffnen oder schließen':feature.title+'-Bereich öffnen oder schließen');
  button.setAttribute('aria-controls','dog-extension-panel');
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-pressed','false');
  const symbol=document.createElement('span');
  symbol.className='dog-extra-icon';
  symbol.setAttribute('aria-hidden','true');
  symbol.textContent=feature.icon;
  const label=document.createElement('span');
  label.textContent=feature.label;
  button.append(symbol,label);
  extraGrid.appendChild(button);
 }
 extraGrid.addEventListener('click',event=>{
  const button=event.target.closest('[data-dog-extra]');
  if(!button)return;
   // Events show the current finders below this button; the full village
   // remains reachable from the three-line menu above.
   setExtension(button.dataset.dogExtra);
 });
}
$('dog-extension-close')?.addEventListener('click',()=>setExtension(null));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activeExtension)setExtension(null);});
$('dog-extra-close')?.addEventListener('click',()=>$('dog-extra-dialog')?.close());
const cards=$('hand');
const featureStatus=$('dog-ui-features-status');
if(featureStatus){
 featureStatus.textContent='Erweiterungsplätze · noch keine aktiven Extras';
}
// Make hidden/local-only test actions accessible only in the expandable
// devtool panel. Board zoom, gameplay buttons and network stay untouched.
cards?.setAttribute('aria-roledescription','Zoom- und verschiebbare Kartenleiste');
