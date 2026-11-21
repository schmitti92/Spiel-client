import {isVerifiedCosmeticUnlocked,isVerifiedDogPlayerLevelAtLeast} from './verified-cosmetics.js?v=3';
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
    && (/^\.\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|svg)$/i.test(path)
       || /^\.\/Bilder\/Spielhintergrundbilder\/[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(path));
}
export function assetBackground(path,fallback){
  if(!validAssetPath(path))return fallback;
  return 'url("'+path+'") center / cover no-repeat, '+fallback;
}

export const DEFAULT_APPEARANCE=Object.freeze({
  board:'studio',
  boardFrame:'classic',
  scene:'schloss',
  pieces:'classic',
  pieceShape:'solid',
  cards:'classic',
  sidebar:'schloss',
  hudLayout:'classic',
  hudTone:'classic',
  hudOpacity:Object.freeze({players:null,piles:null,hand:null,extras:null}),
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
  royalMarmor:{label:"Royal-Marmor · Gold",image:"./assets/boards/royal-marmor.webp",fallbackImage:"./assets/boards/schiefer.svg",page:"radial-gradient(circle at 45% 18%,#071b35,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#262d46","#f4d891","#32374c","#b99c62","#151b2e"],surface:["#123d6a","#09264d","#061331"],center:["#10335a","#061731"],edge:"#e4ba67",route:"#d9b66a"},
  maerchental:{label:"Märchental · Sonnenuntergang",image:"./Bilder/Spielhintergrundbilder/maerchental.webp",fallbackImage:"./assets/boards/bergsee.svg",page:"radial-gradient(circle at 45% 18%,#38745b,#06121c 85%)",frame:'linear-gradient(145deg,#4e6755,#10282b)',wood:["#41633e","#e9c78b","#426b4a","#ac9671","#2e442e"],surface:["#367b65","#24654f","#193b38"],center:["#3f6a59","#112e36"],edge:"#efc983",route:"#dfbf85"},
  alpenland:{label:"Alpenland · Schloss",image:"./Bilder/Spielhintergrundbilder/alpenland.webp",fallbackImage:"./assets/boards/bergsee.svg",page:"radial-gradient(circle at 45% 18%,#183c3f,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#455a49","#e2c19a","#50684f","#ad9870","#26382a"],surface:["#2a675e","#23584e","#0a2c31"],center:["#28534f","#0d2730"],edge:"#e3c888",route:"#b8af78"},
  kuestenabenteuer:{label:"Küstenabenteuer · Leuchtturm",image:"./Bilder/Spielhintergrundbilder/kuestenabenteuer.webp",fallbackImage:"./assets/boards/bergsee.svg",page:"radial-gradient(circle at 45% 18%,#0d263e,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#203f5a","#e6bd83","#335e78","#a07b5b","#1d3148"],surface:["#17486a","#0d2c4b","#07182e"],center:["#103b58","#07223a"],edge:"#d8bb83",route:"#6aafca"},
  royalKarten:{label:"Royal-Karten · Sammleredition",image:"./Bilder/Spielhintergrundbilder/royal-karten.webp",fallbackImage:"./assets/boards/goldwellen.svg",page:"radial-gradient(circle at 45% 18%,#0b1c3c,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#283e5c","#e7bd70","#1e3056","#ba9c61","#111c37"],surface:["#1b4677","#0f3060","#071939"],center:["#17345f","#071d3f"],edge:"#e9c480",route:"#81a9d7"},
  zauberwald:{label:"Zauberwald · Wasserfälle",image:"./Bilder/Spielhintergrundbilder/zauberwald.webp",fallbackImage:"./assets/boards/pergament.svg",page:"radial-gradient(circle at 45% 18%,#102f26,#06121c 85%)",frame:'linear-gradient(145deg,#253a47,#0b1f2a)',wood:["#284a35","#e2c17b","#345b43","#8a8547","#153025"],surface:["#2a6951","#145445","#092a30"],center:["#245640","#082b2d"],edge:"#d4c18b",route:"#79bca3"},
  weihnachtsdorf:{"label":"🎄 Weihnachtsdorf · Weihnachtsevent","image":"./Bilder/Spielhintergrundbilder/dog_weihnachten_01_weihnachtsdorf.webp","unlockId":"christmas2026:board:weihnachtsdorf","fallbackImage":"./assets/boards/bergsee.svg","page":"radial-gradient(circle at 45% 18%,#244961,#081e33 85%)","frame":"linear-gradient(145deg,#426982,#10283e)","wood":["#31566c","#d8e8e9","#4c7183","#aac8c8","#233d55"],"surface":["#5185a1","#305c7c","#102d4d"],"center":["#377086","#123e5b"],"edge":"#d5edf5","route":"#a5d3e4"},
  lebkuchenwerkstatt:{"label":"🍪 Lebkuchenwerkstatt · Weihnachtsevent","image":"./Bilder/Spielhintergrundbilder/dog_weihnachten_02_lebkuchenwerkstatt.webp","unlockId":"christmas2026:board:lebkuchenwerkstatt","fallbackImage":"./assets/boards/holz.svg","page":"radial-gradient(circle at 45% 18%,#79431f,#27140e 85%)","frame":"linear-gradient(145deg,#794529,#2c1912)","wood":["#78431e","#e4be7a","#885327","#bb8850","#432310"],"surface":["#ac713e","#7c4627","#432414"],"center":["#b87a4b","#462413"],"edge":"#ffe2ab","route":"#e0ad6b"},
  polarlichtpalast:{"label":"✨ Polarlichtpalast · Weihnachtsevent","image":"./Bilder/Spielhintergrundbilder/dog_weihnachten_03_polarlichtpalast.webp","unlockId":"christmas2026:board:polarlichtpalast","fallbackImage":"./assets/boards/bergsee.svg","page":"radial-gradient(circle at 45% 18%,#265b87,#0a1b40 85%)","frame":"linear-gradient(145deg,#3d648e,#141d4f)","wood":["#253d6a","#d3e7f4","#365986","#89add2","#172850"],"surface":["#397da2","#225479","#132c5b"],"center":["#346f8e","#182f63"],"edge":"#c8f2ff","route":"#9bd5f5"},
  winterlandschaft:{"label":"❄️ Winterlandschaft · Weihnachtsevent","image":"./Bilder/Spielhintergrundbilder/a_highly_detailed_realistic_winter_landscape_scen.png","unlockId":"christmas2026:board:winterlandschaft","fallbackImage":"./assets/boards/bergsee.svg","page":"radial-gradient(circle at 45% 18%,#315a83,#152744 85%)","frame":"linear-gradient(145deg,#58718d,#23344e)","wood":["#465b70","#e4d7bf","#526d87","#c3b99f","#273e5c"],"surface":["#587c9b","#385877","#263950"],"center":["#47708d","#223b5e"],"edge":"#f5e6bf","route":"#bfddf4"}
});
/** Event board artwork is catalogued now but cannot be selected until the
 * Weihnachtsevent awards ownership. Unlocks must come from validated event
 * progress, never from a query parameter or an untrusted localStorage flag.
 * Future event integration should connect its verified entitlements here.
 */
