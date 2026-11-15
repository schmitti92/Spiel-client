/** DOG collection catalog.
 * Registry entries are available cosmetic choices, NOT proof of event ownership.
 * Only available, already implemented items appear in the shipped collection.
 */
import {BOARD_STYLES,isBoardUnlocked,SCENE_STYLES,PIECE_STYLES,CARD_STYLES,HUD_TONES,HUD_LAYOUTS} from './appearance-registry.js?v=22';
import {DOG_EMOJIS,DOG_EMOJI_STARTERS,DOG_CHRISTMAS_EMOJIS} from './dog-emojis.js?v=2';
import {CHRISTMAS_AVATARS} from './christmas-avatar-catalog.js?v=1';
import {CHRISTMAS_NAME_FRAMES} from './christmas-nameframe-catalog.js?v=1';
import {CHRISTMAS_ACTIVE_ICONS} from './christmas-activeicon-catalog.js?v=1';
import {buildDogCollection} from './collection-extensions.js?v=2';
const avail=(id,name,extra={})=>({id,name,status:'available',...extra});
const BASE_COLLECTION_CATEGORIES=[
 {id:'backgrounds',icon:'🏞️',title:'Hintergründe',subtitle:'Landschaften für die gesamte DOG-Seite',items:[
  ...Object.entries(SCENE_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'scene',image:t.image||null,description:t.description||'Seitenhintergrund für DOG',icon:id==='none'?'🌑':'🏰',artTone:'azure'})),
 ]},
 {id:'boards',icon:'🎲',title:'Spielbretter',subtitle:'Vorhandene DOG-Spielbrettdesigns',items:[
  ...Object.entries(BOARD_STYLES).filter(([id])=>id!=='royalMarmor').map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'board',image:t.image||null,fallbackImage:t.fallbackImage||null,background:t.page||'',status:isBoardUnlocked(id)?'available':'planned',description:isBoardUnlocked(id)?'Brettmotiv. Die offiziellen DOG-Felder bleiben unverändert.':'🔒 Exklusives Weihnachts-Spielbrett. Wird später durch das Weihnachtsevent freigeschaltet.',icon:'🐾',artTone:'wood'})),
 ]},
 {id:'pieces',icon:'♟️',title:'Spielfiguren',subtitle:'Vorhandene Spielfiguren-Farbsätze',items:[
  ...Object.entries(PIECE_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'pieces',palette:t.colors,description:'Aktueller Farbstil für die Spielfiguren; noch keine neue Figurenform.',icon:'♟️',artTone:'azure'})),
 ]},
 {id:'avatars',icon:'👤',title:'Profilbilder',subtitle:'Dein eigenes Bild für den Spielstatus',items:[
  ...Array.from({length:16},(_,i)=>avail('avatar-'+i,'Profilbild '+(i+1),{kind:'avatar',avatar:i,description:'Bereits verfügbares DOG-Profilbild, auswählbar in der Lobby.',icon:'👤'})),
  ...CHRISTMAS_AVATARS.map(item=>avail(item.id,item.name,{kind:'avatar',avatar:item.avatar,image:item.image,status:'planned',unlockId:item.unlockId,description:'Weihnachtsprofilbild – wird erst durch eine spätere Weihnachtsevent-Belohnung freigeschaltet.',icon:'🎄'})),
 ]},
 {id:'frames',icon:'🛡️',title:'Namensrahmen',subtitle:'Klassischer Rahmen und fünf festliche Weihnachtsvorschauen',items:[
  avail('frame-current','Klassischer Rahmen',{kind:'default',icon:'🛡️',description:'Der aktuell verwendete DOG-Spielerrahmen.',artTone:'gold'}),
  ...CHRISTMAS_NAME_FRAMES.map(frame=>({
   ...frame,kind:'nameFrame',icon:frame.frameIcon,status:'planned',artTone:'gold'
  }))
 ]},
 {id:'emblems',icon:'👑',title:'Aktivsymbole',subtitle:'Die goldene Krone und fünf exklusive Weihnachts-Vorschauen',items:[
  avail('emblem-crown','Goldene Krone',{kind:'default',icon:'👑',description:'Standardsymbol des aktiven Spielers.',artTone:'gold'}),
  ...CHRISTMAS_ACTIVE_ICONS.map(entry=>({
   ...entry,kind:'activeIcon',status:'planned',artTone:'gold'
  }))
 ]},
 {id:'emojis',icon:'😄',title:'Emojis',subtitle:'3 verfügbar · 10 Weihnachts-Emojis noch gesperrt · fünf Schnellplätze',items:[
  ...DOG_EMOJIS.filter(item=>DOG_EMOJI_STARTERS.includes(item.id)).map(item=>({
   id:item.id,name:item.name,icon:item.emoji,kind:'emoji',status:'available',
   description:'Starter-Emoji: in deinen fünf Schnellplätzen verwendbar.',artTone:'azure'
  })),
  ...DOG_CHRISTMAS_EMOJIS.map(item=>({
   id:item.id,name:item.name,icon:item.emoji,kind:'emoji',status:'planned',unlockId:item.unlockId,
   description:'Exklusives Weihnachts-Emoji: wird später einzeln als Eventbelohnung freigeschaltet.',artTone:'ember'
  }))
 ]},
 {id:'cards',icon:'🃏',title:'Kartendesigns',subtitle:'Kartenthemen unabhängig von den Spielregeln',items:[
  ...Object.entries(CARD_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'cards',cardTheme:t,description:'Optische DOG-Kartengestaltung. Die Kartenwerte bleiben unverändert.',icon:t.emblem,artTone:'gold'})),
 ]},
 {id:'hud',icon:'🎨',title:'Bedienoberfläche',subtitle:'Farbtöne und Anordnung der rechten Spielblöcke',items:[
  ...Object.entries(HUD_TONES).map(([id,t])=>avail('tone-'+id,t.label,{kind:'appearance',field:'hudTone',value:id,icon:'▤',hudTheme:t,description:'Originalfarben der DOG-Bedienoberfläche mit echten Flächen, Rahmen und Akzenten.',artTone:'azure'})),
  ...Object.entries(HUD_LAYOUTS).map(([id,t])=>avail('layout-'+id,t.label+' · Anordnung',{kind:'appearance',field:'hudLayout',value:id,icon:'☷',description:t.description,artTone:'azure'})),
 ]}
];
// The extension catalog is intentionally empty until new content is actually built.
// Future content may be registered without changing the gallery.
export const DOG_COLLECTION_CATEGORIES=buildDogCollection(BASE_COLLECTION_CATEGORIES);
export const dogCollectionStats=(category=null)=>{
 const entries=category?.items||DOG_COLLECTION_CATEGORIES.flatMap(x=>x.items);
 return {total:entries.length,available:entries.filter(x=>x.status==='available').length,
   planned:entries.filter(x=>x.status==='planned').length};
};
export const dogCollectionCategory=id=>DOG_COLLECTION_CATEGORIES.find(c=>c.id===id)||DOG_COLLECTION_CATEGORIES[0];
