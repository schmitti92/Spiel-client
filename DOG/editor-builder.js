/**
 * DOG Board Builder v2: paint a board from zero by tapping cells, with
 * optional snapping to an adjustable centre-anchored grid.
 * The incomplete draft is never passed to game rules or to the live board.
 */
import {
  BOARD_LAYOUT_ID,currentBoardLayout,saveBoardLayout,validateBoardLayout
} from './board-layout.js';
import {
  EDITOR_DRAFT_KEY,clone,emptyDraft,fromCrossPreset,fromLayout,placedCount,
  fieldOf,selectedValid,snapXY,putField,eraseField,nextSlot,inspectDraft,asGameLayout,
  guidedPoint,directedPoint,previousTrackField,measureStepDistances,EIGHT_DIRECTIONS,alignTrackRun
} from './editor-model.js?v=5';
import {referencePoints,buildGoalLane,buildHomeGroup,getTrackConnections,straightGaps,connectStraightGap,SEAT_LABELS} from './board-assistants.js?v=5';

const $=id=>document.getElementById(id);
const board=$('builder-board');
const DRAW_PREF_KEY='spielportal:dog:builder-prefs:v2';
const color=['#ee655b','#57aefa','#59c991','#f2cb68'];
const names=['Rot','Blau','Grün','Gelb'];
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const pair=p=>p.x+','+p.y;
const toRound=n=>Math.round(n*10)/10;
let draft=emptyDraft();
let selected={kind:'track',index:0,owner:0};
let mode='track',tool='place';
let settings={spacing:32,snap:true,grid:true,numbers:true,path:true,symmetry:false,auto:true,guide:true,stepSpacing:32};
let photoObject=null,photoOpacity=.4,hover=null,pointer=null,walkTimer=null,walkStep=-1;
let history=[],historyAt=0,feedbackText='';
let assistantSeat=0,assistantPreview=null,connectionFocus=null,lastGapSignature=null;

// Initial state must be empty, unless a previously autosaved unfinished draft exists.
// The live match board is deliberately not automatically loaded into the editor.
try{
  const stored=localStorage.getItem(EDITOR_DRAFT_KEY);
  if(stored)draft=fromLayout(JSON.parse(stored));
}catch(err){console.warn('[DOG board builder] Invalid autosave ignored',err);}
try{
  const pref=JSON.parse(localStorage.getItem(DRAW_PREF_KEY)||'{}');
  if([28,32,36,40,48].includes(pref.spacing))settings.spacing=pref.spacing;
  if([28,32,36,40,48].includes(pref.stepSpacing))settings.stepSpacing=pref.stepSpacing;
  else settings.stepSpacing=settings.spacing; // Preserve earlier board drafts drawn on a 28-unit grid.
  if(typeof pref.guide==='boolean')settings.guide=pref.guide;
  for(const key of ['snap','grid','numbers','path','symmetry','auto'])if(typeof pref[key]==='boolean')settings[key]=pref[key];
}catch(_){}
history=[clone(draft)];

