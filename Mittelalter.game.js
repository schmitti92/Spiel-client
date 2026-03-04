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
canvas.style.touchAction = "none";
const ctx = canvas.getContext("2d");
const btnRoll = document.getElementById("btnRoll");
const btnFit = document.getElementById("btnFit");
const dieBox = document.getElementById("dieBox");
const statusLine = document.getElementById("statusLine");

// Joker UI (Sidebar)
const jokerButtonsWrap = document.getElementById("jokerButtons");
const jokerHint = document.getElementById("jokerHint");


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
document.addEventListener("DOMContentLoaded", ()=>{ try{ ensureTopTurnUI(); }catch(_){ } });

const TEAM_COLORS = {
  1: "#b33a3a", // Rot – Wappenrot
  2: "#2f5fa7", // Blau – Wappenblau
  3: "#2f7a4b", // Grün – Wappengrün
  4: "#b08a2e"  // Gold – Wappengold
};

// ---------- Joker System ----------
// Regeln (User):
// - Jeder Spieler startet mit 1 von jedem Joker.
// - Max 3 pro Sorte.
// - Beliebig viele Joker pro Zug.
// - Vor dem Wurf: Doppelwurf, Barrikade versetzen, Spieler tauschen
// - Nach dem Wurf: Neuwurf, Schutzschild, Alle Farben

const JOKER_MAX_PER_TYPE = 3;

const JOKERS = [
  { id:"double",      name:"Doppelwurf",            timing:"before" },
  { id:"moveBarricade", name:"Barrikade versetzen", timing:"before" },
  { id:"swap",        name:"Spieler tauschen",     timing:"before" },
  { id:"reroll",      name:"Neuwurf",              timing:"after"  },
  { id:"shield",      name:"Schutzschild",         timing:"after"  },
  { id:"allcolors",   name:"Alle Farben",          timing:"after"  }
];

function baseJokerLoadout(){
  const inv = {};
  for(const j of JOKERS) inv[j.id] = 1;
  return inv;
}

function ensureJokerState(){
  if(!state.jokers) state.jokers = {1:baseJokerLoadout(),2:baseJokerLoadout(),3:baseJokerLoadout(),4:baseJokerLoadout()};
  if(!state.jokerFlags) state.jokerFlags = { double:false, allcolors:false };
  if(!state.jokerMode) state.jokerMode = null; // swapPickA|swapPickB|moveBarricadePick|moveBarricadePlace|shieldPick
  if(!state.jokerData) state.jokerData = {};
  if(!state.jokerHighlighted) state.jokerHighlighted = new Set();
}

function jokerCount(team, id){
  ensureJokerState();
  const inv = state.jokers[team] || {};
  return Number(inv[id] || 0);
}

function consumeJoker(team, id){
  ensureJokerState();
  if(jokerCount(team,id) <= 0) return false;
  state.jokers[team][id] = jokerCount(team,id) - 1;
  return true;
}


function removeRandomJoker(team, amount=1){
  ensureJokerState();
  amount = Math.max(1, amount|0);
  let removed = 0;
  for(let i=0;i<amount;i++){
    const pool = [];
    for(const j of JOKERS){
      const c = jokerCount(team, j.id);
      if(c>0) pool.push(j.id);
    }
    if(!pool.length) break;
    const id = pool[Math.floor(Math.random()*pool.length)];
    const c = jokerCount(team,id);
    state.jokers[team][id] = clamp(c-1,0,JOKER_MAX);
    removed++;
  }
  if(removed) updateJokerUI();
  return removed;
}

function addJoker(team, id, amount=1){
  ensureJokerState();
  const cur = jokerCount(team,id);
  state.jokers[team][id] = clamp(cur + (amount||0), 0, JOKER_MAX_PER_TYPE);
}

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

// --- Camera bounds (prevents "board flies away") ---
// We clamp cam.x/cam.y so the board stays within the viewport with a margin.
// Works for all scales (pinch/wheel) and prevents the "jump" after fast zoom.
let _boardBoundsCache = null; // {minX,maxX,minY,maxY}

function computeBoardBoundsWorld(padWorld=26){
  if(!nodes || !nodes.length) return {minX:0,maxX:0,minY:0,maxY:0};
  let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
  for(const n of nodes){
    if(!n) continue;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  // expand bounds a bit so nodes on the edge are still reachable
  return {
    minX: minX - padWorld,
    minY: minY - padWorld,
    maxX: maxX + padWorld,
    maxY: maxY + padWorld
  };
}

function clampCameraToBoard(marginPx=70){
  if(!canvas) return;
  const cw = canvas.clientWidth || canvas.width || 0;
  const ch = canvas.clientHeight || canvas.height || 0;
  if(cw<=0 || ch<=0) return;

  const b = _boardBoundsCache || (_boardBoundsCache = computeBoardBoundsWorld(28));
  const s = cam.s || 1;

  const viewMinX = marginPx;
  const viewMaxX = cw - marginPx;
  const viewMinY = marginPx;
  const viewMaxY = ch - marginPx;

  // Allowed cam ranges so the whole board stays inside the viewport (with margins).
  // Works for BOTH cases:
  // - board larger than view: you can pan, but can't lose the board
  // - board smaller than view: you can still pan a bit, but it remains fully visible
  let minCamX = viewMaxX - b.maxX * s;
  let maxCamX = viewMinX - b.minX * s;
  if(minCamX > maxCamX){ const t=minCamX; minCamX=maxCamX; maxCamX=t; }

  let minCamY = viewMaxY - b.maxY * s;
  let maxCamY = viewMinY - b.minY * s;
  if(minCamY > maxCamY){ const t=minCamY; minCamY=maxCamY; maxCamY=t; }

  cam.x = clamp(cam.x, minCamX, maxCamX);
  cam.y = clamp(cam.y, minCamY, maxCamY);
}


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
  clampCameraToBoard(70);
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
  clampCameraToBoard(70);
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
  jokerHighlighted:new Set(),  // Joker placement targets (e.g. barricade move)
  eventActive:new Set(),
  lastEvent:null,  // Barricade placement targets
  pieces:[],
  occupied:new Map(),
  carry: {1:0,2:0,3:0,4:0},    // wie viele Barrikaden trägt Team x
  pendingSix:false,

  // Joker inventory & state
  jokers: {1:baseJokerLoadout(),2:baseJokerLoadout(),3:baseJokerLoadout(),4:baseJokerLoadout()},
  jokerFlags: { double:false, allcolors:false },
  jokerMode: null,
  jokerData: {},

  // --- Landing continuation (after placing a picked-up barricade) ---
  resumeLanding: null,
            // ob nach Aktion nochmal gewürfelt werden darf

  // --- Zielpunkte (Sammelziel) ---
  goalScores: {1:0,2:0,3:0,4:0}, // Punkte pro Team
  goalNodeId: null,             // aktuelles Zielpunkt-Feld (nodeId)
  goalToWin: 10,                // wer zuerst 10 sammelt gewinnt
  gameOver: false,              // Spiel beendet?

  // --- Boss System (max 2 gleichzeitig) ---
  bosses: [],                    // [{id,type,node,hp,visible,meta:{...}}]
  bossMaxActive: 2,
  bossIdSeq: 1,
  bossSpawnNodes: [],            // wird aus board nodes[type=boss] gefüllt
  bossTick: 0                    // Counter (für "jeden 2. Zug" etc.)
};


function currentTeam(){ return state.players[state.turn]; }

function setPlayerCount(n, opts={reset:true}){
  const nn = Math.max(1, Math.min(4, Number(n)||4));
  state.playerCount = nn;
  state.players = Array.from({length: nn}, (_,i)=>i+1);
  state.turn = 0;

  // Joker: reset inventory for active players (start with 1 each)
  ensureJokerState();
  for(let t=1;t<=4;t++){
    state.jokers[t] = baseJokerLoadout();
  }
  state.jokerFlags.double = false;
  state.jokerFlags.allcolors = false;
  state.jokerMode = null;
  state.jokerData = {};
  state.jokerHighlighted.clear();

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

    // Zielpunkte zurücksetzen
    state.goalScores = {1:0,2:0,3:0,4:0};
    state.gameOver = false;
    spawnGoalRandom(true);

    fitToBoard(60);
  }

  dieBox.textContent = "–";
  state.phase = "needRoll";
  setStatus(`Spieleranzahl: ${nn}. Team ${currentTeam()} ist dran: Würfeln.`);

  renderJokerButtons();
  updateJokerUI();
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

// --- Turn indicator in top status bar (always visible) ---
let _statusTextEl = null;
let _turnBadgeEl = null;

function ensureTopTurnUI(){
  if(!statusLine) return;

  // Transform statusLine into: [badge][text]
  if(!_statusTextEl){
    // keep existing text
    const prevText = statusLine.textContent || "";
    statusLine.textContent = "";

    _turnBadgeEl = document.createElement("span");
    _turnBadgeEl.id = "turnBadge";
    _turnBadgeEl.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "gap:6px",
      "padding:6px 10px",
      "margin-right:10px",
      "border-radius:999px",
      "font:800 12px system-ui, -apple-system, Segoe UI, Roboto, Arial",
      "letter-spacing:.2px",
      "border:1px solid rgba(255,255,255,.18)",
      "box-shadow:0 8px 22px rgba(0,0,0,.22)",
      "vertical-align:middle",
      "user-select:none"
    ].join(";");

    _statusTextEl = document.createElement("span");
    _statusTextEl.id = "statusText";
    _statusTextEl.textContent = prevText;

    statusLine.appendChild(_turnBadgeEl);
    statusLine.appendChild(_statusTextEl);
  }

  updateTurnBadge();
}

function updateTurnBadge(){
  if(!_turnBadgeEl) return;
  const t = currentTeam ? currentTeam() : 1;
  const col = TEAM_COLORS[t] || "#888";
  _turnBadgeEl.textContent = `▶ Team ${t} dran`;
  _turnBadgeEl.style.background = col;
  _turnBadgeEl.style.color = "rgba(255,255,255,.95)";
}

// Status text (kept separate from the badge)
function setStatus(t){
  ensureTopTurnUI();
  if(_statusTextEl) _statusTextEl.textContent = t;
  else if(statusLine) statusLine.textContent = t;
  updateTurnBadge();
}


