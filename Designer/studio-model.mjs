/** Pure project document model for the independent Spielseiten-Studio.
 * No application API, Firebase, Render, accounts or live-game state involved.
 */
export const STUDIO_VERSION=1;
export const STUDIO_STORAGE_KEY='spielseiten-studio-project-v1';
export const STUDIO_FORMATS=Object.freeze({'1440x810':[1440,810],'1024x768':[1024,768],'390x844':[390,844]});
export const STUDIO_TYPES=Object.freeze(['text','panel','rect','circle','button','image','bar','player','arrow','note']);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const limited=(v,a,b,f)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):f;
const safeText=(v,max,f='')=>typeof v==='string'?v.slice(0,max):f;
export const safeColor=(v,f='#ffffff')=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v)?v:f;
export const safeImage=(v)=>typeof v==='string'&&v.length<=8_000_000&&
 /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)?v:'';
export const studioId=()=>globalThis.crypto?.randomUUID?.()||
 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
export const itemTypeLabel=type=>({text:'Text',panel:'Glas-Panel',rect:'Rechteck',
 circle:'Kreis',button:'Button',image:'Bild',bar:'LP-Leiste',
 player:'Spielerkarte',arrow:'Pfeil',note:'Notiz'})[type]||'Element';
const samples={text:'Neue Überschrift',panel:'Informationsfenster',rect:'Bereich',circle:'',
 button:'⚔️ Aktion',image:'🖼 Hier ein Bild einfügen',bar:'Boss-LP · 66 %',
 player:'Chris\nBereit ✓',arrow:'',note:'✎ Deine Idee'};
const baseStyle={fontSize:26,color:'#f7f1e6',fill:'#20334d',stroke:'#e6bd77',
 borderWidth:0,radius:20,opacity:80,blur:0,shadow:false,bold:false,align:'center',
 locked:false,hidden:false,progress:66,src:''};