function persist(){
  try{localStorage.setItem(EDITOR_DRAFT_KEY,JSON.stringify(draft));return true;}
  catch(err){announce('⚠️ Der Browser konnte den Entwurf nicht speichern: '+err.message,'error');return false;}
}
function savePreferences(){
  try{localStorage.setItem(DRAW_PREF_KEY,JSON.stringify(settings));}catch(_){}
}
function announce(message,level=''){
  feedbackText=message;
  $('feedback').textContent=message;
  $('feedback').className='status '+(level||'');
}
function currentPosition(){return fieldOf(draft,selected.kind,selected.index,selected.owner);}
function guidedPlacement(raw,draftSnapshot=draft,{forceExact=false}={}){
 if(forceExact)return {x:raw.x,y:raw.y,guided:false};
 if(settings.guide&&selected.kind==='track'){
   const anchor=previousTrackField(draftSnapshot,selected);
   if(anchor){
     const point=guidedPoint(draftSnapshot,selected,raw,{step:settings.stepSpacing});
     if(!point)throw Error('Die Richtung liegt außerhalb des Bretts. Wähle eine andere Richtung.');
     return {...point,guided:true};
   }
 }
 return {...snapXY(raw,settings.spacing,settings.snap),guided:false};
}
function placeAt(raw,draftSnapshot=draft,{forceExact=false}={}){
 const point=guidedPlacement(raw,draftSnapshot,{forceExact});
 return putField(draftSnapshot,selected,point,{
   symmetry:settings.symmetry,spacing:settings.spacing,snap:false
 });
}
function selectedName(s=selected){
  if(s.kind==='track')return (s.index%16===0?'🔒 Startfeld ':'⚪ Lauffeld ')+s.index+' · '+names[Math.floor(s.index/16)];
  return (s.kind==='goals'?'🎯 Zielfeld ':'🏠 Startplatz ')+(s.index+1)+' · '+names[s.owner];
}
function setSelection(s){
  if(!selectedValid(s))return;
  assistantPreview=null;
  selected={...s};
  mode=s.kind;
  updateControls();
  draw();
}
function maybeNext(){
  if(!settings.auto)return;
  const previous={...selected};
  const count=placedCount(draft);
  if(selected.kind==='track'&&count.track===64){
    if(count.goals<16){selected={kind:'goals',index:0,owner:0};mode='goals';announce('✅ Laufweg vollständig! Jetzt die 16 Zielfelder anlegen.','success');}
    else if(count.homes<16){selected={kind:'homes',index:0,owner:0};mode='homes';}
  }else if(selected.kind==='goals'&&count.goals===16){
    if(count.homes<16){selected={kind:'homes',index:0,owner:0};mode='homes';announce('✅ Alle Zielfelder gesetzt! Jetzt die 16 Startplätze platzieren.','success');}
  }else selected=nextSlot(draft,previous,{symmetry:settings.symmetry});
}
function recordChange(){
  const old=JSON.stringify(history[historyAt]),now=JSON.stringify(draft);
  if(old===now)return false;
  history=history.slice(0,historyAt+1);
  history.push(clone(draft));
  if(history.length>150)history.shift();
  historyAt=history.length-1;
  persist();return true;
}
function updateDraft(next,{record=true,advance=false}={}){
  assistantPreview=null;
  draft=next;
  if(record)recordChange();
  if(advance)maybeNext();
  render();
}
function unwind(direction){
  // A tap on an existing SVG field may lose its pointer-up on some tablets.
  // Do not let an abandoned, stationary pointer block Undo forever.
  if(pointer?.moved)return;
  pointer=null;
  const next=historyAt+direction;
  if(next<0||next>=history.length)return;
  historyAt=next;draft=clone(history[next]);assistantPreview=null;persist();
  render();announce(direction<0?'↶ Letzte Änderung rückgängig gemacht.':'↷ Änderung wiederhergestellt.');
}
function stopPreview(){
  if(walkTimer!==null)clearInterval(walkTimer);
  walkTimer=null;walkStep=-1;draw();
}
function showPreview(){
  if(walkTimer!==null){stopPreview();return;}
  if(!placedCount(draft).track){announce('Setze zuerst einige Lauffelder, um den Weg anzusehen.','warn');return;}
  walkStep=-1;
  walkTimer=setInterval(()=>{
    walkStep=(walkStep+1)%64;
    const point=draft.track[walkStep];
    $('board-hint').textContent=point?'▶ Spielfigur wandert zu Feld '+walkStep:'⚠️ Feld '+walkStep+' ist noch nicht gesetzt.';
    draw();
  },250);
}
function updateControls(){
  document.querySelectorAll('[data-mode]').forEach(b=>{
    const on=b.dataset.mode===mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
  });
  document.querySelectorAll('[data-tool]').forEach(b=>{
    const on=b.dataset.tool===tool;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));
  });
  $('field-index').max=mode==='track'?'63':'3';
  $('field-index').value=String(selected.index);
  $('field-seat').disabled=mode==='track';
  $('field-seat').value=String(mode==='track'?Math.floor(selected.index/16):selected.owner);
  $('grid-size').value=String(settings.spacing);
  $('step-size').value=String(settings.stepSpacing);
  $('equal-spacing').checked=settings.guide;
  const canGuide=selected.kind==='track'&&Boolean(previousTrackField(draft,selected));
  document.querySelectorAll('[data-path-dir]').forEach(button=>button.disabled=!canGuide);
  for(const [id,key] of [
    ['snap','snap'],['show-grid','grid'],['show-numbers','numbers'],
    ['show-path','path'],['symmetry','symmetry'],['auto-next','auto']
  ])$(id).checked=settings[key];
  const point=currentPosition();
  // Coordinate entry must also work before the first field exists.
  $('coord-x').disabled=false;$('coord-y').disabled=false;
  $('coord-x').value=point?String(toRound(point.x)):'380';
  $('coord-y').value=point?String(toRound(point.y)):'380';
  $('selected-info').innerHTML='<b>'+selectedName()+'</b>'+(point?'Position X: '+point.x+' · Y: '+point.y:'Noch nicht gesetzt. Klicke auf eine freie Stelle, um dieses Feld anzulegen.');
  $('undo').disabled=historyAt===0;
  $('redo').disabled=historyAt===history.length-1;
}
function refreshAssistantStatus(){
  const refs=referencePoints(draft,assistantSeat),lane=draft.goals[assistantSeat],house=draft.homes[assistantSeat];
  const goalCount=lane.filter(Boolean).length,homeCount=house.filter(Boolean).length;
  $('assist-seat').value=String(assistantSeat);
  $('assist-reference').innerHTML=
    '<strong>'+SEAT_LABELS[assistantSeat]+': Ausstieg Feld '+refs.exitIndex+
    (refs.exit?' ✓':' ✗')+' · Zieleinlauf Feld '+refs.goalEntryIndex+(refs.goalEntry?' ✓':' ✗')+'</strong>'+
    '<div>Haus: '+homeCount+'/4 Startplätze · Ziel: '+goalCount+'/4 Zielfelder</div>'+
    '<div>'+(refs.exit?'Der Haus-Ausgang kann bei Bedarf verschoben werden.':'Setze zuerst das farbige Ausstiegsfeld auf dem Laufweg.')+'</div>';
  const report=getTrackConnections(draft);
  const invalid=report.broken.length,open=report.missing.length;
  const missingIndexes=report.missing.filter(x=>x.hasFrom&&!x.hasTo).map(x=>x.to);
  $('track-summary').textContent=
    '🔗 '+report.links.length+'/64 Nachbarschaften verbunden · '+open+' offene Übergänge'+
    (invalid?' · '+invalid+' Abstandsfehler':'')+
    (report.closed?' · ✅ Rundweg geschlossen':'')+
    (missingIndexes.length?' · Nächste freie Felder: '+missingIndexes.slice(0,6).join(', '):'');
  const gaps=straightGaps(draft,{maxMissing:6});
  const signature=gaps.map(g=>g.from+':'+g.to).join(',');
  const control=$('gap-select');
  if(signature!==lastGapSignature){
    const previously=control.value;
    control.innerHTML=gaps.length?
      gaps.map(g=>'<option value="'+g.from+'">Feld '+g.from+' → '+g.to+' ('+g.missing+' fehlend)</option>').join(''):
      '<option value="">Keine kurze gerade Lücke</option>';
    control.value=gaps.some(g=>String(g.from)===previously)?previously:(gaps.length?String(gaps[0].from):'');
    lastGapSignature=signature;
  }
  $('fill-track-gap').disabled=gaps.length===0;
}