function ensureFixedUILayout(){
  if(window.__fixedUILayoutApplied) return;
  window.__fixedUILayoutApplied = true;

  // Prevent the whole page from scrolling/zooming while interacting with the board.
  try{
    document.documentElement.style.height = "100%";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    // Allow normal tapping on UI controls; canvas itself handles pan/zoom.
    document.body.style.touchAction = "manipulation";
  }catch(e){}

  const css = `
    html, body { height:100%; overflow:hidden; overscroll-behavior:none; }

    /* Lock the UI: topbar + sidebar fixed, only the canvas content pans/zooms */
    .topbar{
      position:fixed !important;
      top:0; left:0; right:0;
      z-index:100;
    }

    /* Main area becomes a fixed viewport below the topbar */
    .main{
      position:fixed !important;
      left:0; right:0;
      top:62px; bottom:0;
      height:auto !important;
      overflow:hidden !important;
    }

    /* Sidebar fixed on the right (desktop/tablet). */
    #sidebar{
      position:fixed !important;
      top:62px; right:0; bottom:0;
      width:280px;
      z-index:90;
      overflow:auto;
      -webkit-overflow-scrolling: touch;
    }

    /* Canvas area fills remaining space left of the sidebar */
    .canvasWrap{
      position:fixed !important;
      top:62px; left:0;
      right:280px; bottom:0;
      min-height:0 !important;
    }
    #boardCanvas{ width:100% !important; height:100% !important; display:block; touch-action:none; }

    /* Status line should stay readable but not shift layout */
    #statusLine{ position:relative !important; }

    /* Mobile: stack sidebar under the board */
    @media (max-width: 980px){
      #sidebar{ position:fixed !important; left:0; right:0; bottom:0; top:auto; width:auto; max-height:46vh; }
      .canvasWrap{ right:0; bottom:46vh; }
    }
  `;
  const st = document.createElement("style");
  st.id = "fixedUILayoutStyles";
  st.textContent = css;
  document.head.appendChild(st);

  // If the sidebar is inside another positioned container, force it to be fixed anyway.
  const sb = document.getElementById("sidebar");
  if(sb){
    sb.style.position = "fixed";
    sb.style.right = "0";
    sb.style.top = "62px";
    sb.style.bottom = "0";
    sb.style.zIndex = "90";
    sb.style.overflow = "auto";
  }
}

function ensurePortalState(){
  if(!state.portalHighlighted) state.portalHighlighted = new Set();
  if(typeof state.portalUsedThisTurn !== "boolean") state.portalUsedThisTurn = false;
}

function ensureEventState(){
  if(!state.eventActive) state.eventActive = new Set();
  if(!("lastEvent" in state)) state.lastEvent = null;
}


// ---------- Boss System ----------
const BOSS_TYPES = {
  hunter: {
    name: "Der Jäger",
    icon: "☠",
    color: "rgba(220,70,70,.95)",
    traits: [
      "Läuft Richtung Führender",
      "Berührung: Figur zurück auf Start",
      "Barrikaden blocken den Weg"
    ],
    // bewegt sich nach jedem Spielerzug
    moveEvery: 1,
    respectsShield: true
  }

  ,
  destroyer: {
    name: "Der Zerstörer",
    icon: "⚔",
    color: "rgba(255,140,60,.95)",
    traits: [
      "Bewegt sich nur am Rundenende",
      "Läuft dann 3 Felder",
      "Zerstört dabei Barrikaden (und zusätzlich 1 zufällige Barrikade)"
    ],
    // bewegt sich NUR am Ende einer kompletten Runde (alle Spieler einmal dran)
    moveOnRoundEnd: true,
    stepsPerMove: 3,
    respectsShield: true
  }

  ,
  reaper: {
    name: "Der Räuber",
    icon: "🗡",
    color: "rgba(140,90,255,.95)",
    traits: [
      "Bewegt sich nur am Rundenende",
      "Läuft dann 5 Felder",
      "Auf dem Weg: Spieler verlieren 1 zufälligen Joker",
      "Auf dem Zielfeld (⭐): Spieler wird auf Start geworfen",
      "Bei Treffer: teleportiert (min. 6 Felder Abstand zum Treffer-Spieler)",
      "Kann NICHT über Barrikaden laufen (wenn blockiert: Zug verfällt)"
    ],
    moveOnRoundEnd: true,
    stepsPerMove: 5,
    respectsShield: true
  }


};

function ensureBossState(){
  if(!Array.isArray(state.bosses)) state.bosses = [];
  if(typeof state.bossMaxActive !== "number") state.bossMaxActive = 2;
  if(typeof state.bossIdSeq !== "number") state.bossIdSeq = 1;
  if(!Array.isArray(state.bossSpawnNodes)) state.bossSpawnNodes = [];
  if(typeof state.bossTick !== "number") state.bossTick = 0;
  if(typeof state.bossAuto !== "boolean") state.bossAuto = true;
  if(typeof state.bossDebug !== "boolean") state.bossDebug = true;
  if(typeof state._bossRoundEndFlag !== "boolean") state._bossRoundEndFlag = false;
}

function getBossSpawnNodes(){
  return nodes.filter(n=>n && n.type==="boss").map(n=>n.id);
}

function isNodeBlockedForBoss(nodeId){
  const n = nodesById.get(nodeId);
  if(!n) return true;
  if(n.type === "start") return true;
  if(state.bosses.some(b=>b.alive!==false && b.node===nodeId)) return true;
  return false;
}

function spawnBoss(type="hunter", preferredNodeId=null){
  ensureBossState();
  const def = BOSS_TYPES[type];
  if(!def) return null;

  const alive = state.bosses.filter(b=>b.alive!==false);
  if(alive.length >= state.bossMaxActive) return null;

  if(!state.bossSpawnNodes.length) state.bossSpawnNodes = getBossSpawnNodes();
  const pool = state.bossSpawnNodes.length ? state.bossSpawnNodes.slice() : nodes.map(n=>n.id);

  let nodeId = preferredNodeId;
  if(!nodeId || isNodeBlockedForBoss(nodeId)){
    const candidates = pool.filter(id=>!isNodeBlockedForBoss(id));
    if(!candidates.length) return null;
    nodeId = candidates[Math.floor(Math.random()*candidates.length)];
  }

  const boss = {
    id: "b"+(state.bossIdSeq++),
    type,
    name: def.name,
    node: nodeId,
    alive: true,
    visible: true,
    meta: {
      moveEvery: def.moveEvery || 1,
      respectsShield: !!def.respectsShield
    }
  };
  state.bosses.push(boss);
  updateBossUI();
  console.info("[BOSS] spawned", boss.type, boss.id, "at", boss.node);
  return boss;
}


function maybeDefeatBossAtNode(nodeId, byTeam){
  ensureBossState();
  const b = state.bosses.find(x => x.alive !== false && x.node === nodeId);
  if(!b) return false;

  // Standard: Bosse sind sofort besiegbar (1 Treffer) – AUSSER Boss 3 (Der Räuber) braucht 2 Treffer.
  if(b.type !== "reaper"){
    b.alive = false;
    b.node = null;
    updateBossUI();
    setStatus(`Team ${byTeam}: Boss besiegt (${(BOSS_TYPES[b.type]?.name)||b.name||b.type})!`);
    return true;
  }

  // Boss 3: braucht 2 Treffer. Treffer 1 => Teleport (min. 6 Felder Abstand nur zum Treffer-Spieler).
  b.hits = (b.hits || 0) + 1;

  if(b.hits >= 2){
    b.alive = false;
    b.node = null;
    updateBossUI();
    setStatus(`Team ${byTeam}: Boss besiegt (${(BOSS_TYPES[b.type]?.name)||b.name||b.type})!`);
    return true;
  }

  const ok = teleportBossRandomFree(b, nodeId, 6, byTeam);
  updateBossUI();
  setStatus(`Team ${byTeam}: Boss getroffen (1/2) – teleportiert${ok ? "" : " (kein freies Feld gefunden)"}!`);
  return true;
}

// Teleportiert den Boss auf ein zufälliges freies Feld.
// - Der Boss darf nicht auf Startfelder.
// - Der Mindestabstand (in Feldern/Schritten auf dem Graphen) gilt NUR zu den Figuren des Teams `byTeam`.
//   (Andere Teams dürfen näher sein.)
function teleportBossRandomFree(boss, fromNodeId, minDist=0, byTeam=null){
  ensureBossState();
  if(!boss || boss.alive===false) return false;

  const team = Number(byTeam||0);
  const teamNodes = team ? getTeamPieceNodes(team) : [];

  // Kandidaten: alle Nodes, die nicht blockiert sind
  const candidates = [];
  for(const n of nodes){
    if(!n || !n.id) continue;
    const id = n.id;
    if(id === fromNodeId) continue;
    if(isNodeBlockedForBoss(id)) continue;
    // Boss nicht direkt auf eine Figur
    if(state.occupied.has(id)) continue;
    // Optional: nicht direkt auf Barrikade teleportieren (wir wollen „frei“)
    if(barricades && barricades.has(id)) continue;
    candidates.push(id);
  }
  if(!candidates.length) return false;

  const randPick = (arr)=>arr[Math.floor(Math.random()*arr.length)];

  // Keine Distanzregel nötig?
  if(!minDist || minDist <= 0 || !teamNodes.length){
    boss.node = randPick(candidates);
    return true;
  }

  // BFS-Distanz von einem Start zu allen Knoten
  const bfsDistances = (startId)=>{
    const dist = new Map();
    dist.set(startId, 0);
    const q = [startId];
    while(q.length){
      const cur = q.shift();
      const d = dist.get(cur);
      for(const nb of (adj.get(cur)||[])){
        // Boss ignoriert Startfelder komplett als „begehbar“
        const nn = nodesById.get(nb);
        if(nn && nn.type === "start") continue;
        if(dist.has(nb)) continue;
        dist.set(nb, d+1);
        q.push(nb);
      }
    }
    return dist;
  };

  // Wir wollen: Abstand(candidate -> irgendeine Figur von byTeam) >= minDist
  // Für performance: Distanzkarten pro Kandidat sind ok (Board ist klein).
  const good = [];
  for(const cand of candidates){
    const dist = bfsDistances(cand);
    let best = Infinity;
    for(const tnode of teamNodes){
      const d = dist.get(tnode);
      if(typeof d === "number" && d < best) best = d;
    }
    if(best >= minDist) good.push(cand);
  }

  if(good.length){
    boss.node = randPick(good);
    return true;
  }

  // Fallback: wenn kein Feld den Mindestabstand schafft, teleportiere trotzdem irgendwo frei.
  boss.node = randPick(candidates);
  return true;
}

function despawnBoss(bossId){
  ensureBossState();
  const b = state.bosses.find(x=>x.id===bossId);
  if(!b) return;
  b.alive = false;
  updateBossUI();
  console.info("[BOSS] despawn", bossId);
}

function leadingTeam(){
  let bestT = currentTeam();
  let best = -1;
  for(const t of state.players){
    const sc = Number(state.goalScores?.[t]||0);
    if(sc > best){ best=sc; bestT=t; }
  }
  return bestT;
}