export function isBoardUnlocked(id){
  const board=BOARD_STYLES[id];
  return Boolean(board) && (!board.unlockId||isVerifiedCosmeticUnlocked(board.unlockId));
}
/** Scenic page backgrounds are NOT board designs.
 * Only assets/backgrounds contains selectable page wallpapers.
 * Old scene IDs (the board pictures) safely normalize to 'schloss'.
 */
/** Outer board-card border only, independent of SVG track and board imagery.
 * A consistent 2px border and zero geometry changes on all nine frame variants.
 * The classic option intentionally leaves the existing game shell untouched.
 */
export const BOARD_FRAMES=deepFreeze({
 classic:{label:'Originalrahmen',description:'Glas & warmes Gold',stroke:'#f5c86f',inner:'#ffe4ac33',glow:'#f5c86f44',fill:'rgba(5,21,40,.36)',radius:'16px',glowSize:'0px'},
 royal:{label:'Königsgold',description:'Doppelgold · Edel',stroke:'#ffe09b',inner:'#f0bd60',glow:'#e6ab51aa',fill:'linear-gradient(145deg,rgba(103,69,22,.75),rgba(26,25,28,.65))',radius:'17px',glowSize:'17px'},
 silver:{label:'Silber',description:'Kühler Metallrahmen',stroke:'#e3ebf5',inner:'#8e9fb2',glow:'#a5c6e566',fill:'linear-gradient(145deg,rgba(65,79,100,.75),rgba(16,28,45,.65))',radius:'15px',glowSize:'12px'},
 timber:{label:'Dunkles Holz',description:'Rustikale Holzfassung',stroke:'#b9864b',inner:'#6f3f23',glow:'#b36f3766',fill:'linear-gradient(145deg,rgba(93,55,28,.79),rgba(39,24,19,.67))',radius:'12px',glowSize:'11px'},
 obsidian:{label:'Obsidian',description:'Tiefschwarz · Minimal',stroke:'#7b899b',inner:'#172032',glow:'#7693b744',fill:'linear-gradient(145deg,rgba(15,20,34,.91),rgba(4,8,18,.73))',radius:'11px',glowSize:'9px'},
 emerald:{label:'Smaragd',description:'Leuchtendes Waldgrün',stroke:'#8de0b4',inner:'#1d8e65',glow:'#29cb8c99',fill:'linear-gradient(145deg,rgba(12,72,52,.72),rgba(7,30,27,.68))',radius:'17px',glowSize:'17px'},
 glacier:{label:'Eiskristall',description:'Helles eisiges Blau',stroke:'#d8f9ff',inner:'#75c9ec',glow:'#81d6f9aa',fill:'linear-gradient(145deg,rgba(29,90,127,.72),rgba(8,29,60,.67))',radius:'18px',glowSize:'18px'},
 ruby:{label:'Rubinrot',description:'Rotgold & Glanz',stroke:'#f0a6b7',inner:'#b73659',glow:'#e2446a9c',fill:'linear-gradient(145deg,rgba(99,30,54,.75),rgba(45,13,27,.66))',radius:'17px',glowSize:'16px'},
 violet:{label:'Mystisches Violett',description:'Magischer Lichtschimmer',stroke:'#ddc1ff',inner:'#8757c6',glow:'#ae80f2aa',fill:'linear-gradient(145deg,rgba(67,34,108,.76),rgba(24,15,45,.66))',radius:'20px',glowSize:'18px'}
});
export const SCENE_STYLES=deepFreeze({
  schloss:{
    label:'Magisches Schloss am Nebelsee',
    description:'Unser erstes echtes Hintergrundbild',
    image:'./assets/backgrounds/dog-hintergrund-magisches-schloss.png'
  },
  none:{
    label:'Ohne Hintergrundbild',
    description:'Neutraler Hintergrund ohne Motiv',
    image:null,
    page:'linear-gradient(145deg,#173344,#071521)'
  },
  winterwald:{label:'Märchenhafter Weihnachtswald',description:'Exklusiver Lichtertal-Vollbild-Hintergrund',image:'./assets/backgrounds/Lichtertal_Vollbild_Neu_01_Maerchenwald.webp',unlockId:'christmas2026:scene:01'},
  mondnacht:{label:'Realistische Mondnacht',description:'Exklusiver Lichtertal-Vollbild-Hintergrund',image:'./assets/backgrounds/Lichtertal_Vollbild_Neu_02_Realistische_Mondnacht.webp',unlockId:'christmas2026:scene:02'},
  weihnachtskarte:{label:'Aquarell-Weihnachtskarte',description:'Exklusiver Lichtertal-Vollbild-Hintergrund',image:'./assets/backgrounds/Lichtertal_Vollbild_Neu_03_Weihnachtskarte_Aquarell.webp',unlockId:'christmas2026:scene:03'},
  lowpoly:{label:'Winterwelt in Low-Poly-3D',description:'Exklusiver Lichtertal-Vollbild-Hintergrund',image:'./assets/backgrounds/Lichtertal_Vollbild_Neu_04_Low_Poly_3D.webp',unlockId:'christmas2026:scene:04'},
  polarlichtfjord:{label:'Magischer Polarlicht-Fjord',description:'Exklusiver Lichtertal-Vollbild-Hintergrund',image:'./assets/backgrounds/Lichtertal_Vollbild_Neu_05_Magischer_Polarlicht_Fjord.webp',unlockId:'christmas2026:scene:05'}
});
/* Right-hand cockpit backgrounds are deliberately independent of board art.
   Add a verified repo-owned image here to offer another choice in Settings. */
