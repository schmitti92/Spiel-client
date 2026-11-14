import {BOARD_STYLES,loadAppearance,saveAppearance} from './appearance-registry.js?v=14';

const ORDER=['studio','schiefer','pergament','holz','bergsee','goldwellen','royalMarmor','maerchental','alpenland','kuestenabenteuer','royalKarten','zauberwald'];
const FALLBACK='linear-gradient(140deg,#243e52,#081524)';
const resolveBoardArt=theme=>{
 const file=theme?.image;
 return typeof file==='string'&&(/^\.\/assets\/boards\/[a-z0-9_-]+\.(?:svg|webp)$/.test(file)||/^\.\/Bilder\/Spielhintergrundbilder\/[a-z0-9_-]+\.webp$/.test(file))
  ?new URL(file,import.meta.url).href:null;
};
const pickers=[...document.querySelectorAll('[data-dog-board-picker]')];
function renderActive(){
 const picked=loadAppearance().board;
 for(const picker of pickers){
  for(const button of picker.querySelectorAll('[data-board-theme]')){
   const active=button.dataset.boardTheme===picked;
   button.classList.toggle('is-picked',active);
   button.setAttribute('aria-pressed',String(active));
  }
  const status=picker.querySelector('[data-board-picked-label]');
  if(status)status.textContent='Gewählt: '+(BOARD_STYLES[picked]?.label||BOARD_STYLES.studio.label);
 }
}
for(const picker of pickers){
 const area=picker.querySelector('[data-board-picker-options]');
 if(!area)continue;
 for(const id of ORDER){
  const theme=BOARD_STYLES[id];if(!theme)continue;
  const button=document.createElement('button');
  button.type='button';button.className='dog-board-option';button.dataset.boardTheme=id;
  button.setAttribute('aria-label','DOG-Spielbrett '+theme.label+' auswählen');
  const thumb=document.createElement('span');thumb.className='dog-board-thumb';thumb.setAttribute('aria-hidden','true');
  const url=resolveBoardArt(theme);
  const fallback=resolveBoardArt({image:theme.fallbackImage});
  thumb.style.backgroundImage=(url?'url("'+url+'"), ':'')+(fallback?'url("'+fallback+'"), ':'')+FALLBACK;
  const text=document.createElement('span');text.className='dog-board-option-name';text.textContent=theme.label;
  button.append(thumb,text);
  button.addEventListener('click',()=>{
   saveAppearance({...loadAppearance(),board:id});
   renderActive();
  });
  area.appendChild(button);
 }
}
renderActive();
window.addEventListener('storage',event=>{
 if(event.key==='dog:appearance:v1')renderActive();
});