function getTeamPieceNodes(team){
  return state.pieces.filter(p=>p.node && p.team===team).map(p=>p.node);
}

function bfsNextStep(startId, goalIds, blockedFn){
  if(!startId || !goalIds || !goalIds.length) return null;
  const goals = new Set(goalIds);
  if(goals.has(startId)) return startId;

  const q = [startId];
  const prev = new Map();
  prev.set(startId, null);

  while(q.length){
    const cur = q.shift();
    for(const nb of (adj.get(cur)||[])){
      if(prev.has(nb)) continue;
      if(blockedFn && blockedFn(nb, cur)) continue;
      prev.set(nb, cur);
      if(goals.has(nb)){
        // reconstruct first step
        let step = nb;
        let p = prev.get(step);
        while(p && p !== startId){
          step = p;
          p = prev.get(step);
        }
        return step;
      }
      q.push(nb);
    }
  }
  return null;
}

function bossBlocked(nextId, fromId, boss){
  // Boss ignoriert Startfelder komplett:
  // - darf NICHT darauf laufen
  // - darf sie auch nicht als Zwischen-Schritt nutzen
  const nn = nodesById.get(nextId);
  if(nn && nn.type === "start") return true;

  // Boss 3 (Der Räuber): Barrikaden blocken hart (er darf NICHT drauf / drüber).
  if(boss && boss.type === "reaper"){
    if(barricades && barricades.has(nextId)) return true;
  }

  // Schutzschild blockt Zwischen-Schritt (Boss darf nicht "drüber laufen")
  const occId = state.occupied.get(nextId);
  if(occId){
    const p = state.pieces.find(x=>x.id===occId);
    if(p && p.shielded) return true;
  }
  return false;
}


function bossCollideAt(nodeId, boss){
  const occId = state.occupied.get(nodeId);
  if(!occId) return false;
  const p = state.pieces.find(x=>x.id===occId);
  if(!p) return false;

  const respectsShield = boss?.meta?.respectsShield ?? true;
  if(respectsShield && p.shielded) return false;

  // Boss 3: nur auf dem Zielfeld (⭐) wird geschmissen, sonst Joker klauen.
  if(boss.type === "reaper"){
    if(state.goalNodeId && nodeId === state.goalNodeId){
      kickToStart(p);
      console.info("[BOSS] reaper hit GOAL -> kick", p.id);
      return true;
    }
    // sonst: 1 zufälligen Joker verlieren
    if(removeRandomJoker(p.team, 1)){
      console.info("[BOSS] reaper stole random joker from team", p.team);
    }
    return true;
  }

  // Standard (Jäger/Zerstörer): Berührung => zurück auf Start
  kickToStart(p);
  console.info("[BOSS] collide", boss.type, boss.id, "-> kick", p.id);
  return true;
}

function moveBossOneStep(boss, force=false){
  if(!boss || boss.alive===false || !boss.node) return;

  const def = BOSS_TYPES[boss.type];
  if(!def) return;

  // Balancing: nur jeden X. Tick bewegen (außer im Debug-Force-Step)
  const every = Number(boss.meta?.moveEvery || 1);
  if(!force && every > 1){
    if(((state.bossTick||0) % every) !== 0) {
      if(state.bossDebug) console.info("[BOSS] skip (moveEvery)", boss.id, "tick", state.bossTick, "every", every);
      return;
    }
  }

  if(boss.type === "hunter"){
    const t = leadingTeam();
    // Boss berücksichtigt Startfelder nicht als Ziel (und jagt keine Figuren, die noch im Start stehen)
    const goals = getTeamPieceNodes(t).filter(id=>!isStartNode(id));
    // Wenn kein Ziel existiert (Team offboard / alle Figuren im Start), fallback: irgendeine Figur, aber auch ohne Startfelder
    const fallback = state.pieces.filter(p=>p.node && !isStartNode(p.node)).map(p=>p.node);
    const goalIds = goals.length ? goals : fallback;
if(!goalIds.length){
      const rnd = nodes.filter(n=>n && n.id && !(nodesById.get(n.id)?.type==="start")).map(n=>n.id);
      if(rnd.length) goalIds = [ rnd[Math.floor(Math.random()*rnd.length)] ];
    }
    if(!goalIds.length) return;

    const step = bfsNextStep(boss.node, goalIds, (n,f)=>bossBlocked(n,f,boss));
    if(!step || step === boss.node){
      if(state.bossDebug){
        const neigh = (adj.get(boss.node)||[]).slice(0,12);
        console.warn("[BOSS] no-step", boss.id, "at", boss.node, "neigh", neigh, "goals", goalIds.slice(0,6), "tick", state.bossTick);
      }
      return;
    }
    // Falls ein Boss auf eine Barrikade tritt: Barrikade wird entfernt (sonst kann er komplett stecken bleiben).
    if(barricades.has(step)){
      barricades.delete(step);
      if(state.bossDebug) console.info("[BOSS] broke barricade at", step, "boss", boss.id);
    }

    boss.node = step;
    bossCollideAt(step, boss);
  }
  else if(boss.type === "destroyer"){
    // Priorität: nächste Barrikade jagen und dabei zerstören
    let goalIds = [];
    if(barricades && barricades.size){
      goalIds = Array.from(barricades).filter(id=>!isStartNode(id));
    }
    // Fallback: Richtung führendes Team (ohne Startfelder)
    if(!goalIds.length){
      const t = leadingTeam();
      goalIds = getTeamPieceNodes(t).filter(id=>!isStartNode(id));
      if(!goalIds.length){
        goalIds = state.pieces.filter(p=>p.node && !isStartNode(p.node)).map(p=>p.node);
      }
    }
    if(!goalIds.length){
      const rnd = nodes.filter(n=>n && n.id && !(nodesById.get(n.id)?.type==="start")).map(n=>n.id);
      if(rnd.length) goalIds = [ rnd[Math.floor(Math.random()*rnd.length)] ];
    }
    if(!goalIds.length) return;

    const step = bfsNextStep(boss.node, goalIds, (n,f)=>bossBlocked(n,f,boss));
    if(!step || step === boss.node){
      if(state.bossDebug){
        const neigh = (adj.get(boss.node)||[]).slice(0,12);
        console.warn("[BOSS] no-step", boss.id, "at", boss.node, "neigh", neigh, "goals", goalIds.slice(0,6), "tick", state.bossTick);
      }
      return;
    }

    // Zerstörer: Barrikade auf dem Schritt wird sofort zerstört
    if(barricades.has(step)){
      barricades.delete(step);
      if(state.bossDebug) console.info("[BOSS] destroyer broke barricade at", step, "boss", boss.id);
    }

    boss.node = step;
    bossCollideAt(step, boss);
  }

  else if(boss.type === "reaper"){
    // Boss 3 (Der Räuber): jagt bevorzugt das Zielfeld (⭐), sonst Richtung führendes Team.
    let goalIds = [];
    if(state.goalNodeId && !isStartNode(state.goalNodeId)){
      goalIds = [state.goalNodeId];
    }
    if(!goalIds.length){
      const t = leadingTeam();
      goalIds = getTeamPieceNodes(t).filter(id=>!isStartNode(id));
      if(!goalIds.length){
        goalIds = state.pieces.filter(p=>p.node && !isStartNode(p.node)).map(p=>p.node);
      }
    }
    if(!goalIds.length){
      // Wenn noch keine Figuren außerhalb des Starts sind (Spielbeginn), wandert der Boss Richtung zufälliges freies Feld
      const rnd = nodes.filter(n=>n && n.id && !(nodesById.get(n.id)?.type==="start")).map(n=>n.id);
      if(rnd.length) goalIds = [ rnd[Math.floor(Math.random()*rnd.length)] ];
    }
    if(!goalIds.length) return;

    const step = bfsNextStep(boss.node, goalIds, (n,f)=>bossBlocked(n,f,boss));
    if(!step || step === boss.node){
      if(state.bossDebug){
        const neigh = (adj.get(boss.node)||[]).slice(0,12);
        console.warn("[BOSS] no-step", boss.id, "at", boss.node, "neigh", neigh, "goals", goalIds.slice(0,6), "tick", state.bossTick);
      }
      return;
    }

    // Räuber darf nicht auf Barrikaden laufen -> BFS blockt bereits.
    boss.node = step;
    bossCollideAt(step, boss);
  }


}


function bossStepOnce(){
  ensureBossState();
  const alive = state.bosses.filter(b=>b.alive!==false);
  for(const b of alive){
    moveBossOneStep(b, true); // force one move for testing
  }
  updateBossUI();
}

function clearBosses(){
  ensureBossState();
  for(const b of state.bosses){
    b.alive = false;
  }
  updateBossUI();
}

function updateBossesAfterPlayerAction(){
  ensureBossState();
  // Tick nach jedem abgeschlossenen Spielerzug (Move+Landing)
  state.bossTick = (state.bossTick||0) + 1;

  if(state.bossAuto){
    const alive = state.bosses.filter(b=>b.alive!==false);
    if(state.bossDebug) console.info("[BOSS] auto-step tick", state.bossTick, "alive", alive.map(x=>x.id), "roundEnd", !!state._bossRoundEndFlag);

    for(const b of alive){
      const def = BOSS_TYPES[b.type];
      if(!def) continue;

      // Boss, der nur am Rundenende agiert
      if(def.moveOnRoundEnd){
        if(!state._bossRoundEndFlag) continue;

        const steps = Math.max(1, Number(def.stepsPerMove||3));
        for(let i=0;i<steps;i++){
          moveBossOneStep(b, false);
        }

        // Extra-Effekt: nur Der Zerstörer zerstört zusätzlich 1 zufällige Barrikade
        if(b.type === "destroyer" && barricades && barricades.size){
          const arr = Array.from(barricades);
          const pick = arr[Math.floor(Math.random()*arr.length)];
          barricades.delete(pick);
          if(state.bossDebug) console.info("[BOSS] destroyer extra broke barricade at", pick, "boss", b.id);
        }
        continue;
      }

      // Standard: pro Boss-Phase 1 Schritt (unter Berücksichtigung moveEvery)
      moveBossOneStep(b, false);
    }
  }

  // RoundEnd-Flag ist nur für diese Boss-Phase gültig
  state._bossRoundEndFlag = false;

  updateBossUI();
}



