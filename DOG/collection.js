import {applyMotionMode,loadMotionMode} from './motion-settings.js';
applyMotionMode(loadMotionMode());
import {DOG_COLLECTION_CATEGORIES,dogCollectionCategory} from './collection-catalog.js?v=20';
import {loadAppearance,saveAppearance} from './appearance-registry.js?v=25';
import {loadEmojiSlots,saveEmojiSlots,emojiById} from './dog-emojis.js?v=3';
import {isChristmasRewardLocked} from './christmas-reward-locks.js?v=4';
import {isVerifiedCosmeticUnlocked,isVerifiedDogPlayerLevelAtLeast,refreshVerifiedCosmetics} from './verified-cosmetics.js?v=3';
import {equippedDogCosmetic,saveEquippedDogCosmetic} from './cosmetic-equipment.js?v=1';
import {CARD_EDITION,loadCardEdition,saveCardEdition,isCardEditionUnlocked} from './card-visuals.js?v=11';
// The collection never grants event rewards. Cosmetic choices persist locally;
// only an explicit avatar update in an active room uses the existing DOG API.
const $=id=>document.getElementById(id),qs=new URLSearchParams(location.search),root=new URL('../',location.href);
function returnPage(){
 try{const u=new URL(qs.get('return')||'../hub-lobby.html',location.href),file=u.pathname.split('/').pop();
 if(u.origin!==location.origin||!['hub-lobby.html','spielauswahl-lokal.html'].includes(file)||u.pathname!==root.pathname+file)throw Error('invalid');
 return u;}catch{return new URL('../hub-lobby.html',location.href);}
}
const back=returnPage(),local=back.pathname.endsWith('/spielauswahl-lokal.html');
$('collection-back-top').href=back.href;$('collection-back-footer').href=back.href;
const tones={gold:'linear-gradient(135deg,#a26e28,#2c2147,#071a32)',azure:'linear-gradient(145deg,#206c91,#092c51,#061831)',cyan:'linear-gradient(145deg,#3b92a0,#164878,#101736)',violet:'linear-gradient(135deg,#8c42b1,#371e64,#0a1735)',forest:'linear-gradient(145deg,#3f8d6c,#1b443e,#091c31)',ember:'linear-gradient(140deg,#b86a23,#7b2250,#16223b)',indigo:'linear-gradient(140deg,#3d4a91,#151f58,#081b35)',wood:'linear-gradient(140deg,#8e5826,#49321f,#072341)'};
let cat=dogCollectionCategory(qs.get('category')),filter='all',picked=null,seat=0,slot=0,toastTimer;
function el(tag,className='',textValue){
 const node=document.createElement(tag);if(className)node.className=className;
 if(textValue!==undefined)node.textContent=String(textValue);return node;
}
function notify(message){const box=$('collection-toast');box.textContent=message;box.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{box.hidden=true;},3500);}
const avatar=()=>local?(window.DogAvatars?.localAvatar?.(seat)??seat):(window.DogAvatars?.onlineAvatar?.()??0);
const available=item=>Boolean(item&&(
 item.unlockId?isVerifiedCosmeticUnlocked(item.unlockId):
 item.minPlayerLevel?isVerifiedDogPlayerLevelAtLeast(item.minPlayerLevel):
 item.status==='available'&&!isChristmasRewardLocked(item)
));
// Secret Rubbellos/Event prizes are shown only after server-verified collection.
// Never expose unrewarded artwork, names or details as gallery previews.
const visibleCollectionItem=item=>Boolean(item&&(!item.unlockId||available(item)));
const canEquip=item=>available(item)&&
 ['appearance','cardEdition','avatar','emoji','default','nameFrame','activeIcon'].includes(item.kind);
