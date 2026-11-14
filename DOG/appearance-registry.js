/**
 * DOG presentation/content registry.
 *
 * The rule engine and its saved/network state never include appearance IDs.
 * Every entry below is visual-only and can be extended without altering the
 * card types, team ownership, track indices or the transport protocol.
 *
 * Add official art as a repository-relative boardImage/cardImage here later.
 * Do not use user-provided URLs or store DOM/HTML in a registry entry.
 */
export const APPEARANCE_STORAGE_KEY='dog:appearance:v1';
/** Relative, repository-owned images only. No remote or traversal URLs. */
export function validAssetPath(path){
  return typeof path==='string'
    && /^\.\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|svg)$/i.test(path);
}
export function assetBackground(path,fallback){
  if(!validAssetPath(path))return fallback;
  return 'url("'+path+'") center / cover no-repeat, '+fallback;
}

export const DEFAULT_APPEARANCE=Object.freeze({
  board:'studio',
  pieces:'classic',
  cards:'classic',
  event:'none'
});
const deepFreeze=obj=>{
  if(obj && typeof obj==='object' && !Object.isFrozen(obj)){
    Object.values(obj).forEach(deepFreeze);Object.freeze(obj);
  }
  return obj;
};
export const BOARD_STYLES=deepFreeze({
  studio:{
    label:'TV-Studio · Klassisch',image:null,
    page:'radial-gradient(ellipse 50% 42% at 28% 7%,#173b4d 0%,transparent 74%),radial-gradient(ellipse 45% 65% at 93% 80%,#132a3b 0%,transparent 72%),#07121e',
    frame:'linear-gradient(145deg,#193b46,#0c1e2f)',
    wood:['#5f422c','#cca471','#6e4930','#a5774e','#4c3223'],
    surface:['#194e83','#123963','#061c35'],
    center:['#133c62','#071d37'],edge:'#7ca9cb',route:'#4b85a9'
  },
  midnight:{
    label:'Mitternacht · Dunkel',image:null,
    page:'radial-gradient(circle at 25% 5%,#182446,transparent 52%),#050b1b',
    frame:'linear-gradient(145deg,#1c2544,#0b1327)',
    wood:['#30334c','#7982ac','#3b3f67','#5c648e','#232942'],
    surface:['#263761','#172344','#070e25'],
    center:['#25325b','#0a142e'],edge:'#a4b7e9',route:'#8b9ee0'
  },
  forest:{
    label:'Waldlichtung · Grün',image:null,
    page:'radial-gradient(circle at 30% 15%,#345944,transparent 50%),#081f22',
    frame:'linear-gradient(145deg,#254a3c,#0c2a2a)',
    wood:['#58412c','#bd9864','#63462e','#926c47','#493221'],
    surface:['#2b6550','#17483e','#09262b'],
    center:['#2d5446','#092b2d'],edge:'#b2d4bb',route:'#91b7a3'
  },
  winter:{
    label:'Winterabend · Eisblau',image:null,
    page:'radial-gradient(circle at 25% 5%,#315778,transparent 55%),#071725',
    frame:'linear-gradient(145deg,#2b5064,#10283e)',
    wood:['#4c6479','#c1d4e5','#69899f','#9cb6cc','#395569'],
    surface:['#376e98','#225075','#102b50'],
    center:['#2e658d','#0d3459'],edge:'#d6f0ff',route:'#a3d6f4'
  },
  schiefer:{label:"Schiefer · Klassisch",image:"./assets/boards/schiefer.svg",page:"radial-gradient(circle at 45% 18%,#0b121c,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#272b32","#c9ab72","#222935","#4c515e","#1a1e28"],surface:["#27323d","#1c2430","#101722"],center:["#272d3c","#0c1220"],edge:"#d3ad6c",route:"#99999b"},
  pergament:{label:"Pergament · Vintage",image:"./assets/boards/pergament.svg",page:"radial-gradient(circle at 45% 18%,#7d6649,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#7f6142","#d2b583","#8a6f50","#af926f","#6e5032"],surface:["#dbc99d","#d6b886","#a8895e"],center:["#7c5d40","#3e2e1e"],edge:"#bb9e6a",route:"#ab8c64"},
  holz:{label:"Holz · Natürlich",image:"./assets/boards/holz.svg",page:"radial-gradient(circle at 45% 18%,#29170e,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#50301b","#bc8d5c","#563421","#976947","#352013"],surface:["#94623b","#774726","#3e2418"],center:["#5d3c2a","#27170c"],edge:"#d1a06d",route:"#d1ac6a"},
  bergsee:{label:"Bergsee · Ruhe",image:"./assets/boards/bergsee.svg",page:"radial-gradient(circle at 45% 18%,#183d59,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#48627a","#b8d4d9","#435d6f","#719bac","#2d465b"],surface:["#4b93ac","#2d6d90","#173c5b"],center:["#275a75","#0b344f"],edge:"#d2eaf2",route:"#a3cadd"},
  goldwellen:{label:"Goldlinien · Elegant",image:"./assets/boards/goldwellen.svg",page:"radial-gradient(circle at 45% 18%,#0d131b,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#2c313b","#e8c891","#3a3f47","#a38555","#161b26"],surface:["#222c3c","#171d2c","#0c1119"],center:["#192339","#0b1124"],edge:"#ebc882",route:"#cbaa70"},
  royalMarmor:{label:"Royal-Marmor · Gold",image:"./assets/boards/royal-marmor.webp",page:"radial-gradient(circle at 45% 18%,#071b35,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#262d46","#f4d891","#32374c","#b99c62","#151b2e"],surface:["#123d6a","#09264d","#061331"],center:["#10335a","#061731"],edge:"#e4ba67",route:"#d9b66a"},
  alpenland:{label:"Alpenland · Schloss",image:"./assets/boards/alpenland.webp",page:"radial-gradient(circle at 45% 18%,#183c3f,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#455a49","#e2c19a","#50684f","#ad9870","#26382a"],surface:["#2a675e","#23584e","#0a2c31"],center:["#28534f","#0d2730"],edge:"#e3c888",route:"#b8af78"},
  kuestenabenteuer:{label:"Küstenabenteuer · Leuchtturm",image:"./assets/boards/kuestenabenteuer.webp",page:"radial-gradient(circle at 45% 18%,#0d263e,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#203f5a","#e6bd83","#335e78","#a07b5b","#1d3148"],surface:["#17486a","#0d2c4b","#07182e"],center:["#103b58","#07223a"],edge:"#d8bb83",route:"#6aafca"},
  royalKarten:{label:"Royal-Karten · Sammleredition",image:"./assets/boards/royal-karten.webp",page:"radial-gradient(circle at 45% 18%,#0b1c3c,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#283e5c","#e7bd70","#1e3056","#ba9c61","#111c37"],surface:["#1b4677","#0f3060","#071939"],center:["#17345f","#071d3f"],edge:"#e9c480",route:"#81a9d7"},
  zauberwald:{label:"Zauberwald · Wasserfälle",image:"./assets/boards/zauberwald.webp",page:"radial-gradient(circle at 45% 18%,#102f26,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#284a35","#e2c17b","#345b43","#8a8547","#153025"],surface:["#2a6951","#145445","#092a30"],center:["#245640","#082b2d"],edge:"#d4c18b",route:"#79bca3"}
});
export const PIECE_STYLES=deepFreeze({
  classic:{label:'Klassisch',colors:['#e65f58','#4c9bfa','#5ac68d','#e8b84e']},
  pastel:{label:'Pastell',colors:['#ec8a91','#94bfff','#9ed8ad','#f0d48f']},
  neon:{label:'Neon',colors:['#ff5366','#40c7ff','#40e6a4','#ffd050']},
  contrast:{label:'Hoher Kontrast',colors:['#ff493a','#2b87ff','#00c778','#ffdf00']}
});
export const CARD_STYLES=deepFreeze({
  classic:{
    label:'Klassische DOG-Karten',
    face:'linear-gradient(150deg,#f7fafb,#d1e0e9)',
    special:'linear-gradient(150deg,#fcf0dd,#e8be84)',
    border:'#dbe7ef',specialBorder:'#ffe0a3',ink:'#152531',
    back:'repeating-linear-gradient(45deg,#193958 0 8px,#244d6e 8px 16px)',emblem:'🐾'
  },
  royal:{
    label:'Königliches Gold',
    face:'linear-gradient(145deg,#fff3c8,#ebcb79)',
    special:'linear-gradient(145deg,#fff2a8,#d8a442)',
    border:'#c59b43',specialBorder:'#fff0b5',ink:'#513713',
    back:'repeating-linear-gradient(45deg,#8a5b28 0 9px,#a57a37 9px 18px)',emblem:'♛'
  },
  dark:{
    label:'Schwarze Edition',
    face:'linear-gradient(145deg,#253347,#101c30)',
    special:'linear-gradient(145deg,#453556,#251d36)',
    border:'#8ea8c3',specialBorder:'#bc96d5',ink:'#f3f7ff',
    back:'repeating-linear-gradient(45deg,#15192b 0 9px,#374463 9px 18px)',emblem:'✦'
  },
  forest:{
    label:'Waldkarten',
    face:'linear-gradient(145deg,#e4f1d9,#bbd7ad)',
    special:'linear-gradient(145deg,#eff6cc,#a1cb8c)',
    border:'#83a774',specialBorder:'#ddf6ac',ink:'#244a36',
    back:'repeating-linear-gradient(45deg,#315b47 0 9px,#477762 9px 18px)',emblem:'🍃'
  },
  winter:{
    label:'Winterkarten',
    face:'linear-gradient(145deg,#f3faff,#c9e1f5)',
    special:'linear-gradient(145deg,#eaf9ff,#afd3ee)',
    border:'#8cbfe1',specialBorder:'#e4f8ff',ink:'#17466c',
    back:'repeating-linear-gradient(45deg,#386486 0 9px,#5a89ab 9px 18px)',emblem:'❄'
  }
});

