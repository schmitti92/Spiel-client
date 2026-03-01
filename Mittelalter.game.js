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


// ---------- On-Screen Console (Debug Overlay) ----------
// Hilft besonders auf Tablet/Handy, wenn man DevTools nicht sieht.
// Toggle: Taste ` (Backtick) oder Button oben rechts (klein).
function installOnScreenConsole(){
  if(document.getElementById("osConsole")) return;

  const wrap = document.createElement("div");
  wrap.id = "osConsole";
  wrap.style.cssText = [
    "position:fixed",
    "right:12px",
    "bottom:12px",
    "width:min(520px, calc(100vw - 24px))",
    "max-height:40vh",
    "display:none",
    "flex-direction:column",
    "z-index:99999",
    "border-radius:14px",
    "overflow:hidden",
    "background:rgba(10,12,18,.92)",
    "box-shadow:0 12px 40px rgba(0,0,0,.45)",
    "backdrop-filter: blur(10px)",
    "-webkit-backdrop-filter: blur(10px)",
    "border:1px solid rgba(255,255,255,.10)"
  ].join(";");

  const bar = document.createElement("div");
  bar.style.cssText = [
    "display:flex",
    "align-items:center",
    "gap:8px",
    "padding:10px 12px",
    "background:rgba(255,255,255,.06)",
    "border-bottom:1px solid rgba(255,255,255,.08)",
    "font:600 12px system-ui, -apple-system, Segoe UI, Roboto, Arial",
    "color:rgba(240,245,255,.92)",
    "user-select:none",
    "cursor:move"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "Debug Console";
  title.style.flex = "1";

  const btnClear = document.createElement("button");
  btnClear.textContent = "Clear";
  btnClear.style.cssText = "all:unset; padding:6px 10px; border-radius:10px; background:rgba(255,255,255,.10); cursor:pointer;";
  btnClear.onmouseenter=()=>btnClear.style.background="rgba(255,255,255,.16)";
  btnClear.onmouseleave=()=>btnClear.style.background="rgba(255,255,255,.10)";

  const btnHide = document.createElement("button");
  btnHide.textContent = "Hide";
  btnHide.style.cssText = "all:unset; padding:6px 10px; border-radius:10px; background:rgba(255,255,255,.10); cursor:pointer;";
  btnHide.onmouseenter=()=>btnHide.style.background="rgba(255,255,255,.16)";
  btnHide.onmouseleave=()=>btnHide.style.background="rgba(255,255,255,.10)";

  const body = document.createElement("div");
  body.id = "osConsoleBody";
  body.style.cssText = [
    "padding:10px 12px",
    "overflow:auto",
    "font:12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    "color:rgba(235,245,255,.92)",
    "line-height:1.35",
    "white-space:pre-wrap"
  ].join(";");

  bar.appendChild(title);
  bar.appendChild(btnClear);
  bar.appendChild(btnHide);
  wrap.appendChild(bar);
  wrap.appendChild(body);
  document.body.appendChild(wrap);

  // Small toggle button (top-right)
  const tbtn = document.createElement("button");
  tbtn.id = "osConsoleToggle";
  tbtn.textContent = "🪲";
  tbtn.title = "Debug Console (`)";
  tbtn.style.cssText = [
    "position:fixed",
    "right:14px",
    "top:74px",
    "z-index:99998",
    "width:42px",
    "height:42px",
    "border-radius:14px",
    "border:1px solid rgba(255,255,255,.12)",
    "background:rgba(10,12,18,.55)",
    "color:rgba(240,245,255,.92)",
    "box-shadow:0 10px 30px rgba(0,0,0,.35)",
    "cursor:pointer"
  ].join(";");
  document.body.appendChild(tbtn);

  function toggle(show){
    const isShown = wrap.style.display !== "none";
    const next = (typeof show === "boolean") ? show : !isShown;
    wrap.style.display = next ? "flex" : "none";
  }
  tbtn.addEventListener("click", ()=>toggle());
  btnHide.addEventListener("click", ()=>toggle(false));
  btnClear.addEventListener("click", ()=>{ body.textContent=""; });

  window.addEventListener("keydown",(e)=>{
    if(e.key === "`"){ toggle(); }
  });

  // Drag window (mouse/touch)
  let drag = null;
  const startDrag = (clientX, clientY)=>{
    const r = wrap.getBoundingClientRect();
    drag = { ox: clientX - r.left, oy: clientY - r.top };
  };
  const moveDrag = (clientX, clientY)=>{
    if(!drag) return;
    wrap.style.right = "auto";
    wrap.style.bottom = "auto";
    wrap.style.left = Math.max(8, Math.min(window.innerWidth - 8, clientX - drag.ox)) + "px";
    wrap.style.top  = Math.max(8, Math.min(window.innerHeight - 8, clientY - drag.oy)) + "px";
  };
  const endDrag = ()=>{ drag = null; };

  bar.addEventListener("pointerdown",(e)=>{ bar.setPointerCapture(e.pointerId); startDrag(e.clientX,e.clientY); });
  bar.addEventListener("pointermove",(e)=>{ moveDrag(e.clientX,e.clientY); });
  bar.addEventListener("pointerup", endDrag);
  bar.addEventListener("pointercancel", endDrag);

  const fmt = (args)=>args.map(a=>{
    try{
      if(typeof a === "string") return a;
      return JSON.stringify(a, null, 2);
    }catch(_){ return String(a); }
  }).join(" ");

  function addLine(level, args){
    const t = new Date().toLocaleTimeString();
    const line = `[${t}] ${level}: ${fmt(args)}\n`;
    body.textContent += line;
    body.scrollTop = body.scrollHeight;
  }

  // Hook console
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console)
  };
  console.log = (...a)=>{ orig.log(...a); addLine("LOG", a); };
  console.info = (...a)=>{ orig.info(...a); addLine("INFO", a); };
  console.warn = (...a)=>{ orig.warn(...a); addLine("WARN", a); };
  console.error = (...a)=>{ orig.error(...a); addLine("ERR", a); };

  // Global errors
  window.addEventListener("error",(e)=>{
    addLine("JS-ERROR", [e.message, e.filename+":"+e.lineno+":"+e.colno]);
  });
  window.addEventListener("unhandledrejection",(e)=>{
    addLine("PROMISE", [String(e.reason)]);
  });

  addLine("READY", ["On-screen console installed. Press ` or click 🪲."]);
}