const statsFor=group=>{
 const items=group.items.filter(visibleCollectionItem);
 return {total:items.length,available:items.filter(available).length,
  planned:items.filter(x=>!available(x)).length};
};
function equipped(item){
 if(!available(item))return false;
 if(item.kind==='default')return item.id==='frame-current'?
   equippedDogCosmetic('nameFrame',{local,seat})===null:
   equippedDogCosmetic('activeIcon',{local,seat})===null;
 if(item.kind==='nameFrame')return equippedDogCosmetic('nameFrame',{local,seat})===item.unlockId;
 if(item.kind==='activeIcon')return equippedDogCosmetic('activeIcon',{local,seat})===item.unlockId;
 if(item.kind==='avatar')return item.avatar===avatar();
 if(item.kind==='emoji')return loadEmojiSlots().includes(item.id);
 if(item.kind==='appearance')return loadAppearance()[item.field]===(item.value??item.id) && (item.field!=='cards'||loadCardEdition()===CARD_EDITION);
 if(item.kind==='cardEdition')return isCardEditionUnlocked(item.cardEdition)&&loadCardEdition()===item.cardEdition;
 return false;
}
function art(item,big=false){
 const wrap=el('div',(big?'detail-image':'tile-art')+(item.cardEdition?' has-card-edition':'')),placeholder=el('div',big?'detail-fallback':'tile-fallback');
 placeholder.style.background=item.background||tones[item.artTone]||tones.azure;
 placeholder.append(el('span','',item.icon||'🐾'));
 if(item.image){
  const img=el('img');img.alt='';img.loading=big?'eager':'lazy';let fallbackUsed=false;
  img.onerror=()=>{if(!fallbackUsed&&item.fallbackImage){fallbackUsed=true;img.src=new URL(item.fallbackImage,import.meta.url).href;}else img.classList.add('is-broken');};
  img.src=new URL(item.image,import.meta.url).href;wrap.append(img);
 }
 wrap.append(placeholder);
 // Draw a real sample player-name plaque in both gallery and large detail
 // preview. This does not equip the locked frame or change the game HUD.
 if(item.kind==='nameFrame' && item.frameTheme){
  wrap.classList.add('has-nameframe-preview');
  placeholder.replaceChildren();
  const preview=el('div','collection-nameframe-preview nameframe-'+item.frameTheme);
  preview.setAttribute('aria-hidden','true');
  preview.append(el('span','nameframe-corner nameframe-corner-left',item.cornerIcon||'✦'));
  const plaque=el('div','nameframe-plaque');
  plaque.append(el('span','nameframe-emblem',item.frameIcon||'✨'),el('strong','nameframe-name','DEIN NAME'));
  preview.append(plaque,el('span','nameframe-corner nameframe-corner-right',item.cornerIcon||'✦'));
  preview.append(el('span','nameframe-bottom-caption','DOG · WEIHNACHTSEDITION'));
  wrap.append(preview);
 }
 // Locked Christmas active-symbol prototypes: the actual visual motif is
 // rendered in both the small gallery tile and the large detail pane.
 // They cannot be equipped and do not change the live turn indicator.
 if(item.kind==='activeIcon' && item.iconTheme){
  wrap.classList.add('has-activeicon-preview');
  const display=el('div','collection-activeicon-preview activeicon-'+item.iconTheme);
  display.setAttribute('aria-hidden','true');
  const halo=el('div','activeicon-halo');
  halo.append(el('span','activeicon-spark activeicon-spark-left',item.accent||'✦'));
  const medallion=el('span','activeicon-medallion');
  medallion.append(el('span','activeicon-motif',item.icon||'⭐'));
  halo.append(medallion,el('span','activeicon-spark activeicon-spark-right',item.accent||'✦'));
  display.append(halo,el('span','activeicon-preview-caption','JETZT AM ZUG'));
  wrap.append(display);
 }
 // Color tones show a miniature DOG cockpit using their REAL saved HUD palette.
 // This is a pure local preview: it does not update the appearance or the server.
 if(item.hudTheme){
  const tone=item.hudTheme;
  const preview=el('div','collection-hud-tone-preview');
  const vars={base:tone.swatch,panel:tone.panel,seat:tone.seat,button:tone.button,
   border:tone.border,accent:tone.accent,text:tone.text,muted:tone.muted};
  for(const [key,value] of Object.entries(vars))preview.style.setProperty('--hud-preview-'+key,value);
  preview.setAttribute('aria-hidden','true');
  const top=el('div','hud-preview-top');
  top.append(el('span','hud-preview-paw','🐾'),el('span','hud-preview-heading','DOG'),
   el('span','hud-preview-spark','✦'));
  const seats=el('div','hud-preview-seats');
  for(const [i,color] of ['#e65f58','#4c9bfa'].entries()){
   const seat=el('span','hud-preview-seat');
   seat.style.setProperty('--seat-indicator',color);
   seat.append(el('i','hud-preview-avatar'),el('b','',i===0?'Chris':'Spieler 2'));
   seats.append(seat);
  }
  const controls=el('div','hud-preview-controls');
  for(const icon of ['✨','😄','🎁'])controls.append(el('span','',icon));
  preview.append(top,seats,controls);
  wrap.append(preview);
 }
 if(item.kind==='avatar'&&item.avatar<16){
  const sprite=el('span','portrait-sprite'),index=item.avatar%8;
  sprite.style.backgroundImage="url('"+new URL(item.avatar<8?'../profile-avatars.webp':'../profile-avatars-extra.webp',import.meta.url).href+"')";
  sprite.style.backgroundSize='400% 200%';sprite.style.backgroundPosition=(index%4*100/3)+'% '+(Math.floor(index/4)*100)+'%';wrap.append(sprite);
 }
 if(item.palette){
  const group=el('div','collection-pawn-preview');
  for(const color of item.palette.slice(0,4)){const mark=el('i');mark.style.setProperty('--pawn',color);group.append(mark);}
  placeholder.replaceChildren(group);
 }
 if(item.cardTheme){
  const t=item.cardTheme,pic=el('div','collection-card-preview');
  pic.style.setProperty('--card-face',t.face);pic.style.setProperty('--card-border',t.border);pic.style.setProperty('--card-ink',t.ink);
  pic.append(el('b','','9'),el('small','',t.emblem));wrap.append(pic);
 }
 return wrap;
}
function drawNavigation(){
 const nav=$('collection-categories');
 nav.replaceChildren(...DOG_COLLECTION_CATEGORIES.map(group=>{
  const stats=statsFor(group),btn=el('button','category-button'+(group.id===cat.id?' is-active':''));
  btn.type='button';btn.setAttribute('aria-current',String(cat.id===group.id));
  btn.setAttribute('aria-label',group.title+': '+stats.available+' von '+stats.total+' verfügbar');
  btn.append(el('span','category-icon',group.icon),el('strong','',group.title),el('span','category-count',stats.available+'/'+stats.total));
  btn.onclick=()=>{cat=group;filter='all';picked=null;const url=new URL(location.href);url.searchParams.set('category',group.id);history.replaceState(null,'',url);draw();};
  return btn;
 }));
}
function drawFilters(){
 const s=statsFor(cat);
 $('collection-heading').textContent=cat.icon+' '+cat.title;$('collection-subheading').textContent=cat.subtitle;
 $('count-all').textContent='('+s.total+')';$('count-active').textContent='('+cat.items.filter(x=>visibleCollectionItem(x)&&equipped(x)).length+')';
 document.querySelectorAll('[data-filter]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.filter===filter)));
}
function drawGrid(){
 const items=cat.items.filter(x=>visibleCollectionItem(x)&&(filter==='all'||equipped(x)));
 if(!items.some(x=>x.id===picked))picked=items.find(equipped)?.id||items[0]?.id||null;
 $('collection-empty').hidden=items.length>0;
 $('collection-grid').replaceChildren(...items.map(item=>{
  const locked=!available(item),active=equipped(item),btn=el('button','collection-tile'+(locked?' is-locked':'')+(item.id===picked?' is-selected':''));
  btn.type='button';btn.setAttribute('aria-pressed',String(item.id===picked));btn.setAttribute('aria-label',item.name+' · '+(locked?'gesperrt':active?'aktiv':'verfügbar'));
  const image=art(item);image.append(el('span','tile-status-icon'+(locked?' lock':''),locked?'🔒':'✓'));
  btn.append(image,el('div','tile-title',item.name),el('span','tile-label'+(locked?' planned':active?' active':''),locked?'🔒 Noch nicht gewonnen':active?'✓ Aktiv':item.unlockId?'✓ Gewonnen':'Verfügbar'));
  btn.onclick=()=>{picked=item.id;drawGrid();drawDetails();if(matchMedia('(max-width:840px)').matches)$('collection-detail').scrollIntoView({behavior:'smooth',block:'nearest'});};
  return btn;
 }));
}
function slotsPreview(){const row=el('div','detail-emoji-slots');for(const id of loadEmojiSlots())row.append(el('span','detail-emoji-slot',emojiById(id)?.emoji||'＋'));return row;}
async function equipAvatar(item,button){
 const ap=window.DogAvatars;if(!ap){notify('Profilbilder konnten nicht geladen werden.');return;}
 button.disabled=true;
 const prior=local?ap.localAvatar(seat):ap.onlineAvatar();
 const applied=local?ap.setLocal(seat,item.avatar):ap.setOnline(item.avatar);
 if(!applied){notify('Belohnung noch nicht bestätigt – Profilbilder werden geladen.');draw();return;}
 const code=back.searchParams.get('room')||'',user=window.SpielOnline?.state?.()?.user;
 if(!local&&/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code)&&user?.getIdToken){
  try{
   const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
   const response=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+'/dog/avatar',{
    method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},body:JSON.stringify({avatar:item.avatar})
   });
   const data=await response.json();
   if(!response.ok||data.ok!==true)throw Error(data.error||'Synchronisierung fehlgeschlagen');
   notify('✓ Profilbild für den DOG-Raum übernommen.');
  }catch(err){
   ap.setOnline(prior);
   notify('Online-Profilbild nicht übernommen: '+(err.message||'nicht möglich'));
  }
 }else notify('✓ Profilbild auf diesem Gerät gespeichert.');
 draw();
}
async function syncRoomEquipment(kind,unlockId){
 const code=back.searchParams.get('room')||'',user=window.SpielOnline?.state?.()?.user;
 if(local||!/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code)||!user?.getIdToken)return;
 try{
  const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
  const response=await fetch(base+'/api/hub/rooms/'+encodeURIComponent(code)+'/dog/cosmetic',{
   method:'POST',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},
   body:JSON.stringify({kind,unlockId})
  });
  const data=await response.json();
  if(!response.ok||data.ok!==true)throw Error(data.error||'Synchronisierung fehlgeschlagen');
  notify('✓ Auch im DOG-Raum übernommen.');
 }catch(error){notify('Lokal ausgewählt · Online: '+error.message);}
}
function equip(item,button){
 if(!canEquip(item))return;
 if(item.kind==='avatar'){void equipAvatar(item,button);return;}
 if(['nameFrame','activeIcon','default'].includes(item.kind)){
  const kind=item.kind==='default'?(item.id==='frame-current'?'nameFrame':'activeIcon'):item.kind;
  const unlockId=item.kind==='default'?null:item.unlockId;
  if(!saveEquippedDogCosmetic(kind,unlockId,{local,seat})){
   notify('Nur tatsächlich gewonnene Belohnungen sind auswählbar.');return;
  }
  notify('✓ '+item.name+' ausgerüstet!');
  draw();void syncRoomEquipment(kind,unlockId);return;
 }
 if(item.kind==='emoji'){
  const slots=loadEmojiSlots(),previous=slots.indexOf(item.id);
  if(previous!==-1&&previous!==slot)slots[previous]=slots[slot]||null;
  slots[slot]=item.id;saveEmojiSlots(slots);
  notify('✓ '+item.icon+' in Schnellplatz '+(slot+1)+' gespeichert.');draw();return;
 }
 if(item.kind==='cardEdition'){
  if(!isCardEditionUnlocked(item.cardEdition))return;
  saveCardEdition(item.cardEdition);
  notify('✓ '+item.name+' für DOG ausgewählt.');draw();return;
 }
 if(item.kind==='appearance'){
  if(item.field==='cards')saveCardEdition(CARD_EDITION);
  saveAppearance({...loadAppearance(),[item.field]:item.value??item.id});
  window.dispatchEvent(new Event('dog-appearance-changed'));
  notify('✓ '+item.name+' für DOG ausgewählt.');draw();return;
 }
 notify('Das ist bereits das DOG-Standarddesign.');
}
function drawDetails(){
 const root=$('collection-detail-content');root.replaceChildren();
 const item=cat.items.find(x=>x.id===picked&&visibleCollectionItem(x));if(!item){root.append(el('p','collection-detail-loading','Wähle einen verfügbaren oder bereits gewonnenen Inhalt aus.'));return;}
 const locked=!available(item),active=equipped(item),btn=el('button','detail-button'+(locked?' is-locked':active&&item.kind!=='emoji'?' is-active':''));
 btn.type='button';
 btn.textContent=locked?'🔒 Noch nicht gewonnen':!canEquip(item)?'✓ Gewonnen · Ausrüsten folgt':item.kind==='default'?(item.id==='frame-current'?'✓ Standardrahmen aktiv':'✓ Standardsymbol aktiv'):active&&item.kind!=='emoji'?'✓ Aktiv':item.kind==='emoji'?'In Schnellleiste verwenden':'✓ Ausrüsten';
 btn.disabled=!canEquip(item)||item.kind==='default'||(active&&item.kind!=='emoji');
 if(!btn.disabled)btn.onclick=()=>equip(item,btn);
 const detailArt=art(item,true);if(locked)detailArt.classList.add('is-locked');
 root.append(detailArt,el('h3','detail-title',item.name),el('div','detail-rule'),
   el('div','detail-state'+(locked?' is-locked':''),locked?'🔒 Noch nicht gewonnen':active?'✓ Aktiv / vorhanden':item.unlockId?'✅ In deiner Sammlung':'✓ Verfügbar'),
   el('p','detail-description',item.unlockId?'🎁 Gesammelt und für dein Spielerprofil freigeschaltet.':item.description||'DOG-Design'));
 if(item.kind==='nameFrame')root.append(el('small','nameframe-preview-note',locked?'🎄 Noch nicht freigeschaltet.':'✅ Im Spielstatus als Namensrahmen auswählbar.'));
 if(item.kind==='activeIcon')root.append(el('small','activeicon-preview-note',locked?'🎄 Noch nicht freigeschaltet.':'✅ Ersetzt die goldene Krone beim eigenen Spielzug.'));
 if(item.kind==='cardEdition')root.append(el('small','detail-fine',locked?(item.minPlayerLevel?'🔒 Freischaltung ab Spielerlevel '+item.minPlayerLevel+'.':'🎄 Erst als Eventgewinn erhältlich.'):'✅ Kartensatz freigeschaltet: 14 Motive und Rückseite.'));
 if(item.kind==='avatar'&&local&&!locked){
  const label=el('label','detail-picker','Spielerplatz'),select=el('select');
  ['Rot','Blau','Grün','Gelb'].forEach((name,i)=>{const option=el('option','','Spieler '+(i+1)+' · '+name);option.value=String(i);option.selected=i===seat;select.append(option);});
  select.onchange=()=>{seat=Number(select.value)||0;draw();};label.append(select);root.append(label);
 }
 if(item.kind==='emoji'){
  root.append(slotsPreview());
  if(!locked){
   const label=el('label','detail-picker','Schnellplatz'),select=el('select');
   for(let i=0;i<5;i++){const option=el('option','',String(i+1));option.value=String(i);option.selected=i===slot;select.append(option);}
   select.onchange=()=>{slot=Number(select.value)||0;};label.append(select);root.append(label);
  }
 }
 root.append(btn,el('small','detail-fine',locked?(item.minPlayerLevel?'Ab DOG-Spielerlevel '+item.minPlayerLevel+' automatisch freigeschaltet.':'Vorschau: Diese Belohnung ist noch nicht im Spiel freischaltbar.'):
  item.kind==='emoji'?'Emoji-Schnelltasten werden lokal nach Spielerprofil gespeichert.':
  item.kind==='avatar'?'Das Profilbild wird lokal und im aktiven DOG-Raum nach Möglichkeit synchronisiert.':
  item.kind==='default'?'Dieser Standardinhalt ist ohne Freischaltung vorhanden.':
  !canEquip(item)?'🎁 Dieser Inhalt ist noch nicht ausrüstbar.':
  'Die Auswahl ist rein optisch und wird ohne zusätzliche Firestore-Schreibvorgänge gespeichert.'));
}
function draw(){
 const all=DOG_COLLECTION_CATEGORIES.flatMap(c=>c.items).filter(visibleCollectionItem);
 const stats={available:all.filter(available).length,planned:all.filter(x=>!available(x)).length};
 $('collection-total').textContent=String(stats.available);
 
 $('collection-progress-caption').textContent='Neue Rubbellos-Gewinne erscheinen erst nach dem Einsammeln.';
 drawNavigation();drawFilters();drawGrid();drawDetails();
}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;picked=null;drawFilters();drawGrid();drawDetails();});
window.addEventListener('spielonline-change',()=>draw());
window.addEventListener('dog-cosmetics-verified',draw);
window.addEventListener('dog-avatar-change',()=>{if(cat.id==='avatars')draw();});
window.addEventListener('dog-emojis-changed',()=>{if(cat.id==='emojis')draw();});
draw();
void refreshVerifiedCosmetics();