function renderProgress(){
  const check=inspectDraft(draft),count=check.count;
  $('track-progress').textContent=count.track+'/64';
  $('goal-progress').textContent=count.goals+'/16';
  $('home-progress').textContent=count.homes+'/16';
  $('progress-total').textContent=count.total+'/96';
  const gap=measureStepDistances(draft,settings.stepSpacing),anchor=previousTrackField(draft,selected);
  $('align-run').disabled=selected.kind!=='track'||!Boolean(draft.track[selected.index]);
  refreshAssistantStatus();
  $('gap-report').textContent=settings.guide?
    (anchor?'📐 Ausgangspunkt: Feld '+anchor.index+'. ':'📍 Setze Feld 0 frei. ')+
    (gap.measured?gap.even+' von '+gap.measured+' Verbindungen im Abstand '+settings.stepSpacing+
      '. '+(gap.uneven?'Orange Linien markieren Abweichungen.':'Alle gemessenen Abstände passen.'):
      'Mit den 8 Pfeilen setzt du gerade und diagonale Schritte gleich weit auseinander.'):
    'Abstandshilfe aus – die Felder folgen dem Raster oder der freien Positionierung.';
  $('total-progress').value=count.total;
  $('finish-button').disabled=!check.ready;
  $('save-live-top').disabled=!check.ready;
  $('export-game').disabled=!check.ready;
  $('check-label').textContent=check.ready?'✓ Bereit':'Entwurf '+count.total+'/96';
  const list=[];
  if(check.ready)list.push('✅ Spielfeld vollständig: 64 Lauffelder, 16 Ziel- und 16 Startplätze. Rundweg ohne Unterbrechung.');
  else if(count.total<96)list.push('Noch '+(96-count.total)+' Positionen fehlen. Du kannst trotzdem jederzeit weiterarbeiten.');
  if(check.errors.length)list.push('❌ '+check.errors.slice(0,3).join(' | ')+(check.errors.length>3?' …':''));
  else if(check.warnings.length&&count.complete)list.push('⚠️ '+check.warnings.slice(0,3).join(' | '));
  if(!check.errors.length&&!check.ready&&count.total>=96)list.push('Prüfe die Abstände benachbarter Lauffelder.');
  $('validation').textContent=list.join('\n');
  $('validation').className='status '+(check.errors.length?'error':check.ready?'success':'warn');
  $('board-subtitle').textContent=check.ready?'Das Brett kann übernommen werden.':tool==='place'?'Nächster Klick: '+selectedName():tool==='erase'?'Tippe auf ein Feld, um es zu entfernen.':'Ziehe ein Feld an die richtige Rasterposition.';
  if(walkTimer===null)$('board-hint').textContent=tool==='place'
    ?(settings.guide&&selected.kind==='track'&&previousTrackField(draft,selected)?'📐 Gleicher Abstand ('+settings.stepSpacing+'): Tippe ungefähr in die Richtung oder nutze die acht Pfeile.':'Tippe auf die freie Fläche, um '+selectedName()+' zu setzen. Zum Ersetzen Feld antippen und dann neue freie Stelle.')
    :tool==='move'?'Tippe auf ein vorhandenes Feld und ziehe es an die neue Position.':'Tippe auf ein Feld, um es zu entfernen.';
  updateControls();
}
function render(){
  renderProgress();
  draw();
}
const svgText=(x,y,value,fill='#dfedf8',size=11,anchor='middle')=>
  '<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+fill+'" text-anchor="'+anchor+'" font-weight="800" pointer-events="none">'+value+'</text>';