export const SIDEBAR_BACKGROUNDS=deepFreeze({
  schloss:{
    label:'🏰 Magisches Schloss am Nebelsee',
    image:'./assets/backgrounds/dog-hintergrund-magisches-schloss.png'
  },
  none:{label:'🌑 Ohne Hintergrundbild',image:null}
});
/** The play HUD is cosmetic: one safe layout today, expandable later. */
export const HUD_LAYOUTS=deepFreeze({
  classic:{label:'Klassisch',description:'Spieler oben, Karten darunter, Extras am Ende'}
});
/** Approved text-readable themes for the RIGHT game modules only.
 * Board, game-piece player colors and all hit targets are unaffected.
 */
export const HUD_TONES=deepFreeze({
  classic:{label:'Original · Glasblau',swatch:'#174d74',panel:'rgba(9,39,69,.34)',seat:'rgba(4,27,53,.70)',inner:'rgba(5,28,55,.48)',button:'rgba(7,34,65,.72)',border:'rgba(218,202,170,.28)',accent:'#f0cb89',text:'#f8f4ec',muted:'#c7d9e5'},
  midnight:{label:'Mitternachtsblau',swatch:'#1e387c',panel:'rgba(12,24,67,.88)',seat:'rgba(9,20,52,.96)',inner:'rgba(8,19,49,.90)',button:'rgba(24,40,99,.97)',border:'rgba(126,159,235,.65)',accent:'#c4d7ff',text:'#f1f6ff',muted:'#cbdbf2'},
  forest:{label:'Waldgrün',swatch:'#23664b',panel:'rgba(12,50,40,.89)',seat:'rgba(10,39,32,.96)',inner:'rgba(10,44,33,.91)',button:'rgba(17,72,52,.96)',border:'rgba(117,191,145,.72)',accent:'#c7efba',text:'#f5fff0',muted:'#c9e4d5'},
  burgundy:{label:'Bordeaux',swatch:'#843653',panel:'rgba(74,24,47,.89)',seat:'rgba(51,14,35,.96)',inner:'rgba(64,19,41,.91)',button:'rgba(102,32,63,.96)',border:'rgba(229,145,171,.66)',accent:'#ffd0dc',text:'#fff5f8',muted:'#efcbd5'},
  violet:{label:'Violett',swatch:'#6944a5',panel:'rgba(51,31,83,.89)',seat:'rgba(34,21,62,.96)',inner:'rgba(42,25,69,.91)',button:'rgba(82,51,132,.96)',border:'rgba(196,158,236,.69)',accent:'#ebd3ff',text:'#fcf8ff',muted:'#dfd1f0'},
  graphite:{label:'Graphit',swatch:'#4b5968',panel:'rgba(30,42,51,.91)',seat:'rgba(21,32,42,.96)',inner:'rgba(26,38,47,.92)',button:'rgba(50,64,76,.96)',border:'rgba(181,199,210,.62)',accent:'#e5eef2',text:'#f6fbfc',muted:'#cedde3'},
  bronze:{label:'Bronze & Sand',swatch:'#866038',panel:'rgba(67,47,29,.91)',seat:'rgba(52,37,26,.96)',inner:'rgba(60,43,28,.92)',button:'rgba(111,71,31,.96)',border:'rgba(232,185,119,.70)',accent:'#ffe0ac',text:'#fff7e9',muted:'#ead9bd'},
  ruby:{label:'Rubinrot',swatch:'#a82b49',panel:'rgba(71,17,39,.91)',seat:'rgba(45,11,27,.96)',inner:'rgba(59,14,34,.93)',button:'rgba(105,25,53,.95)',border:'rgba(236,125,156,.72)',accent:'#ffc1cf',text:'#fff5f8',muted:'#f4cad4'},
  coral:{label:'Koralle',swatch:'#d46c66',panel:'rgba(85,41,45,.90)',seat:'rgba(59,25,32,.96)',inner:'rgba(72,32,39,.92)',button:'rgba(153,73,77,.94)',border:'rgba(255,165,154,.68)',accent:'#ffe1c2',text:'#fff8f1',muted:'#f3d5c9'},
  mandarin:{label:'Mandarin',swatch:'#d17726',panel:'rgba(81,42,15,.92)',seat:'rgba(54,29,14,.96)',inner:'rgba(67,35,15,.93)',button:'rgba(136,69,15,.97)',border:'rgba(244,163,85,.72)',accent:'#ffe0a9',text:'#fff7e9',muted:'#f2d6b0'},
  sunGold:{label:'Sonnengold',swatch:'#cf9d2b',panel:'rgba(67,54,19,.91)',seat:'rgba(43,35,11,.96)',inner:'rgba(55,44,15,.93)',button:'rgba(114,88,18,.96)',border:'rgba(239,211,111,.76)',accent:'#fff0b2',text:'#fff9e5',muted:'#eee2b9'},
  olive:{label:'Olivgrün',swatch:'#728a3d',panel:'rgba(42,57,24,.93)',seat:'rgba(28,41,15,.97)',inner:'rgba(36,49,20,.95)',button:'rgba(73,99,36,.96)',border:'rgba(179,215,103,.72)',accent:'#e1f4ac',text:'#f6ffe9',muted:'#d8e6c1'},
  emerald:{label:'Smaragd',swatch:'#0b8e70',panel:'rgba(7,64,54,.91)',seat:'rgba(6,43,37,.97)',inner:'rgba(9,55,46,.95)',button:'rgba(9,112,89,.96)',border:'rgba(94,221,169,.73)',accent:'#b1ffe1',text:'#edfff8',muted:'#b9e7d8'},
  turquoise:{label:'Türkis',swatch:'#1999a0',panel:'rgba(7,59,66,.91)',seat:'rgba(6,42,50,.96)',inner:'rgba(9,51,58,.94)',button:'rgba(10,102,112,.96)',border:'rgba(109,226,225,.73)',accent:'#bdf9f4',text:'#f0ffff',muted:'#bce6e9'},
  iceBlue:{label:'Eisblau',swatch:'#4e92bd',panel:'rgba(26,52,76,.93)',seat:'rgba(12,37,60,.97)',inner:'rgba(19,44,66,.95)',button:'rgba(38,94,139,.95)',border:'rgba(144,211,248,.73)',accent:'#d2f3ff',text:'#f4fcff',muted:'#c6e2f4'},
  magenta:{label:'Magenta',swatch:'#af4f99',panel:'rgba(76,27,70,.92)',seat:'rgba(53,17,48,.97)',inner:'rgba(67,25,63,.94)',button:'rgba(133,42,117,.96)',border:'rgba(231,146,218,.72)',accent:'#ffcfef',text:'#fff4fc',muted:'#f1cce9'},
  roseGold:{label:'Roségold',swatch:'#bc8588',panel:'rgba(74,40,46,.93)',seat:'rgba(51,27,31,.97)',inner:'rgba(63,34,40,.94)',button:'rgba(128,76,84,.96)',border:'rgba(234,180,174,.74)',accent:'#ffe0d8',text:'#fff8f5',muted:'#eddbd9'}
});
export const PIECE_STYLES=deepFreeze({
  classic:{label:'Klassisch',colors:['#e65f58','#4c9bfa','#5ac68d','#e8b84e']},
  pastel:{label:'Pastell',colors:['#ec8a91','#94bfff','#9ed8ad','#f0d48f']},
  neon:{label:'Neon',colors:['#ff5366','#40c7ff','#40e6a4','#ffd050']},
  contrast:{label:'Hoher Kontrast',colors:['#ff493a','#2b87ff','#00c778','#ffdf00']}
});
// Shape and color palette can be selected independently.
// Use a new ID for the gated 3D edition: old "classic" preferences migrate
// naturally to the new solid default rather than preselecting a level reward.
export const PIECE_SHAPES=deepFreeze({
  solid:{label:'Vollflächige Farb-Spielsteine'},
  classic3d:{label:'Klassische 3D-Figuren',minPlayerLevel:4}
});
export const isPieceShapeUnlocked=id=>{
  const shape=PIECE_SHAPES[id];
  return Boolean(shape&&(!shape.minPlayerLevel||isVerifiedDogPlayerLevelAtLeast(shape.minPlayerLevel)));
};
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

