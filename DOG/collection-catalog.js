/** DOG collection catalog.
 * Registry entries are available cosmetic choices, NOT proof of event ownership.
 * Only available, already implemented items appear in the shipped collection.
 */
import {BOARD_STYLES,isBoardUnlocked,SCENE_STYLES,PIECE_STYLES,CARD_STYLES,PUBLISHED_CARD_STYLE_IDS,HUD_TONES,HUD_LAYOUTS} from './appearance-registry.js?v=25';
import {CARD_EDITION,CARD_EDITIONS,cardVisual,isCardEditionUnlocked} from './card-visuals.js?v=11';
import {DOG_EMOJIS,DOG_EMOJI_STARTERS,DOG_CHRISTMAS_EMOJIS} from './dog-emojis.js?v=3';
import {CHRISTMAS_AVATARS} from './christmas-avatar-catalog.js?v=1';
import {CHRISTMAS_NAME_FRAMES} from './christmas-nameframe-catalog.js?v=1';
import {CHRISTMAS_ACTIVE_ICONS} from './christmas-activeicon-catalog.js?v=1';
import {buildDogCollection} from './collection-extensions.js?v=2';
import {isChristmasRewardLocked} from './christmas-reward-locks.js?v=5';
const avail=(id,name,extra={})=>({id,name,status:'available',...extra});
const BASE_COLLECTION_CATEGORIES=[
 {id:'backgrounds',icon:'🏞️',title:'Hintergründe',subtitle:'Landschaften für die gesamte DOG-Seite',items:[
  ...Object.entries(SCENE_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'scene',image:t.image||null,description:t.description||'Seitenhintergrund für DOG',icon:id==='none'?'🌑':'🏰',artTone:'azure',
    unlockId:t.unlockId||null,status:t.unlockId?'planned':'available'})),
 ]},
 {id:'boards',icon:'🎲',title:'Spielbretter',subtitle:'Vorhandene DOG-Spielbrettdesigns',items:[
  ...Object.entries(BOARD_STYLES).filter(([id])=>id!=='royalMarmor').map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'board',image:t.image||null,fallbackImage:t.fallbackImage||null,background:t.page||'',unlockId:t.unlockId||null,status:isBoardUnlocked(id)?'available':'planned',description:isBoardUnlocked(id)?'Brettmotiv. Die offiziellen DOG-Felder bleiben unverändert.':'🔒 Exklusives Weihnachts-Spielbrett. Wird später durch das Weihnachtsevent freigeschaltet.',icon:'🐾',artTone:'wood'})),
 ]},
 {id:'pieces',icon:'♟️',title:'Spielfiguren',subtitle:'Vorhandene Spielfiguren-Farbsätze',items:[
  ...Object.entries(PIECE_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'pieces',palette:t.colors,description:'Aktueller Farbstil für die Spielfiguren; noch keine neue Figurenform.',icon:'♟️',artTone:'azure'})),
 ]},
 {id:'avatars',icon:'👤',title:'Profilbilder',subtitle:'Dein eigenes Bild für den Spielstatus',items:[
  ...Array.from({length:16},(_,i)=>avail('avatar-'+i,'Profilbild '+(i+1),{kind:'avatar',avatar:i,description:'Bereits verfügbares DOG-Profilbild, auswählbar in der Lobby.',icon:'👤'})),
  ...CHRISTMAS_AVATARS.map(item=>avail(item.id,item.name,{kind:'avatar',avatar:item.avatar,image:item.image,status:'planned',unlockId:item.unlockId,description:'Weihnachtsprofilbild – wird erst durch eine spätere Weihnachtsevent-Belohnung freigeschaltet.',icon:'🎄'})),
 ]},
 {id:'frames',icon:'🛡️',title:'Namensrahmen',subtitle:'Deine bereits gesammelten Namensrahmen',items:[
  avail('frame-current','Klassischer Rahmen',{kind:'default',icon:'🛡️',description:'Der aktuell verwendete DOG-Spielerrahmen.',artTone:'gold'}),
  ...CHRISTMAS_NAME_FRAMES.map(frame=>({
   ...frame,kind:'nameFrame',icon:frame.frameIcon,status:'planned',artTone:'gold'
  }))
 ]},
 {id:'emblems',icon:'👑',title:'Aktivsymbole',subtitle:'Deine gesammelten Aktivsymbole',items:[
  avail('emblem-crown','Goldene Krone',{kind:'default',icon:'👑',description:'Standardsymbol des aktiven Spielers.',artTone:'gold'}),
  ...CHRISTMAS_ACTIVE_ICONS.map(entry=>({
   ...entry,kind:'activeIcon',status:'planned',artTone:'gold'
  }))
 ]},
 {id:'emojis',icon:'😄',title:'Emojis',subtitle:'Nur bereits gesammelte Emojis',items:[
  ...DOG_EMOJIS.filter(item=>DOG_EMOJI_STARTERS.includes(item.id)).map(item=>({
   id:item.id,name:item.name,icon:item.emoji,kind:'emoji',status:'available',
   description:'Starter-Emoji: in deinen fünf Schnellplätzen verwendbar.',artTone:'azure'
  })),
  ...DOG_EMOJIS.filter(item=>!DOG_EMOJI_STARTERS.includes(item.id)&&!item.unlockId).map(item=>({
   id:item.id,name:item.name,icon:item.emoji,kind:'emoji',status:'planned',
   unlockId:'christmas2026:standard-emoji:'+item.id,
   description:'Klassisches DOG-Emoji, das beim einfachen Rubbellos gewonnen werden kann.',artTone:'azure'
  })),
  ...DOG_CHRISTMAS_EMOJIS.map(item=>({
   id:item.id,name:item.name,icon:item.emoji,kind:'emoji',status:'planned',unlockId:item.unlockId,
   description:'Exklusives Weihnachts-Emoji: wird später einzeln als Eventbelohnung freigeschaltet.',artTone:'ember'
  }))
 ]},
 {id:'cards',icon:'🃏',title:'Kartendesigns',subtitle:'Deine verfügbaren Kartendesigns',items:[
  ...PUBLISHED_CARD_STYLE_IDS.map(id=>{const t=CARD_STYLES[id];return avail(id,t.label,{kind:'appearance',field:'cards',cardEdition:CARD_EDITION,image:cardVisual('9',CARD_EDITION).image,description:'Fertiges Kartendesign mit allen 14 Kartenmotiven und eigener Rückseite. Die Spielregeln bleiben unverändert.',icon:t.emblem,artTone:'gold'});}),
  ...Object.entries(CARD_EDITIONS).filter(([id])=>id!==CARD_EDITION).map(([id,entry])=>avail(id,entry.label,{
   kind:'cardEdition',cardEdition:id,status:isCardEditionUnlocked(id)?'available':'planned',
   minPlayerLevel:entry.minPlayerLevel||0,
   unlockId:entry.unlockId,image:entry.base+'9.'+(entry.extension||'png'),
   fallbackImage:entry.fallbackBase?entry.fallbackBase+'9.'+(entry.fallbackExtension||'svg'):null,
   description:id==='kartendesign-05'?'🎅 Nikolaus Deluxe – besondere Freischaltung ab Spielerlevel 20. Mit 14 festlichen Kartenmotiven und eigener Rückseite; keine Änderung der Spielregeln.':id==='kartendesign-04'?'Zusätzliche Edition aus transparentem Astralglas. Mit allen Kartenmotiven und eigener Rückseite. Direkt auswählbar; Spielregeln bleiben unverändert.':'🎄 Weihnachtsedition mit allen 14 Kartenarten und eigener Rückseite. Noch gesperrt – später als Eventbelohnung freischaltbar. Nur das Aussehen der Karten ändert sich.',
   icon:id==='kartendesign-02'?'❄️':id==='kartendesign-04'?'✨':id==='kartendesign-05'?'🎅':'🎄',artTone:'gold'
  }))
 ]},
 {id:'hud',icon:'🎨',title:'Bedienoberfläche',subtitle:'Farbtöne und Anordnung der rechten Spielblöcke',items:[
  ...Object.entries(HUD_TONES).map(([id,t])=>avail('tone-'+id,t.label,{kind:'appearance',field:'hudTone',value:id,icon:'▤',hudTheme:t,description:'Farben der rechten DOG-Spielblöcke. Außer dem Standard können diese Farben beim einfachen Rubbellos freigeschaltet werden.',artTone:'azure',
    status:id==='classic'?'available':'planned',unlockId:id==='classic'?null:'christmas2026:hud-tone:'+id})),
  ...Object.entries(HUD_LAYOUTS).map(([id,t])=>avail('layout-'+id,t.label+' · Anordnung',{kind:'appearance',field:'hudLayout',value:id,icon:'☷',description:t.description,artTone:'azure'})),
 ]}
];
// The extension catalog is intentionally empty until new content is actually built.
// Future content may be registered without changing the gallery.
// A future collection edit must never accidentally mark an event item
// 'available' before Render has verified the player's individual unlock.
export const DOG_COLLECTION_CATEGORIES=Object.freeze(
 buildDogCollection(BASE_COLLECTION_CATEGORIES).map(category=>Object.freeze({
  ...category,
  items:Object.freeze(category.items.map(item=>isChristmasRewardLocked(item)
   ?Object.freeze({...item,status:'planned'}):item))
 }))
);
export const dogCollectionStats=(category=null)=>{
 const entries=category?.items||DOG_COLLECTION_CATEGORIES.flatMap(x=>x.items);
 return {total:entries.length,available:entries.filter(x=>x.status==='available').length,
   planned:entries.filter(x=>x.status==='planned').length};
};
export const dogCollectionCategory=id=>DOG_COLLECTION_CATEGORIES.find(c=>c.id===id)||DOG_COLLECTION_CATEGORIES[0];