export function createItem(type='panel',x=120,y=120,w=null,h=null,text=null,options={}){
 if(!STUDIO_TYPES.includes(type))type='panel';
 const sizes={text:[420,82],panel:[400,220],rect:[280,150],circle:[180,180],
  button:[300,84],image:[330,230],bar:[600,66],player:[245,150],
  arrow:[160,85],note:[290,170]};
 const [dw,dh]=sizes[type];const item={id:studioId(),type,x,y,
  w:w??dw,h:h??dh,text:text??samples[type],...baseStyle};
 if(type==='text')Object.assign(item,{opacity:0,fontSize:43,bold:true,align:'left'});
 if(type==='panel')Object.assign(item,{opacity:60,blur:12,borderWidth:2,shadow:true});
 if(type==='rect')Object.assign(item,{opacity:45,borderWidth:2,radius:4});
 if(type==='circle')Object.assign(item,{opacity:63,borderWidth:3,radius:100});
 if(type==='button')Object.assign(item,{fill:'#e4ae5e',color:'#172438',fontSize:25,
  opacity:100,bold:true,borderWidth:2,radius:17,shadow:true});
 if(type==='image')Object.assign(item,{fill:'#20344f',opacity:65,borderWidth:2});
 if(type==='bar')Object.assign(item,{fill:'#291d2f',opacity:95,borderWidth:3,fontSize:23,bold:true});
 if(type==='player')Object.assign(item,{fill:'#283c56',opacity:83,borderWidth:2,blur:8,fontSize:20,bold:true});
 if(type==='arrow')Object.assign(item,{fill:'#f7cf83',opacity:92,stroke:'#f7cf83'});
 if(type==='note')Object.assign(item,{fill:'#f5df98',color:'#303040',opacity:92,
  fontSize:19,align:'left',borderWidth:0,radius:8,shadow:true});
 return {...item,...options};
}
export function createScene(name,backgroundColor='#10243e'){
 return {id:studioId(),name,background:{color:backgroundColor,image:'',
  fit:'cover',overlay:'#091325',overlayOpacity:35,blur:0},items:[]};
}
function buildBoss(){
 const names=['Vor dem Kampf','Boss erscheint','Minispiel','Sieg','Niederlage'];
 const screens=names.map((n,i)=>createScene(n,['#142d47','#3d2026','#203448','#1b4538','#332039'][i]));
 const add=(i,type,x,y,w,h,text,opts={})=>screens[i].items.push(createItem(type,x,y,w,h,text,opts));
 // Scene 1: rally lobby with visible preparation and three player slots.
 add(0,'text',56,32,780,70,'TOR 10  ·  DER ASCHEWÄCHTER',{fontSize:42});
 add(0,'bar',55,123,1315,48,'BOSS-LP  25.000 / 25.000',{progress:100});
 add(0,'circle',570,217,300,300,'',{fill:'#522b37',borderWidth:4,stroke:'#f2ae71',opacity:70,blur:8});
 add(0,'text',620,275,230,170,'🐉',{fontSize:120,align:'center'});
 add(0,'text',515,524,425,58,'Gemeinsam gegen den Boss!',{fontSize:32,align:'center'});
 for(let n=0;n<3;n++)add(0,'player',72+n*436,624,370,120,
  ['👤  CHRIS\nBereit machen','🤖  NOVA\nBereit machen','🤖  TITAN\nBereit machen'][n]);
 add(0,'button',1075,40,286,70,'⚔️ Kampf starten');
 // Scene 2: dramatic entrance.
 add(1,'text',70,45,1220,70,'⚠️ EIN MÄCHTIGER GEGNER ERSCHEINT',{fontSize:44,align:'center',color:'#ffe1b4'});
 add(1,'circle',456,157,530,470,'',{fill:'#8f352e',opacity:50,borderWidth:5,stroke:'#f8b162',blur:16});
 add(1,'text',522,205,400,360,'🔥🐉',{fontSize:165,align:'center'});
 add(1,'panel',278,656,890,116,'DER ASCHEWÄCHTER  ·  Der Boden beginnt zu beben …',{fontSize:31,align:'center'});
 // Scene 3: overlay minigame while boss remains visible.
 add(2,'text',48,25,740,75,'TOR 10  ·  BOSS-PHASE',{fontSize:39});
 add(2,'bar',52,120,1333,49,'BOSS-LP  66 %');
 add(2,'circle',62,224,335,320,'',{fill:'#49273f',opacity:45,blur:8});
 add(2,'text',84,290,290,140,'🐉',{fontSize:104,align:'center'});
 add(2,'panel',425,200,860,420,'',{fill:'#17253c',opacity:84,blur:16,stroke:'#eec78d',borderWidth:3});
 add(2,'text',486,239,760,70,'🧠  REAKTION · MATHE',{fontSize:35,align:'center'});
 add(2,'text',670,328,370,89,'7 + 8 = ?',{fontSize:66,align:'center'});
 for(let n=0;n<3;n++)add(2,'button',525+n*250,478,215,83,['12','15','18'][n],{fontSize:38});
 add(2,'text',600,642,520,75,'⏱️  Noch 5 Sekunden',{fontSize:29,align:'center'});
 add(2,'player',80,649,300,98,'👤  CHRIS\nAusweichbereit',{fontSize:20});
 // Scene 4: outcome
 add(3,'text',280,74,880,90,'🏆  BOSS BESIEGT!',{fontSize:68,align:'center',color:'#d8ffde'});
 add(3,'circle',548,208,354,350,'',{fill:'#205946',stroke:'#9bffd6',borderWidth:4,opacity:66});
 add(3,'text',590,262,280,230,'🏆',{fontSize:152,align:'center'});
 add(3,'panel',380,589,690,96,'✨ Belohnungen und nächstes Tor anzeigen',{fontSize:27,align:'center'});
 add(3,'button',535,706,373,72,'➡ Weiter zu Tor 11');
 // Scene 5: loss and retry.
 add(4,'text',290,65,860,95,'💀  BOSS-KAMPF VERLOREN',{fontSize:61,align:'center',color:'#ffe2db'});
 add(4,'circle',555,220,330,330,'',{fill:'#803a44',stroke:'#f29a87',borderWidth:4,opacity:62});
 add(4,'text',610,276,230,195,'⚔️',{fontSize:133,align:'center'});
 add(4,'panel',343,587,756,112,'Team verstärken · 10 Minuten warten oder Testmodus nutzen',{fontSize:25,align:'center'});
 add(4,'button',540,712,360,72,'↻ Erneut versuchen');
 return {version:STUDIO_VERSION,id:studioId(),name:'100 Tore · Boss-Arena',
  width:1440,height:810,screens};
}
function buildForge(){
 const screens=['Schmiede','Waffe verbessern','Materialien','Upgrade-Erfolg']
  .map((n,i)=>createScene(n,['#473022','#372b26','#293b40','#28413a'][i]));
 const add=(i,...args)=>screens[i].items.push(createItem(...args));
 add(0,'text',54,43,940,92,'⚒️  DIE SCHMIEDE',{fontSize:64});
 add(0,'panel',72,167,730,478,'🔥  Waffen und Rüstungen\n\nHier kommen große Schmiedefeuer, Modelle und Effekte hin.',
  {fontSize:39,align:'center',opacity:51,blur:12});
 add(0,'button',919,215,410,98,'⚔️ Waffe verbessern');
 add(0,'button',919,341,410,98,'🛡️ Rüstung verbessern');
 add(0,'button',919,466,410,98,'📦 Materiallager');
 add(0,'panel',65,703,1300,77,'Chris   ·   Eisen: 125   ·   Mithril: 4   ·   Drachenstahl: 0');
 add(1,'text',70,45,900,85,'⚔️  WAFFE VERBESSERN',{fontSize:53});
 add(1,'panel',70,157,747,513,'Hier soll die Waffe groß mit Level und Upgrade-Effekt stehen.',{fontSize:30});
 add(1,'panel',890,166,450,245,'Benötigte Materialien\n⚒ Eisen   ✦ Kristalle',{fontSize:30});
 add(1,'button',907,484,430,104,'🔥 VERBESSERN');
 add(2,'text',76,39,900,91,'📦  DEIN MATERIALLAGER',{fontSize:54});
 for(let i=0;i<6;i++)add(2,'panel',90+(i%3)*435,187+Math.floor(i/3)*238,373,194,
  ['Eisen','Holz','Stein','Kristall','Mithril','Drachenstahl'][i],{fontSize:32});
 add(3,'text',225,65,960,95,'✨ UPGRADE ERFOLGREICH ✨',{fontSize:64,align:'center'});
 add(3,'circle',530,220,380,380,'',{stroke:'#f9da8e',borderWidth:4,opacity:52});
 add(3,'text',570,270,303,245,'⚔️',{fontSize:142,align:'center'});
 add(3,'button',510,676,420,81,'Weiter schmieden');
 return {version:STUDIO_VERSION,id:studioId(),name:'100 Tore · Schmiede',
  width:1440,height:810,screens};
}
function buildLobby(){
 const screens=['Hauptlobby','Spielauswahl','Raum & Spieler']
  .map((n,i)=>createScene(n,['#23354b','#213047','#262e44'][i]));
 const add=(i,...args)=>screens[i].items.push(createItem(...args));
 add(0,'text',145,69,1150,100,'🏰  WILLKOMMEN IN DER SPIELLOBBY',{fontSize:57,align:'center'});
 add(0,'panel',72,226,623,390,'🎲  DEAL OR NO DEAL',{fontSize:51});
 add(0,'panel',745,226,623,390,'🚪  100 TORE',{fontSize:55});
 add(0,'button',511,681,411,88,'🎮 SPIEL STARTEN');
 add(1,'text',250,77,940,94,'WÄHLE DEIN SPIEL',{fontSize:58,align:'center'});
 for(let i=0;i<4;i++)add(1,'panel',93+i*327,280,279,280,
  ['🎲 Kniffel','🏰 100 Tore','🐕 DOG','🎯 Minispiele'][i],{fontSize:35});
 add(2,'text',370,75,700,80,'👥  EUER SPIELRAUM',{fontSize:56,align:'center'});
 for(let i=0;i<3;i++)add(2,'player',115+i*440,297,367,243,['Chris','David','Vanessa'][i],{fontSize:36});
 add(2,'button',536,669,390,94,'✅ Bereit');
 return {version:STUDIO_VERSION,id:studioId(),name:'Spielportal · Lobby',
  width:1440,height:810,screens};
}
export function createTemplate(type='boss'){
 if(type==='forge')return buildForge();
 if(type==='lobby')return buildLobby();
 if(type==='empty')return {version:STUDIO_VERSION,id:studioId(),name:'Neues Design-Projekt',
  width:1440,height:810,screens:[createScene('Freie Ansicht')]};
 return buildBoss();
}
export function normalizeProject(source){
 if(!plain(source)||!Array.isArray(source.screens)||!source.screens.length)
  throw Error('INVALID_PROJECT');
 if(source.screens.length>40)throw Error('TOO_MANY_SCENES');
 const formats=Object.values(STUDIO_FORMATS);
 const width=limited(source.width,300,3000,1440),height=limited(source.height,300,2000,810);
 if(!formats.some(([w,h])=>w===width&&h===height))throw Error('INVALID_FORMAT');
 const screens=source.screens.map(raw=>{
  if(!plain(raw))throw Error('INVALID_SCENE');
  const back=plain(raw.background)?raw.background:{};
  const background={color:safeColor(back.color,'#10243e'),image:safeImage(back.image),
   fit:back.fit==='contain'?'contain':'cover',
   overlay:safeColor(back.overlay,'#091325'),
   overlayOpacity:limited(back.overlayOpacity,0,100,35),blur:limited(back.blur,0,16,0)};
  if(!Array.isArray(raw.items)||raw.items.length>160)throw Error('INVALID_ITEMS');
  const items=raw.items.map(r=>{
   if(!plain(r)||!STUDIO_TYPES.includes(r.type))throw Error('INVALID_ITEM');
   const it=createItem(r.type,0,0);
   it.id=studioId();it.x=limited(r.x,0,3000,50);it.y=limited(r.y,0,2000,50);
   it.w=limited(r.w,10,3000,200);it.h=limited(r.h,10,2000,100);
   it.text=safeText(r.text,1500,'');it.fontSize=limited(r.fontSize,8,170,25);
   it.color=safeColor(r.color,'#ffffff');it.fill=safeColor(r.fill,'#22354a');
   it.stroke=safeColor(r.stroke,'#e6bd77');it.borderWidth=limited(r.borderWidth,0,16,0);
   it.radius=limited(r.radius,0,300,12);it.opacity=limited(r.opacity,0,100,80);
   it.blur=limited(r.blur,0,28,0);it.progress=limited(r.progress,0,100,66);
   it.bold=r.bold===true;it.shadow=r.shadow===true;
   it.locked=r.locked===true;it.hidden=r.hidden===true;
   it.align=['left','center','right'].includes(r.align)?r.align:'center';
   it.src=safeImage(r.src);
   return it;
  });
  return {id:studioId(),name:safeText(raw.name,65,'Neue Ansicht')||'Neue Ansicht',
   background,items};
 });
 return {version:STUDIO_VERSION,id:studioId(),name:safeText(source.name,70,'Neues Projekt')||'Neues Projekt',
  width,height,screens};
}
export const clamp=(number,min,max)=>Math.max(min,Math.min(max,number));
/** Resize any visual component using the 8 edge/corner handles.
 * Dragging west/north repositions the corresponding top/left edges.
 * Works equally for bars, text, panels, circles and uploaded images.
 * All output coordinates remain inside the active canvas. */