function draw(){
  const out=[];
  out.push('<defs><radialGradient id="dog-surface" cx=".47" cy=".40" r=".85"><stop stop-color="#194c70"/><stop offset=".66" stop-color="#113b5f"/><stop offset="1" stop-color="#061c34"/></radialGradient><linearGradient id="dog-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a57445"/><stop offset=".3" stop-color="#e2c18f"/><stop offset=".7" stop-color="#795237"/><stop offset="1" stop-color="#b17e4f"/></linearGradient></defs>');
  out.push('<rect x="8" y="8" width="744" height="744" rx="43" fill="url(#dog-wood)" stroke="#3b2921" stroke-width="5"/>');
  out.push('<rect x="29" y="29" width="702" height="702" rx="28" fill="url(#dog-surface)" stroke="#bcd5dc" stroke-opacity=".42" stroke-width="2"/>');
  out.push('<image id="reference-photo" x="29" y="29" width="702" height="702" preserveAspectRatio="xMidYMid meet" opacity="'+photoOpacity+'" pointer-events="none"/>');
  if(settings.grid){
    const gap=settings.spacing;
    out.push('<g stroke="#b6def1" stroke-width=".65" opacity=".26" pointer-events="none">');
    for(let x=380;x>=40;x-=gap)out.push('<line x1="'+x+'" x2="'+x+'" y1="30" y2="730"/>');
    for(let x=380+gap;x<=720;x+=gap)out.push('<line x1="'+x+'" x2="'+x+'" y1="30" y2="730"/>');
    for(let y=380;y>=40;y-=gap)out.push('<line x1="30" x2="730" y1="'+y+'" y2="'+y+'"/>');
    for(let y=380+gap;y<=720;y+=gap)out.push('<line x1="30" x2="730" y1="'+y+'" y2="'+y+'"/>');
    out.push('</g>');
    out.push('<line x1="380" x2="380" y1="30" y2="730" stroke="#ffd595" stroke-width="1.1" opacity=".32" pointer-events="none"/>');
    out.push('<line x1="30" x2="730" y1="380" y2="380" stroke="#ffd595" stroke-width="1.1" opacity=".32" pointer-events="none"/>');
  }
  if(settings.path){
    for(let i=0;i<64;i++){
      const a=draft.track[i],b=draft.track[(i+1)%64];
      if(!a||!b)continue;
      const distance=Math.hypot(a.x-b.x,a.y-b.y),even=Math.abs(distance-settings.stepSpacing)<=.25;
      const lineColor=settings.guide?(even?'#89e6bc':'#f4a575'):'#d6e6ee';
      out.push('<path d="M '+pair(a)+' L '+pair(b)+'" fill="none" stroke="'+lineColor+'" stroke-opacity="'+(settings.guide?'.83':'.48')+'" stroke-width="3.5" stroke-linecap="round" pointer-events="none"/>');
    }
    for(let seat=0;seat<4;seat++){
      for(const kind of ['goals','homes'])for(let i=0;i<3;i++){
        const a=draft[kind][seat][i],b=draft[kind][seat][i+1];
        if(a&&b)out.push('<path d="M '+pair(a)+' L '+pair(b)+'" fill="none" stroke="'+color[seat]+'" stroke-opacity=".48" stroke-width="4" pointer-events="none"/>');
      }
    }
  }
  out.push('<rect x="303" y="311" width="154" height="138" rx="30" fill="#061b2f" fill-opacity=".62" stroke="#b39a6c" stroke-opacity=".43" stroke-width="2" pointer-events="none"/>');
  out.push(svgText(380,372,'DOG','#f7dfae',40));
  out.push(svgText(380,397,'BRETT-BAUKASTEN','#d1dfeb',10));
  function fieldMarkup(point,kind,index,owner){
    const track=kind==='track',start=track&&index%16===0;
    const here=kind===selected.kind&&index===selected.index&&(track||owner===selected.owner);
    const c=color[owner],fill=track&&!start?'#edf4f8':start?c:'#0e314d';
    const stroke=here?'#ffe2a0':track&&!start?'#587a94':c;
    const label=track?String(index):String(index+1);
    out.push('<g data-kind="'+kind+'" data-index="'+index+'" data-owner="'+owner+'" aria-label="'+(track?'Lauffeld ':kind==='goals'?'Zielfeld ':'Startplatz ')+label+' '+names[owner]+'">');
    if(here)out.push('<circle cx="'+point.x+'" cy="'+point.y+'" r="24" fill="none" stroke="#ffe0a1" stroke-width="3" stroke-dasharray="5 4" pointer-events="none"/>');
    out.push('<circle cx="'+point.x+'" cy="'+(point.y+2)+'" r="16.3" fill="#051323" opacity=".67" pointer-events="none"/>');
    out.push('<circle class="field" cx="'+point.x+'" cy="'+point.y+'" r="14.3" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+(here?3.1:2)+'" pointer-events="none"/>');
    out.push('<circle cx="'+(point.x-4)+'" cy="'+(point.y-5)+'" r="4" fill="#fff" opacity=".35" pointer-events="none"/>');
    if(settings.numbers)out.push(svgText(point.x,point.y+3.4,label,track&&!start?'#193247':'#eaf7ff',track?9:10));
    out.push('<circle cx="'+point.x+'" cy="'+point.y+'" r="20.4" fill="transparent"/>');
    out.push('</g>');
  }
  for(let i=0;i<64;i++)if(draft.track[i])fieldMarkup(draft.track[i],'track',i,Math.floor(i/16));
  for(const kind of ['goals','homes'])for(let seat=0;seat<4;seat++)
    for(let i=0;i<4;i++)if(draft[kind][seat][i])fieldMarkup(draft[kind][seat][i],kind,i,seat);
  // Eight equal-radius destinations around the previous track field.
  if(settings.guide&&selected.kind==='track'&&tool==='place'){
    const origin=previousTrackField(draft,selected);
    if(origin){
      const p=origin.point,r=settings.stepSpacing;
      out.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" fill="none" stroke="#ffd794" stroke-opacity=".38" stroke-width="1.5" stroke-dasharray="4 4" pointer-events="none"/>');
      for(const direction of EIGHT_DIRECTIONS){
        const target=directedPoint(draft,selected,direction.dx,direction.dy,{step:r});
        if(target)out.push('<circle cx="'+target.x+'" cy="'+target.y+'" r="5" fill="#ffe0a0" fill-opacity=".48" pointer-events="none"/>');
      }
    }
  }
  // Show the next position only as a preview, never as a real field.
  if(hover&&tool==='place'&&!pointer){
    let p;try{p=guidedPlacement(hover);}catch(_){p=null;}
    if(p){
    out.push('<line x1="'+p.x+'" y1="30" x2="'+p.x+'" y2="730" stroke="#ffdc9f" stroke-width="1.2" stroke-dasharray="7 6" opacity=".54" pointer-events="none"/>');
    out.push('<line x1="30" y1="'+p.y+'" x2="730" y2="'+p.y+'" stroke="#ffdc9f" stroke-width="1.2" stroke-dasharray="7 6" opacity=".54" pointer-events="none"/>');
    if(p.guided){
      out.push('<path d="M '+p.anchor.x+' '+p.anchor.y+' L '+p.x+' '+p.y+'" stroke="#ffe0a0" stroke-width="3" stroke-dasharray="4 3" pointer-events="none"/>');
      out.push(svgText(p.x,p.y-25,settings.stepSpacing+' · '+p.label,'#ffe5ae',10));
    }
    out.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="15" fill="#ffe0a0" fill-opacity=".23" stroke="#ffe2a9" stroke-dasharray="4 3" stroke-width="2.3" pointer-events="none"/>');
    }
  }
  if(walkStep>=0){
    const p=draft.track[walkStep];
    if(p){
      out.push('<circle cx="'+p.x+'" cy="'+p.y+'" r="26" stroke="#ffe4aa" stroke-width="4" fill="#ffd37b" fill-opacity=".35" pointer-events="none"/>');
      out.push(svgText(p.x,p.y-28,walkStep,'#fff0c5',16));
    }
  }
  board.innerHTML=out.join('');
  if(photoObject)board.querySelector('#reference-photo').setAttribute('href',photoObject);
}
function canvasXY(event){
  const matrix=board.getScreenCTM();
  if(!matrix)return null;
  const svgPoint=board.createSVGPoint();
  svgPoint.x=event.clientX;svgPoint.y=event.clientY;
  return svgPoint.matrixTransform(matrix.inverse());
}
// Immediate pointer-down placement is deliberate: on touch devices some browsers
// cancel or retarget pointer-up if the SVG has been redrawn during a gesture.
// A single finger tap now creates the field without depending on pointer-up.
let lastHandledPointer=0;
function commitPlacement(pos,{forceExact=false}={}){
  if(tool!=='place')return;
  try{
    const hadField=Boolean(currentPosition());
    const next=placeAt(pos,draft,{forceExact});
    draft=next;
    const changed=recordChange();
    if(changed&&!hadField)maybeNext();
    render();
    if(changed)announce(
      hadField?'✓ Bereits gesetztes Feld wurde an der neuen Position ersetzt.':
        '✓ Feld erfolgreich gesetzt. Nächstes Feld: '+selectedName()+'.','success'
    );
    else announce('Dieses Feld liegt bereits an dieser Stelle. Wähle eine andere Position.','warn');
  }catch(error){
    announce('⚠️ Feld konnte nicht gesetzt werden: '+(error?.message||error),'error');
  }
}
function targetSelection(event){
  const hit=event.target?.closest?.('[data-kind]');
  if(!hit)return null;
  const s={kind:hit.dataset.kind,index:Number(hit.dataset.index),owner:Number(hit.dataset.owner)};
  return selectedValid(s)?s:null;
}
function clickExisting(s){
  setSelection(s);
  if(tool==='place')announce('✏️ '+selectedName()+' ausgewählt. Tippe jetzt auf eine freie Stelle, um dieses Feld zu ersetzen – oder ziehe es direkt.','success');
}
board.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  const pos=canvasXY(event);if(!pos)return;
  // Discard an abandoned drag when a fresh touch starts (mobile pointercancel may be lost).
  if(pointer)pointer=null;
  const existing=targetSelection(event);
  event.preventDefault();
  lastHandledPointer=Date.now();
  if(existing){
    clickExisting(existing);
    if(tool==='erase'){
      updateDraft(eraseField(draft,selected,{symmetry:settings.symmetry}));
      announce('✓ Feld gelöscht. Tippe auf eine freie Stelle, um es neu zu platzieren.','success');
      return;
    }
    pointer={id:event.pointerId,kind:'existing',initial:pos,draft:clone(draft),moved:false};
    try{board.setPointerCapture(event.pointerId);}catch(_){} // no capture support on some tablets
  }else if(tool==='place'){
    // Placing on pointerdown also makes short taps reliable on Android tablets.
    commitPlacement(pos);
  }else announce(tool==='move'?
    'Zum Verschieben ein vorhandenes Spielfeld anfassen.':
    'Zum Löschen ein vorhandenes Spielfeld antippen.');
});
board.addEventListener('pointermove',event=>{
 const p=canvasXY(event);if(!p)return;
 if(!pointer){
   if(tool!=='place'||event.pointerType==='touch')return;
   let proposed;try{proposed=guidedPlacement(p);}catch(_){return;}
   if(!hover||hover.x!==proposed.x||hover.y!==proposed.y){hover=proposed;draw();}
   return;
 }
 if(pointer.id!==event.pointerId)return;
 event.preventDefault();
 if(Math.hypot(p.x-pointer.initial.x,p.y-pointer.initial.y)>4)pointer.moved=true;
 if(pointer.moved){
   try{
     draft=placeAt(p,pointer.draft);
     draw();
   }catch(err){announce('⚠️ Feld konnte nicht bewegt werden: '+err.message,'error');}
 }
});
board.addEventListener('pointerleave',()=>{if(!pointer&&hover){hover=null;draw();}});
function pointerFinish(event,canceled=false){
 if(!pointer||pointer.id!==event.pointerId)return;
 const prior=pointer;
 pointer=null;
 if(canceled){draft=prior.draft;render();return;}
 if(prior.moved){
   recordChange();
   render();
   announce('↔ Feld verschoben. Raster: '+(settings.snap?'aktiv':'frei')+'.','success');
 }else render();
}
board.addEventListener('pointerup',event=>pointerFinish(event,false));
board.addEventListener('pointercancel',event=>pointerFinish(event,true));
// Fallback for synthetic clicks, keyboard click events and browsers that do not
// expose Pointer Events. The normal pointerdown path is always processed once.
board.addEventListener('click',event=>{
  if(Date.now()-lastHandledPointer<750)return;
  const selectedField=targetSelection(event);
  if(selectedField){clickExisting(selectedField);return;}
  if(tool==='place'){
    const p=canvasXY(event);
    if(p)commitPlacement(p);
  }
});
document.querySelectorAll('[data-tool]').forEach(button=>button.addEventListener('click',()=>{
 tool=button.dataset.tool;render();announce(tool==='place'?'✚ Klicke auf eine freie Fläche, um das ausgewählte Feld zu setzen.':tool==='move'?'↔ Ziehe ein vorhandenes Feld an die gewünschte Position.':'⌫ Tippe auf ein Feld, um es zu löschen.');
}));
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
 const kind=button.dataset.mode;
 const count=placedCount(draft);
 selected=kind==='track'?{kind,index:count.track<64?draft.track.findIndex(p=>p===null):0,owner:0}:
  {kind,index:0,owner:0};
 mode=kind;render();
}));
$('field-index').addEventListener('input',event=>{
 const idx=Number(event.target.value),max=mode==='track'?63:3;
 if(!Number.isInteger(idx)||idx<0||idx>max)return;
 setSelection({kind:mode,index:idx,owner:mode==='track'?Math.floor(idx/16):selected.owner});
});
$('field-seat').addEventListener('change',event=>{
 if(mode==='track')return;
 const owner=Number(event.target.value);if(!Number.isInteger(owner)||owner<0||owner>3)return;
 setSelection({kind:mode,index:selected.index,owner});
});
function changeSetting(id,key,parser=el=>el.checked){
 const el=$(id);el.addEventListener('change',()=>{
  settings[key]=parser(el);
  savePreferences();render();
 });
}
// Keep the newly introduced distance guide in sync with the grid until the
// player deliberately chooses a different step distance.
$('grid-size').addEventListener('change',event=>{
 const next=Number(event.target.value);
 if(![28,32,36,40,48].includes(next))return;
 if(settings.stepSpacing===settings.spacing)settings.stepSpacing=next;
 settings.spacing=next;
 savePreferences();render();
});
changeSetting('step-size','stepSpacing',el=>Number(el.value));
changeSetting('equal-spacing','guide');
for(const [id,key]of [['snap','snap'],['show-grid','grid'],['show-numbers','numbers'],['show-path','path'],['symmetry','symmetry'],['auto-next','auto']])changeSetting(id,key);
document.querySelectorAll('[data-path-dir]').forEach(button=>button.addEventListener('click',()=>{
  if(selected.kind!=='track'){
    announce('Die Richtungspfeile sind für die 64 Lauffelder vorgesehen.','warn');return;
  }
  const [dx,dy]=button.dataset.pathDir.split(',').map(Number);
  let target;
  try{target=directedPoint(draft,selected,dx,dy,{step:settings.stepSpacing});}
  catch(err){announce('⚠️ '+err.message,'error');return;}
  if(!target){
    announce('Setze zuerst das vorherige Lauffeld oder wähle eine andere Richtung innerhalb des Bretts.','warn');
    return;
  }
  tool='place';
  commitPlacement(target,{forceExact:true});
}));
$('align-run').addEventListener('click',()=>{
  if(selected.kind!=='track'||!draft.track[selected.index]){
    announce('Wähle zuerst ein bereits platziertes Lauffeld als Anfang deiner Geraden oder Diagonale.','warn');
    return;
  }
  const start=selected.index;
  const count=Number($('align-count').value);
  const [dx,dy]=String($('align-direction').value).split(',').map(Number);
  try{
    const result=alignTrackRun(draft,selected,{
      count,dx,dy,step:settings.stepSpacing,symmetry:settings.symmetry
    });
    const previouslyPresent=result.track.slice(start+1,start+count+1).filter(Boolean).length;
    draft=result;
    const changed=recordChange();
    if(!changed){announce('Dieser Abschnitt ist bereits gleichmäßig ausgerichtet.','success');return;}
    selected={kind:'track',index:start+count,owner:Math.floor((start+count)/16)};
    mode='track';
    tool='place';
    render();
    announce('✓ Felder '+(start+1)+' bis '+(start+count)+' im Abstand '+settings.stepSpacing+
      ' ausgerichtet. Der Startpunkt '+start+' bleibt erhalten. Rückgängig ist möglich.','success');
  }catch(err){
    announce('⚠️ Abschnitt unverändert: '+(err?.message||err),'warn');
  }
});