// ---- Boss Phase Helper ----
// Läuft nach jedem abgeschlossenen Spielerzug einmal, damit der Boss "zwischen" den Zügen agiert.
// Blockiert in der kurzen Zeit Eingaben, damit es keine Race-Conditions gibt (Boss vs. Spieler-Click).
function runBossPhaseThen(done){
  try{
    if(state.gameOver) return;
    ensureBossState();

    // Round-End Flag: gilt für Bosse, die nur am Rundenende laufen.
    // Wichtig: Boss-Phase läuft VOR dem Spielerwechsel. Also prüfen wir,
    // ob der nächste "echte" Spielerwechsel (ohne pendingSix) eine Runde abschließt.
    const _willAdvance = !state.pendingSix;
    state._bossRoundEndFlag = _willAdvance && (state.players.length <= 1 || state.turn === state.players.length - 1);

    const hasAlive = (state.bosses||[]).some(b=>b.alive!==false);
    if(!state.bossAuto || !hasAlive){
      done && done();
      return;
    }

    const prevPhase = state.phase;
    state.phase = "bossPhase";
    setStatus("Boss bewegt sich...");

    // kleiner Delay -> fühlt sich "Phase" an und verhindert gleichzeitige Clicks auf Touch-Geräten
    setTimeout(()=>{
      updateBossesAfterPlayerAction();
      // done setzt anschließend wieder eine sinnvolle Phase (needRoll / choosePiece / etc.)
      done && done();
      // falls done nichts gesetzt hat, zurückfallen
      if(state.phase === "bossPhase") state.phase = prevPhase || "needRoll";
    }, 220);
  }catch(e){
    console.warn("[BOSS] bossPhase error", e);
    // Niemals hängen bleiben:
    done && done();
  }
}
function bossFieldHighlightDraw(n, R){
  // Spawn-Felder (type=boss) leicht markieren
  ctx.save();
  ctx.strokeStyle = "rgba(220,70,70,.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(n.x,n.y,R+6,0,Math.PI*2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,220,220,.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6,6]);
  ctx.beginPath();
  ctx.arc(n.x,n.y,R+10,0,Math.PI*2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ---- Boss UI in Sidebar ----
function ensureBossPanel(){
  // Wir hängen es unter die Joker-Buttons (rechts in der Sidebar)
  const anchor = jokerButtonsWrap || document.getElementById("sidebar") || document.body;
  let host = document.getElementById("bossPanel");
  if(host) return host;

  host = document.createElement("div");
  host.id = "bossPanel";
  host.style.cssText = [
    "margin-top:12px",
    "padding:12px",
    "border-radius:14px",
    "background:rgba(10,12,18,.42)",
    "border:1px solid rgba(255,255,255,.10)",
    "color:rgba(245,250,255,.92)",
    "font:600 13px system-ui, -apple-system, Segoe UI, Roboto, Arial"
  ].join(";");

  const title = document.createElement("div");
  title.textContent = "Bosse";
  title.style.cssText = "font-weight:800; margin-bottom:8px; letter-spacing:.2px;";
  host.appendChild(title);

  const list = document.createElement("div");
  list.id = "bossPanelList";
  host.appendChild(list);

  // --- Debug Controls (immer sichtbar) ---
  const dbg = document.createElement('div');
  dbg.id = 'bossDebugControls';
  dbg.style.cssText = 'margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:8px;';

  function mkBtn(id, label){
    const b = document.createElement('button');
    b.id = id;
    b.textContent = label;
    b.className = 'btn small';
    b.style.cssText = 'padding:10px 10px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:rgba(245,250,255,.92); font-weight:800; letter-spacing:.2px;';
    b.onmouseenter = ()=>{ b.style.background='rgba(255,255,255,.10)'; };
    b.onmouseleave = ()=>{ b.style.background='rgba(255,255,255,.06)'; };
    return b;
  }

  // Spawn selector (Test)
  const sel = document.createElement('select');
  sel.id = 'bossSpawnSelect';
  sel.style.cssText = 'grid-column:1 / -1; padding:10px 10px; border-radius:12px; border:1px solid rgba(255,255,255,.12); background:rgba(10,12,18,.35); color:rgba(245,250,255,.92); font-weight:800;';
  // Options from BOSS_TYPES
  for(const k of Object.keys(BOSS_TYPES)){
    const o = document.createElement('option');
    o.value = k;
    o.textContent = (BOSS_TYPES[k]?.name) ? BOSS_TYPES[k].name : k;
    sel.appendChild(o);
  }
  dbg.appendChild(sel);

  const btnSpawn = mkBtn('btnBossSpawn','Spawn Boss');
  const btnSpawnHunter = mkBtn('btnBossSpawnHunter','Spawn Jäger');
  const btnStep = mkBtn('btnBossStep','Boss Step');
  const btnToggle = mkBtn('btnBossToggleAI','Boss AI: AN');
  const btnClear = mkBtn('btnBossClear','Clear Bosses');

  dbg.appendChild(btnSpawn);
  dbg.appendChild(btnSpawnHunter);
  dbg.appendChild(btnStep);
  dbg.appendChild(btnToggle);
  dbg.appendChild(btnClear);

  const hint = document.createElement('div');
  hint.id = 'bossDebugHint';
  hint.style.cssText = 'grid-column:1 / -1; margin-top:2px; opacity:.7; font-size:12px; line-height:1.25;';
  hint.textContent = 'Test-Modus: Spawnen, Step, AI togglen, Clear.';
  dbg.appendChild(hint);

  host.appendChild(dbg);

  // Wire once
  btnSpawn.onclick = ()=>{ const t = document.getElementById('bossSpawnSelect')?.value || 'hunter'; spawnBoss(t); };
  btnSpawnHunter.onclick = ()=>{ spawnBoss('hunter'); };
  btnStep.onclick = ()=>{ bossStepOnce(); };
  btnClear.onclick = ()=>{ clearBosses(); };
  btnToggle.onclick = ()=>{
    ensureBossState();
    state.bossAuto = !state.bossAuto;
    btnToggle.textContent = 'Boss AI: ' + (state.bossAuto ? 'AN' : 'AUS');
  };

  // Insert after jokerButtonsWrap if possible
  if(jokerButtonsWrap && jokerButtonsWrap.parentElement){
    jokerButtonsWrap.parentElement.appendChild(host);
  }else{
    anchor.appendChild(host);
  }

  return host;
}

function updateBossUI(){
  ensureBossState();
  const panel = ensureBossPanel();
  const tgl = document.getElementById("btnBossToggleAI");
  if(tgl){ ensureBossState(); tgl.textContent = "Boss AI: " + (state.bossAuto ? "AN" : "AUS"); }
  const list = document.getElementById("bossPanelList");
  if(!list) return;

  const alive = state.bosses.filter(b=>b.alive!==false);
  if(!alive.length){
    list.innerHTML = "<div style='opacity:.75'>Kein Boss aktiv</div>";
    return;
  }

  list.innerHTML = "";
  for(const b of alive){
    const def = BOSS_TYPES[b.type] || {};
    const card = document.createElement("div");
    card.style.cssText = [
      "display:flex",
      "gap:10px",
      "align-items:flex-start",
      "padding:10px",
      "border-radius:12px",
      "background:rgba(255,255,255,.06)",
      "border:1px solid rgba(255,255,255,.10)",
      "margin-bottom:8px"
    ].join(";");

    const icon = document.createElement("div");
    icon.textContent = def.icon || "☠";
    icon.style.cssText = [
      "width:38px","height:38px",
      "border-radius:14px",
      "display:flex","align-items:center","justify-content:center",
      "background:"+(def.color || 'rgba(220,70,70,.95)'),
      "color:rgba(255,245,235,.95)",
      "font-weight:900",
      "border:1px solid rgba(0,0,0,.25)"
    ].join(";");

    const body = document.createElement("div");
    body.style.flex = "1";
    const name = document.createElement("div");
    name.textContent = def.name || b.name || b.type;
    name.style.cssText = "font-weight:900; margin-bottom:2px;";
    const meta = document.createElement("div");
    meta.style.cssText = "opacity:.78; font-weight:600; font-size:12px; margin-bottom:6px;";
    meta.textContent = `Feld: ${b.node}`;

    const ul = document.createElement("ul");
    ul.style.cssText = "margin:0; padding-left:16px; opacity:.9; font-weight:600; font-size:12px; line-height:1.3;";
    const traits = def.traits || [];
    for(const t of traits){
      const li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    }

    body.appendChild(name);
    body.appendChild(meta);
    body.appendChild(ul);

    card.appendChild(icon);
    card.appendChild(body);
    list.appendChild(card);
  }
}


// ---------- Joker UI + Logic ----------
function renderJokerButtons(){
  if(!jokerButtonsWrap) return;
  if(jokerButtonsWrap._built) return;
  jokerButtonsWrap._built = true;

  jokerButtonsWrap.innerHTML = "";
  const btns = {};
  for(const j of JOKERS){
    const b = document.createElement("button");
    b.className = "jokerBtn";
    b.type = "button";
    b.dataset.jokerId = j.id;

    const label = document.createElement("span");
    label.textContent = j.name;

    const count = document.createElement("span");
    count.className = "jokerCount";
    count.textContent = "0";

    b.appendChild(label);
    b.appendChild(count);

    b.addEventListener("click", ()=>{
      tryUseJoker(j.id);
    });
    jokerButtonsWrap.appendChild(b);
    btns[j.id] = { btn:b, countEl: count };
  }
  state._jokerBtns = btns;
  updateJokerUI();
}

function jokerIsUsableNow(joker){
  if(state.gameOver) return false;
  if(state.jokerMode) return false; // während eines Joker-Modus keine anderen starten

  const beforeOk = (state.phase === "needRoll") && (state.roll === null);
  const afterOk = (state.roll !== null) && (state.phase === "choosePiece" || state.phase === "chooseTarget");

  if(joker.timing === "before") return beforeOk;
  return afterOk;
}

function updateJokerUI(){
  if(!jokerButtonsWrap) return;
  ensureJokerState();
  renderJokerButtons();

  const team = currentTeam();
  const hint = [];
  if(state.jokerMode === "swapPickA") hint.push("Spieler tauschen: Figur A wählen");
  if(state.jokerMode === "swapPickB") hint.push("Spieler tauschen: Figur B wählen");
  if(state.jokerMode === "moveBarricadePick") hint.push("Barrikade versetzen: Barrikade wählen");
  if(state.jokerMode === "moveBarricadePlace") hint.push("Barrikade versetzen: Ziel-Feld wählen");
  if(state.jokerMode === "shieldPick") hint.push("Schutzschild: eigene Figur wählen");
  if(!hint.length){
    if(state.phase === "needRoll") hint.push("Vor dem Wurf nutzbar: Doppelwurf / Barrikade / Spieler tauschen");
    else if(state.phase === "choosePiece" || state.phase === "chooseTarget") hint.push("Nach dem Wurf nutzbar: Neuwurf / Schutzschild / Alle Farben");
    else hint.push("–");
  }
  if(jokerHint) jokerHint.textContent = hint.join(" · ");

  const btns = state._jokerBtns || {};
  for(const j of JOKERS){
    const ref = btns[j.id];
    if(!ref) continue;
    ref.countEl.textContent = String(jokerCount(team, j.id));

    const usable = jokerIsUsableNow(j) && jokerCount(team, j.id) > 0;
    ref.btn.disabled = !usable;

    // Active toggles
    let on = false;
    if(j.id === "double" && state.jokerFlags.double) on = true;
    if(j.id === "allcolors" && state.jokerFlags.allcolors) on = true;
    ref.btn.classList.toggle("on", on);
  }
}

function setJokerMode(mode, data={}){
  ensureJokerState();
  state.jokerMode = mode;
  state.jokerData = data || {};
  state.jokerHighlighted.clear();
  updateJokerUI();
}

function clearJokerMode(msg){
  ensureJokerState();
  state.jokerMode = null;
  state.jokerData = {};
  state.jokerHighlighted.clear();
  if(msg) setStatus(msg);
  updateJokerUI();
}

function beginChoosePieceAfterRoll(){
  // Nach (Neu-)Wurf: Figur wählen (oder wechseln)
  state.selected = null;
  state.highlighted.clear();
  state.phase = "choosePiece";
  const any = state.pieces.some(p=>p.node);
  if(!any){
    setStatus(`Team ${currentTeam()}: Keine Figur auf dem Board.`);
  }
  updateJokerUI();
}

function rollDice(){
  const a = Math.floor(Math.random()*6)+1;
  if(state.jokerFlags.double){
    const b = Math.floor(Math.random()*6)+1;
    state.jokerFlags.double = false; // verbraucht beim Wurf
    return a + b;
  }
  return a;
}

function tryUseJoker(jokerId){
  if(state.gameOver) return;
  ensureJokerState();

  const team = currentTeam();
  const joker = JOKERS.find(j=>j.id===jokerId);
  if(!joker) return;

  if(jokerCount(team, jokerId) <= 0) return;
  if(!jokerIsUsableNow(joker)) return;

  // Consume first (prevents double click abuse)
  if(!consumeJoker(team, jokerId)) return;

  if(jokerId === "double"){
    state.jokerFlags.double = true;
    setStatus(`Team ${team}: Doppelwurf aktiv. Jetzt würfeln.`);
    updateJokerUI();
    return;
  }

  if(jokerId === "reroll"){
    // nur nach dem Wurf
    state.roll = rollDice();
    dieBox.textContent = state.roll;
    setStatus(`Team ${team}: Neuwurf! Wurf ${state.roll}.`);
    beginChoosePieceAfterRoll();
    return;
  }

  if(jokerId === "allcolors"){
    state.jokerFlags.allcolors = true;
    setStatus(`Team ${team}: Alle Farben aktiv – du darfst jede Figur wählen.`);
    updateJokerUI();
    return;
  }

  if(jokerId === "moveBarricade"){
    setJokerMode("moveBarricadePick");
    setStatus(`Team ${team}: Joker Barrikade versetzen – tippe eine Barrikade an.`);
    return;
  }

  if(jokerId === "swap"){
    setJokerMode("swapPickA");
    setStatus(`Team ${team}: Joker Spieler tauschen – wähle Figur A.`);
    return;
  }

  if(jokerId === "shield"){
    setJokerMode("shieldPick");
    setStatus(`Team ${team}: Schutzschild – wähle eine eigene Figur.`);
    return;
  }
}


// ---------- Zielpunkte (Sammelziel) ----------
function isFreeForGoal(id){
  // Zielpunkt darf NICHT auf Figuren liegen.
  // ABER: Er DARF unter einer Barrikade liegen (versteckt).
  if(state.occupied.has(id)) return false;
  return true;
}

function spawnGoalRandom(force=false){
  // Wählt ein zufälliges Feld für den Zielpunkt
  // - nur wenn noch keiner existiert oder force=true
  if(state.gameOver) return;
  if(state.goalNodeId && !force) return;

  if(!nodes || nodes.length===0) return;

  const candidates = nodes
    .filter(n => n && n.id)
    // optional: Start/Portal meiden, damit es fair bleibt
    .filter(n => n.type !== "start" && n.type !== "portal")
    .map(n => n.id)
    .filter(id => isFreeForGoal(id));

  // Fallback: wenn zu restriktiv, nimm wirklich "irgendwo frei"
  const fallback = nodes.map(n=>n.id).filter(id => isFreeForGoal(id));

  const pool = (candidates.length ? candidates : fallback);
  if(!pool.length) return;

  // Nicht exakt dasselbe Feld wie vorher (wenn möglich)
  let pick = pool[Math.floor(Math.random()*pool.length)];
  if(state.goalNodeId && pool.length > 1){
    let tries = 0;
    while(pick === state.goalNodeId && tries < 10){
      pick = pool[Math.floor(Math.random()*pool.length)];
      tries++;
    }
  }

  state.goalNodeId = pick;
}

function maybeCaptureGoal(piece){
  if(state.gameOver) return false;
  if(!state.goalNodeId) return false;
  if(!piece || !piece.node) return false;

  if(piece.node !== state.goalNodeId) return false;

  // Wenn hier eine Barrikade liegt, ist der Zielpunkt "versteckt" und kann nicht eingesammelt werden.
  if(barricades.has(piece.node)) return false;

  // Punkt einsammeln
  const t = piece.team;
  state.goalScores[t] = (state.goalScores[t]||0) + 1;

  // Sieg?
  if(state.goalScores[t] >= state.goalToWin){
    state.gameOver = true;
    state.phase = "gameOver";
    setStatus(`🏆 Team ${t} gewinnt! (${state.goalToWin} Zielpunkte erreicht)`);
    showWinOverlay(t);
    return true;
  }

  // Neu spawnen
  state.goalNodeId = null;
  spawnGoalRandom(true);
  setStatus(`🎯 Team ${t} sammelt einen Zielpunkt! Stand: ${state.goalScores[t]}/${state.goalToWin}`);
  return true;
}

function showWinOverlay(team){
  let ov = document.getElementById("winOverlay");
  if(!ov){
    ov = document.createElement("div");
    ov.id = "winOverlay";
    ov.style.cssText = [
      "position:fixed","inset:0","display:none",
      "align-items:center","justify-content:center",
      "z-index:99998",
      "background:rgba(0,0,0,.55)"
    ].join(";");

    ov.innerHTML = `
      <div style="
        width:min(640px, calc(100vw - 28px));
        border-radius:22px;
        padding:22px 20px 18px;
        background:
          radial-gradient(900px 380px at 50% 10%, rgba(255,255,255,.55), rgba(255,255,255,0) 65%),
          repeating-linear-gradient(90deg, rgba(70,55,38,.05), rgba(70,55,38,.05) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 26px),
          repeating-linear-gradient(0deg, rgba(70,55,38,.03), rgba(70,55,38,.03) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 34px),
          linear-gradient(180deg, #f3e7c9 0%, #ead8ab 60%, #ddc58f 100%);
        border:1px solid rgba(0,0,0,.22);
        box-shadow:0 26px 90px rgba(0,0,0,.62);
        color:rgba(38,26,18,.92);
        font-family: ui-serif, Georgia, 'Times New Roman', Times, serif;
      ">
        <div style="font:800 28px 'Cinzel', ui-serif, Georgia, serif; letter-spacing:.5px; margin-bottom:8px;">
          🏆 Sieg!
        </div>
        <div id="winText" style="font:600 18px 'EB Garamond', ui-serif, Georgia, serif; line-height:1.35; margin-bottom:14px;">
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button id="btnWinRestart" style="
            all:unset; cursor:pointer;
            padding:10px 14px; border-radius:12px;
            background:rgba(60,40,20,.12);
            border:1px solid rgba(0,0,0,.18);
            font:700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial;
          ">Neu starten</button>
          <button id="btnWinClose" style="
            all:unset; cursor:pointer;
            padding:10px 14px; border-radius:12px;
            background:rgba(60,40,20,.18);
            border:1px solid rgba(0,0,0,.18);
            font:700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial;
          ">Schließen</button>
        </div>
      </div>
    `;
    document.body.appendChild(ov);

    ov.addEventListener("click",(e)=>{
      if(e.target === ov) ov.style.display="none";
    });

    ov.querySelector("#btnWinClose").addEventListener("click",()=>{
      ov.style.display="none";
    });

    ov.querySelector("#btnWinRestart").addEventListener("click",()=>{
      // Soft-Reset: Punkte + Figuren zurück (kein Reload nötig)
      state.goalScores = {1:0,2:0,3:0,4:0};
      state.gameOver = false;
      initPieces();
      initEventFieldsFromBoard();
      state.goalNodeId = null;
      spawnGoalRandom(true);
      state.phase = "needRoll";
      state.turn = 0;
      state.roll = null;
      state.selected = null;
      state.highlighted.clear();
      state.placeHighlighted.clear();
      ensurePortalState();
      state.portalHighlighted.clear();
      state.portalUsedThisTurn = false;
      state.pendingSix = false;

      dieBox.textContent="–";
      setStatus(`Neustart! Team ${currentTeam()} ist dran: Würfeln.`);
      ov.style.display="none";
    });
  }

  const winText = ov.querySelector("#winText");
  winText.textContent = `Team ${team} hat als erstes ${state.goalToWin} Zielpunkte gesammelt.`;
  ov.style.display="flex";
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
    ov.style.cssText = [
      "position:fixed","inset:0","display:none",
      "align-items:center","justify-content:center",
      "z-index:99997",
      "background:rgba(0,0,0,.48)"
    ].join(";") + ";";

    ov.innerHTML = `
      <div id="eventCard" style="
        width:min(560px, calc(100vw - 28px));
        border-radius:18px;
        padding:18px 18px 14px;
        background:
          radial-gradient(900px 380px at 50% 10%, rgba(255,255,255,.55), rgba(255,255,255,0) 65%),
          repeating-linear-gradient(90deg, rgba(70,55,38,.05), rgba(70,55,38,.05) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 26px),
          repeating-linear-gradient(0deg, rgba(70,55,38,.03), rgba(70,55,38,.03) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 34px),
          linear-gradient(180deg, #f3e7c9 0%, #ead8ab 60%, #ddc58f 100%);
        border:1px solid rgba(0,0,0,.22);
        box-shadow:0 22px 70px rgba(0,0,0,.55);
        color:rgba(38,26,18,.92);
        font-family: ui-serif, Georgia, 'Times New Roman', Times, serif;
        position:relative;
      ">
        <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom:10px;">
          <div style="
            width:44px; height:44px; border-radius:16px;
            display:flex; align-items:center; justify-content:center;
            background:linear-gradient(180deg, rgba(255,255,255,.20), rgba(0,0,0,.10)),
                       radial-gradient(circle at 35% 35%, rgba(200,55,65,.98), rgba(90,14,18,.96));
            border:1px solid rgba(0,0,0,.28);
            box-shadow: inset 0 0 0 2px rgba(255,240,232,.12);
            color:rgba(255,245,235,.92);
            font-weight:900;
          ">✦</div>

          <div style="flex:1;">
            <div id="eventTitle" style="font-weight:900; font-size:20px; letter-spacing:.2px; line-height:1.15;">Ereignis</div>
            <div style="opacity:.72; font-size:12px; margin-top:2px;">Ereigniskarte (Wachssiegel)</div>
          </div>

          <button id="eventCloseX" title="Schließen" style="
            border:1px solid rgba(0,0,0,.22);
            background:rgba(255,255,255,.55);
            color:rgba(38,26,18,.85);
            border-radius:12px;
            width:38px; height:38px;
            display:flex; align-items:center; justify-content:center;
            font-size:16px;
            cursor:pointer;
          ">✕</button>
        </div>

        <div id="eventText" style="
          font-size:15px;
          line-height:1.4;
          padding:12px 12px;
          border-radius:14px;
          background:rgba(255,255,255,.35);
          border:1px dashed rgba(0,0,0,.18);
          margin-bottom:12px;
          white-space:pre-wrap;
        "></div>

        <div style="display:flex; gap:10px; justify-content:flex-end; align-items:center;">
          <button id="eventOk" style="
            cursor:pointer;
            padding:10px 14px;
            border-radius:12px;
            border:1px solid rgba(0,0,0,.35);
            background:
              linear-gradient(180deg, rgba(255,255,255,.18), rgba(0,0,0,.18)),
              linear-gradient(180deg, #6a4a2f, #4f3623);
            color:rgba(255,250,235,.92);
            font-weight:800;
            text-shadow:0 1px 0 rgba(0,0,0,.45);
          ">Annehmen</button>
        </div>

        <div style="
          position:absolute; right:14px; bottom:12px;
          width:58px; height:58px; border-radius:22px;
          background:
            radial-gradient(circle at 35% 35%, rgba(200,55,65,.98), rgba(90,14,18,.96));
          border:1px solid rgba(0,0,0,.30);
          box-shadow: 0 14px 26px rgba(0,0,0,.35), inset 0 0 0 2px rgba(255,240,232,.10);
          display:flex; align-items:center; justify-content:center;
          color:rgba(255,245,235,.92);
          font-size:18px; font-weight:900;
          transform: rotate(-8deg);
          opacity:.92;
          pointer-events:none;
        ">✦</div>
      </div>
    `;

    document.body.appendChild(ov);

    // Prevent closing by clicking inside card
    ov.addEventListener("click",(e)=>{
      if(e.target===ov) doClose();
    });

    function doClose(){
      ov.style.display="none";
      if(typeof onClose==="function") onClose();
    }

    ov._doClose = doClose;

    ov.querySelector("#eventOk").addEventListener("click", doClose);
    ov.querySelector("#eventCloseX").addEventListener("click", doClose);
  }

  // update content + show
  ov.querySelector("#eventTitle").textContent = card?.title || "Ereignis";
  ov.querySelector("#eventText").textContent = card?.text || "";
  ov.style.display="flex";

  // If onClose changes between calls, update handler
  ov._doClose = (function(){
    return function(){
      ov.style.display="none";
      if(typeof onClose==="function") onClose();
    };
  })();

  // Rebind buttons to new onClose
  const okBtn = ov.querySelector("#eventOk");
  const xBtn  = ov.querySelector("#eventCloseX");
  okBtn.onclick = ov._doClose;
  xBtn.onclick  = ov._doClose;
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

  // Start/Portal/Boss meiden (Fairness / Logik)
  if(n.type==="start" || n.type==="portal") return false;
  if(n.type==="boss") return false;

  // Hindernisse meiden (aber: Barrikaden dürfen darüber liegen -> "versteckt" ist erlaubt)
  if(n.type==="obstacle") return false;

  // nicht auf ein bereits aktives Eventfeld / nicht auf Figuren
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
  ensureJokerState();
  state.turn = (state.turn+1)%state.players.length;
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.jokerHighlighted.clear();
  state.jokerMode = null;
  state.jokerData = {};
  state.jokerFlags.double = false;
  state.jokerFlags.allcolors = false;
  ensurePortalState();
  state.portalHighlighted.clear();
  state.portalUsedThisTurn=false;
  state.phase="needRoll";
  state.pendingSix=false;
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);

  updateJokerUI();
}