document.addEventListener("DOMContentLoaded", installOnScreenConsole);

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
  playerCount:4,
  turn:0,
  roll:null,
  phase:"loading", // loading | needRoll | choosePiece | chooseTarget | usePortal | placeBarricade
  selected:null,
  highlighted:new Set(),       // Move targets
  placeHighlighted:new Set(),
  eventActive:new Set(),
  lastEvent:null,  // Barricade placement targets
  pieces:[],
  occupied:new Map(),
  carry: {1:0,2:0,3:0,4:0},    // wie viele Barrikaden trägt Team x
  pendingSix:false            // ob nach Aktion nochmal gewürfelt werden darf
};

function currentTeam(){ return state.players[state.turn]; }

function setPlayerCount(n, opts={reset:true}){
  const nn = Math.max(1, Math.min(4, Number(n)||4));
  state.playerCount = nn;
  state.players = Array.from({length: nn}, (_,i)=>i+1);
  state.turn = 0;

  // Reset running turn state
  state.roll = null;
  state.selected = null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  ensurePortalState();
  state.portalHighlighted.clear();
  state.portalUsedThisTurn = false;
  state.pendingSix = false;

  if(opts.reset){
    initPieces();
    initEventFieldsFromBoard();
    fitToBoard(60);
  }

  dieBox.textContent = "–";
  state.phase = "needRoll";
  setStatus(`Spieleranzahl: ${nn}. Team ${currentTeam()} ist dran: Würfeln.`);
}

function isStartNode(id){
  const n = nodesById.get(id);
  return !!n && n.type === "start";
}

function isPortalNode(id){
  const n = nodesById.get(id);
  return !!n && n.type === "portal";
}

