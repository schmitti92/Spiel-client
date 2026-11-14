/** DOG collection catalog.
 * Registry entries are available cosmetic choices, NOT proof of event ownership.
 * Future rewards are labelled planned and may never be equipped locally.
 */
import {BOARD_STYLES,SCENE_STYLES,PIECE_STYLES,CARD_STYLES,HUD_TONES,HUD_LAYOUTS} from './appearance-registry.js?v=18';
import {DOG_EMOJIS,DOG_EMOJI_STARTERS} from './dog-emojis.js?v=1';
const planned=(id,name,icon,description,artTone='indigo')=>({id,name,icon,description,artTone,status:'planned'});
const avail=(id,name,extra={})=>({id,name,status:'available',...extra});
export const DOG_COLLECTION_CATEGORIES=Object.freeze([
 {id:'backgrounds',icon:'🏞️',title:'Hintergründe',subtitle:'Landschaften für die gesamte DOG-Seite',items:[
  ...Object.entries(SCENE_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'scene',image:t.image||null,description:t.description||'Seitenhintergrund für DOG',icon:id==='none'?'🌑':'🏰',artTone:'azure'})),
  planned('polarlicht','Polarlichter','🌌','Zukünftige Event-Landschaft','cyan'),
  planned('winterdorf','Winterdorf','❄️','Geplantes Winter-Event','azure'),
  planned('zauberbaum','Magischer Baum','🌳','Zukünftige Event-Landschaft','violet')
 ]},
 {id:'boards',icon:'🎲',title:'Spielbretter',subtitle:'Bestehende DOG-Bretter und neue Designs',items:[
  ...Object.entries(BOARD_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'board',image:t.image||null,fallbackImage:t.fallbackImage||null,background:t.page||'',description:'Brettmotiv. Die offiziellen DOG-Felder bleiben unverändert.',icon:'🐾',artTone:'wood'})),
  planned('future-board-crystal','Kristallbrett','💎','Geplantes Design für ein zukünftiges Event','violet'),
  planned('future-board-fire','Feuerbrett','🔥','Geplantes Design für ein zukünftiges Event','ember')
 ]},
 {id:'pieces',icon:'♟️',title:'Spielfiguren',subtitle:'Farbsets jetzt, besondere Formen später',items:[
  ...Object.entries(PIECE_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'pieces',palette:t.colors,description:'Aktueller Farbstil für die Spielfiguren; noch keine neue Figurenform.',icon:'♟️',artTone:'azure'})),
  planned('pawns-jewel','Edelsteinfiguren','💎','Zukünftige Figurenform','cyan'),
  planned('pawns-paws','DOG-Pfotenfiguren','🐾','Zukünftige Figurenform','gold'),
  planned('pawns-animals','Tierfiguren','🦊','Zukünftige Figurenform','forest'),
  planned('pawns-royal','Königliche Figuren','♛','Zukünftige Figurenform','gold'),
  planned('pawns-magic','Magische Leuchtfiguren','✨','Zukünftige Figurenform','violet')
 ]},
 {id:'avatars',icon:'👤',title:'Profilbilder',subtitle:'Dein eigenes Bild für den Spielstatus',items:[
  ...Array.from({length:16},(_,i)=>avail('avatar-'+i,'Profilbild '+(i+1),{kind:'avatar',avatar:i,description:'Bereits verfügbares DOG-Profilbild, auswählbar in der Lobby.',icon:'👤'})),
  planned('avatar-dragon','Drachenmeister','🐉','Zukünftiges Event-Profilbild','ember'),
  planned('avatar-winter','Eiskönig','❄️','Zukünftiges Event-Profilbild','cyan'),
  planned('avatar-phoenix','Phönix','🔥','Zukünftiges Event-Profilbild','ember'),
  planned('avatar-knight','Ritter','🛡️','Zukünftiges Event-Profilbild','gold')
 ]},
 {id:'frames',icon:'🛡️',title:'Namensrahmen',subtitle:'Jeder Spieler kann später seinen eigenen Rahmen tragen',items:[
  avail('frame-current','Klassischer Rahmen',{kind:'default',icon:'🛡️',description:'Der aktuell verwendete DOG-Spielerrahmen. Zusätzliche Rahmenformen sind noch nicht eingebaut.',artTone:'gold'}),
  planned('frame-elegant','Klassisch Elegant · A','👑','Die ausgewählte neue Standardform ist noch nicht im Spiel integriert.','gold'),
  planned('frame-crystal','Kristallrahmen','💎','Freischaltbar in einem späteren Event','violet'),
  planned('frame-dragon','Drachenrahmen','🐉','Freischaltbar in einem späteren Event','ember'),
  planned('frame-winter','Winterrahmen','❄️','Freischaltbar in einem späteren Event','cyan')
 ]},
 {id:'emblems',icon:'👑',title:'Aktivsymbole',subtitle:'Das Symbol des Spielers, der gerade am Zug ist',items:[
  avail('emblem-crown','Goldene Krone',{kind:'default',icon:'👑',description:'Standardsymbol des aktiven Spielers.',artTone:'gold'}),
  ...[['dragon','Drachenkrone','🐉','ember'],['phoenix','Phönix','🔥','ember'],['diamond','Diamant','💎','cyan'],['lion','Goldener Löwe','🦁','gold'],['star','Magischer Stern','🌟','gold'],['knight','Ritterwappen','🛡️','azure'],['moon','Mondzepter','🌙','violet'],['trophy','Goldpokal','🏆','gold'],['wolf','Wolfswappen','🐺','azure'],['wings','Kristallflügel','🪽','cyan']].map(([id,name,icon,tone])=>planned('emblem-'+id,name,icon,'Später als Event-Belohnung freischaltbar',tone))
 ]},
 {id:'emojis',icon:'😄',title:'Emojis',subtitle:'Fünf Schnellplätze · 50 Emojis im Katalog',items:DOG_EMOJIS.map(item=>({
  id:item.id,name:item.name,icon:item.emoji,kind:'emoji',status:DOG_EMOJI_STARTERS.includes(item.id)?'available':'planned',
  description:DOG_EMOJI_STARTERS.includes(item.id)?'Starter-Emoji: in deinen fünf Schnellplätzen verwendbar.':'Für ein späteres Event vorgesehen.',artTone:'azure'
 }))},
 {id:'cards',icon:'🃏',title:'Kartendesigns',subtitle:'Kartenthemen unabhängig von den Spielregeln',items:[
  ...Object.entries(CARD_STYLES).map(([id,t])=>avail(id,t.label,{kind:'appearance',field:'cards',cardTheme:t,description:'Optische DOG-Kartengestaltung. Die Kartenwerte bleiben unverändert.',icon:t.emblem,artTone:'gold'})),
  planned('card-dragon','Drachenkarten','🐉','Zukünftige Event-Kartenoptik','ember'),
  planned('card-star','Sternenkarten','🌌','Zukünftige Event-Kartenoptik','violet')
 ]},
 {id:'effects',icon:'✨',title:'Spezialeffekte',subtitle:'Künftige kosmetische Animationen',items:[
  planned('effect-winner','Goldener Siegesregen','🏆','Zukünftiger Siegereffekt','gold'),
  planned('effect-trail','Magische Spur','✨','Zukünftiger Figureneffekt','violet'),
  planned('effect-fireworks','Feuerwerk','🎆','Zukünftiger Siegereffekt','ember'),
  planned('effect-snow','Schneeflocken','❄️','Zukünftiger Wintereffekt','cyan')
 ]},
 {id:'hud',icon:'🎨',title:'Bedienoberfläche',subtitle:'Farbtöne und Anordnung der rechten Spielblöcke',items:[
  ...Object.entries(HUD_TONES).map(([id,t])=>avail('tone-'+id,t.label,{kind:'appearance',field:'hudTone',value:id,icon:'▤',palette:[t.swatch,t.accent,t.text],description:'Bereits auswählbarer Farbton für die Bedienoberfläche.',artTone:'azure'})),
  ...Object.entries(HUD_LAYOUTS).map(([id,t])=>avail('layout-'+id,t.label+' · Anordnung',{kind:'appearance',field:'hudLayout',value:id,icon:'☷',description:t.description,artTone:'azure'})),
  planned('hud-layout-compact','Kompakte Anordnung','▤','Neue Anordnung für ein zukünftiges Update','azure'),
  planned('hud-layout-wide','Breite Anordnung','▦','Neue Anordnung für ein zukünftiges Update','azure')
 ]}
]);
export const dogCollectionStats=(category=null)=>{
 const entries=category?.items||DOG_COLLECTION_CATEGORIES.flatMap(x=>x.items);
 return {total:entries.length,available:entries.filter(x=>x.status==='available').length,
   planned:entries.filter(x=>x.status==='planned').length};
};
export const dogCollectionCategory=id=>DOG_COLLECTION_CATEGORIES.find(c=>c.id===id)||DOG_COLLECTION_CATEGORIES[0];