function assistanceBuild(kind,preview=false){
 const seat=assistantSeat;
 try{
   let updated;
   if(kind==='goals'){
     const [dx,dy]=String($('assist-goal-dir').value||'1,0').split(',').map(Number);
     updated=buildGoalLane(draft,seat,{dx,dy,spacing:Number($('assist-goal-spacing').value)||28});
   }else{
     const [dx,dy]=String($('assist-home-dir').value||'0,1').split(',').map(Number);
     updated=buildHomeGroup(draft,seat,{
       layout:$('assist-home-layout').value||'square',
       dx,dy,spacing:Number($('assist-home-spacing').value)||28,
       distance:Number($('assist-home-distance').value)||100
     });
   }
   if(preview){
     assistantPreview={kind,seat,points:updated[kind][seat]};
     draw();
     announce('👁 Vorschau für '+SEAT_LABELS[seat]+' eingeblendet. Erst „4 Felder setzen“ übernimmt die Gruppe.','success');
   }else{
     assistantPreview=null;
     updateDraft(updated);
     setSelection({kind,index:3,owner:seat});
     announce('✓ Vier '+(kind==='goals'?'Zielfelder':'Startplätze')+' für '+SEAT_LABELS[seat]+
       ' präzise gesetzt. Einzelne Positionen kannst du weiterhin antippen und korrigieren.','success');
   }
 }catch(err){
   assistantPreview=null;draw();
   announce('⚠️ Keine Änderung: '+(err?.message||err),'warn');
 }
}
$('assist-seat').addEventListener('change',event=>{
 const seat=Number(event.target.value);
 if(!Number.isInteger(seat)||seat<0||seat>3)return;
 assistantSeat=seat;assistantPreview=null;render();
 announce('📍 '+SEAT_LABELS[seat]+': Ausstieg Feld '+(seat*16)+
   ', Zieleinlauf über Feld '+((seat*16+63)%64)+'.');
});
$('choose-exit').addEventListener('click',()=>{
 selected={kind:'track',index:assistantSeat*16,owner:assistantSeat};
 mode='track';tool='place';assistantPreview=null;render();
 announce('📍 '+SEAT_LABELS[assistantSeat]+': Ausstieg auf Feld '+selected.index+
   ' ausgewählt. Tippe zum Setzen oder Verschieben auf das Brett.','success');
});
$('choose-goal-first').addEventListener('click',()=>{
 selected={kind:'goals',index:0,owner:assistantSeat};
 mode='goals';tool='place';assistantPreview=null;render();
 announce('🎯 Zielfeld 1 '+SEAT_LABELS[assistantSeat]+
  ' gewählt. Setze es genau an die gewünschte Stelle; danach erzeugt der Assistent die übrigen drei.','success');
});
$('choose-home-first').addEventListener('click',()=>{
 selected={kind:'homes',index:0,owner:assistantSeat};
 mode='homes';tool='place';assistantPreview=null;render();
 announce('🏠 Startplatz 1 '+SEAT_LABELS[assistantSeat]+
  ' gewählt. Setze ihn genau an die gewünschte Stelle; danach erzeugt der Assistent die übrigen drei.','success');
});
$('preview-goals').addEventListener('click',()=>assistanceBuild('goals',true));
$('preview-homes').addEventListener('click',()=>assistanceBuild('homes',true));
$('build-goals').addEventListener('click',()=>assistanceBuild('goals',false));
$('build-homes').addEventListener('click',()=>assistanceBuild('homes',false));
for(const id of ['assist-goal-dir','assist-goal-spacing','assist-home-layout','assist-home-spacing','assist-home-dir','assist-home-distance']){
 $(id).addEventListener('change',()=>{assistantPreview=null;draw();});
}
$('gap-select').addEventListener('change',()=>{draw();});
$('check-connections').addEventListener('click',()=>{
 const report=getTrackConnections(draft);
 const breaks=report.missing.filter(edge=>edge.hasFrom&&!edge.hasTo).map(edge=>edge.to);
 connectionFocus=Number($('gap-select').value);
 draw();
 if(report.closed){
   announce('✅ Der Laufweg ist geschlossen. Alle 64 Feldübergänge sind verbunden.','success');
 }else{
   announce('🔍 '+report.links.length+'/64 Verbindungen, '+report.missing.length+
     ' offene Übergänge, '+report.broken.length+' Abstandsprobleme.'+
     (breaks.length?' Fehlende nächste Felder: '+breaks.slice(0,8).join(', ')+'.':'')+
     ' Das Verbinden ergänzt nur sichere, gerade Lücken.','warn');
 }
});
$('fill-track-gap').addEventListener('click',()=>{
 const from=Number($('gap-select').value);
 if(!Number.isInteger(from)){announce('Wähle zuerst eine kurze gerade Lücke aus.','warn');return;}
 try{
   const result=connectStraightGap(draft,from,{step:settings.stepSpacing});
   assistantPreview=null;connectionFocus=null;
   updateDraft(result.draft);
   selected={kind:'track',index:(result.from+result.added)%64,owner:Math.floor(((result.from+result.added)%64)/16)};
   mode='track';render();
   announce('🔗 Lauffelder '+((result.from+1)%64)+' bis '+((result.to+63)%64)+
     ' gleichmäßig verbunden. '+result.added+' Felder ergänzt. Rückgängig ist möglich.','success');
 }catch(err){
   announce('⚠️ Lücke nicht automatisch verbunden: '+err.message+
     ' Bei einem Knick oder einer Kurve die fehlenden Felder einzeln mit den 8 Richtungspfeilen setzen.','warn');
 }
});