function staySameTeamNeedRoll(msg){
  ensurePortalState();
  ensureJokerState();
  state.roll=null;
  state.selected=null;
  state.highlighted.clear();
  state.placeHighlighted.clear();
  state.jokerHighlighted.clear();
  state.jokerMode = null;
  state.jokerData = {};
  state.jokerFlags.double = false;
  state.jokerFlags.allcolors = false;
  ensurePortalState();
  state.portalHighlighted.clear();
  state.portalUsedThisTurn=false;
  state.phase="needRoll";
  dieBox.textContent="–";
  setStatus(msg || `Team ${currentTeam()} ist dran: Würfeln.`);

  updateJokerUI();
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

  // Anti-Hüpfen (nur INNERHALB dieses Wurfs):
  // Verhindert nur A->B->A im selben Pfad.
  // WICHTIG: NICHT das vorherige Feld aus dem letzten Zug sperren!
  //
  // Dafür tracken wir pro BFS-State das "from" (Vorgängerfeld) und blocken nur den direkten Rücksprung.
  const q = [{ id: start, d: 0, from: null }];
  const visited = new Set([start+"|0|null"]);

  while(q.length){
    const cur = q.shift();

    if(cur.d === steps){
      if(cur.id !== start){
        const occ = state.occupied.get(cur.id);
        if(!occ){
          state.highlighted.add(cur.id);
        }else{
          const op = state.pieces.find(x=>x.id===occ);
          // Wenn Ziel eine Figur hat:
          // - Gegner darf geschmissen werden (außer Schutzschild)
          // - Eigene Figur blockt
          if(op && op.team !== piece.team && !op.shielded){
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

      // 🛡 Schutzschild blockt Zwischen-Schritte (niemand darf drüber laufen)
      if((cur.d+1) < steps){
        const occ = state.occupied.get(nb);
        if(occ){
          const op = state.pieces.find(x=>x.id===occ);
          if(op && op.shielded) continue;
        }
      }

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

    // Schutzschild: darf nicht geschmissen werden
    if(other && other.shielded) return false;

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

  // Schutzschild endet, sobald diese Figur bewegt wird
  if(piece.shielded) piece.shielded = false;
  return true;
}

function resolveLanding(piece, opts={allowPortal:true, fromBarricade:false}){
  const team = piece.team;

  // ✅ 1) Barrikade aufgenommen?
  // Wichtig: Anti-Funktionsverlust + saubere State-Machine:
  // - Wenn man auf einer Barrikade landet, wird zuerst aufgenommen
  // - Danach platziert man sie
  // - Danach wird das Landefeld (Ziel/Event/Portal) weiter ausgewertet
  if(!opts.fromBarricade && barricades.has(piece.node)){
    barricades.delete(piece.node);
    state.carry[team] = (state.carry[team]||0) + 1;

    // Merke, dass wir nach der Platzierung hier weiter machen müssen
    state.resumeLanding = { pieceId: piece.id, allowPortal: !!opts.allowPortal, nodeId: piece.node };

    computePlaceTargets();
    state.phase = "placeBarricade";
    setStatus(`Team ${team}: Barrikade aufgenommen! Tippe ein freies Feld zum Platzieren.`);
    updateJokerUI();
    return;
  }

  // 👹 Boss auf dem Feld? -> sofort besiegt (bevor Ziel/Event ausgewertet wird)
  if(maybeDefeatBossAtNode(piece.node, team)){
    // nach Boss-Besiegung geht der Zug normal weiter (Ziel/Event kann trotzdem passieren)
  }


  // 🎯 2) Zielpunkt einsammeln?
  if(maybeCaptureGoal(piece)){
    if(state.gameOver) return; // bei Sieg sofort stoppen
    // weiter mit normalen Landing-Effekten
  }

  // 🎴 3) Ereignisfeld: Karte ziehen
  ensureEventState();
  if(state.eventActive && state.eventActive.has(piece.node)){
    const card = pickRandomEventCard();
    state.lastEvent = card;
    console.info('[EVENT] draw', card.id, 'on', piece.node);

    showEventOverlay(card, ()=>{
      relocateEventField(piece.node);
      // Nach dem OK weiter mit Portal / Turn-Ende (ohne Barrikade-Check erneut)
      resolveLanding(piece, { allowPortal: !!opts.allowPortal, fromBarricade: true });
    });

    // Temporär entfernen, damit wir nicht sofort wieder triggert
    state.eventActive.delete(piece.node);
    return;
  }

  // 🌀 4) Portal (optional, z.B. nach Teleport nicht nochmal)
  if(opts.allowPortal && isPortalNode(piece.node) && !state.portalUsedThisTurn){
    computePortalTargets(piece.node);
    if(state.portalHighlighted.size > 0){
      state.phase = "usePortal";
      setStatus(`Team ${team}: Portal! Tippe ein anderes freies Portal (oder tippe dein Portal nochmal = bleiben).`);
      updateJokerUI();
      return;
    }
  }

  // ✅ 5) Zug beenden / 6 = nochmal
  // 👹 Boss-Phase nach abgeschlossenem Spielerzug (Move + Landing)
  // Rundenende-Marker (für Bosse, die nur am Rundenende agieren)
  ensureBossState();
  state._bossRoundEndFlag = (!state.pendingSix) && (state.turn === state.players.length-1);
  // WICHTIG:
  // - Boss bewegt sich erst NACH allen Spieler-Aktionen (inkl. Barrikade/Events/Portale)
  // - Boss bewegt sich VOR dem Spielerwechsel / erneuten Würfeln (bei 6)
  runBossPhaseThen(()=>{
    if(state.pendingSix){
      state.pendingSix=false;
      staySameTeamNeedRoll(`Team ${team}: Du hast eine 6! Nochmal würfeln.`);
    }else{
      nextTurn();
    }
  });
}

function afterLandingNoPortal(piece){
  return resolveLanding(piece, { allowPortal:false, fromBarricade:false });
}

function afterLanding(piece){
  return resolveLanding(piece, { allowPortal:true, fromBarricade:false });
}

function placeBarricadeAt(nodeId){
  const team = currentTeam();
  if(!state.placeHighlighted.has(nodeId)) return false;
  if((state.carry[team]||0) <= 0) return false;

  barricades.add(nodeId);
  state.carry[team] -= 1;

  // Nach Platzierung:
  // Wenn wir gerade eine Barrikade von einem Landefeld aufgenommen haben, muss
  // danach das Landefeld (Ziel / Ereignis / Portal / Turn-Ende) weiter ausgewertet werden.
  state.placeHighlighted.clear();

  if(state.resumeLanding && state.resumeLanding.pieceId){
    const info = state.resumeLanding;
    state.resumeLanding = null;

    const p = state.pieces.find(pp => pp.id === info.pieceId);
    if(p){
      // Weiter mit der Landelogik (ohne erneuten Barrikaden-Check)
      resolveLanding(p, { allowPortal: !!info.allowPortal, fromBarricade: true });
      return true;
    }
  }

  // Fallback: normales Ende nach Barrikaden-Platzierung
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
  // UX-Fix:
  // - Der Hit-Radius bleibt in SCREEN-Pixeln ungefähr gleich (auch beim Rauszoomen).
  // - Wir wählen den NÄCHSTEN Node innerhalb des Radius (nicht "erster Treffer" in Array-Reihenfolge),
  //   damit man auch bei Zoom-out zuverlässig das richtige Feld / die richtige Figur trifft.
  const desiredScreenR = 26; // px (klickbar auf Tablet)
  const minWorldR = 18;      // nie kleiner als Node-Kreis
  const maxWorldR = 44;      // Sicherheitsklemme (sonst zu viel "Mitnehmen")

  const R = clamp(desiredScreenR / (cam.s || 1), minWorldR, maxWorldR);
  const R2 = R*R;

  let best = null;
  let bestD2 = Infinity;
  for(const n of nodes){
    const dx = wx - n.x, dy = wy - n.y;
    const d2 = dx*dx + dy*dy;
    if(d2 <= R2 && d2 < bestD2){
      best = n;
      bestD2 = d2;
    }
  }
  return best;
}


function handleTapAtWorld(wx, wy){
  if(state.gameOver) return;
  const hit = hitTestWorld(wx, wy);
  if(!hit) return;

  // Joker modes have priority
  ensureJokerState();
  if(state.jokerMode){
    const team = currentTeam();

    // --- Barrikade versetzen ---
    if(state.jokerMode === "moveBarricadePick"){
      if(!barricades.has(hit.id)){
        setStatus(`Team ${team}: Tippe eine Barrikade an.`);
        return;
      }
      // choose origin
      state.jokerData = { fromId: hit.id };
      // compute possible targets
      state.jokerHighlighted.clear();
      for(const n of nodes){
        if(isFreeForBarricade(n.id) || n.id === hit.id) state.jokerHighlighted.add(n.id);
      }
      state.jokerMode = "moveBarricadePlace";
      setStatus(`Team ${team}: Barrikade gewählt. Tippe das neue Feld.`);
      updateJokerUI();
      return;
    }

    if(state.jokerMode === "moveBarricadePlace"){
      const fromId = state.jokerData?.fromId;
      if(!fromId || !barricades.has(fromId)){
        clearJokerMode(`Team ${team}: Barrikade nicht mehr vorhanden.`);
        return;
      }
      if(!state.jokerHighlighted.has(hit.id)) return;
      // move
      barricades.delete(fromId);
      barricades.add(hit.id);
      clearJokerMode(`Team ${team}: Barrikade versetzt.`);
      return;
    }

    // --- Spieler tauschen ---
    if(state.jokerMode === "swapPickA"){
      const occId = state.occupied.get(hit.id);
      if(!occId){
        setStatus(`Team ${team}: Wähle eine Figur.`);
        return;
      }
      const p = state.pieces.find(x=>x.id===occId);
      if(!p || !p.node){
        setStatus(`Team ${team}: Ungültige Figur.`);
        return;
      }
      state.jokerData = { aId: p.id };
      state.jokerMode = "swapPickB";
      setStatus(`Team ${team}: Figur A gewählt. Wähle Figur B.`);
      updateJokerUI();
      return;
    }

    if(state.jokerMode === "swapPickB"){
      const occId = state.occupied.get(hit.id);
      if(!occId){
        setStatus(`Team ${team}: Wähle eine Figur.`);
        return;
      }
      const a = state.pieces.find(x=>x.id===state.jokerData?.aId);
      const b = state.pieces.find(x=>x.id===occId);
      if(!a || !b || !a.node || !b.node){
        clearJokerMode(`Team ${team}: Tausch nicht möglich.`);
        return;
      }
      if(a.id === b.id){
        setStatus(`Team ${team}: Wähle eine andere Figur als B.`);
        return;
      }

      // swap nodes and occupied
      const aNode = a.node;
      const bNode = b.node;
      state.occupied.set(aNode, b.id);
      state.occupied.set(bNode, a.id);
      a.node = bNode;
      b.node = aNode;
      a.prev = null;
      b.prev = null;

      clearJokerMode(`Team ${team}: Figuren getauscht.`);
      return;
    }

    // --- Schutzschild ---
    if(state.jokerMode === "shieldPick"){
      const occId = state.occupied.get(hit.id);
      if(!occId){
        setStatus(`Team ${team}: Wähle eine eigene Figur.`);
        return;
      }
      const p = state.pieces.find(x=>x.id===occId);
      if(!p || p.team !== team){
        setStatus(`Team ${team}: Nur eigene Figur!`);
        return;
      }
      p.shielded = true;
      clearJokerMode(`Team ${team}: Schutzschild aktiv auf einer Figur (bis sie bewegt wird).`);
      return;
    }
  }

  // 1) Figur wählen / wechseln (nach dem Wurf)
  const occId = state.occupied.get(hit.id);
  if(occId && (state.phase==="choosePiece") && state.roll){
    const occPiece = state.pieces.find(p=>p.id===occId);
    if(occPiece && (occPiece.team === currentTeam() || state.jokerFlags.allcolors)){
      state.selected = occPiece.id;
      computeMoveTargets(occPiece, state.roll);
      state.phase = "chooseTarget";
      setStatus(`Team ${currentTeam()}: Wurf ${state.roll}. Tippe ein leuchtendes Zielfeld.`);
      return;
    }
  }

  // 1b) Figur wechseln auch NACH Auswahl (solange der Zug noch nicht ausgeführt wurde)
  // Wunsch: Nach Auswahl einer Figur soll man eine andere eigene Figur anklicken können.
  if(occId && (state.phase==="chooseTarget") && state.roll){
    const occPiece = state.pieces.find(p=>p.id===occId);
    if(occPiece && (occPiece.team === currentTeam() || state.jokerFlags.allcolors)){
      state.selected = occPiece.id;
      computeMoveTargets(occPiece, state.roll);
      // Phase bleibt chooseTarget
      setStatus(`Team ${currentTeam()}: Wurf ${state.roll}. Figur gewechselt – tippe ein leuchtendes Zielfeld.`);
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
    // multi-touch: not a tap / stop panning baseline (prevents jump after pinch)
    tapCandidate = null;
    isPanning = false;
    panStart = null;
    canvas._pinchLastDist = null;
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
    clampCameraToBoard(70);

    // wenn merklich bewegt -> kein Tap
    if(tapCandidate){
      const mx = p.x - tapCandidate.x;
      const my = p.y - tapCandidate.y;
      if((mx*mx + my*my) > 144) tapCandidate = null; // >12px // >6px
    }
    return;
  }

  if(pointers.size===2){
    // Pinch: stop panning baseline (prevents jump when pinch ends)
    isPanning = false;
    panStart = null;
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

  // If pinch ends and one pointer remains: reset pan baseline to prevent "jump"
  if(pointers.size===1){
    const only = Array.from(pointers.values())[0];
    isPanning = true;
    panStart = { x: only.x, y: only.y, camX: cam.x, camY: cam.y };
    tapCandidate = null;
  }

  // Tap if candidate still valid and single pointer ended
  if(tapCandidate && pointers.size===0){
    const p = getLocalXY(e);
    const dt = performance.now() - tapCandidate.t;
    const dx = p.x - tapCandidate.x;
    const dy = p.y - tapCandidate.y;
    if(dt < 450 && (dx*dx+dy*dy) <= 144){
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
  if(state.gameOver) return;
  if(state.phase!=="needRoll") return;

  ensureJokerState();
  state.roll = rollDice();
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

  updateJokerUI();
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



// ---------- Eventfelder: Wachssiegel (nur optisch) ----------
function drawWaxSeal(x,y,baseR){
  const r = baseR;
  ctx.save();

  // soft shadow
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(0,0,0,.18)";
  ctx.beginPath();
  ctx.arc(x+r*0.18, y+r*0.22, r*1.02, 0, Math.PI*2);
  ctx.fill();

  ctx.globalCompositeOperation = "source-over";

  // wax gradient
  const g = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.25, x, y, r*1.25);
  g.addColorStop(0, "rgba(200,55,65,.98)");
  g.addColorStop(0.55, "rgba(135,25,32,.95)");
  g.addColorStop(1, "rgba(80,14,18,.95)");

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();

  // pressed edge
  ctx.strokeStyle = "rgba(255,235,220,.22)";
  ctx.lineWidth = Math.max(1.5, r*0.12);
  ctx.beginPath();
  ctx.arc(x,y,r-0.6,0,Math.PI*2);
  ctx.stroke();

  // inner ring
  ctx.strokeStyle = "rgba(0,0,0,.28)";
  ctx.lineWidth = Math.max(1, r*0.08);
  ctx.beginPath();
  ctx.arc(x,y,r*0.62,0,Math.PI*2);
  ctx.stroke();

  // stamp symbol
  ctx.fillStyle = "rgba(255,245,235,.92)";
  ctx.font = `${Math.round(r*0.95)}px ui-serif, Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦", x, y+0.5);

  ctx.restore();
}

// ---------- Zielpunkt (Render) ----------
function drawGoalToken(x,y){
  const r = 13;
  ctx.save();
  // Glow
  const g = ctx.createRadialGradient(x,y,2,x,y,24);
  g.addColorStop(0, "rgba(255,215,120,.95)");
  g.addColorStop(1, "rgba(255,215,120,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x,y,24,0,Math.PI*2);
  ctx.fill();

  // Coin
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle = "rgba(255,215,120,.95)";
  ctx.fill();
  ctx.strokeStyle = "rgba(80,50,15,.65)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Star
  ctx.fillStyle = "rgba(60,35,10,.75)";
  ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", x, y+0.5);
  ctx.restore();
}

// ---------- Boss Spawn Marker (legendary) ----------
function drawBossSpawnLegendary(x,y,t){
  // t in seconds
  const pulse = 0.55 + 0.45*Math.sin(t*2.2);
  const rOuter = 28 + pulse*2.5;
  const rInner = 18;

  ctx.save();

  // Soft glow
  ctx.shadowColor = "rgba(255,170,60,.65)";
  ctx.shadowBlur = 18 + pulse*10;

  // Outer rune ring (gold -> ember)
  const grad = ctx.createLinearGradient(x-rOuter, y-rOuter, x+rOuter, y+rOuter);
  grad.addColorStop(0, "rgba(255,220,140,.95)");
  grad.addColorStop(0.55, "rgba(255,120,60,.92)");
  grad.addColorStop(1, "rgba(255,220,140,.95)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x,y,rOuter,0,Math.PI*2);
  ctx.stroke();

  // Rotating dashed ring
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,230,170,.70)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 6]);
  ctx.lineDashOffset = -t*18;
  ctx.beginPath();
  ctx.arc(x,y,rOuter-7,0,Math.PI*2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner dark seal
  ctx.fillStyle = "rgba(30,10,6,.65)";
  ctx.beginPath();
  ctx.arc(x,y,rInner,0,Math.PI*2);
  ctx.fill();

  // Inner rim
  ctx.strokeStyle = "rgba(255,200,120,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x,y,rInner,0,Math.PI*2);
  ctx.stroke();

  // Icon
  ctx.fillStyle = "rgba(255,230,170,.92)";
  ctx.font = "16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("☠", x, y+0.5);

  // Small crown sparkle
  ctx.font = "13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,215,120,.95)";
  ctx.fillText("♛", x, y-13.5);

  ctx.restore();
}



// ---------- Boss Entity ----------
function drawBossEntity(boss, t){
  const n = nodesById.get(boss.node);
  if(!n) return;
  const x = n.x, y = n.y;

  // Visible/stealth handling (future)
  const visible = (boss.visible !== false);

  ctx.save();

  // Base aura
  const pulse = 0.55 + 0.45*Math.sin(t*2.6 + (boss._pulseSeed||0));
  ctx.globalAlpha = visible ? 1 : 0.15;

  // Outer glow ring
  ctx.shadowColor = "rgba(255,80,40,.75)";
  ctx.shadowBlur  = 20 + pulse*14;

  ctx.beginPath();
  ctx.arc(x, y, 22 + pulse*2.0, 0, Math.PI*2);
  ctx.strokeStyle = "rgba(255,150,80,.95)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner dark core
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(x, y, 14, 0, Math.PI*2);
  ctx.fillStyle = "rgba(20,10,6,.75)";
  ctx.fill();

  // Icon
  ctx.fillStyle = "rgba(255,220,180,.95)";
  ctx.font = "bold 16px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("☠", x, y+0.5);

  ctx.restore();
}


// ---------- HUD (Screen) ----------
function drawHUD(){
  // kleine Punkteanzeige oben links
  const pad = 12;
  const x = pad;
  const y = pad;
  const w = 220;
  const h = 126;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(10,12,18,.55)";
  ctx.strokeStyle = "rgba(255,255,255,.12)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(245,250,255,.92)";
  ctx.font = "700 14px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Zielpunkte (bis ${state.goalToWin})`, x+12, y+10);

  const lines = [1,2,3,4].map(t=>`Team ${t}: ${(state.goalScores?.[t]||0)}/${state.goalToWin}`);
  ctx.font = "600 13px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  lines.forEach((txt,i)=>{
    ctx.fillStyle = "rgba(245,250,255,.92)";
    ctx.fillText(txt, x+12, y+34 + i*20);
  });

  if(state.gameOver){
    ctx.fillStyle = "rgba(255,215,120,.95)";
    ctx.fillText("Spiel beendet", x+12, y+34 + 4*20);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
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
    if(state.jokerMode==="moveBarricadePlace" && state.jokerHighlighted && state.jokerHighlighted.has(n.id)) fill="rgba(255,204,102,.28)";
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

    // Ereignisfelder: als Wachssiegel richtig sichtbar (unter Barrikaden versteckbar)
    if(state.eventActive && state.eventActive.has(n.id)){
      if(!barricades.has(n.id)){
        drawWaxSeal(n.x, n.y, 14);
      }
    }

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

  // 🎯 Zielpunkt zeichnen (unter Barrikaden versteckbar)
  if(state.goalNodeId){
    const gn = nodesById.get(state.goalNodeId);
    if(gn && !barricades.has(state.goalNodeId)){
      drawGoalToken(gn.x, gn.y);
    }
  }

  // Barrikaden als Overlay (decken Ziel/Ereignis optisch komplett ab)
  for(const id of barricades){
    const n = nodesById.get(id);
    if(!n) continue;

    const s = 36; // Größe der Barrikade (muss größer als Ziel-Glow sein)
    const x = n.x - s/2;
    const y = n.y - s/2;

    ctx.save();

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(x+2.5, y+3.0, s, s);

    // Wood-like fill
    const g = ctx.createLinearGradient(x, y, x, y+s);
    g.addColorStop(0, "rgba(115,78,44,.98)");
    g.addColorStop(.55, "rgba(92,60,33,.98)");
    g.addColorStop(1, "rgba(70,44,24,.98)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, s, s);

    // Plank lines
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x+3, y+s*0.33);
    ctx.lineTo(x+s-3, y+s*0.33);
    ctx.moveTo(x+3, y+s*0.66);
    ctx.lineTo(x+s-3, y+s*0.66);
    ctx.stroke();

    // Frame
    ctx.strokeStyle = "rgba(255,204,102,.95)";
    ctx.lineWidth = 3.5;
    ctx.strokeRect(x+1.5, y+1.5, s-3, s-3);

    // Nails
    ctx.fillStyle = "rgba(0,0,0,.22)";
    const nail = (nx,ny)=>{ ctx.beginPath(); ctx.arc(nx,ny,2.1,0,Math.PI*2); ctx.fill(); };
    nail(x+7, y+7); nail(x+s-7, y+7); nail(x+7, y+s-7); nail(x+s-7, y+s-7);

    ctx.restore();
  }

  // 👑 Boss-Respawn-Felder (legendär sichtbar)
  const _tBoss = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
  for(const n of nodes){
    if(n.type === "boss"){
      drawBossSpawnLegendary(n.x, n.y, _tBoss);
    }
  }



  // Bosses (entities)
  if(state.bosses && state.bosses.length){
    const tSec = (performance.now()/1000);
    for(const b of state.bosses){
      if(!b || b.alive===false || !b.node) continue;
      if(b._pulseSeed==null) b._pulseSeed = (Math.random()*10);
      drawBossEntity(b, tSec);
    }
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
    ctx.strokeStyle="rgba(20,12,6,.55)";
    ctx.lineWidth=2;
    ctx.stroke();

    // Shield ring
    if(p.shielded){
      ctx.save();
      ctx.strokeStyle="rgba(120,200,255,.92)";
      ctx.lineWidth=4;
      ctx.beginPath();
      ctx.arc(n.x,n.y,17,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }

    // Selected piece ring (nur die ausgewählte Figur umranden)
    if(selectedId && p.id === selectedId){
      ctx.save();
      ctx.strokeStyle="rgba(200,166,75,.95)";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(n.x,n.y,16,0,Math.PI*2);
      ctx.stroke();

      ctx.strokeStyle="rgba(35,25,16,.55)";
      ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.arc(n.x,n.y,18.5,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();

  // HUD (Screen overlay)
  drawHUD();

  requestAnimationFrame(draw);
}

// ---------- Load ----------
async function load(){
  const V = (typeof window !== "undefined" && window.BUILD_ID) ? window.BUILD_ID : String(Date.now());
  const url = `Mittelalter.board.json?v=${V}`;

  setStatus("Lade Board...");
  ensureFixedUILayout();
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

  // reset cached bounds when a new board loads
  _boardBoundsCache = null;

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
      if(n.type === "barricade") continue;
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


  // --- Auto-Fix: Boss-Spawn-Felder müssen mit dem "Haupt-Graph" verbunden sein ---
  // Problem: Ein Boss-Spawn kann zwar Nachbarn haben, aber nur im Boss-Subgraph hängen → Boss findet keinen Pfad zu Spielern.
  // Fix: Wenn vom Boss-Spawn KEIN Nicht-Boss-Feld erreichbar ist, verbinden wir runtime-mäßig zum nächstgelegenen Nicht-Boss-Knoten.
  // (Ändert NICHT dein board.json dauerhaft, ist nur ein Runtime-Fix.)
  function canReachWalkable(startId){
    const q=[startId];
    const seen=new Set([startId]);
    while(q.length){
      const cur=q.shift();
      const nn=adj.get(cur)||[];
      for(const nb of nn){
        if(seen.has(nb)) continue;
        seen.add(nb);
        const node = nodesById.get(nb);
        // "Walkable" = Boss kann dorthin laufen (kein Boss/Start/Barrikade)
        if(node && node.type !== "boss" && node.type !== "start" && node.type !== "barricade") return true;
        q.push(nb);
      }
    }
    return false;
  }

  const bossNodes = nodes.filter(n=>n.type==="boss");
  for(const s of bossNodes){
    if(canReachWalkable(s.id)) continue;

    let best = null;
    let bestD = Infinity;
    for(const n of nodes){
      if(!n || n.id === s.id) continue;
      if(n.type === "boss") continue; // nicht Boss->Boss verbinden
      // Start-Felder meiden (Boss soll nicht in Startzonen "spawnen")
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

    edges.push({a: s.id, b: best.id});
    if(!adj.has(s.id)) adj.set(s.id, []);
    if(!adj.has(best.id)) adj.set(best.id, []);
    adj.get(s.id).push(best.id);
    adj.get(best.id).push(s.id);

    console.warn("[AUTO-FIX] Boss-Spawn verbunden:", s.id, "->", best.id);
  }

  initPieces();
  initEventFieldsFromBoard();

  // Boss-System initialisieren (keine Bosse aktiv beim Start)
  ensureBossState();
  state.bosses = [];
  state.bossSpawnNodes = getBossSpawnNodes();
  state.bossTick = 0;
  updateBossUI();

  // Zielpunkte initialisieren
  state.goalScores = {1:0,2:0,3:0,4:0};
  state.gameOver = false;
  state.goalNodeId = null;
  spawnGoalRandom(true);
  if(selPlayerCount) selPlayerCount.value = String(state.players.length||4);
  fitToBoard(60);
  state.phase="needRoll";
  dieBox.textContent="–";
  setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);

  // Joker UI init
  ensureJokerState();
  renderJokerButtons();
  updateJokerUI();
}

load();
draw();

})();
