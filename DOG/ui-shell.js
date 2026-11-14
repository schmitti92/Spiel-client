import {DOG_UI_FEATURES,dogFeatureById} from './ui-features.js?v=1';

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
if(online){
 if(tools)tools.hidden=true;
 if(newGame)newGame.hidden=true;
}
const extraGrid=$('dog-extra-buttons');
const extraDialog=$('dog-extra-dialog');
const extraTitle=$('dog-extra-title');
const extraDescription=$('dog-extra-description');
if(extraGrid){
 for(const feature of DOG_UI_FEATURES){
  const button=document.createElement('button');
  button.type='button';
  button.className='dog-extra-button';
  button.dataset.dogExtra=feature.id;
  button.setAttribute('aria-label',feature.id==='emojis'?'Emojis senden':feature.title+' – in Vorbereitung');
  const symbol=document.createElement('span');
  symbol.className='dog-extra-icon';
  symbol.setAttribute('aria-hidden','true');
  symbol.textContent=feature.icon;
  const text=document.createElement('span');
  text.textContent=feature.label;
  button.append(symbol,text);
  extraGrid.appendChild(button);
 }
 extraGrid.addEventListener('click',event=>{
  const button=event.target.closest('[data-dog-extra]');
  const feature=dogFeatureById(button?.dataset.dogExtra);
  if(!feature)return;
  if(feature.id==='emojis'){window.dispatchEvent(new Event('dog-emojis-open'));return;}
  if(!extraDialog||!extraTitle||!extraDescription)return;
  extraTitle.textContent=feature.icon+' '+feature.title;
  extraDescription.textContent=feature.description;
  if(!extraDialog.open)extraDialog.showModal();
 });
}
$('dog-extra-close')?.addEventListener('click',()=>extraDialog?.close());
const cards=$('hand');
const featureStatus=$('dog-ui-features-status');
if(featureStatus){
 featureStatus.textContent='Erweiterungsplätze · noch keine aktiven Extras';
}
// Make hidden/local-only test actions accessible only in the expandable
// devtool panel. Board zoom, gameplay buttons and network stay untouched.
cards?.setAttribute('aria-roledescription','Zoom- und verschiebbare Kartenleiste');
