import {DOG_EMOJIS,DOG_EMOJI_STARTERS,loadEmojiSlots,saveEmojiSlots,emojiById} from './dog-emojis.js?v=2';
/* One personal emoji editor in local and online DOG lobby. No network writes. */
for(const root of document.querySelectorAll('[data-dog-emoji-editor]')){
 let draft=loadEmojiSlots(),selected=0,page=0;
 const pageCount=Math.ceil(DOG_EMOJIS.length/10);
 root.innerHTML=`<div class="dog-emoji-lobby-head"><h3>😄 Meine DOG-Emojis</h3><span>${DOG_EMOJI_STARTERS.length} / ${DOG_EMOJIS.length} freigeschaltet</span></div>
 <p class="dog-emoji-hint">Wähle einen der fünf Schnellplätze und anschließend ein freigeschaltetes Emoji.</p>
 <div class="dog-emoji-slot-list" data-emoji-slots role="group" aria-label="Fünf Emoji-Schnellplätze"></div>
 <div class="dog-emoji-lobby-actions"><button type="button" data-clear>Platz leeren</button><button type="button" data-save>✓ Schnelltasten speichern</button></div>
 <div class="dog-emoji-collection-head"><strong>Emoji-Sammlung</strong><span data-emoji-pages></span></div>
 <div class="dog-emoji-collection" data-emoji-gallery></div>
 <div class="dog-emoji-pages"><button type="button" data-prev aria-label="Vorherige Emojis">‹ Zurück</button><button type="button" data-next aria-label="Weitere Emojis">Weiter ›</button></div>
 <p class="dog-emoji-note" data-emoji-note role="status">47 weitere Emojis und 10 Weihnachts-Emojis sind für spätere Freischaltungen gesperrt.</p>`;
 const by=s=>root.querySelector(s),slots=by('[data-emoji-slots]'),gallery=by('[data-emoji-gallery]'),notice=by('[data-emoji-note]');
 function draw(){
  slots.replaceChildren(...draft.map((id,i)=>{
   const button=document.createElement('button');button.type='button';button.className='dog-emoji-slot'+(i===selected?' is-editing':'');
   button.setAttribute('aria-pressed',String(i===selected));button.setAttribute('aria-label','Schnellplatz '+(i+1)+': '+(emojiById(id)?.name||'leer'));
   const picture=document.createElement('span');picture.textContent=emojiById(id)?.emoji||'＋';picture.className='dog-emoji-big';
   const label=document.createElement('small');label.textContent='Platz '+(i+1);
   button.append(picture,label);button.addEventListener('click',()=>{selected=i;draw();});return button;
  }));
  gallery.replaceChildren(...DOG_EMOJIS.slice(page*10,page*10+10).map(item=>{
   const allowed=DOG_EMOJI_STARTERS.includes(item.id);
   const button=document.createElement('button');button.type='button';button.className='dog-emoji-option';
   button.disabled=!allowed;button.title=allowed?item.name:item.unlockId?item.name+' – einzeln im Weihnachtsevent freischaltbar':item.name+' – später freischaltbar';
   button.setAttribute('aria-label',button.title);
   const glyph=document.createElement('span');glyph.className='dog-emoji-big';glyph.textContent=item.emoji;
   const label=document.createElement('small');label.textContent=allowed?item.name:item.unlockId?'🔒 🎄 '+item.name:'🔒 '+item.name;
   button.append(glyph,label);
   if(allowed)button.addEventListener('click',()=>{
    const index=draft.indexOf(item.id);
    if(index>=0&&index!==selected)draft[index]=draft[selected]||null;
    draft[selected]=item.id;
    notice.textContent=item.name+' für Platz '+(selected+1)+' ausgewählt. Zum Übernehmen speichern.';
    draw();
   });return button;
  }));
  by('[data-emoji-pages]').textContent='Seite '+(page+1)+' / '+pageCount;
  by('[data-prev]').disabled=page===0;by('[data-next]').disabled=page>=pageCount-1;
 }
 by('[data-clear]').addEventListener('click',()=>{draft[selected]=null;notice.textContent='Platz '+(selected+1)+' geleert. Speichern nicht vergessen.';draw();});
 by('[data-save]').addEventListener('click',()=>{draft=saveEmojiSlots(draft);notice.textContent='✓ Deine Schnelltasten sind auf diesem Gerät gespeichert.';draw();});
 by('[data-prev]').addEventListener('click',()=>{if(page>0){page--;draw();}});
 by('[data-next]').addEventListener('click',()=>{if(page<pageCount-1){page++;draw();}});
 window.addEventListener('spielonline-change',()=>{draft=loadEmojiSlots();notice.textContent='Deine persönlichen Schnelltasten geladen.';draw();});
 draw();
}
