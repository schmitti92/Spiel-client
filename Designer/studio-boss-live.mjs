/** Editable, visual-only live-boss wireframe shared by all four minigames.
 * All seven screens use exactly the same boss/LP/timer/team coordinates.
 * The studio does not simulate, award, or connect to the real multiplayer game.
 */
export function buildLiveBossTemplate({createScene,createItem,studioId,version}){
 const scenes=[
  ['Kampfbeginn','#281c2c'],['Reaktion','#231d32'],
  ['Blitz-Mathe','#262039'],['Ausweichen','#222d39'],
  ['Zieltreffer','#29243b'],['Sieg','#203a32'],
  ['Niederlage','#39252f']
 ].map(([name,color])=>createScene(name,color));
 const colors={gold:'#ffdc9b',white:'#f9f1e9',mint:'#b5ffcf',red:'#ffd0c8'};
 const add=(n,type,x,y,w,h,label,props={})=>{
  const item=createItem(type,x,y,w,h,label,props);scenes[n].items.push(item);
  return item;
 };
 const txt=(n,x,y,w,h,value,size=28,opts={})=>
  add(n,'text',x,y,w,h,value,{fontSize:size,align:'center',color:colors.white,...opts});
 const panel=(n,x,y,w,h,opts={})=>
  add(n,'panel',x,y,w,h,'',{fill:'#182437',opacity:80,blur:11,
   stroke:'#d6a566',borderWidth:2,radius:18,...opts});
 const btn=(n,x,y,w,h,value,opts={})=>
  add(n,'button',x,y,w,h,value,{fontSize:23,fill:'#e5ae62',color:'#212332',...opts});
 const note=(n,value)=>
  txt(n,50,752,1340,39,value,17,{color:'#c8d2e3'});

 for(let n=0;n<scenes.length;n++){
  scenes[n].background.overlay='#081122';
  scenes[n].background.overlayOpacity=n===5?22:33;
  // Entire composition is one 1440 x 810 screen, no separate section below.
  panel(n,29,18,1382,90,{fill:'#1b1b33',opacity:87,radius:18});
  txt(n,52,33,815,54,'🐉  TOR 10 · DER ASCHEWÄCHTER',38,
   {align:'left',bold:true,color:colors.gold});
  txt(n,915,36,464,49,'⚔️  30 SEKUNDEN BOSS-SHOW',21,
   {align:'right',bold:true,color:colors.gold});
  add(n,'bar',42,125,928,57,n===5?'BOSS-LP · 0 / 25.000':
   n===6?'BOSS-LP · 1.533 / 25.000':'BOSS-LP · 25.000 / 25.000',
   {fill:'#491e2c',stroke:'#ffb978',borderWidth:3,radius:21,
    progress:n===5?0:n===6?6:100,fontSize:23,color:colors.white,bold:true});
  panel(n,985,121,414,65,{fill:'#352432',opacity:90,stroke:'#ecbf76'});
  txt(n,994,133,394,44,n===5?'🏆  SIEG':n===6?'💀  ENDE':'⏱️  00:23',
   27,{bold:true,color:colors.gold});

  // Boss remains on the left in every phase.
  panel(n,40,205,420,453,{fill:'#382036',opacity:61,stroke:'#f0b575'});
  add(n,'circle',107,252,285,280,'',
   {fill:'#78392e',stroke:'#f7a65c',borderWidth:4,opacity:62,radius:150,blur:10});
  txt(n,116,309,272,199,'🔥\n🪨',78,{bold:true,color:colors.gold});
  txt(n,71,553,360,64,'DER ASCHEWÄCHTER',25,
   {bold:true,color:colors.gold});
  txt(n,91,615,320,30,'BOSS · Feuer & Asche',17,{color:'#f7d3b2'});

  // Central challenge slot is the ONLY zone that changes with each mini.
  panel(n,484,205,626,453,{fill:'#18283e',opacity:83,stroke:'#e4c084',blur:16});

  // Three player cards remain in place on the right, including feedback.
  panel(n,1125,205,275,453,{fill:'#17263e',stroke:'#8aadd0',opacity:85});
  txt(n,1140,220,247,49,'🛡️  DEIN TEAM',25,{bold:true,color:colors.gold});
  ['CHRIS','NOVA','TITAN'].forEach((name,i)=>{
   add(n,'player',1146,289+i*102,236,86,
    ['⚔️  CHRIS\nBereit ✓','✨  NOVA\nBereit ✓','🛡️  TITAN\nBereit ✓'][i],
    {fill:i===0?'#243d49':'#25354a',opacity:90,stroke:'#7faeaa',
     borderWidth:2,radius:14,fontSize:20,bold:true,color:colors.white});
  });
  // Footer is a part of the same canvas, not a scrolling second section.
  panel(n,40,674,1360,119,{fill:'#141e32',opacity:90,stroke:'#c89c6e'});
 }
 // Start scene.
 txt(0,535,239,520,69,'⚔️  DER KAMPF BEGINNT',35,{bold:true,color:colors.gold});
 txt(0,554,332,486,75,'Der Aschewächter lädt\nseinen ersten Angriff …',25);
 btn(0,613,470,368,86,'🔥  3 · 2 · 1  LOS!',{fill:'#bf794d',color:'#fff1d9'});
 txt(0,568,578,460,40,'Bereit für drei zufällige Aufgaben',20);
 note(0,'Kampfstart · Boss, Helden, LP und Zeit bleiben immer sichtbar');

 // Reaction.
 txt(1,514,232,568,65,'⚡ REAKTION · RUNDE 1/3',32,{bold:true,color:colors.gold});
 txt(1,533,307,524,64,'Drücke, wenn die Anzeige grün ist!',22);
 add(1,'bar',549,391,499,47,'',
  {fill:'#182a42',stroke:'#70bee4',borderWidth:2,progress:62,opacity:95});
 add(1,'rect',777,391,95,47,'',{fill:'#3ed3a8',opacity:75,borderWidth:0,radius:7});
 btn(1,639,483,328,88,'⚡  JETZT DRÜCKEN',{fill:'#385ea3',color:colors.white,fontSize:25});
 txt(1,633,592,341,38,'⏱️  3 Sekunden',22,{color:colors.mint});
 note(1,'Reaktionsspiel · Trefferbereich, Button und Boss gleichzeitig sichtbar');

 // Math.
 txt(2,512,234,573,58,'🧮 BLITZ-MATHE · RUNDE 2/3',31,
  {bold:true,color:colors.gold});
 txt(2,649,326,312,97,'7 + 15 = ?',56,{bold:true,color:colors.white});
 [18,20,22].forEach((answer,i)=>btn(2,531+i*188,472,165,84,String(answer),
  {fill:'#4b417e',color:colors.white,fontSize:36}));
 txt(2,649,582,319,42,'⏱️  6 Sekunden',22,{color:colors.mint});
 note(2,'Blitz-Mathe · große Antwortfelder, kurze Eingabezeit');

 // Dodge.
 txt(3,508,229,574,62,'🛡️ AUSWEICHEN · RUNDE 1–3',31,
  {bold:true,color:colors.gold});
 txt(3,544,302,503,66,'Der Boss greift von vorne an!\nWohin weichst du aus?',24);
 ['⬅ LINKS','⬆ MITTE','RECHTS ➡'].forEach((choice,i)=>
  btn(3,522+i*191,458,182,94,choice,{fill:'#3b6381',
   color:colors.white,fontSize:19}));
 txt(3,619,577,360,44,'⏱️  Reagiere sofort!',22,{color:colors.mint});
 note(3,'Ausweichen · wähle rechtzeitig die sichere Richtung');

 // Target.
 txt(4,521,226,556,69,'🎯 ZIELTREFFER · RUNDE 1–3',32,
  {bold:true,color:colors.gold});
 txt(4,548,291,502,51,'Treffe den leuchtenden Schwachpunkt!',20);
 add(4,'circle',675,346,240,216,'',
  {fill:'#2d4861',opacity:75,stroke:'#79c6eb',borderWidth:4,radius:140});
 add(4,'circle',735,396,118,115,'',
  {fill:'#d06b48',opacity:85,stroke:'#ffd58b',borderWidth:5,radius:100});
 txt(4,736,412,115,75,'🎯',45,{bold:true});
 txt(4,634,585,354,33,'⏱️  Schnell und präzise',19,{color:colors.mint});
 note(4,'Zieltreffer · deine Trefffläche kann größer oder kleiner gestaltet werden');

 // Result scenes are placeholders, not real rewards or simulated victory.
 txt(5,522,239,559,71,'🏆  BOSS BESIEGT!',43,{bold:true,color:colors.mint});
 txt(5,526,322,538,70,'Die Gruppe hat den Wächter\nzurückgedrängt!',24);
 panel(5,564,445,465,120,{fill:'#264537',opacity:90,stroke:'#a2e2b4'});
 txt(5,583,462,429,87,'🎁  Belohnungen hier anzeigen\n(nur serverbestätigte Gewinne)',20);
 btn(5,630,576,336,62,'➡ NÄCHSTES TOR',{fill:'#649f75',color:colors.white});
 note(5,'Sieg · Belohnungen erst nach echter Serverbestätigung');

 txt(6,529,239,548,69,'💀  BOSS HAT ÜBERLEBT',38,
  {bold:true,color:colors.red});
 txt(6,543,323,520,63,'Der nächste Versuch braucht\nmehr Stärke und gutes Timing.',23);
 panel(6,563,434,466,111,{fill:'#473037',opacity:90,stroke:'#e4a6a4'});
 txt(6,573,447,439,86,'⏳  Kampfpause: 10 Minuten\n(Testmodus kann sie deaktivieren)',20,{color:'#ffe0ce'});
 btn(6,622,572,358,68,'⚒️  ZUR SCHMIEDE',{fill:'#92564d',color:colors.white});
 note(6,'Niederlage · Fortschritt und Pausenzeit sind später servergesteuert');

 return {version,id:studioId(),name:'100 Tore · Bosskampf LIVE · Entwurf',
  width:1440,height:810,screens:scenes};
}
