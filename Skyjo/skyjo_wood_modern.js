/* Optional SKYJO Wood Modern skin. Separate from the game engine. */
(()=>{'use strict';
 const params=new URLSearchParams(location.search);
 const choice=params.get('skin')==='wood'?'wood':'classic';
 if(choice!=='wood')return;
 document.documentElement.classList.add('skyjo-wood-modern');
 document.addEventListener('DOMContentLoaded',()=>document.body.classList.add('skyjo-wood-modern'));
 const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='skyjo_wood_modern.css?v=1';document.head.appendChild(sheet);
})();