function computePortalTargets(currentPortalId){
  ensurePortalState();
  ensurePortalState();
  state.portalHighlighted.clear();
  for(const n of nodes){
    if(n.type !== "portal") continue;
    if(n.id === currentPortalId) continue;
    if(state.occupied.has(n.id)) continue; // Zielportal muss frei sein
    state.portalHighlighted.add(n.id);
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

function ensurePortalState(){
  if(!state.portalHighlighted) state.portalHighlighted = new Set();
  if(typeof state.portalUsedThisTurn !== "boolean") state.portalUsedThisTurn = false;
}

function ensureEventState(){
  if(!state.eventActive) state.eventActive = new Set();
  if(!("lastEvent" in state)) state.lastEvent = null;
}

// ---------- Event Cards (Ereignisse) ----------
const EVENT_DECK = [
  { id:"gold", title:"Goldfund", text:"+1 Barrikade in Reserve (als Beute).", effect:"addCarry" },
  { id:"trap", title:"Falle!", text:"Nächster Wurf -2 (min. 1).", effect:"nextRollMinus2" },
  { id:"blessing", title:"Segen", text:"Du darfst sofort 1 Feld extra gehen (optional).", effect:"bonusStep" },
  { id:"swap", title:"Tauschhandel", text:"Tausche Position mit einer beliebigen eigenen Figur.", effect:"swapOwn" }
];

function showEventOverlay(card, onClose){
  let ov = document.getElementById("eventOverlay");
  if(!ov){
    ov = document.createElement("div");
    ov.id = "eventOverlay";
    ov.style.cssText = "position:fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:99997; background:rgba(0,0,0,.55);";
    ov.innerHTML = `
      <div style="
        width:min(520px, calc(100vw - 28px));
        border-radius:18px;
        padding:18px 18px 14px;
        background:rgba(12,14,22,.92);
        border:1px solid rgba(255,255,255,.12);
        box-shadow:0 18px 60px rgba(0,0,0,.55);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        color:rgba(240,245,255,.95);
        font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
      ">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="width:38px; height:38px; border-radius:14px; display:flex; align-items:center; justify-content:center; background:rgba(180,120,255,.18); border:1px solid rgba(180,120,255,.25);">✨</div>
          <div style="flex:1;">
            <div id="eventTitle" style="font-weight:800; font-size:18px; line-height:1.1;">Event</div>
            <div style="opacity:.75; font-size:12px;">Ereigniskarte</div>
          </div>
        </div>
        <div id="eventText" style="opacity:.92; font-size:14px; line-height:1.35; margin:10px 0 14px;"></div>
        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button id="eventOkBtn" style="all:unset; padding:10px 14px; border-radius:12px; background:rgba(255,255,255,.12); cursor:pointer; border:1px solid rgba(255,255,255,.14);">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(ov);
  }
  ov.querySelector("#eventTitle").textContent = card.title;
  ov.querySelector("#eventText").textContent = card.text;
  ov.style.display = "flex";
  const btn = ov.querySelector("#eventOkBtn");
  const close = ()=>{
    ov.style.display="none";
    btn.onclick=null;
    onClose && onClose();
  };
  btn.onclick = close;
}

function pickRandomEventCard(){
  return EVENT_DECK[Math.floor(Math.random()*EVENT_DECK.length)];
}

function initEventFieldsFromBoard(){
  ensureEventState();
  state.eventActive.clear();
  for(const n of nodes){
    const isEvent = (n.type==="event") || (n.props && (n.props.event===true || n.props.kind==="event"));
    if(isEvent) state.eventActive.add(n.id);
  }
  console.info("[EVENT] init:", Array.from(state.eventActive));
}

function isEligibleEventSpawnNode(id){
  const n = nodesById.get(id);
  if(!n) return false;
  if(n.type==="start" || n.type==="portal") return false;
  if(n.type==="boss") return false;
  if(n.type==="barricade" || n.type==="obstacle") return false;
  if(state.eventActive.has(id)) return false;
  if(state.occupied.has(id)) return false;
  return true;
}

function relocateEventField(fromId){
  ensureEventState();
  const eligible = nodes.filter(nn=>isEligibleEventSpawnNode(nn.id)).map(nn=>nn.id);
  if(!eligible.length) return;
  const toId = eligible[Math.floor(Math.random()*eligible.length)];
  state.eventActive.delete(fromId);
  state.eventActive.add(toId);
  console.info("[EVENT] relocated", fromId, "->", toId);
}

function nextTurn(){
  ensurePortalState();
  state.turn = (state.turn+1)%state.players.length;
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  ensurePortalState();
  state.portalHighlighted.clear();
  state.portalUsedThisTurn=false;
  state.phase="needRoll";
  state.pendingSix=false;
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
}

function staySameTeamNeedRoll(msg){
  ensurePortalState();
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  ensurePortalState();
  state.portalHighlighted.clear();
  state.portalUsedThisTurn=false;
  state.phase="needRoll";
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
  const active = new Set(state.players);
  const starts = nodes.filter(n=>n.type==="start" && active.has(Number(n.props?.startTeam)));
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

    // Portal-Schutz: Figuren auf Portal können NICHT geschmissen werden.
    // => Feld bleibt blockiert.
    if(other && other.node && isPortalNode(other.node)){
      return false;
    }

    if(other) kickToStart(other);
  }

  state.occupied.delete(piece.node);
  piece.prev=piece.node;
  piece.node=target;
  state.occupied.set(target,piece.id);
  return true;
}

function afterLandingNoPortal(piece){
  const team = piece.team;

  // ✅ Ereignisfeld: Karte ziehen, dann Feld zufällig neu platzieren (nicht Start/Portal)
  ensureEventState();
  if(state.eventActive && state.eventActive.has(piece.node)){
    const card = pickRandomEventCard();
    state.lastEvent = card;
    console.info('[EVENT] draw', card.id, 'on', piece.node);

    // Feld erst nach OK verschieben, damit man es noch sieht
    showEventOverlay(card, ()=>{
      relocateEventField(piece.node);
      // Danach normal weiter (Barrikade prüfen / Zug beenden)
      afterLandingNoPortal(piece);
    });

    // Temporär aus eventActive entfernen, damit recursion nicht sofort wieder triggert
    state.eventActive.delete(piece.node);
    return;
  }

  // ✅ Barrikade aufgenommen?
  if(barricades.has(piece.node)){
    barricades.delete(piece.node);
    state.carry[team] = (state.carry[team]||0) + 1;

    computePlaceTargets();
    state.phase = "placeBarricade";
    setStatus(`Team ${team}: Barrikade aufgenommen! Tippe ein freies Feld zum Platzieren.`);
    return;
  }

  // ✅ Zug beenden / 6 = nochmal
  if(state.pendingSix){
    state.pendingSix=false;
    staySameTeamNeedRoll(`Team ${team}: Du hast eine 6! Nochmal würfeln.`);
  }else{
    nextTurn();
  }
}

function afterLanding(piece){
  const team = piece.team;

  // ✅ Barrikade aufgenommen?
  if(barricades.has(piece.node)){
    barricades.delete(piece.node);
    state.carry[team] = (state.carry[team]||0) + 1;

    computePlaceTargets();
    state.phase = "placeBarricade";
    setStatus(`Team ${team}: Barrikade aufgenommen! Tippe ein freies Feld zum Platzieren.`);
    return;
  }

  // ✅ Portal-Einfluss NUR wenn man AUF einem Portal steht
  if(isPortalNode(piece.node) && !state.portalUsedThisTurn){
    computePortalTargets(piece.node);
    if(state.portalHighlighted.size > 0){
      state.phase = "usePortal";
      setStatus(`Team ${team}: Portal! Tippe ein anderes freies Portal (oder tippe dein Portal nochmal = bleiben).`);
      return;
    }
  }

  // ✅ Zug beenden / 6 = nochmal
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
  if(occId && (state.phase==="choosePiece") && state.roll){
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
    const piece = state.pieces.find(p=>p.id===state.selected);
    if(!piece) return;
    const curPortal = piece.node;

    // Tippe aktuelles Portal nochmal = bleiben (Portal ist damit "verbraucht")
    if(hit.id === curPortal){
      ensurePortalState();
  state.portalHighlighted.clear();
      state.portalUsedThisTurn = true;
      afterLandingNoPortal(piece); // beendet Zug sauber / 6 nochmal
      return;
    }

    if(!state.portalHighlighted.has(hit.id)) return;

    // Teleport
    state.occupied.delete(piece.node);
    piece.prev = piece.node;
    piece.node = hit.id;
    state.occupied.set(hit.id, piece.id);

    ensurePortalState();
  state.portalHighlighted.clear();
    state.portalUsedThisTurn = true;

    // Nach Teleport: Barrikade prüfen / sonst Zug beenden
    afterLandingNoPortal(piece);
    return;
  }

  // 2) Ziel klicken (bewegen)
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

  // 3) Barrikade platzieren
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

// ---------- Spieleranzahl (1–4) ----------
const selPlayerCount = document.getElementById("playerCount");
if(selPlayerCount){
  // Default = 4
  selPlayerCount.value = String(state.players.length || 4);

  selPlayerCount.addEventListener("change", ()=>{
    const n = Number(selPlayerCount.value || 4);

    // Nur vor dem Laufen umstellen (sicher)
    const safeToChange = (state.phase === "needRoll") && (state.roll === null) && (!state.selected);
    if(!safeToChange){
      console.warn("[PLAYERS] change blocked during active move/roll");
      // reset select back
      selPlayerCount.value = String(state.players.length || 4);
      setStatus("Spieleranzahl nur ändern, wenn noch NICHT gewürfelt wurde.");
      return;
    }
    setPlayerCount(n, {reset:true});
  });
}


// ---------- Render -----------
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
  const selectedId = state.selected;
  for(const p of state.pieces){
    if(!p.node) continue;
    const n=nodesById.get(p.node);
    if(!n) continue;

    // Piece body
    ctx.beginPath();
    ctx.arc(n.x,n.y,12,0,Math.PI*2);
    ctx.fillStyle=TEAM_COLORS[p.team] || "#fff";
    ctx.fill();
    ctx.strokeStyle="rgba(0,0,0,.35)";
    ctx.lineWidth=2;
    ctx.stroke();

    // Selected piece ring (nur die ausgewählte Figur umranden)
    if(selectedId && p.id === selectedId){
      ctx.save();
      ctx.strokeStyle="rgba(255,255,255,.95)";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(n.x,n.y,16,0,Math.PI*2);
      ctx.stroke();

      ctx.strokeStyle="rgba(0,0,0,.45)";
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.arc(n.x,n.y,18.5,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();

  requestAnimationFrame(draw);
}

// ---------- Load ----------
async function load(){
  const V = (typeof window !== "undefined" && window.BUILD_ID) ? window.BUILD_ID : String(Date.now());
  const url = `Mitteralter.board.json?v=${V}`;

  setStatus("Lade Board...");
  console.info("[LOAD] fetching", url);

  const ac = new AbortController();
  const t = setTimeout(()=>ac.abort(), 12000);

  try{
    const res = await fetch(url, { cache:"no-store", signal: ac.signal });
    console.info("[LOAD] status", res.status, res.statusText, "content-type:", res.headers.get("content-type"));

    if(!res.ok){
      const txt = await res.text().catch(()=>"(no body)");
      console.error("[LOAD] fetch failed", res.status, res.statusText, txt.slice(0,400));
      setStatus(`Board-Fehler: HTTP ${res.status}`);
      return;
    }

    // Parse JSON (catch parsing errors)
    board = await res.json();
  }catch(err){
    console.error("[LOAD] exception", err);
    const msg = (err && err.name === "AbortError") ? "Timeout beim Laden" : (err?.message || String(err));
    setStatus(`Board-Fehler: ${msg}`);
    return;
  }finally{
    clearTimeout(t);
  }

  nodes=board.nodes||[];
  edges=board.edges||[];

  nodesById=new Map(nodes.map(n=>[n.id,n]));

  // --- Safety: Startfelder dürfen NICHT miteinander verbunden sein (sonst startet eine Farbe "im Weg" einer anderen).
  // Falls im Board versehentlich ein Edge zwischen zwei Startfeldern verschiedener Teams liegt (z.B. Grün <-> Braun),
  // entfernen wir ihn hier automatisch, ohne am Board-JSON rumzuschrauben.
  edges = (edges||[]).filter(e=>{
    const a = nodesById.get(e.a);
    const b = nodesById.get(e.b);
    if(!a || !b) return false;
    if(a.type==="start" && b.type==="start"){
      const ta = Number(a.props?.startTeam);
      const tb = Number(b.props?.startTeam);
      if(ta && tb && ta !== tb) return false;
    }
    return true;
  });
  adj=new Map();
  for(const n of nodes) adj.set(n.id,[]);
  for(const e of edges){
    if(!adj.has(e.a)) adj.set(e.a,[]);
    if(!adj.has(e.b)) adj.set(e.b,[]);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }

  // --- Auto-Fix: Start-Ausgang fehlt? ---
  // Wenn ein Startfeld keine Verbindung zu einem Nicht-Start-Feld hat, kann die Figur nicht "rauslaufen".
  // Wir verbinden es dann automatisch mit dem nächstgelegenen Nicht-Start-Knoten.
  // (Ändert NICHT dein board.json dauerhaft, ist nur ein Runtime-Fix.)
  const startNodes = nodes.filter(n=>n.type==="start");
  for(const s of startNodes){
    const neigh = adj.get(s.id) || [];
    const hasExit = neigh.some(id=> (nodesById.get(id)?.type) !== "start");
    if(hasExit) continue;

    // suche nächstgelegenen Nicht-Start-Knoten
    let best = null;
    let bestD = Infinity;
    for(const n of nodes){
      if(n.id === s.id) continue;
      if(n.type === "start") continue;
      const dx = n.x - s.x;
      const dy = n.y - s.y;
      const d2 = dx*dx + dy*dy;
      if(d2 < bestD){
        bestD = d2;
        best = n;
      }
    }
    if(!best) continue;

    // Edge hinzufügen
    edges.push({a: s.id, b: best.id});
    if(!adj.has(s.id)) adj.set(s.id, []);
    if(!adj.has(best.id)) adj.set(best.id, []);
    adj.get(s.id).push(best.id);
    adj.get(best.id).push(s.id);

    console.warn("[AUTO-FIX] Start-Ausgang hinzugefügt:", s.id, "->", best.id);
  }

  initPieces();
  initEventFieldsFromBoard();
  if(selPlayerCount) selPlayerCount.value = String(state.players.length||4);
  fitToBoard(60);
  state.phase="needRoll";
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
}

load();
draw();

})();