$('place-coordinates').addEventListener('click',()=>{
 const x=Number($('coord-x').value),y=Number($('coord-y').value);
 if(!Number.isFinite(x)||!Number.isFinite(y)||x<26||x>734||y<26||y>734){
   announce('Bitte für X und Y jeweils eine Koordinate zwischen 26 und 734 eingeben.','warn');
   return;
 }
 if(tool!=='place'){
   tool='place'; // The manual button is always an explicit set / replace action.
 }
 commitPlacement({x,y},{forceExact:true});
});
function updateCoord(part){
 const point=currentPosition();if(!point)return;
 const value=Number($(part==='x'?'coord-x':'coord-y').value);
 if(!Number.isFinite(value)||value<26||value>734){announce('Bitte eine Koordinate zwischen 26 und 734 eingeben.','warn');render();return;}
 const pos={...point,[part]:value};
 updateDraft(putField(draft,selected,pos,{symmetry:settings.symmetry,snap:false,spacing:settings.spacing}));
}
$('coord-x').addEventListener('change',()=>updateCoord('x'));
$('coord-y').addEventListener('change',()=>updateCoord('y'));
document.querySelectorAll('[data-nudge]').forEach(button=>button.addEventListener('click',event=>{
 const [dx,dy]=button.dataset.nudge.split(',').map(Number),p=currentPosition();
 if(!p||(!dx&&!dy))return;
 const mult=event.shiftKey?12:3;
 updateDraft(putField(draft,selected,{x:p.x+dx*mult,y:p.y+dy*mult},{symmetry:settings.symmetry,snap:false,spacing:settings.spacing}));
}));
window.addEventListener('keydown',event=>{
 if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName))return;
 if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
  event.preventDefault();unwind(event.shiftKey?1:-1);return;
 }
 const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 const [dx,dy]=directions[event.key]||[];
 if(dx===undefined)return;
 const p=currentPosition();if(!p)return;
 event.preventDefault();
 const step=event.shiftKey?12:3;
 updateDraft(putField(draft,selected,{x:p.x+dx*step,y:p.y+dy*step},{symmetry:settings.symmetry,snap:false,spacing:settings.spacing}));
});
$('undo').addEventListener('click',()=>unwind(-1));
$('redo').addEventListener('click',()=>unwind(1));
$('preview').addEventListener('click',showPreview);
$('stop-preview').addEventListener('click',stopPreview);
function replaceDraft(next,message){
 stopPreview();draft=fromLayout(next);recordChange();
 selected={kind:'track',index:0,owner:0};mode='track';tool='place';hover=null;
 render();announce(message,'success');
}
$('new-blank').addEventListener('click',()=>{
 if(placedCount(draft).total&& !confirm('Alle Felder im aktuellen Entwurf leeren? Dein bisheriger Entwurf bleibt nur erhalten, wenn du ihn vorher als JSON exportiert hast.'))return;
 replaceDraft(emptyDraft(),'✓ Leere Spielfläche erstellt. Beginne mit Lauffeld 0.');
});
$('load-cross').addEventListener('click',()=>{
 if(placedCount(draft).total&& !confirm('Die Kreuz-Vorlage laden? Der aktuelle Entwurf wird überschrieben.'))return;
 replaceDraft(fromCrossPreset(),'✓ Kreuz-Vorlage geladen. Du kannst jedes Feld nachträglich verschieben.');
});
$('load-current').addEventListener('click',()=>{
 if(placedCount(draft).total&& !confirm('Das zuletzt im DOG-Spiel gespeicherte Brett laden? Der aktuelle Entwurf wird überschrieben.'))return;
 replaceDraft(currentBoardLayout(),'✓ Dein derzeitiges DOG-Spielbrett wurde in den Editor geladen.');
});
$('photo-upload').addEventListener('change',event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){announce('Nur PNG, JPG oder WebP bis 12 MB erlaubt.','warn');return;}
 if(photoObject)URL.revokeObjectURL(photoObject);
 photoObject=URL.createObjectURL(file);draw();
 announce('Foto eingeblendet. Es wird nicht an den Server übertragen.','success');
});
$('remove-photo').addEventListener('click',()=>{
 if(photoObject)URL.revokeObjectURL(photoObject);
 photoObject=null;$('photo-upload').value='';draw();announce('Hintergrundfoto entfernt.');
});
$('photo-opacity').addEventListener('input',event=>{
 photoOpacity=clamp(Number(event.target.value),0,100)/100;
 $('photo-value').textContent=Math.round(photoOpacity*100)+' %';
 draw();
});
function download(contents,name,type){
 const url=URL.createObjectURL(new Blob([contents],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
$('export-draft').addEventListener('click',()=>{
 download(JSON.stringify(draft,null,2),'dog-mein-entwurf.json','application/json');
 announce('✓ Entwurf exportiert. Er kann auch mit noch leeren Feldern später wieder importiert werden.','success');
});
$('export-game').addEventListener('click',()=>{
 const result=inspectDraft(draft);if(!result.ready){announce('Bitte erst alle Felder setzen und die Warnungen korrigieren.','warn');return;}
 download(JSON.stringify(asGameLayout(draft),null,2),'dog-fertiges-spielfeld.json','application/json');
 announce('✓ Vollständiges Brett-Layout als JSON exportiert.','success');
});
$('import-json').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(file.size>250000)throw Error('Die JSON-Datei darf höchstens 250 KB groß sein.');
  const data=JSON.parse(await file.text());
  const normalized=fromLayout(data);
  if(placedCount(draft).total&&!confirm('Den aktuellen Entwurf durch die importierte Datei ersetzen?'))return;
  replaceDraft(normalized,'✓ Spielfeldentwurf geladen. Kontrolliere die Felder und den Laufweg.');
 }catch(err){announce('Import fehlgeschlagen: '+err.message,'error');}
 finally{$('import-json').value='';}
});
$('save-draft').addEventListener('click',()=>{
 const ok=persist();if(ok)announce('💾 Entwurf gespeichert. Du kannst ihn später weiterbauen.','success');
});
function backToGame(){
 const raw=new URL(location.href).searchParams.get('return');
 if(!raw)return 'index.html';
 try{
  const url=new URL(raw,location.href);
  const allowed=url.origin===location.origin&&url.pathname.endsWith('/DOG/index.html');
  return allowed?'index.html'+url.search:'index.html';
 }catch(_){return 'index.html';}
}
$('back-link').href=backToGame();
function finalize(){
 const info=inspectDraft(draft);
 if(!info.ready){announce('Das Brett ist noch nicht bereit: '+[...info.errors,...info.warnings].slice(0,3).join(' · '),'warn');return;}
 try{
  saveBoardLayout(asGameLayout(draft));
  persist();
  announce('✓ Das Brett wurde im Browser übernommen und wird im DOG-Spiel verwendet.','success');
  location.assign(backToGame());
 }catch(err){announce('Übernahme fehlgeschlagen: '+err.message,'error');}
}
$('finish-button').addEventListener('click',finalize);
$('save-live-top').addEventListener('click',finalize);
window.addEventListener('pagehide',()=>{
 if(walkTimer!==null)clearInterval(walkTimer);
 if(photoObject)URL.revokeObjectURL(photoObject);
});
render();
if(placedCount(draft).total)announce('🔄 Deinen bisherigen Entwurf wiederhergestellt. Du kannst direkt weiterbauen.','success');
else announce('Bereit! Die Spielfläche ist komplett leer. Setze Lauffeld 0 mit einem Klick.','success');
