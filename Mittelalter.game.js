// Mittelalter – Phase 1.1 (mit Barrikaden)
// ✅ Figuren dürfen übersprungen werden (AUßER Barrikaden – die blocken den Weg!)
// ✅ Nur Endfeld wird geprüft (1 Figur pro Feld)
// ✅ Gegner können geschmissen werden
// ✅ Bei 6: nochmal würfeln (nach evtl. Barrikaden-Platzierung)
// ✅ Barrikade:
//    - darf NICHT übersprungen werden (blockt Zwischen-Schritte)
//    - wenn du drauf landest: automatisch aufnehmen
//    - danach: irgendwo frei platzieren (auch auf Ereignisfelder / Spezialfelder)
//    - (Sicherheit) NICHT auf Startfelder platzieren

(() => {

const canvas = document.getElementById("boardCanvas");
const ctx = canvas.getContext("2d");
const btnRoll = document.getElementById("btnRoll");
const btnFit = document.getElementById("btnFit");
const dieBox = document.getElementById("dieBox");
const statusLine = document.getElementById("statusLine");

const TEAM_COLORS = {
  1: "#ff5151",
  2: "#3aa0ff",
  3: "#42d17a",
  4: "#ffd166"
};

// ---------- Camera (Pan / Zoom) ----------
// World = Node-Koordinaten aus board.json
// Screen = Canvas Pixel (CSS px)
// Wir zeichnen in World-Koordinaten und transformieren mit cam.
const cam = {
  x: 0,   // translate in screen px
  y: 0,
  s: 1    // scale
};

const camLimits = { minS: 0.35, maxS: 2.5 };

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function screenToWorld(sx, sy){
  // sx/sy sind CSS-Pixel relativ zum Canvas
  return {
    x: (sx - cam.x) / cam.s,
    y: (sy - cam.y) / cam.s
  };
}

function applyZoomAt(screenX, screenY, factor){
  const before = screenToWorld(screenX, screenY);
  cam.s = clamp(cam.s * factor, camLimits.minS, camLimits.maxS);
  const after = screenToWorld(screenX, screenY);
  // cursor stays fixed: adjust translation
  cam.x += (after.x - before.x) * cam.s;
  cam.y += (after.y - before.y) * cam.s;
}

function fitToBoard(padding=40){
  if(!nodes || !nodes.length) return;
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for(const n of nodes){
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const bw = Math.max(1, (maxX - minX));
  const bh = Math.max(1, (maxY - minY));
  const sX = (cw - padding*2) / bw;
  const sY = (ch - padding*2) / bh;
  cam.s = clamp(Math.min(sX, sY), camLimits.minS, camLimits.maxS);

  // center bbox
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  cam.x = cw/2 - cx*cam.s;
  cam.y = ch/2 - cy*cam.s;
}

let board, nodes=[], edges=[];
let nodesById = new Map();
let adj = new Map();

// Barrikaden-Positionen (separat vom Node-Type, damit wir sie "wegnehmen" & woanders platzieren können)
const barricades = new Set(); // nodeId

const state = {
  players:[1,2,3,4],
  turn:0,
  roll:null,
  phase:"loading", // loading | needRoll | choosePiece | chooseTarget | placeBarricade
  selected:null,
  highlighted:new Set(),       // Move targets
  placeHighlighted:new Set(),  // Barricade placement targets
  portalHighlighted:new Set(), // Portal targets (Teleport)
  portalUsedThisTurn:false
  pieces:[],
  occupied:new Map(),
  carry: {1:0,2:0,3:0,4:0},    // wie viele Barrikaden trägt Team x
  pendingSix:false            // ob nach Aktion nochmal gewürfelt werden darf
};

function currentTeam(){ return state.players[state.turn]; }

function isStartNode(id){
  const n = nodesById.get(id);
  return !!n && n.type === "start";

function isPortalNode(id){
  const n = nodesById.get(id);
  return !!n && n.type === "portal";
}

function isFreeForPortal(id){
  // Zielportal muss frei sein (1 Figur pro Feld) – Barrikade darf dort liegen (dann wird sie ggf. aufgenommen)
  if(state.occupied.has(id)) return false;
  return isPortalNode(id);
}

function computePortalTargets(currentPortalId){
  state.portalHighlighted.clear();
  for(const n of nodes){
    if(n.type !== "portal") continue;
    if(n.id === currentPortalId) continue;
    if(isFreeForPortal(n.id)){
      state.portalHighlighted.add(n.id);
    }
  }
}
}

function isFreeForBarricade(id){
  // frei heißt: kein Spieler drauf UND keine Barrikade drauf
  if (state.occupied.has(id)) return false;
  if (barricades.has(id)) return false;
  // Sicherheit: nicht auf Start platzieren
  if (isStartNode(id)) return false;
  return true;
}

function setStatus(t){ statusLine.textContent = t; }

function nextTurn(){
  state.turn = (state.turn+1)%state.players.length;
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.phase="needRoll";
  state.pendingSix=false;
  state.portalUsedThisTurn=false;
  state.portalHighlighted.clear();
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
}

function staySameTeamNeedRoll(msg){
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.phase="needRoll";
  state.portalUsedThisTurn=false;
  state.portalHighlighted.clear();
  dieBox.textContent="–";
  setStatus(msg || `Team ${currentTeam()} ist dran: Würfeln.`);
}

function initPieces(){
  state.pieces=[];
  state.occupied.clear();
  state.carry = {1:0,2:0,3:0,4:0};

  // Barrikaden initial aus dem Board lesen: nodes mit type "barricade"
  barricades.clear();
  for(const n of nodes){
    if(n.type === "barricade"){
      barricades.add(n.id);
    }
  }

  // Auf ALLEN Startfeldern eine Figur (wie vorher)
  const starts = nodes.filter(n=>n.type==="start");
  let i=0;
  for(const s of starts){
    const id="p"+(++i);
    const p={id,team:Number(s.props.startTeam),node:s.id,prev:null};
    state.pieces.push(p);
    state.occupied.set(s.id,id);
  }
}

function computeMoveTargets(piece,steps){
  state.highlighted.clear();

  const start = piece.node;
  const prev = piece.prev;

  // Anti-Hüpfen:
  // - Schritt 1 nicht direkt zurück aufs vorherige Feld (prev)
  // - UND generell nicht direkt zurück zum Feld, von dem man gerade kam (A->B->A)
  //
  // Dafür tracken wir pro BFS-State auch das "from" (Vorgängerfeld).
  const q = [{ id: start, d: 0, from: prev || null }];
  const visited = new Set([start+"|0|"+(prev||"null")]);

  while(q.length){
    const cur = q.shift();

    if(cur.d === steps){
      if(cur.id !== start){
        const occ = state.occupied.get(cur.id);
        if(!occ){
          state.highlighted.add(cur.id);
        }else{
          const op = state.pieces.find(x=>x.id===occ);
          if(op && op.team !== piece.team){
            state.highlighted.add(cur.id);
          }
        }
      }
      continue;
    }

    for(const nb of (adj.get(cur.id)||[])){

      // Kein Zurück-Hüpfen (A->B->A)
      if(cur.from && nb === cur.from) continue;

      // ✅ Barrikade blockt Zwischen-Schritte (nicht überspringen!)
      if(barricades.has(nb) && (cur.d+1) < steps) continue;

      // visited muss auch den Vorgänger berücksichtigen, sonst schneiden wir legitime Pfade ab
      const key = nb+"|"+(cur.d+1)+"|"+cur.id;
      if(visited.has(key)) continue;
      visited.add(key);

      q.push({ id: nb, d: cur.d+1, from: cur.id });
    }
  }
}

function computePlaceTargets(){
  state.placeHighlighted.clear();
  for(const n of nodes){
    if(isFreeForBarricade(n.id)){
      state.placeHighlighted.add(n.id);
    }
  }
}

function kickToStart(other){
  // Gegner "schmeißen": zurück auf ein freies Startfeld seines Teams, sonst bleibt er in "Reserve" (node=null)
  state.occupied.delete(other.node);
  other.node = null;
  other.prev = null;

  const starts = nodes.filter(n=>n.type==="start" && Number(n.props?.startTeam)===other.team);
  for(const s of starts){
    if(!state.occupied.has(s.id)){
      other.node = s.id;
      state.occupied.set(s.id, other.id);
      return;
    }
  }
  // kein freies Startfeld -> bleibt offboard
}

function move(piece,target){
  const occ=state.occupied.get(target);
  if(occ){
    const other=state.pieces.find(p=>p.id===occ);
    if(other && other.team===piece.team) return false;

    // ❗ Portal-Schutz: Figuren auf Portal können NICHT geschmissen werden.
    if(other && other.node && isPortalNode(other.node)){
      return false; // Ziel ist blockiert
    }
    if(other) kickToStart(other);
  }

  state.occupied.delete(piece.node);
  piece.prev=piece.node;
  piece.node=target;
  state.occupied.set(target,piece.id);
  return true;
}

function afterLanding(piece){
  const team = piece.team;

  // ✅ Wenn auf dem Zielfeld eine Barrikade liegt -> aufnehmen und danach platzieren
  if(barricades.has(piece.node)){
    barricades.delete(piece.node);
    state.carry[team] = (state.carry[team]||0) + 1;

    // Placement Phase
    computePlaceTargets();
    state.phase = "placeBarricade";
    setStatus(`Team ${team}: Barrikade aufgenommen! Tippe ein freies Feld zum Platzieren.`);
    return;
  }

  // Keine Barrikade aufgenommen -> normal weiter
  // ✅ Portal: Wenn du auf einem Portal landest, darfst du dich auf ein anderes Portal teleportieren (frei wählbar).
  // (nur 1x pro Zug; Teleport-Ziel muss frei sein)
  if(isPortalNode(piece.node) && !state.portalUsedThisTurn){
    computePortalTargets(piece.node);
    if(state.portalHighlighted.size > 0){
      state.phase = "usePortal";
      setStatus(`Team ${team}: Portal! Tippe ein anderes freies Portal zum Teleportieren (oder tippe dein Portal nochmal = bleiben).`);
      return;
    }
  }

  // Keine Barrikade/kein Portal -> normal weiter
  if(state.pendingSix){
    state.pendingSix=false;
    staySameTeamNeedRoll(`Team ${team}: Du hast eine 6! Nochmal würfeln.`);
  }else{
    nextTurn();
  }
}

function placeBarricadeAt(nodeId){
  const team = currentTeam();
  if(!state.placeHighlighted.has(nodeId)) return false;
  if((state.carry[team]||0) <= 0) return false;

  barricades.add(nodeId);
  state.carry[team] -= 1;

  // Nach Platzierung: wenn 6 -> nochmal würfeln, sonst Zugwechsel
  state.placeHighlighted.clear();
  if(state.pendingSix){
    state.pendingSix=false;
    staySameTeamNeedRoll(`Team ${team}: Barrikade platziert + 6! Nochmal würfeln.`);
  }else{
    nextTurn();
  }
  return true;
}

// ---------- Input (Tap/Click + Pan/Zoom) ----------
function hitTestWorld(wx, wy){
  const R = 18; // node radius (world units)
  let hit=null;
  for(const n of nodes){
    const dx=wx-n.x, dy=wy-n.y;
    if(dx*dx+dy*dy<=R*R){ hit=n; break; }
  }
  return hit;
}

function handleTapAtWorld(wx, wy){
  const hit = hitTestWorld(wx, wy);
  if(!hit) return;

  // 1) Figur wählen / wechseln (nach dem Wurf)
  const occId = state.occupied.get(hit.id);
  if(occId && (state.phase==="choosePiece" || state.phase==="chooseTarget") && state.roll){
    const occPiece = state.pieces.find(p=>p.id===occId);
    if(occPiece && occPiece.team === currentTeam()){
      state.selected = occPiece.id;
      computeMoveTargets(occPiece, state.roll);
      state.phase = "chooseTarget";
      setStatus(`Team ${currentTeam()}: Wurf ${state.roll}. Tippe ein leuchtendes Zielfeld.`);
      return;
    }
  }

  // 2) Portal benutzen (Teleport)
  if(state.phase==="usePortal"){
    // Tippe aktuelles Portal nochmal = bleiben
    if(hit.id === state.pieces.find(p=>p.id===state.selected)?.node){
      state.portalHighlighted.clear();
      state.portalUsedThisTurn = true;
      // danach normal weiter (6 / next turn)
      if(state.pendingSix){
        state.pendingSix=false;
        staySameTeamNeedRoll(`Team ${currentTeam()}: Du hast eine 6! Nochmal würfeln.`);
      }else{
        nextTurn();
      }
      return;
    }

    if(!state.portalHighlighted.has(hit.id)) return;

    const piece = state.pieces.find(p=>p.id===state.selected);
    if(!piece) return;

    // Teleport: Ziel muss frei sein (isFreeForPortal prüft occupied)
    state.occupied.delete(piece.node);
    piece.prev = piece.node;
    piece.node = hit.id;
    state.occupied.set(hit.id, piece.id);

    state.portalHighlighted.clear();
    state.portalUsedThisTurn = true;

    // Nach Teleport ggf. Barrikade aufnehmen etc. (Portal aber nicht nochmal in diesem Zug)
    afterLanding(piece);
    return;
  }

  // 3) Ziel klicken (bewegen)
  if(state.phase==="chooseTarget"){
    if(!state.highlighted.has(hit.id)) return;

    const piece=state.pieces.find(p=>p.id===state.selected);
    if(!piece) return;

    if(move(piece,hit.id)){
      // merken ob 6 (extra roll) – gilt erst NACH evtl. Barrikadenplatzierung
      state.pendingSix = (state.roll === 6);

      // Move-Ende: Targets reset
      state.highlighted.clear();

      // Landing logic (barricade pickup etc.)
      afterLanding(piece);
    }
    return;
  }

  // 4) Barrikade platzieren
  if(state.phase==="placeBarricade"){
    placeBarricadeAt(hit.id);
    return;
  }
}

// Pointer-Tracking (1 Finger / Maus = Pan, Tap = Auswahl; 2 Finger = Pinch Zoom)
const pointers = new Map(); // id -> {x,y}
let isPanning = false;
let panStart = null; // {x,y, camX, camY}
let tapCandidate = null; // {x,y,t}

function getLocalXY(e){
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener("pointerdown",(e)=>{
  canvas.setPointerCapture(e.pointerId);
  const p = getLocalXY(e);
  pointers.set(e.pointerId, p);

  if(pointers.size===1){
    isPanning = true;
    panStart = { x: p.x, y: p.y, camX: cam.x, camY: cam.y };
    tapCandidate = { x: p.x, y: p.y, t: performance.now() };
  }else{
    // multi-touch: not a tap
    tapCandidate = null;
  }
},{passive:true});

canvas.addEventListener("pointermove",(e)=>{
  if(!pointers.has(e.pointerId)) return;
  const p = getLocalXY(e);
  const prev = pointers.get(e.pointerId);
  pointers.set(e.pointerId, p);

  if(pointers.size===1 && isPanning && panStart){
    const dx = p.x - panStart.x;
    const dy = p.y - panStart.y;
    cam.x = panStart.camX + dx;
    cam.y = panStart.camY + dy;

    // wenn merklich bewegt -> kein Tap
    if(tapCandidate){
      const mx = p.x - tapCandidate.x;
      const my = p.y - tapCandidate.y;
      if((mx*mx + my*my) > 36) tapCandidate = null; // >6px
    }
    return;
  }

  if(pointers.size===2){
    // Pinch: compute distance/center between two pointers
    const pts = Array.from(pointers.values());
    const a = pts[0], b = pts[1];
    const cx = (a.x + b.x)/2;
    const cy = (a.y + b.y)/2;
    const dist = Math.hypot(a.x-b.x, a.y-b.y);

    // store last dist on canvas dataset
    const last = canvas._pinchLastDist;
    if(typeof last === "number" && last > 0){
      const factor = dist / last;
      // limit huge jumps
      const safe = clamp(factor, 0.85, 1.15);
      applyZoomAt(cx, cy, safe);
    }
    canvas._pinchLastDist = dist;
    lastPinchAt = performance.now();
    tapCandidate = null;
  }
},{passive:true});

function endPointer(e){
  if(!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);

  if(pointers.size<2){
    canvas._pinchLastDist = null;
  }

  // Tap if candidate still valid and single pointer ended
  if(tapCandidate && pointers.size===0){
    const p = getLocalXY(e);
    const dt = performance.now() - tapCandidate.t;
    const dx = p.x - tapCandidate.x;
    const dy = p.y - tapCandidate.y;
    if(dt < 350 && (dx*dx+dy*dy) <= 36){
      // Double-tap only if no pinch recently (prevents "spring back" after zoom)
      const now = performance.now();
      if(now - lastPinchAt > 450){
        if(now - lastTapTime < 280){
          fitToBoard(60);
          lastTapTime = 0;
        }else{
          lastTapTime = now;
        }
      }
      const w = screenToWorld(p.x, p.y);
      handleTapAtWorld(w.x, w.y);
    }
  }

  if(pointers.size===0){
    isPanning = false;
    panStart = null;
    tapCandidate = null;
  }
}

canvas.addEventListener("pointerup", endPointer, {passive:true});
canvas.addEventListener("pointercancel", endPointer, {passive:true});

// Mouse wheel zoom (desktop)
canvas.addEventListener("wheel",(e)=>{
  e.preventDefault();
  const p = getLocalXY(e);
  const dir = Math.sign(e.deltaY);
  const factor = dir > 0 ? 0.92 : 1.08;
  applyZoomAt(p.x, p.y, factor);
},{passive:false});

// Doppeltipp (Touch) + Doppelklick (Mouse) = zentrieren
let lastTapTime = 0;
let lastPinchAt = 0;

// Mouse double click
canvas.addEventListener("dblclick", (e)=>{
  fitToBoard(60);
});

// Button "Zentrieren"
btnFit?.addEventListener("click", ()=> fitToBoard(60));


// ---------- Würfeln ----------
btnRoll.addEventListener("click",()=>{
  if(state.phase!=="needRoll") return;

  state.roll=Math.floor(Math.random()*6)+1;
  dieBox.textContent=state.roll;

  // Nach dem Wurf darf man die Figur wählen (oder wechseln).
  state.selected = null;
  state.highlighted.clear();
  state.phase = "choosePiece";

  // Wenn keine Figur dieses Teams auf dem Board ist -> Hinweis
  const any = state.pieces.some(p=>p.team===currentTeam() && p.node);
  if(!any){
    setStatus(`Team ${currentTeam()}: Keine Figur auf dem Board.`);
    return;
  }

  setStatus(`Team ${currentTeam()}: Wurf ${state.roll}. Tippe eine eigene Figur an, um sie zu bewegen.`);
});

// ---------- Render ----------
function draw(){
  // Canvas auf CSS-Größe setzen (einfach)
  const dpr = Math.max(1, window.devicePixelRatio||1);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if(canvas.width!==w || canvas.height!==h){
    canvas.width=w; canvas.height=h;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);

  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.s, cam.s);

  // Edges
  ctx.lineWidth=2;
  ctx.strokeStyle="rgba(255,255,255,.18)";
  for(const e of edges){
    const a=nodesById.get(e.a);
    const b=nodesById.get(e.b);
    if(!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  }

    // Nodes + Highlights
  const R=18;
  for(const n of nodes){
    ctx.beginPath();
    ctx.arc(n.x,n.y,R,0,Math.PI*2);

    let fill="rgba(255,255,255,.10)";
    if(state.highlighted.has(n.id)) fill="rgba(124,92,255,.38)";
    if(state.phase==="placeBarricade" && state.placeHighlighted.has(n.id)) fill="rgba(65,209,122,.28)";
    if(state.phase==="usePortal" && state.portalHighlighted.has(n.id)) fill="rgba(120,200,255,.35)";

    // Portal sichtbar machen (rein optisch, noch keine Teleport-Logik)
    // Board-Editor setzt dafür n.type==="portal" (optional auch props.portalKey / portalId)
    if(n.type==="portal"){
      // wenn es ein Highlight ist, bleibt das Highlight stärker, ansonsten Portal-Farbton
      if(!state.highlighted.has(n.id) && !(state.phase==="placeBarricade" && state.placeHighlighted.has(n.id))){
        fill="rgba(76,160,255,.22)";
      }
    }

    ctx.fillStyle=fill;
    ctx.fill();

    // outline
    ctx.strokeStyle="rgba(255,255,255,.12)";
    ctx.stroke();

    // Portal-Ring + Symbol
    if(n.type==="portal"){
      ctx.save();
      // Außenring
      ctx.strokeStyle="rgba(120,200,255,.75)";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(n.x,n.y,R+4,0,Math.PI*2);
      ctx.stroke();

      // Innenring
      ctx.strokeStyle="rgba(120,200,255,.35)";
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(n.x,n.y,R-6,0,Math.PI*2);
      ctx.stroke();

      // kleines Portal-Symbol (∿) in der Mitte
      ctx.fillStyle="rgba(210,240,255,.85)";
      ctx.font="14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      ctx.fillText("⟲", n.x, n.y+0.5);
      ctx.restore();
    }
  }

  // Barrikaden als Overlay (sichtbar, aber können "versteckt" sein: du darfst sie trotzdem auf Ereignisfelder setzen)
  // Wenn du sie wirklich unsichtbar auf Ereignis willst: sag Bescheid, dann mache ich "Ereignis überdeckt Barrikade optisch".
  for(const id of barricades){
    const n = nodesById.get(id);
    if(!n) continue;
    ctx.save();
    ctx.strokeStyle="rgba(255,204,102,.85)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.rect(n.x-12, n.y-12, 24, 24);
    ctx.stroke();
    ctx.restore();
  }

  // Pieces
  for(const p of state.pieces){
    if(!p.node) continue;
    const n=nodesById.get(p.node);
    if(!n) continue;
    ctx.beginPath();
    ctx.arc(n.x,n.y,12,0,Math.PI*2);
    ctx.fillStyle=TEAM_COLORS[p.team] || "#fff";
    ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.35)";
    ctx.lineWidth=2;
    ctx.stroke();
  }

  ctx.restore();

  requestAnimationFrame(draw);
}

// ---------- Load ----------
async function load(){
  const V = (typeof window !== "undefined" && window.BUILD_ID) ? window.BUILD_ID : String(Date.now());
  const res=await fetch(`Mitteralter.board.json?v=${V}`,{cache:"no-store"});
  board=await res.json();
  nodes=board.nodes||[];
  edges=board.edges||[];

  nodesById=new Map(nodes.map(n=>[n.id,n]));
  adj=new Map();
  for(const n of nodes) adj.set(n.id,[]);
  for(const e of edges){
    if(!adj.has(e.a)) adj.set(e.a,[]);
    if(!adj.has(e.b)) adj.set(e.b,[]);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }

  initPieces();
  fitToBoard(60);
  state.phase="needRoll";
  state.portalUsedThisTurn=false;
  state.portalHighlighted.clear();
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
}

load();
draw();

})();