/**
 * Future event content may add visuals, quests, rewards and UI in separate
 * modules. An event pack is opt-in and MUST NEVER mutate the classic engine.
 * A server-validated event subsystem is needed for shared progression.
 */
export const EVENT_PACKS=deepFreeze({
  none:{label:'Kein Event',board:null,pieces:null,cards:null}
});
export const APPEARANCE_CATEGORIES=deepFreeze({
  board:BOARD_STYLES,
  pieces:PIECE_STYLES,
  cards:CARD_STYLES,
  event:EVENT_PACKS
});
export function normalizeAppearance(value){
  const next={...DEFAULT_APPEARANCE};
  if(!value||typeof value!=='object'||Array.isArray(value))return next;
  for(const [category,registry] of Object.entries(APPEARANCE_CATEGORIES)){
    const id=value[category];
    if(typeof id==='string' && Object.hasOwn(registry,id))next[category]=id;
  }
  return next;
}
export function resolveAppearance(value){
  const picked=normalizeAppearance(value);
  const event=EVENT_PACKS[picked.event];
  const chosen={
    ...picked,
    board:event.board&&Object.hasOwn(BOARD_STYLES,event.board)?event.board:picked.board,
    pieces:event.pieces&&Object.hasOwn(PIECE_STYLES,event.pieces)?event.pieces:picked.pieces,
    cards:event.cards&&Object.hasOwn(CARD_STYLES,event.cards)?event.cards:picked.cards
  };
  return {
    selected:picked,board:BOARD_STYLES[chosen.board],
    pieces:PIECE_STYLES[chosen.pieces],cards:CARD_STYLES[chosen.cards],
    event
  };
}
export function loadAppearance(storage=typeof localStorage!=='undefined'?localStorage:null){
  try{return normalizeAppearance(JSON.parse(storage?.getItem(APPEARANCE_STORAGE_KEY)||'null'));}
  catch{return normalizeAppearance(null);}
}
export function saveAppearance(value,storage=typeof localStorage!=='undefined'?localStorage:null){
  const selected=normalizeAppearance(value);
  if(storage)storage.setItem(APPEARANCE_STORAGE_KEY,JSON.stringify(selected));
  return selected;
}
