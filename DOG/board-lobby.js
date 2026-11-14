/**
 * DOG plate picker for local catalog and online hub lobby. Everything is
 * cosmetic per device: no Firestore calls and no edits to server game state.
 */
import {BOARD_STYLES,loadAppearance,saveAppearance} from './appearance-registry.js?v=13';
const plates=Object.entries(BOARD_STYLES);
const sections=[];
const browserUrl=path=>new URL(path,import.meta.url).href;
const selected=()=>loadAppearance().board;

function buildPicker(target,mode){
 if(!target)return;
 const box=document.createElement('section');
 box.className='dog-plate-select'+(mode==='local'?' dog-plate-local':'');
 box.setAttribute('aria-label','DOG Spielbrett auswählen');
 const title=document.createElement('h3');title.textContent='🎨 DOG-Spielbrett auswählen';
 const subtitle=document.createElement('p');
 subtitle.textContent='Wähle deine Spielplatte vor dem Start. Die Spielfelder und Figuren werden im Spiel darüber angezeigt.';
 const cards=document.createElement('div');cards.className='dog-plate-choices';
 for(const [id,theme] of plates){
  const card=document.createElement('button');
  card.type='button';card.className='dog-plate-choice';card.dataset.board=id;
  const picture=theme.image?document.createElement('img'):document.createElement('div');
  if(theme.image){
   picture.loading='lazy';picture.alt='';
   picture.src=browserUrl(theme.image);
   if(theme.fallbackImage)picture.addEventListener('error',()=>{
    if(picture.src!==browserUrl(theme.fallbackImage))picture.src=browserUrl(theme.fallbackImage);
   });
  }else{
   picture.className='dog-plate-placeholder';
   picture.style.background=theme.page||'#123456';
  }
  const caption=document.createElement('span');caption.textContent=theme.label;
  card.append(picture,caption);
  card.addEventListener('click',()=>{
   saveAppearance({...loadAppearance(),board:id});
   document.querySelectorAll('.dog-plate-choice').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.board===id)));
  });
  cards.appendChild(card);
 }
 const note=document.createElement('p');note.className='dog-plate-footnote';
 note.textContent='Die Gestaltung wird auf diesem Gerät gespeichert. Alle DOG-Spielregeln bleiben unverändert.';
 box.append(title,subtitle,cards,note);target.appendChild(box);sections.push(box);
}
const localCard=document.querySelector('.dog-classic-card');
if(localCard&&localCard.parentElement){
 const target=document.createElement('div');
 target.className='dog-plate-select-wrap';target.style.gridColumn='1 / -1';
 localCard.after(target);
 buildPicker(target,'local');
}
const localView=document.getElementById('local-view');
if(localView)buildPicker(localView,'hub-local');
const stage=document.getElementById('game-stage-hero');
if(stage&&stage.parentElement){
 const target=document.createElement('div');
 stage.after(target);
 buildPicker(target,'hub-online');
 const update=()=>{target.hidden=stage.classList.contains('hidden')||stage.dataset.game!=='dog';};
 new MutationObserver(update).observe(stage,{attributes:true,attributeFilter:['class','data-game']});
 update();
}
document.querySelectorAll('.dog-plate-choice').forEach(card=>card.setAttribute('aria-pressed',String(card.dataset.board===selected())));
