/* Hammer-Bingo Cinematics v1
 * PURE PRESENTATION. The server is solely responsible for rewards and inventory.
 * No fetch, no Firebase, no state mutations and no prize calculations for awarding.
 */
(() => {
  'use strict';
  const LINES = Object.freeze([
    [0,1,2,3],[4,5,6,7],[8,9,10,11],[12,13,14,15],
    [0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15],
    [0,5,10,15],[3,6,9,12]
  ]);
  const KINDS = Object.freeze({
    single:{name:'Einfach-Hammer', image:'hammer-einfach.webp',emoji:'🔨'},
    double:{name:'Doppel-Hammer', image:'hammer-doppel.webp',emoji:'🔨🔨'},
    lucky:{name:'Glückshammer', image:'hammer-glueck.webp',emoji:'✨🔨'}
  });
  const ASSET_ROOT='./Weihnachtsevent2/Weihnachtsbilder/';
  const byId = id => document.getElementById(id);
  const boardKey = board => board===4 ? 'mixed' : 'common';
  const validLine = value => Number.isInteger(value)&&value>=0&&value<LINES.length;
  const normalAmounts = raw => Object.fromEntries(Object.keys(KINDS).map(key=>[key,Math.max(0,Math.floor(Number(raw?.[key])||0))]));
  const fieldName = board => board===4 ? 'Legendäre Winterwelt' : 'Weihnachtswerkstatt';
  const lineName = line => line<4?'Reihe '+(line+1):line<8?'Spalte '+(line-3):line===8?'Diagonale ↘':'Diagonale ↙';
  const worldClass = board => board===4?'winter':'workshop';
  const copyCards = cards => {
    const safe={};
    for(let n=33;n<=64;n++){const id='christmas-'+String(n).padStart(2,'0');safe[id]=(Number(cards?.[id])||0)>0;}
    return safe;
  };
  const artworkArray = artwork => Array.isArray(artwork)&&artwork.length===32 ? artwork.map(name=>typeof name==='string'&&/^[\w.-]+\.png$/.test(name)?name:null) : [];

  /** Pure, read-only visual scene planning from server-confirmed award response. */
  function plan(payload={}){
    const awarded=Array.isArray(payload.awarded)?payload.awarded:[];
    const jackpots=Array.isArray(payload.jackpots)?payload.jackpots:[];
    const progress=Array.isArray(payload.hammerProgress?.boards)?payload.hammerProgress.boards:[];
    const art=artworkArray(payload.artwork);
    const owned=copyCards(payload.preClaimCards);
    const scenes=[];
    for(const board of [3,4]){
      const lines=awarded.filter(entry=>entry?.board===board&&validLine(entry.line));
      const uniqueLines=[...new Set(lines.map(entry=>entry.line))];
      const jackpot=jackpots.find(entry=>entry?.board===board && Number(entry.cycle)>=1);
      if(!uniqueLines.length&&!jackpot)continue;
      const totals={single:0,double:0,lucky:0};
      for(const award of lines){
        const hammers=normalAmounts(award.hammers);
        for(const kind of Object.keys(KINDS))totals[kind]+=hammers[kind];
      }
      const jackpotAmounts=normalAmounts(jackpot?.hammers);
      for(const kind of Object.keys(KINDS))totals[kind]+=jackpotAmounts[kind];
      const status=progress.find(entry=>entry?.board===board);
      const cycle=jackpot?Number(jackpot.cycle):Math.max(1,Number(status?.cycle)||1);
      const id=[board,cycle,jackpot?'jackpot':'bingo',uniqueLines.join('-')].join(':');
      scenes.push({
        id,board,world:worldClass(board),worldName:fieldName(board),
        kind:jackpot?'jackpot':'bingo',cycle,lines:uniqueLines,totals,
        prize:jackpotAmounts,art,owned,completedBingos:uniqueLines.length,
        title:jackpot?(board===4?'LEGENDÄRER JACKPOT!':'JACKPOT!'):(uniqueLines.length>1?'MEGA-BINGO!':'BINGO!'),
        subtitle:jackpot?'Alle 16 Sammelkarten gefunden!':uniqueLines.length>1
          ?uniqueLines.length+' Bingo-Linien gleichzeitig vollendet!'
          :lineName(uniqueLines[0])+' vollständig gesammelt!'
      });
    }
    return scenes;
  }

  const state={
    queue:[], seen:new Set(), last:[], active:null, closeTimer:null, sound:false,
    soundContext:null, focusBefore:null
  };
  const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const packOpen=()=>!byId('reveal-overlay')?.hidden;
  const canShow=()=>!document.hidden&&!packOpen();

  function prizeList(amounts){
    return Object.entries(KINDS).filter(([kind])=>amounts[kind]>0)
      .map(([kind,meta])=>({kind,meta,count:amounts[kind]}));
  }
  function setSoundUI(){
    const control=byId('hammer-cinema-sound');
    if(!control)return;
    control.textContent=state.sound?'🔊 Ton an':'🔇 Ton aus';
    control.setAttribute('aria-pressed',String(state.sound));
    control.title=state.sound?'Siegesshow-Ton ausschalten':'Siegesshow-Ton einschalten';
  }
  function setReplayUI(){
    const replay=byId('hammer-cinema-replay');
    if(replay){replay.disabled=!state.last.length;replay.title=state.last.length?'Letzte Siegesshow ohne neue Gutschrift wiederholen':'Noch keine Siegesshow verfügbar';}
  }
  function chime(isJackpot=false){
    if(!state.sound)return;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      if(!AudioContext)return;
      const ctx=state.soundContext||(state.soundContext=new AudioContext());
      if(ctx.state==='suspended'){void ctx.resume().catch(()=>{});}
      const now=ctx.currentTime;
      const notes=isJackpot?[523.25,659.25,783.99,1046.5,1318.5]:[523.25,659.25,987.77];
      notes.forEach((freq,i)=>{
        const start=now+i*(isJackpot?.16:.18);
        const oscillator=ctx.createOscillator(),gain=ctx.createGain();
        oscillator.type='sine';oscillator.frequency.setValueAtTime(freq,start);
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(.052,start+.025);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.57);
        oscillator.connect(gain);gain.connect(ctx.destination);
        oscillator.start(start);oscillator.stop(start+.59);
      });
    }catch(_){/* Audio is optional. Never interrupt the reward UI. */}
  }

  function restoreBoard(){
    document.querySelectorAll('.hammer-photo-card.is-cinema-lit,.hammer-line-prize.is-cinema-lit')
      .forEach(element=>element.classList.remove('is-cinema-lit'));
  }
  function pulseBoard(scene){
    restoreBoard();
    const key=boardKey(scene.board);
    const cards=byId('hammer-board-'+key)?.querySelectorAll('.hammer-photo-card');
    const indexes=scene.kind==='jackpot'?Array.from({length:16},(_,i)=>i):
      [...new Set(scene.lines.flatMap(line=>LINES[line]))];
    indexes.forEach(index=>cards?.[index]?.classList.add('is-cinema-lit'));
    for(const index of scene.lines){
      document.querySelector('#hammer-'+key+'-'+(index<4?'rows':index<8?'columns':'diagonals')+
        ' .hammer-line-prize[data-line="'+index+'"]')?.classList.add('is-cinema-lit');
    }
  }

  function drawTiles(scene){
    const grid=byId('hammer-cinema-grid'),svg=byId('hammer-cinema-paths');
    if(!grid||!svg)return;
    grid.replaceChildren();svg.replaceChildren();
    const lit=new Set(scene.kind==='jackpot'?Array.from({length:16},(_,i)=>i):
      scene.lines.flatMap(line=>LINES[line]));
    for(let i=0;i<16;i++){
      const tile=document.createElement('div');
      tile.className='hammer-cinema-tile'+(lit.has(i)?' is-lit':'');
      tile.style.setProperty('--order',String(i));
      const number=scene.board===4?49+i:33+i;
      const key='christmas-'+String(number).padStart(2,'0');
      if(scene.owned[key]&&scene.art[(scene.board-3)*16+i]){
        const pic=document.createElement('img');
        pic.loading='lazy';pic.decoding='async';
        pic.src=ASSET_ROOT+encodeURIComponent(scene.art[(scene.board-3)*16+i]);
        pic.alt='Gesammelte Karte '+number;
        tile.append(pic);
      }else{
        tile.classList.add('is-back');
      }
      const label=document.createElement('span');label.className='hammer-cinema-tile-number';
      label.textContent=String(number);tile.append(label);
      grid.append(tile);
    }
    // A 400x400 logical canvas keeps the magic ray centered through each row,
    // column or diagonal independently of CSS pixel size and viewport.
    for(const [order,index] of scene.lines.entries()){
      const segment=LINES[index],start=segment[0],end=segment.at(-1);
      const x=i=>50+(i%4)*100,y=i=>50+Math.floor(i/4)*100;
      const path=document.createElementNS('http://www.w3.org/2000/svg','line');
      path.setAttribute('x1',String(x(start)));path.setAttribute('y1',String(y(start)));
      path.setAttribute('x2',String(x(end)));path.setAttribute('y2',String(y(end)));
      path.setAttribute('class','hammer-cinema-ray');
      path.style.setProperty('--ray-order',String(order));
      svg.append(path);
    }
  }
  function drawPrizes(scene){
    const root=byId('hammer-cinema-prizes');
    if(!root)return;
    root.replaceChildren();
    const list=prizeList(scene.totals);
    for(const [i,part] of list.entries()){
      const figure=document.createElement('div');
      figure.className='hammer-cinema-prize'+(part.kind==='lucky'?' lucky':'');
      figure.style.setProperty('--prize-order',String(i));
      const img=document.createElement('img');img.src=ASSET_ROOT+part.meta.image;
      img.alt='';img.loading='eager';img.decoding='async';
      const copy=document.createElement('div');
      const count=document.createElement('strong');count.textContent='×'+part.count;
      const name=document.createElement('small');name.textContent=part.meta.name;
      copy.append(count,name);figure.append(img,copy);root.append(figure);
    }
    if(!list.length){
      const empty=document.createElement('span');
      empty.textContent='🏆 Gewinn bereits bestätigt';root.append(empty);
    }
  }
  function drawParticles(){
    const root=byId('hammer-cinema-particles');if(!root)return;
    root.replaceChildren();
    if(reduced())return;
    const colors=['#ffe29d','#ffffff','#9bd9ed','#e3aeff','#ffc877'];
    for(let i=0;i<28;i++){
      const item=document.createElement('i');
      item.style.setProperty('--x',(7+(i*41)%87)+'%');
      item.style.setProperty('--y',(9+(i*29)%83)+'%');
      item.style.setProperty('--delay',((i%9)*.11)+'s');
      item.style.setProperty('--size',(3+i%4*2)+'px');
      item.style.setProperty('--particle-color',colors[i%colors.length]);
      root.append(item);
    }
  }
  function paint(scene){
    const overlay=byId('hammer-cinema');if(!overlay)return;
    overlay.hidden=false;overlay.setAttribute('aria-hidden','false');
    overlay.dataset.world=scene.world;overlay.dataset.kind=scene.kind;overlay.dataset.preview=scene.preview?'true':'false';
    byId('hammer-cinema-world').textContent=(scene.world==='winter'?'👑 ':'🎄 ')+scene.worldName+' · Durchgang '+scene.cycle;
    byId('hammer-cinema-title').textContent=scene.title;
    byId('hammer-cinema-subtitle').textContent=scene.subtitle;
    byId('hammer-cinema-tag').textContent=scene.preview?'✦ VORSCHAU · KEINE GUTSCHRIFT ✦':scene.kind==='jackpot'?'✦ DER GROSSE SAMMLER-JACKPOT ✦':'✦ WEIHNACHTS-BINGO ✦';
    byId('hammer-cinema-prize-title').textContent=scene.kind==='jackpot'
      ?'🎁 Jackpot + Bingo-Belohnungen':'🎁 Deine gewonnenen Hammer';
    byId('hammer-cinema-confirmation').textContent=scene.preview?'🎬 Vorschau: keine Hammer gutgeschrieben':'✓ Bereits deinem Hammer-Konto gutgeschrieben';
    byId('hammer-cinema-footer-note').textContent=scene.preview?'Reine Demo-Animation · Keine Verbindung zum Spielkonto':'Die Gewinne sind sicher gespeichert · Diese Szene vergibt keine weiteren Hammer';
    byId('hammer-cinema-next').textContent=state.queue.length?'Nächsten Gewinn ansehen ›':'Schließen ✓';
    byId('hammer-cinema-close').title='Siegesshow überspringen';
    drawTiles(scene);drawPrizes(scene);drawParticles();pulseBoard(scene);
    overlay.classList.remove('is-playing');
    // Restart GPU-only CSS animations with each new, independent scene.
    void overlay.offsetWidth;
    overlay.classList.add('is-playing');
    state.focusBefore=document.activeElement;
    byId('hammer-cinema-next')?.focus({preventScroll:true});
    chime(scene.kind==='jackpot');
  }
  function finish(){
    if(!state.active)return;
    clearTimeout(state.closeTimer);state.closeTimer=null;
    state.active=null;
    restoreBoard();
    const overlay=byId('hammer-cinema');
    if(overlay){overlay.hidden=true;overlay.setAttribute('aria-hidden','true');overlay.classList.remove('is-playing');}
    if(state.focusBefore?.isConnected){try{state.focusBefore.focus({preventScroll:true})}catch(_){}}
    state.focusBefore=null;
    // Only open a deferred gift AFTER the old scene and its focus are released.
    window.ChristmasShowDirector?.bingoEnded();
    // Deliberate tiny beat between prizes; claim logic never waits for this.
    setTimeout(startNext,170);
  }
  function startNext(){
    if(state.active||!state.queue.length||!canShow())return;
    const director=window.ChristmasShowDirector;
    if(director&&!director.bingoStarted())return;
    const scene=state.queue.shift();
    if(!byId('hammer-cinema')){
      director?.bingoEnded();return;
    }
    state.active=scene;paint(scene);
    state.closeTimer=setTimeout(finish,reduced()?2100:scene.kind==='jackpot'?7100:5400);
  }
  function celebrate(payload){
    const scenes=plan(payload);
    if(!scenes.length)return 0;
    const fresh=scenes.filter(scene=>!state.seen.has(scene.id));
    for(const scene of fresh)state.seen.add(scene.id);
    if(!fresh.length)return 0;
    state.last=fresh;setReplayUI();
    state.queue.push(...fresh);
    // Only confirmed awards are forwarded to the visual director.
    window.ChristmasShowDirector?.awardQueued(fresh.length);
    startNext();
    return fresh.length;
  }
  /** Free local preview: no server call and no account / wallet changes. */
  function preview(artwork=[]){
    if(state.active||state.queue.length||packOpen())return false;
    const preClaimCards={};
    for(const number of [33,34,35,36,...Array.from({length:16},(_,i)=>49+i)]){
      preClaimCards['christmas-'+String(number)]=1;
    }
    const doubleUp=prize=>Object.fromEntries(Object.entries(prize).map(([kind,count])=>[kind,count*2]));
    const catalog=[{single:1},{single:1},{single:1},{single:2},{single:1},
      {single:2},{double:1},{double:1},{double:1},{lucky:1}];
    const previewScenes=plan({
      preClaimCards,artwork,
      hammerProgress:{boards:[{board:3,cycle:1},{board:4,cycle:2}]},
      awarded:[{board:3,line:0,hammers:{single:1}},...catalog.map((amounts,line)=>({
        board:4,line,hammers:doubleUp(amounts)
      }))],
      jackpots:[{board:4,cycle:1,hammers:{double:10,lucky:3}}]
    });
    if(!previewScenes.length)return false;
    state.queue.push(...previewScenes.map(scene=>({...scene,preview:true,id:'demo-'+scene.id})));
    startNext();return true;
  }
  function replay(){
    if(state.active||state.queue.length||!state.last.length)return false;
    state.queue.push(...state.last);
    startNext();return true;
  }
  function resume(){startNext()}
  function init(){
    byId('hammer-cinema-next')?.addEventListener('click',finish);
    byId('hammer-cinema-close')?.addEventListener('click',finish);
    byId('hammer-cinema-replay')?.addEventListener('click',replay);
    byId('hammer-cinema-sound')?.addEventListener('click',()=>{
      state.sound=!state.sound;setSoundUI();
      if(state.sound){
        try{
          const Context=window.AudioContext||window.webkitAudioContext;
          if(Context){state.soundContext ||=new Context();void state.soundContext.resume().catch(()=>{});}
        }catch(_){}
      }
    });
    document.addEventListener('visibilitychange',resume);
    document.addEventListener('christmas-pack-reveal-closed',resume);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&state.active&&!packOpen()){event.preventDefault();finish()}
    });
    setSoundUI();setReplayUI();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  window.HammerBingoCinematics=Object.freeze({celebrate,plan,replay,resume,preview});
})();