export function resizeItemFrame(frame,direction,dx,dy,canvasWidth,canvasHeight,snap=false){
 const original={x:Number(frame.x),y:Number(frame.y),w:Number(frame.w),h:Number(frame.h)};
 if(!/^(n|s|e|w|ne|nw|se|sw)$/.test(direction))return {...original};
 const cw=Math.max(40,Number(canvasWidth)||1440),ch=Math.max(40,Number(canvasHeight)||810);
 const minW=Math.min(24,cw),minH=Math.min(24,ch);
 const tick=value=>snap?Math.round(value/20)*20:Math.round(value);
 let x1=clamp(original.x,0,cw-minW),x2=clamp(original.x+original.w,x1+minW,cw);
 let y1=clamp(original.y,0,ch-minH),y2=clamp(original.y+original.h,y1+minH,ch);
 if(direction.includes('w'))x1=clamp(tick(original.x+dx),0,x2-minW);
 if(direction.includes('e'))x2=clamp(tick(original.x+original.w+dx),x1+minW,cw);
 if(direction.includes('n'))y1=clamp(tick(original.y+dy),0,y2-minH);
 if(direction.includes('s'))y2=clamp(tick(original.y+original.h+dy),y1+minH,ch);
 return {x:x1,y:y1,w:x2-x1,h:y2-y1};
}
export const rgba=(hex,alpha=100)=>{
 const c=safeColor(hex);return 'rgba('+[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)).join(',')+','+
  clamp(Number(alpha)||0,0,100)/100+')';
};
