(()=>{'use strict';
const button=document.getElementById('fullscreen-toggle');if(!button)return;
const sync=()=>{const active=!!document.fullscreenElement;button.textContent=active?'⤢ Vollbild verlassen':'⛶ Vollbild';button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',active?'Vollbild verlassen':'Vollbild aktivieren');document.body.classList.toggle('skyjo-fullscreen',active)};
button.addEventListener('click',async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen({navigationUI:'hide'})}else{button.title='Dieser Browser unterstützt keinen Vollbildmodus';button.textContent='Vollbild nicht verfügbar'}}catch(e){button.title='Vollbild wurde vom Browser nicht erlaubt';button.textContent='Vollbild nicht erlaubt'}sync()});
document.addEventListener('fullscreenchange',sync);
document.addEventListener('fullscreenerror',()=>{button.title='Vollbild nicht verfügbar';sync()});
sync();
})();