// Only the fully illustrated card edition is published. Other CARD_STYLES
// entries are unfinished color mockups, not collectible card decks.
export const PUBLISHED_CARD_STYLE_IDS=Object.freeze(['classic']);
export const isCardStylePublished=id=>PUBLISHED_CARD_STYLE_IDS.includes(id);

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
  boardFrame:BOARD_FRAMES,
  scene:SCENE_STYLES,
  sidebar:SIDEBAR_BACKGROUNDS,
  hudLayout:HUD_LAYOUTS,
  hudTone:HUD_TONES,
  pieces:PIECE_STYLES,
  pieceShape:PIECE_SHAPES,
  cards:CARD_STYLES,
  event:EVENT_PACKS
});
/** Independent fill opacity (0–100%) for the four right-side HUD blocks.
 * null preserves the existing theme styling for old designs and players.
 * Only panel surfaces are tinted: text, cards, active seat and controls stay solid.
 */
export const HUD_OPACITY_BLOCKS=Object.freeze(['players','piles','hand','extras']);
/** Create a solid-color surface with the user's chosen transparency.
 * Reads only predefined theme colors and a normalized percentage.
 */
export function hudOpacityColor(tone,part,percent){
  const source=String(tone?.[part]||'');
  const rgb=/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(source);
  if(!rgb||typeof percent!=='number'||!Number.isFinite(percent))return 'transparent';
  const opacity=Math.max(0,Math.min(100,percent))/100;
  return 'rgba('+rgb[1]+','+rgb[2]+','+rgb[3]+','+opacity+')';
}
export function normalizeHudOpacity(value){
  const raw=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const out={};
  for(const key of HUD_OPACITY_BLOCKS){
    const v=raw[key];
    out[key]=typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100?Math.round(v):null;
  }
  return out;
}
export function normalizeAppearance(value){
  const next={...DEFAULT_APPEARANCE,hudOpacity:normalizeHudOpacity(value?.hudOpacity)};
  if(!value||typeof value!=='object'||Array.isArray(value))return next;
  for(const [category,registry] of Object.entries(APPEARANCE_CATEGORIES)){
    const id=value[category];
    if(typeof id==='string' && Object.hasOwn(registry,id) && (category!=='board' || isBoardUnlocked(id)) && (category!=='pieceShape' || isPieceShapeUnlocked(id)) && (category!=='cards' || isCardStylePublished(id)) &&
      (category!=='hudTone'||id==='classic'||isVerifiedCosmeticUnlocked('christmas2026:hud-tone:'+id)) &&
      (category!=='scene'||!registry[id].unlockId||isVerifiedCosmeticUnlocked(registry[id].unlockId)))next[category]=id;
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
    cards:event.cards&&isCardStylePublished(event.cards)?event.cards:picked.cards
  };
  return {
    selected:picked,board:BOARD_STYLES[chosen.board],boardFrame:BOARD_FRAMES[picked.boardFrame],scene:SCENE_STYLES[picked.scene],sidebar:SIDEBAR_BACKGROUNDS[chosen.sidebar],
    hudLayout:HUD_LAYOUTS[picked.hudLayout],hudTone:HUD_TONES[picked.hudTone],
    pieces:PIECE_STYLES[chosen.pieces],pieceShape:chosen.pieceShape,cards:CARD_STYLES[chosen.cards],
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
