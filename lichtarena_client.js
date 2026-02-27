/* Lichtarena – saubere neue Grundarchitektur (Offline)
   Dateien/Struktur:
   - lichtarena.html lädt nur lichtarena.css + lichtarena_client.js
   - Board-Datei: ./lichtarena_board_1.json (separat von barikade board.json)
   Ziele Board 1:
   - Vorwärts-Edges (from->to). Rückwärts verboten.
   - Würfel-Schritte müssen komplett genutzt werden (exakt N Schritte).
   - Rauswerfen: Wenn Ziel-Feld belegt (anderer Spieler) -> Gegner zurück zum Start.
     Danach Glücksrad 5s: aktiver Spieler bekommt 1 Joker (keine Nieten).
   - Bei Würfel=6: aktiver Spieler darf erneut würfeln.
   - Lichtfelder sind gold; verschwinden nach Einsammeln.
   - Wenn kein Licht auf dem Feld: neues Licht zufällig auf freies Normalfeld.
   - Anzeige gesammelt (pro Spieler + global). Bei global=5: Board1 done modal.
*/

(() => {
  "use strict";

  // ---------- Constants ----------
    // Board selection via URL param (?board=1 / ?board=2 ...)
  const BOARD_MAP = {
    "1": "./lichtarena_board_1.json",
    "2": "./lichtarena_board_2.json"
  };
  const qs = new URLSearchParams(location.search);
  const boardKey = (qs.get("board") || "1").trim();
  const BOARD_URL = BOARD_MAP[boardKey] || BOARD_MAP["1"];
  // Dev mode via URL param (?dev=1) – enables test shortcuts without affecting normal gameplay
  const devMode = (qs.get("dev") === "1");
  const gotoBoard = (k) => {
    const url = new URL(location.href);
    url.searchParams.set("board", String(k));
    if (devMode) url.searchParams.set("dev","1");
    url.searchParams.set("v", String(Date.now())); // cache-bust
    location.href = url.toString();
  };

  const LS_KEY = "lichtarena_offline_save_clean_v1";
  const COLORS = ["red","blue","green","yellow"];

  // Spieleranzahl (offline): 2–4 Spieler
  const PLAYER_COUNT_KEY = "la_playersCount_v1";
  const initialPlayersCount = Math.max(2, Math.min(4, Number(localStorage.getItem(PLAYER_COUNT_KEY) || "4") || 4));

  const JOKERS = [
    { id:"j1", name:"Neuwurf" },
    { id:"j2", name:"Alle Farben" },
    { id:"j3", name:"Doppelwurf" },
    { id:"j4", name:"Barikade versetzen" },
    { id:"j5", name:"Durch Barikade" },
    { id:"j6", name:"Schutzschild" },
    { id:"j7", name:"Spieler tauschen" },
  ];

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const stage = $("stage");
  const edgesSvg = $("edgesSvg");
  const boardShell = $("boardShell");

  const pillMode = $("pillMode");
  const pillBoard = $("pillBoard");
  const pillRule = $("pillRule");
  const pillTurn = $("pillTurn");

  const btnToggleUI = $("btnToggleUI");
  const layout = $("layout");
  const side = $("side");

  // Dev UI (only visible with ?dev=1) – lets you test Board 2 without finishing Board 1
  if (devMode && side){
    const devCard = document.createElement("section");
    devCard.className = "card";
    devCard.innerHTML = `
      <h3>DEV</h3>
      <div class="row">
        <button class="btn" id="btnDevBoard2">Board 2 testen</button>
      </div>
      <div class="hint">Nur sichtbar mit <code>?dev=1</code>. Im normalen Spiel unsichtbar.</div>
    `;
    side.insertBefore(devCard, side.firstChild);
  }

  // Spieleranzahl UI (offline). Ändert die Spieler-Reihenfolge (RED → BLUE → GREEN → YELLOW) und startet das Spiel neu.
  if (side){
    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <h3>Spieleranzahl</h3>
      <div class="row">
        <label style="display:flex;align-items:center;gap:10px;width:100%;">
          <span style="min-width:110px;color:var(--muted);">Spieler</span>
          <select id="selPlayersCount" class="btn" style="flex:1;padding:10px 12px;">
            <option value="2">2 Spieler</option>
            <option value="3">3 Spieler</option>
            <option value="4">4 Spieler</option>
          </select>
        </label>
      </div>
      <div class="row">
        <button class="btn" id="btnApplyPlayersCount">Anwenden (Neustart)</button>
      </div>
      <div class="hint">Hinweis: Anwenden setzt das laufende Spiel zurück (offline). Speichere vorher, falls nötig.</div>
    `;
    // unter die DEV-Karte (falls vorhanden), sonst ganz oben
    const firstCard = side.querySelector(".card");
    if (firstCard && firstCard.nextSibling) side.insertBefore(card, firstCard.nextSibling);
    else side.insertBefore(card, side.firstChild);
  }


  const btnRoll = $("btnRoll");
  const btnEndTurn = $("btnEndTurn");
  const btnFit = $("btnFit");
  const btnResetView = $("btnResetView");
  const btnToggleLines = $("btnToggleLines");
  const btnRestart = $("btnRestart");
  const btnSave = $("btnSave");
  const btnLoad = $("btnLoad");

  const hudPlayer = $("hudPlayer");
  const hudDice = $("hudDice");
  const hudActiveLights = $("hudActiveLights");
  const hudGlobal = $("hudGlobal");
  const hudGoal = $("hudGoal");
  const hudHint = $("hudHint");
  const statusLine = $("statusLine");

// ---------- In-Game Log (Tablet-friendly "Console") ----------
// Shows console.log/warn/error + window errors inside the game UI.
function initLogDock(){
  if (document.getElementById("logDock")) return;
  const style = document.createElement("style");
  style.id = "logDockStyles";
  style.textContent = `
    #logDock{ position:fixed; left:10px; right:10px; bottom:10px; max-height:42vh; z-index:9999;
      background:rgba(10,14,22,.92); border:1px solid rgba(255,255,255,.14); border-radius:14px;
      box-shadow:0 10px 30px rgba(0,0,0,.45); overflow:hidden; display:none; }
    #logDock.open{ display:block; }
    #logDockHeader{ display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:10px 12px; border-bottom:1px solid rgba(255,255,255,.10); }
    #logDockHeader .title{ font-weight:800; letter-spacing:.4px; opacity:.95; }
    #logDockHeader .actions{ display:flex; gap:8px; align-items:center; }
    #logDockHeader button{ border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.06);
      color:rgba(255,255,255,.92); padding:6px 10px; border-radius:10px; font-weight:700; }
    #logDockBody{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size:12px; line-height:1.3; padding:10px 12px; overflow:auto; max-height:34vh; }
    #logDockBody .l{ padding:2px 0; white-space:pre-wrap; word-break:break-word; }
    #logDockBody .info{ color: rgba(200,220,255,.92); }
    #logDockBody .warn{ color: rgba(255,220,120,.96); }
    #logDockBody .err{ color: rgba(255,130,150,.96); }
    #logFab{ position:fixed; right:12px; bottom:12px; z-index:10000;
      border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.08); color:rgba(255,255,255,.92);
      padding:10px 12px; border-radius:999px; font-weight:900; letter-spacing:.4px; }
  `;
  document.head.appendChild(style);

  const dock = document.createElement("div");
  dock.id = "logDock";
  dock.innerHTML = `
    <div id="logDockHeader">
      <div class="title">LOG</div>
      <div class="actions">
        <button id="logClear">Clear</button>
        <button id="logClose">Schließen</button>
      </div>
    </div>
    <div id="logDockBody"></div>
  `;
  document.body.appendChild(dock);

  const fab = document.createElement("button");
  fab.id = "logFab";
  fab.textContent = "LOG";
  document.body.appendChild(fab);

  const body = dock.querySelector("#logDockBody");
  const btnClose = dock.querySelector("#logClose");
  const btnClear = dock.querySelector("#logClear");

  const append = (kind, msg) => {
    const line = document.createElement("div");
    line.className = `l ${kind}`;
    const ts = new Date();
    const hh = String(ts.getHours()).padStart(2,"0");
    const mm = String(ts.getMinutes()).padStart(2,"0");
    const ss = String(ts.getSeconds()).padStart(2,"0");
    line.textContent = `[${hh}:${mm}:${ss}] ${msg}`;
    body.appendChild(line);
    // limit lines
    while (body.childNodes.length > 200) body.removeChild(body.firstChild);
    body.scrollTop = body.scrollHeight;
  };

  // wrap console
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  console.log = (...a) => { orig.log(...a); append("info", a.map(String).join(" ")); };
  console.warn = (...a) => { orig.warn(...a); append("warn", a.map(String).join(" ")); };
  console.error = (...a) => { orig.error(...a); append("err", a.map(String).join(" ")); };

  window.addEventListener("error", (e) => {
    append("err", `JS Error: ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`);
  });
  window.addEventListener("unhandledrejection", (e) => {
    append("err", `Promise Rejection: ${String(e.reason)}`);
  });

  fab.addEventListener("click", () => dock.classList.toggle("open"));
  btnClose.addEventListener("click", () => dock.classList.remove("open"));
  btnClear.addEventListener("click", () => { body.innerHTML = ""; append("info","(cleared)"); });

  // first line
  append("info","Log bereit. Tippe unten rechts auf LOG.");
}

function ensureEventFieldStyles(){
  if (document.getElementById("laEventFieldStyles")) return;
  const style = document.createElement("style");
  style.id = "laEventFieldStyles";
  style.textContent = `
    .node.event{
      box-shadow: 0 0 0 2px rgba(255,200,90,.28), 0 0 22px rgba(255,200,90,.16);
      background: rgba(255,200,90,.06);
    }
    .node.event .eventIcon{
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      font-size:20px;
      opacity:.95;
      text-shadow: 0 0 10px rgba(255,210,120,.35), 0 0 18px rgba(255,210,120,.25);
      pointer-events:none;
      transform: translateY(-1px);
    }
    .node.event::after{
      content:'';
      position:absolute; inset:-6px;
      border-radius:14px;
      background: radial-gradient(circle at 50% 50%, rgba(255,210,120,.18), rgba(255,210,120,0) 62%);
      pointer-events:none;
    }
  `;
  document.head.appendChild(style);
}


function ensureBarricadeStyles(){
  if (document.getElementById("laBarricadeStyles")) return;
  const style = document.createElement("style");
  style.id = "laBarricadeStyles";
  style.textContent = `
    .node.barricade{
      box-shadow: 0 0 0 2px rgba(255,255,255,.10), 0 0 26px rgba(120,200,255,.10);
    }
    .node .barricadeIcon{
      position:absolute;
      inset:0;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:20px;
      filter: drop-shadow(0 10px 14px rgba(0,0,0,.55));
      pointer-events:none;
      opacity:.92;
    }
    .node.barricadeTarget{
      outline: 3px solid rgba(120,255,200,.55);
      box-shadow: 0 0 0 2px rgba(120,255,200,.22), 0 0 26px rgba(120,255,200,.18);
      transform: translateZ(0) scale(1.03);
    }
  `;
  document.head.appendChild(style);
}



  const playersPanel = $("playersPanel");
  const jokerTable = $("jokerTable");

  // wheel modal
  const wheelModal = $("wheelModal");
  const wheelCanvas = $("wheelCanvas");
  const wheelResult = $("wheelResult");
  const btnWheelClose = $("btnWheelClose");

  // done modal
  const doneModal = $("doneModal");
  const btnDoneClose = $("btnDoneClose");
  const btnGoBoard2 = $("btnGoBoard2");

  // ---------- Helpers ----------
  function setStatus(text, kind="good"){
    const cls = kind === "bad" ? "bad" : kind === "warn" ? "warn" : "good";
    statusLine.innerHTML = `Status: <span class="${cls}">${escapeHtml(text)}</span>`;
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }
  function colorToCss(c){
    c = String(c||"").toLowerCase();
    if (c==="red") return "rgba(255,90,106,.95)";
    if (c==="blue") return "rgba(90,162,255,.95)";
    if (c==="green") return "rgba(46,229,157,.95)";
    if (c==="yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.9)";
  }
  function badgeColor(c){
    c = String(c||"").toLowerCase();
    if (c==="red") return "rgba(255,90,106,.9)";
    if (c==="blue") return "rgba(90,162,255,.9)";
    if (c==="green") return "rgba(46,229,157,.9)";
    if (c==="yellow") return "rgba(255,210,80,.9)";
    return "rgba(255,255,255,.8)";
  }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  function pickRandom(arr){
    if(!Array.isArray(arr) || arr.length===0) return null;
    return arr[randInt(0, arr.length-1)];
  }

  function randomStartNodeIdForColor(color){
    const c = String(color).toLowerCase();
    const starts = (state.startByColor.get(c) || []).map(String);

    // Regel: pro Feld darf nur 1 Figur stehen.
    // Deshalb: wenn möglich ein FREIES Startfeld wählen (zufällig).
    const occupied = new Set(state.pieces.map(p => String(p.nodeId)));
    const freeStarts = starts.filter(id => !occupied.has(String(id)));

    const pick = pickRandom(freeStarts.length ? freeStarts : starts);
    if (pick && !occupied.has(String(pick))) return String(pick);

    // Fallback, falls alle Startfelder belegt sind:
    // Nimm irgendein freies normales Feld. (Wenn es wirklich keines gibt, bleibt als letzter Notfall ein Startfeld.)
    const freeNormals = [];
    for (const n of state.nodeById.values()){
      const t = String(n.type||"normal").toLowerCase();
      if (t !== "normal") continue;
      const id = String(n.id);
      if (occupied.has(id)) continue;
      freeNormals.push(id);
    }
    const alt = pickRandom(freeNormals);
    return String(alt || pick || starts[0] || findAnyNormalNodeId() || findAnyNodeId());
  }


  function isForeignStartNode(nodeId, pieceColor){
  const id = String(nodeId);
  const n = state.nodeById.get(id);
  if(!n) return false;
  const t = String(n.type||"normal").toLowerCase();
  if(t!=="start") return false;
  const c = String(n.color||"").toLowerCase();
  return c && c !== String(pieceColor||"").toLowerCase();
}

function occupiedByAny(nodeId){
  const id = String(nodeId);
  return state.pieces.some(p => String(p.nodeId) === id);
}

function occupiedByOwn(nodeId, myColor){
  const id = String(nodeId);
  const c = String(myColor||"").toLowerCase();
  return state.pieces.some(p => String(p.nodeId) === id && String(p.color).toLowerCase() === c);
}

function occupiedByEnemy(nodeId, myColor){
  const id = String(nodeId);
  const c = String(myColor||"").toLowerCase();
  return state.pieces.some(p => String(p.nodeId) === id && String(p.color).toLowerCase() !== c);
}


function isBarricadeAt(nodeId){
  const id = String(nodeId);
  return !!(state.barricades && (state.barricades instanceof Set ? state.barricades.has(id) : Array.isArray(state.barricades) ? state.barricades.includes(id) : false));
}

function isNodeBlocked(nodeId){
    const id = String(nodeId);
    const n = state.nodeById.get(id);
    if(!n) return true;

    // Barrikaden-Block: wir behandeln Barrikaden als "Objekt auf einem Feld"
    // (nicht als fester Node-Typ), damit man sie versetzen kann, ohne Board-JSON zu ändern.
    if (isBarricadeAt(id)) return true;

    // Backward-compat: falls alte Saves noch dynamicBarricades nutzen
    if(state.dynamicBarricades){
      if(state.dynamicBarricades instanceof Set && state.dynamicBarricades.has(id)) return true;
      if(Array.isArray(state.dynamicBarricades) && state.dynamicBarricades.includes(id)) return true;
    }
    return false;
  }

  // ---------- State ----------
  const state = {
    board: null,
    nodeById: new Map(),
    outgoing: new Map(),        // from -> [{to}] (visual arrows)
    incoming: new Map(),        // to -> [{from}] (optional)
    neighbors: new Map(),       // undirected movement graph: node -> [neighbor]
    startByColor: new Map(),    // color -> [nodeId]

    // players
    playersCount: initialPlayersCount,
    activeColors: COLORS.slice(0, initialPlayersCount),

    // game
    turnIndex: 0,
    dice: 0,
    rolled: false,
    canRollAgain: false,        // when dice==6
    selectedPieceId: null,

    // pieces: {id,color,nodeId}
    pieces: [],

    
    // barricades (Barikade-Regel)
    // Wir speichern aktuelle Barrikaden-Positionen separat, damit "versetzen" ohne Board-JSON geht.
    barricades: new Set(),      // nodeIds
    pendingBarricade: null,     // { fromId, color } wenn Spieler nach dem Landen eine Barrikade umsetzen muss
    barricadeTargets: new Set(),// erlaubte Ziel-Felder (nur während pendingBarricade)

    // lights
    activeLights: new Set(),    // nodeIds
    collected: { red:0, blue:0, green:0, yellow:0 },
    globalCollected: 0,
    globalGoal: 5,

    // jokers inventory per color
    jokers: {
      red:{}, blue:{}, green:{}, yellow:{}
    },

    // UI / view
    showLines: false,
    reachable: new Map(),       // nodeId -> path (array of nodeIds, including start+...+dest)
    animating: false,

    // camera
    cam: { x:0, y:0, scale:1 },
  };

  // ---------- Load Board ----------
  async function loadBoard(){
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden: ${BOARD_URL} (HTTP ${res.status})`);
    return await res.json();
  }

  function buildMaps(){
    state.nodeById = new Map();
    state.outgoing = new Map();
    state.incoming = new Map();
    state.neighbors = new Map();
    state.startByColor = new Map();

    for (const n of (state.board.nodes||[])){
      state.nodeById.set(String(n.id), n);
      if (String(n.type||"").toLowerCase()==="start"){
        const color = String(n.color||"").toLowerCase();
        if (!state.startByColor.has(color)) state.startByColor.set(color, []);
        state.startByColor.get(color).push(String(n.id));
      }
    }

    const addOut = (a,b) => {
      if (!state.outgoing.has(a)) state.outgoing.set(a, []);
      state.outgoing.get(a).push({to:b});
    };
    const addIn = (a,b) => {
      if (!state.incoming.has(b)) state.incoming.set(b, []);
      state.incoming.get(b).push({from:a});
    };
    const addNei = (a,b) => {
      if (!state.neighbors.has(a)) state.neighbors.set(a, []);
      state.neighbors.get(a).push(b);
    };

    // IMPORTANT: directed edges
    for (const e of (state.board.edges||[])){
      const a = String(e.from), b = String(e.to);
      if (!state.nodeById.has(a) || !state.nodeById.has(b)) continue;
      addOut(a,b);
      addIn(a,b);
      addNei(a,b);
      addNei(b,a);
    }
  }

  // ---------- Init Game ----------
  function resetGame(){
    state.turnIndex = 0;
    state.dice = 0;
    state.rolled = false;
    state.canRollAgain = false;
    state.selectedPieceId = null;
    state.animating = false;

    // barricades: initial aus Board (type === barricade_fixed)
    state.barricades = new Set();
    for (const n of state.nodeById.values()){
      if (String(n.type||"").toLowerCase() === "barricade_fixed"){
        state.barricades.add(String(n.id));
      }
    }
    state.pendingBarricade = null;
    state.barricadeTargets = new Set();

    // pieces: Board 1 will use 4 pieces total? (dein späterer Plan)
    // Für saubere Basis: pro Farbe 1 Figur auf erstem Startfeld (4 Figuren).
    // Wenn du später 5 pro Farbe willst: hier umstellen.
    state.pieces = [];

    // Figuren pro Farbe: aus Board-Meta (fallback 4)
    const piecesPerColor = (color) => {
      const mp = state.board?.meta?.players;
      if (Array.isArray(mp)){
        const row = mp.find(x => String(x?.color||"").toLowerCase() === String(color).toLowerCase());
        const n = Number(row?.pieces);
        if (Number.isFinite(n) && n > 0) return Math.floor(n);
      }
      return 4;
    };

    // Startaufstellung:
    // - wenn genug Startfelder vorhanden: je Figur ein Startfeld
    // - sonst: Rest stapelt auf dem ersten Startfeld
    for (const color of state.activeColors){
      const starts = (state.startByColor.get(color) || []).map(String);
      const count = piecesPerColor(color);

      // Regel: pro Feld nur 1 Figur (keine eigenen Stacks).
      const occupied = new Set(state.pieces.map(p => String(p.nodeId)));

      for (let i=1; i<=count; i++){
        // bevorzugt: i-tes Startfeld, sonst irgendein freies Startfeld, sonst freies normales Feld
        let nodeId = starts[i-1] || null;

        if (!nodeId || occupied.has(String(nodeId))){
          const freeStart = starts.find(id => !occupied.has(String(id)));
          nodeId = freeStart || null;
        }

        if (!nodeId || occupied.has(String(nodeId))){
          const freeNormals = [];
          for (const n of state.nodeById.values()){
            const t = String(n.type||"normal").toLowerCase();
            if (t !== "normal") continue;
            const id = String(n.id);
            if (occupied.has(id)) continue;
            freeNormals.push(id);
          }
          nodeId = pickRandom(freeNormals) || nodeId || starts[0] || findAnyNormalNodeId() || findAnyNodeId();
        }

        nodeId = String(nodeId);
        state.pieces.push({ id:`${color}_${i}`, color, nodeId });
        occupied.add(nodeId);
      }
    }

    // Standard-Auswahl: erste Figur
    state.selectedPieceId = state.pieces[0]?.id || null;

    // jokers: 2× je Typ pro Spieler
    for (const color of state.activeColors){
      state.jokers[color] = {};
      for (const j of JOKERS) state.jokers[color][j.id] = 2;
    }

    // lights: start with ALL light_start nodes active
    state.activeLights = new Set();
    for (const n of state.nodeById.values()){
      if (String(n.type||"").toLowerCase()==="light_start"){
        state.activeLights.add(String(n.id));
      }
    }
    // if none, spawn 2 lights on random free normals
    if (state.activeLights.size===0){
      spawnRandomLight();
      spawnRandomLight();
    }

    state.collected = { red:0, blue:0, green:0, yellow:0 };
    state.globalCollected = 0;
    state.globalGoal = Number(state.board?.meta?.lightRule?.globalGoal || 5) || 5;

    state.reachable = new Map();

    renderAll();
    updateHUD();
    setStatus(`Bereit. Start-Lichter aktiv: ${state.activeLights.size}`, "good");
  }

  function findAnyNormalNodeId(){
    for (const n of state.nodeById.values()){
      if (String(n.type||"normal").toLowerCase()==="normal") return String(n.id);
    }
    return null;
  }
  function findAnyNodeId(){
    for (const n of state.nodeById.values()) return String(n.id);
    return null;
  }

  function activeColor(){
    const arr = state.activeColors && state.activeColors.length ? state.activeColors : COLORS;
    return arr[state.turnIndex % arr.length];
  }

  // ---------- Save/Load ----------
  function saveLocal(){
    const payload = {
      v:1,
      playersCount: state.playersCount,
      activeColors: state.activeColors,
      turnIndex: state.turnIndex,
      dice: state.dice,
      rolled: state.rolled,
      canRollAgain: state.canRollAgain,
      selectedPieceId: state.selectedPieceId,
      pieces: state.pieces,
      activeLights: Array.from(state.activeLights),
      collected: state.collected,
      globalCollected: state.globalCollected,
      globalGoal: state.globalGoal,
      jokers: state.jokers,
      showLines: state.showLines,
      cam: state.cam
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setStatus("✅ Gespeichert.", "good");
  }

  function loadLocal(){
    const raw = localStorage.getItem(LS_KEY);
    if (!raw){ setStatus("Kein Save gefunden.", "warn"); return; }
    try{
      const p = JSON.parse(raw);
      if (!p || p.v!==1) throw new Error("Ungültiges Save-Format");

      state.playersCount = Math.max(2, Math.min(4, Number(p.playersCount || initialPlayersCount || 4) || 4));
      state.activeColors = Array.isArray(p.activeColors) && p.activeColors.length ? p.activeColors.map(x=>String(x).toLowerCase()).filter(x=>COLORS.includes(x)).slice(0, state.playersCount) : COLORS.slice(0, state.playersCount);

      state.turnIndex = p.turnIndex|0;
      state.dice = p.dice|0;
      state.rolled = !!p.rolled;
      state.canRollAgain = !!p.canRollAgain;
      state.selectedPieceId = p.selectedPieceId ?? null;

      state.pieces = Array.isArray(p.pieces) ? p.pieces.filter(pp => state.activeColors.includes(String(pp?.color||'').toLowerCase())) : state.pieces;
      state.activeLights = new Set(Array.isArray(p.activeLights) ? p.activeLights.map(String) : []);
      state.collected = p.collected || state.collected;
      state.globalCollected = Number(p.globalCollected||0);
      state.globalGoal = Number(p.globalGoal||5);
      state.jokers = p.jokers || state.jokers;

      state.showLines = !!p.showLines;
      state.cam = p.cam || state.cam;

      state.reachable = new Map();
      renderAll();
      applyCamera();
      updateHUD();
      setStatus("✅ Save geladen.", "good");
    }catch(e){
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Rendering ----------
  function clearStage(){
    edgesSvg.innerHTML = "";
    for (const el of Array.from(stage.querySelectorAll(".node"))) el.remove();
  }

  // Camera transform on stage children
  function applyCamera(){
    const t = `translate(${state.cam.x}px, ${state.cam.y}px) scale(${state.cam.scale})`;
    // apply to SVG + nodes via CSS transform origin 0 0
    edgesSvg.style.transformOrigin = "0 0";
    edgesSvg.style.transform = t;
    for (const el of Array.from(stage.querySelectorAll(".node"))){
      el.style.transform = `translate(-50%,-50%) ${t}`;
      // careful: node already uses translate(-50%,-50%); we append camera transform.
    }
  }

  function computeFitCamera(){
    // fit nodes into viewport
    const rect = boardShell.getBoundingClientRect();
    const pad = 60;

    const xs=[], ys=[];
    for (const n of state.nodeById.values()){
      if (typeof n.x==="number" && typeof n.y==="number"){ xs.push(n.x); ys.push(n.y); }
    }
    if (!xs.length){
      state.cam = {x:0,y:0,scale:1};
      return;
    }
    const minX = Math.min(...xs), maxX=Math.max(...xs);
    const minY = Math.min(...ys), maxY=Math.max(...ys);
    const spanX = Math.max(1, maxX-minX);
    const spanY = Math.max(1, maxY-minY);

    const scale = Math.min((rect.width-pad*2)/spanX, (rect.height-pad*2)/spanY);
    // Center
    const cx = (minX+maxX)/2;
    const cy = (minY+maxY)/2;
    const vx = rect.width/2;
    const vy = rect.height/2;
    state.cam.scale = clamp(scale, 0.35, 2.2);
    state.cam.x = vx - cx*state.cam.scale;
    state.cam.y = vy - cy*state.cam.scale;
  }

  function renderEdges(){
    edgesSvg.innerHTML = "";
    if (!state.showLines) return;

    // arrows for directed edges
    // create marker
    const defs = document.createElementNS("http://www.w3.org/2000/svg","defs");
    const marker = document.createElementNS("http://www.w3.org/2000/svg","marker");
    marker.setAttribute("id","arrowHead");
    marker.setAttribute("viewBox","0 0 10 10");
    marker.setAttribute("refX","9");
    marker.setAttribute("refY","5");
    marker.setAttribute("markerWidth","6");
    marker.setAttribute("markerHeight","6");
    marker.setAttribute("orient","auto-start-reverse");
    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    path.setAttribute("d","M 0 0 L 10 5 L 0 10 z");
    path.setAttribute("class","edgeArrow");
    marker.appendChild(path);
    defs.appendChild(marker);
    edgesSvg.appendChild(defs);

    for (const e of (state.board.edges||[])){
      const a = state.nodeById.get(String(e.from));
      const b = state.nodeById.get(String(e.to));
      if (!a || !b) continue;

      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1", String(a.x));
      line.setAttribute("y1", String(a.y));
      line.setAttribute("x2", String(b.x));
      line.setAttribute("y2", String(b.y));
      line.setAttribute("class","edgeLine");
      line.setAttribute("marker-end","url(#arrowHead)");
      edgesSvg.appendChild(line);
    }
  }

  function nodeClass(nid){
    const n = state.nodeById.get(String(nid));
    const cls = ["node"];

    const t = String(n?.type||"normal").toLowerCase();
    if (t==="special") cls.push("event");
    if (t==="start"){
      const c = String(n?.color||"").toLowerCase();
      cls.push(`start-${c||"red"}`);
    }
    if (state.activeLights.has(String(nid))) cls.push("light");

    if (isBarricadeAt(nid)) cls.push("barricade");
    if (state.barricadeTargets && state.barricadeTargets.has(String(nid))) cls.push("barricadeTarget");

    if (state.reachable.has(String(nid))) cls.push("reachable");

    // selected node highlight: selected piece is on nid
    const sp = getSelectedPiece();
    if (sp && String(sp.nodeId)===String(nid)) cls.push("selected");

    return cls.join(" ");
  }

  function renderNodes(){
    for (const n of (state.board.nodes||[])){
      const nid = String(n.id);
      const el = document.createElement("div");
      el.className = nodeClass(nid);
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
      el.dataset.id = nid;

      const stack = document.createElement("div");
      stack.className = "tokenStack";
      el.appendChild(stack);

      if (String(n?.type||"normal").toLowerCase()==="special"){
        const ico = document.createElement("div");
        ico.className = "eventIcon";
        ico.textContent = "⚡";
        el.appendChild(ico);
      }

      bindBtn(el, (ev) => { onNodeClicked(nid); });

      
      if (isBarricadeAt(nid)){
        const b = document.createElement("div");
        b.className = "barricadeIcon";
        b.textContent = "🧱";
        el.appendChild(b);
      }

      stage.appendChild(el);
    }
    renderTokens();
  }

  function renderTokens(){
    // clear stacks
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const stack = nodeEl.querySelector(".tokenStack");
      if (stack) stack.innerHTML = "";
    }

    // group pieces by node
    const byNode = new Map();
    for (const p of state.pieces){
      const nid = String(p.nodeId);
      if (!byNode.has(nid)) byNode.set(nid, []);
      byNode.get(nid).push(p);
    }

    for (const [nid, list] of byNode.entries()){
      const nodeEl = stage.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
      if (!nodeEl) continue;
      const stack = nodeEl.querySelector(".tokenStack");
      if (!stack) continue;

      // Tokens pro Feld:
      // - 1 Figur: groß anzeigen
      // - mehrere Figuren: bis zu 4 kleine Tokens (klickbar), darüber "+N" Hinweis
      if (list.length === 1){
        const p = list[0];
        const tok = document.createElement("div");
        tok.className = "token big" + (p.id===state.selectedPieceId ? " sel" : "");
        tok.style.background = colorToCss(p.color);
        tok.title = `Figur ${p.id}`;
        bindBtn(tok, (ev) => { selectPiece(p.id); });
        stack.appendChild(tok);
      } else {
        const show = list.slice(0,4);
        for (const p of show){
          const tok = document.createElement("div");
          tok.className = "token" + (p.id===state.selectedPieceId ? " sel" : "");
          tok.style.background = colorToCss(p.color);
          tok.title = `Figur ${p.id}`;
          bindBtn(tok, (ev) => { selectPiece(p.id); });
          stack.appendChild(tok);
        }
        if (list.length > 4){
          const lbl = document.createElement("div");
          lbl.className = "token label";
          lbl.textContent = `+${list.length - 4}`;
          stack.appendChild(lbl);
        }
      }
}

    // update node classes (reachable/selected/light)
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const nid = nodeEl.dataset.id;
      nodeEl.className = nodeClass(nid);
    }

    applyCamera();
  }

  function renderAll(){
    clearStage();
    renderEdges();
    renderNodes();
    applyCamera();
  }

  // ---------- HUD / Panels ----------
  function updateHUD(){
    const c = activeColor();
    pillTurn.textContent = `Am Zug: ${c.toUpperCase()}`;
    hudPlayer.textContent = c.toUpperCase();
    hudDice.textContent = state.rolled ? String(state.dice) : "–";
    hudActiveLights.textContent = String(state.activeLights.size);
    hudGlobal.textContent = String(state.globalCollected);
    hudGoal.textContent = String(state.globalGoal);

    // pills
    pillMode.textContent = "Modus: Offline lokal";
    const bname = state.board?.meta?.name ? String(state.board.meta.name) : "Board";
    pillBoard.textContent = `Board: ${bname}`;
    pillRule.textContent = `Regel: Sammle ${state.globalGoal} Lichter global → Board 2`;

    // players panel
    playersPanel.innerHTML = "";
    for (const color of (state.activeColors?.length?state.activeColors:COLORS)){
      const pc = document.createElement("div");
      pc.className = "playerCard";
      const left = document.createElement("div");
      left.className = "pcLeft";
      const badge = document.createElement("div");
      badge.className = "badge";
      badge.style.background = badgeColor(color);
      left.appendChild(badge);

      const txt = document.createElement("div");
      const name = document.createElement("div");
      name.className = "pcName";
      name.textContent = color.toUpperCase() + (color===c ? " (am Zug)" : "");
      const sub = document.createElement("div");
      sub.className = "pcSub";
      sub.textContent = `Lichter: ${state.collected[color] || 0}`;
      txt.appendChild(name);
      txt.appendChild(sub);
      left.appendChild(txt);

      const right = document.createElement("div");
      right.className = "pcRight";
      const big = document.createElement("div");
      big.className = "big";
      big.textContent = `Joker: ${jokerTotal(color)}`;
      const small = document.createElement("div");
      small.className = "small";
      small.textContent = `Figur: ${pieceOfColor(color)?.nodeId ?? "–"}`;
      right.appendChild(big);
      right.appendChild(small);

      pc.appendChild(left);
      pc.appendChild(right);
      playersPanel.appendChild(pc);
    }

    // joker table for active player
    const ac = activeColor();
    jokerTable.innerHTML = "";
    for (const j of JOKERS){
      const row = document.createElement("div");
      row.className = "jRow";
      const name = document.createElement("div");
      name.className = "jName";
      name.textContent = j.name;
      const count = document.createElement("div");
      count.className = "jCount";
      count.textContent = String(state.jokers[ac]?.[j.id] ?? 0);
      row.appendChild(name);
      row.appendChild(count);
      jokerTable.appendChild(row);
    }

    // hint
    if (!state.rolled) hudHint.textContent = "Würfeln → dann Figur wählen → Ziel anklicken (exakt Würfel‑Schritte, ohne Hin‑und‑her‑Hüpfen).";
    else if (!state.selectedPieceId) hudHint.textContent = "Figur anklicken, dann ein blau markiertes Ziel wählen.";
    else hudHint.textContent = "Ziel anklicken (blau markiert).";
  }

  // Backward-compat alias: older code calls renderHud()
  // Keep function name to avoid crashes (no gameplay change).
  function renderHud(){
    try{ updateHUD(); }catch(_e){}
  }


  function jokerTotal(color){
    const inv = state.jokers[color] || {};
    return Object.values(inv).reduce((a,b)=>a+(Number(b)||0),0);
  }

  function pieceOfColor(color){
    return state.pieces.find(p => p.color===color) || null;
  }

  // ---------- Turn / Dice ----------
  function rollDice(){
    if (state.animating) return;
    const c = activeColor();
    state.dice = randInt(1,6);
    state.rolled = true;
    state.canRollAgain = (state.dice===6);

    // Nach dem Würfeln soll man die Figur auswählen.
    state.selectedPieceId = null;
    state.reachable = new Map();

    setStatus(`🎲 ${c.toUpperCase()} würfelt: ${state.dice}` + (state.canRollAgain ? " (6 → Bonuswurf möglich)" : ""), "good");
    updateHUD();
    renderTokens();
  }

  function endTurn(){
    if (state.animating) return;
    if (state.pendingBarricade){ toast('Erst die Barikade umsetzen!'); return; }
    // If dice==6 and player hasn't used bonus roll yet, allow to keep turn if they roll again:
    // We'll implement: ending turn always passes, bonus roll is optional by pressing Würfeln again after move (we keep same turn).
    state.turnIndex = (state.turnIndex + 1) % (state.activeColors?.length || COLORS.length);
    state.rolled = false;
    state.dice = 0;
    state.canRollAgain = false;
    state.selectedPieceId = null;
    state.reachable = new Map();
    renderTokens();
    updateHUD();
    setStatus(`Zug: ${activeColor().toUpperCase()} ist dran.`, "good");
  }

  // ---------- Selection / Movement ----------
  function selectPiece(id){
    if (state.animating) return;
    const p = state.pieces.find(x => x.id===id);
    if (!p) return;

    // Only active player's piece selectable
    if (p.color !== activeColor()){
      setStatus("Du kannst nur die Figur des aktiven Spielers bewegen.", "warn");
      return;
    }
    state.selectedPieceId = id;
    if (state.rolled) computeReachable();
    renderTokens();
    updateHUD();
  }

  function getSelectedPiece(){
    return state.pieces.find(p => p.id===state.selectedPieceId) || null;
  }

    function piecesAt(nodeId){
    const id = String(nodeId);
    return state.pieces.filter(p => String(p.nodeId) === id);
  }

  async function onNodeClicked(nodeId){
    if (state.animating) return;

    const myColor = activeColor();

    // Barrikade-Umsetzen-Modus: erst Ziel-Feld wählen, dann geht es weiter.
    if (state.pendingBarricade){
      const id = String(nodeId);
      if (!state.barricadeTargets || !state.barricadeTargets.has(id)){
        toast("Hier kannst du die Barikade nicht hinsetzen.");
        return;
      }
      // umsetzen
      const fromId = String(state.pendingBarricade.fromId);
      state.barricades.delete(fromId);
      state.barricades.add(id);
      state.pendingBarricade = null;
      state.barricadeTargets = new Set();
      toast("🧱 Barikade versetzt.");
      renderAll();
      // nach dem Umsetzen kann (wie gewohnt) der Zug beendet werden / weitergehen
      return;
    }


    // UX: Figur wechseln per Feld-Klick (super wichtig auf Tablet).
    // Wenn man auf ein Feld tippt, auf dem eine eigene Figur steht,
    // soll das IMMER als Figur-Auswahl gelten (und NICHT als "Ziel anklicken").
    // So kann man nach dem Würfeln bequem umwählen, ohne die Tokens exakt treffen zu müssen.
    const ownHere = piecesAt(nodeId).filter(p => p.color === myColor);
    if (state.rolled && ownHere.length){
      // Wenn noch keine Figur gewählt ist ODER man eine andere Figur wählen will:
      if (!state.selectedPieceId || ownHere[0].id !== state.selectedPieceId){
        selectPiece(ownHere[0].id);
        setStatus("✅ Figur ausgewählt. Jetzt ein blau markiertes Ziel wählen.", "good");
        return;
      }
      // Wenn man die aktuell gewählte Figur antippt: nichts weiter tun (kein Move).
      // (Verhindert, dass ein Tap auf das Startfeld als 'Ziel' missverstanden wird.)
      setStatus("ℹ️ Figur ist schon ausgewählt. Jetzt ein blau markiertes Ziel wählen.", "warn");
      return;
    }

    const piece = state.pieces.find(p => p.id === state.selectedPieceId);

    if (!piece || piece.color !== myColor){
      setStatus("Erst eine eigene Figur auswählen (aktiver Spieler).","warn");
      return;
    }
    if (!state.rolled){
      setStatus("Erst würfeln.","warn");
      return;
    }

    const to = String(nodeId);
    const path = state.reachable?.get(to) || null;
    if (!path){
      setStatus("Zielknoten nicht erreichbar (exakt Würfel-Schritte, ohne Hin-und-her-Hüpfen).","warn");
      return;
    }

    const diceWas = state.dice;

    // Sicherheit: eigenes Feld darf nicht besetzt sein
    const occDest = piecesAt(to).filter(p => p.id !== piece.id);
    if (occDest.length && occDest[0].color === piece.color){
      setStatus("Du darfst nicht auf ein Feld mit eigener Figur ziehen.","warn");
      return;
    }

    await moveAlongPath(piece, path);

    // Nach Ankunft: Barikade-Regel (wie Barikade)
    if (isBarricadeAt(to)){
      // Figur steht jetzt auf dem Feld, die Barikade muss umgesetzt werden.
      state.barricades.delete(to);
      state.pendingBarricade = { fromId: to, color: piece.color };
      state.barricadeTargets = computeBarricadeTargets();
      setStatus("🧱 Barikade! Tippe ein freies Feld, um sie umzusetzen.", "warn");
      // Zug ist gelaufen, aber erst nach Umsetzen darf es weitergehen.
      state.rolled = false;
      state.dice = null;
      state.reachable = new Map();
      renderAll();
      return;
    }

    // Nach Ankunft: ggf. Rausschmeißen (Capture) + Glücksrad (Capture) + Glücksrad
    const occ = piecesAt(to).filter(p => p.id !== piece.id);
    if (occ.length){
      const victim = occ[0];
      if (victim.color !== piece.color){
                victim.nodeId = randomStartNodeIdForColor(victim.color);
        renderTokens();

        await runWheelReward(piece.color);
        renderHud();
      }
    }

    // Nach Ankunft: Licht einsammeln
    if (state.activeLights.has(to)){
      state.activeLights.delete(to);
      state.globalCollected = (state.globalCollected|0) + 1;
            state.collected[piece.color] = (state.collected[piece.color]||0) + 1;

      if (state.activeLights.size === 0){
        spawnRandomLight();
      }

            if (state.globalCollected >= state.globalGoal){
                setStatus(`🏁 Board 1 geschafft! (${state.globalGoal} Lichter) – weiter zu Board 2.`,`good`);
        openDoneModal();
      } else {
                setStatus(`💡 Licht eingesammelt! Global: ${state.globalCollected}/${state.globalGoal}`,"good");
      }
    } else {
      setStatus(`Zug: ${piece.color.toUpperCase()} → ${to}`,"good");
    }

    // Zug-Reset / Bonuswurf bei 6
    state.rolled = false;
    state.dice = null;
    state.reachable = new Map();
    renderHud();
    renderTokens();

    if (diceWas === 6){
      setStatus("🎲 6 gewürfelt: Du darfst nochmal würfeln!","good");
      return;
    }

    endTurn();
  }

  async function moveAlongPath(piece, path){
    state.animating = true;
    try{
      for (let i=1;i<path.length;i++){
        piece.nodeId = String(path[i]);
        renderTokens();
        await sleep(120);
      }
    } finally {
      state.animating = false;
    }
  }



      function canonEdgeKey(a,b){
    const x=String(a), y=String(b);
    return (x<y)? `${x}__${y}` : `${y}__${x}`;
  }

function computeReachable(){
    state.reachable = new Map();
    if (!state.rolled || !state.selectedPieceId) return;

    const piece = state.pieces.find(p => p.id === state.selectedPieceId);
    if (!piece) return;

    const steps = Number(state.dice || 0);
    if (!Number.isFinite(steps) || steps <= 0) return;

    const startId = String(piece.nodeId);

    const dfs = (cur, rem, usedEdges, visitedNodes, path) => {
      if (rem === 0){
        if (!state.reachable.has(cur)) state.reachable.set(cur, path.slice());
        return;
      }

      const neigh = state.neighbors.get(cur) || [];
      for (const to of neigh){
        const edgeKey = canonEdgeKey(cur, to);
        if (usedEdges.has(edgeKey)) continue;   // no back-and-forth over same edge
        if (visitedNodes.has(to)) continue;     // no visiting a node twice in same move
        
// rule: cannot enter/step over other-color start fields
if (isForeignStartNode(to, piece.color)) continue;

// rule: no stacking (1 piece per field). Intermediate steps cannot land on any occupied node.
// Destination is allowed only if occupied by an ENEMY (capture).
if (rem - 1 > 0){
  if (occupiedByAny(to)) continue;
} else {
  // destination
  if (occupiedByOwn(to, piece.color)) continue;
  // enemy destination is allowed (capture)
}

if (isNodeBlocked(to)){
  // Barrikade darf NUR als Ziel (letzter Schritt) betreten werden,
  // damit die Figur "auf der Barrikade landet" und sie danach umgesetzt wird.
  if (!(rem - 1 === 0 && isBarricadeAt(to))) continue;
}

        // Regel: pro Feld nur 1 Figur.
        // - Zwischenschritte: niemals über belegte Felder laufen.
        // - Ziel (letzter Schritt): Gegner darf dort stehen (Capture), eigene Figur nicht.
        const occ = piecesAt(to);
        if (occ.length){
          const o = occ[0];
          if (rem > 1) continue; // nicht über Figuren laufen
          if (String(o.color) === String(piece.color)) continue; // eigene blockt immer
          // Gegner ist okay, wenn rem==1 (Capture auf Ziel)
        }

        const nextUsed = new Set(usedEdges); nextUsed.add(edgeKey);
        const nextVisited = new Set(visitedNodes); nextVisited.add(to);

        path.push(to);
        dfs(to, rem - 1, nextUsed, nextVisited, path);
        path.pop();
      }
    };

    dfs(startId, steps, new Set(), new Set([startId]), [startId]);
  }



  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  // ---------- Lights ----------
  function spawnRandomLight(){
    // choose random free normal node
    const normals = [];
    const occupied = new Set(state.pieces.map(p => String(p.nodeId)));
    for (const n of state.nodeById.values()){
      const t = String(n.type||"normal").toLowerCase();
      if (t!=="normal") continue;
      const id = String(n.id);
      if (occupied.has(id)) continue;
      if (state.activeLights.has(id)) continue;
      if (isBarricadeAt(id)) continue;
      normals.push(id);
    }
    if (!normals.length) return null;
    const pick = normals[randInt(0, normals.length-1)];
    state.activeLights.add(pick);
    renderTokens();
    updateHUD();
    return pick;
  }


  function isStartNodeId(id){
    const n = state.nodeById.get(String(id));
    return !!n && String(n.type||"normal").toLowerCase()==="start";
  }

  function isAdjacentToAnyStart(nodeId){
    const id = String(nodeId);
    const neigh = state.neighbors.get(id) || [];
    for (const nb of neigh){
      if (isStartNodeId(nb)) return true;
    }
    return false;
  }

  function computeBarricadeTargets(){
    const targets = new Set();
    const occupied = new Set(state.pieces.map(p => String(p.nodeId)));

    for (const n of state.nodeById.values()){
      const t = String(n.type||"normal").toLowerCase();

      // Barrikaden dürfen nur auf freie normale Felder
      if (t !== "normal") continue;

      const id = String(n.id);

      // darf nicht neben Startfeldern liegen (Board 2/3 wichtiger, weil Startfelder verteilt sind)
      if (isAdjacentToAnyStart(id)) continue;

      // kein Feld belegt / keine Lichter / keine andere Barrikade
      if (occupied.has(id)) continue;
      if (state.activeLights.has(id)) continue;
      if (isBarricadeAt(id)) continue;

      targets.add(id);
    }
    return targets;
  }



  // ---------- Wheel (Joker reward) ----------
  function openWheel(){
    wheelModal.classList.remove("hidden");
    wheelResult.textContent = "Dreht…";
  }
  function closeWheel(){
    wheelModal.classList.add("hidden");
  }

  async function runWheelReward(color){
    openWheel();
    const ctx = wheelCanvas.getContext("2d");
    const size = wheelCanvas.width;
    const cx = size/2, cy=size/2;
    const radius = size/2 - 18;

    const slices = JOKERS.map(j => j.name);
    const sliceCount = slices.length;
    const sliceAngle = (Math.PI*2)/sliceCount;

    // choose result uniformly
    const winnerIndex = randInt(0, sliceCount-1);
    const winner = JOKERS[winnerIndex];

    // animation: 5s rotation ending at winner under pointer (top)
    const start = performance.now();
    const duration = 5000;
    const spins = 6 + Math.random()*3; // 6-9 spins
    const targetAngle = (Math.PI*1.5) - (winnerIndex*sliceAngle + sliceAngle/2); // pointer at top
    const endRot = spins*2*Math.PI + targetAngle;

    function draw(rot){
      ctx.clearRect(0,0,size,size);

      // background circle
      ctx.save();
      ctx.translate(cx,cy);

      // slices
      for (let i=0;i<sliceCount;i++){
        const a0 = rot + i*sliceAngle;
        const a1 = a0 + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.arc(0,0,radius,a0,a1);
        ctx.closePath();

        // alternating brightness
        const alpha = i%2===0 ? 0.22 : 0.14;
        ctx.fillStyle = `rgba(90,162,255,${alpha})`;
        ctx.fill();

        ctx.strokeStyle = "rgba(255,255,255,.14)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // text
        ctx.save();
        ctx.rotate(a0 + sliceAngle/2);
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.font = "bold 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
        ctx.fillText(slices[i], radius-20, 6);
        ctx.restore();
      }

      // center hub
      ctx.beginPath();
      ctx.arc(0,0,60,0,Math.PI*2);
      ctx.fillStyle = "rgba(12,16,26,.92)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "800 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("JOKER", 0, 6);

      ctx.restore();

      // pointer (top)
      ctx.beginPath();
      ctx.moveTo(cx, cy-radius-6);
      ctx.lineTo(cx-14, cy-radius+22);
      ctx.lineTo(cx+14, cy-radius+22);
      ctx.closePath();
      ctx.fillStyle = "rgba(244,200,74,.95)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }

    return await new Promise(resolve => {
      function frame(now){
        const t = clamp((now-start)/duration, 0, 1);
        const e = easeOutCubic(t);
        const rot = e*endRot;
        draw(rot);
        if (t<1) requestAnimationFrame(frame);
        else {
          // reward
          state.jokers[color][winner.id] = (state.jokers[color][winner.id]||0) + 1;
          wheelResult.textContent = `Gewonnen: ${winner.name}`;
          updateHUD();
          setTimeout(() => { closeWheel(); resolve(); }, 650);
        }
      }
      requestAnimationFrame(frame);
    });
  }

  // ---------- Done Modal ----------
  function openDoneModal(){
    doneModal.classList.remove("hidden");
  }
  function closeDoneModal(){
    doneModal.classList.add("hidden");
  }

  // ---------- UI Wire ----------
  // Tablet/Touch: ensure buttons always react (some browsers suppress/delay plain "click").
  function bindBtn(el, fn){
    if (!el) return;
    const handler = (e) => {
      // ignore right/middle mouse
      if (e?.pointerType === "mouse" && typeof e.button === "number" && e.button !== 0) return;
      try { e?.preventDefault?.(); } catch {}
      try { e?.stopPropagation?.(); } catch {}
      fn(e);
    };
    el.addEventListener("click", handler);
    el.addEventListener("pointerup", handler, { passive:false });
  }

  // Spieleranzahl: UI initialisieren + anwenden
  const selPlayersCount = $("selPlayersCount");
  const btnApplyPlayersCount = $("btnApplyPlayersCount");
  if (selPlayersCount){
    selPlayersCount.value = String(state.playersCount || initialPlayersCount || 4);
  }
  bindBtn(btnApplyPlayersCount, () => {
    const n = Math.max(2, Math.min(4, Number(selPlayersCount?.value || state.playersCount || 4) || 4));
    if (n === (state.playersCount || 4)){
      setStatus("Spieleranzahl unverändert.", "warn");
      return;
    }
    // Speichern (nur Setting), dann Neustart
    try{ localStorage.setItem(PLAYER_COUNT_KEY, String(n)); }catch(_e){}
    state.playersCount = n;
    state.activeColors = COLORS.slice(0, n);

    // Neustart: laufendes Spiel wird zurückgesetzt (offline)
    state.turnIndex = 0;
    state.rolled = false;
    state.dice = 0;
    state.canRollAgain = false;
    state.selectedPieceId = null;
    state.reachable = new Map();

    resetGame();
    setStatus(`✅ Spieleranzahl gesetzt: ${n}. Neues Spiel gestartet.`, "good");
  });

  bindBtn(btnToggleUI, () => {
    document.body.classList.toggle("uiHidden");
  });

  bindBtn(btnRoll, () => {
    // if bonus roll available, it's fine. If already rolled and not bonus, block.
    if (state.animating) return;
    if (state.rolled){
      setStatus("Du hast schon gewürfelt. Erst ziehen oder Zug beenden.", "warn");
      return;
    }
    rollDice();
  });

  bindBtn(btnEndTurn, () => endTurn());

  bindBtn(btnToggleLines, () => {
    state.showLines = !state.showLines;
    btnToggleLines.textContent = `Linien: ${state.showLines ? "AN" : "AUS"}`;
    renderEdges();
    applyCamera();
  });

  bindBtn(btnFit, () => { computeFitCamera(); applyCamera(); });
  bindBtn(btnResetView, () => { state.cam={x:0,y:0,scale:1}; computeFitCamera(); applyCamera(); });

  bindBtn(btnRestart, async () => { await start(); });
  bindBtn(btnSave, saveLocal);
  bindBtn(btnLoad, loadLocal);

  bindBtn(btnWheelClose, closeWheel);
  bindBtn(btnDoneClose, closeDoneModal);
  bindBtn(btnGoBoard2, () => {
    // Weiterleitung auf Board 2 (Datei: lichtarena_board_2.json)
    closeDoneModal();
    gotoBoard(2);
  });

  // Board 2 button: always available (also without ?dev=1)
  {
    const btnDevBoard2 = $("btnDevBoard2");
    bindBtn(btnDevBoard2, () => gotoBoard(2));
  }

// ---------- Camera interactions (pan/zoom) ----------
  let isPanning = false;
  let panStart = {x:0,y:0,cx:0,cy:0};
  let pinch = null;

  // Wenn wir auf dem Stage-Element immer Pointer-Capture aktivieren,
  // gehen Klicks auf Nodes/Tokens (besonders auf Tablets) kaputt.
  // Daher: pannen/zoomen nur, wenn der Nutzer wirklich den Hintergrund zieht.
  function isInteractiveTarget(el){
    if (!el) return false;
    return !!el.closest(
      ".node, .token, .panel, .btn, button, input, select, textarea, label, a, .jokerRow, .playerCard, .pill, .topbar"
    );
  }

  stage.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = boardShell.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const zoom = e.deltaY < 0 ? 1.08 : 0.92;
    zoomAt(mx,my,zoom);
  }, { passive:false });

  stage.addEventListener("pointerdown", (e) => {
    // Nicht pannen, wenn auf Node/Token/UI geklickt wird.
    if (isInteractiveTarget(e.target)) return;
    try{ stage.setPointerCapture(e.pointerId); }catch(_){ }
    isPanning = true;
    panStart = { x:e.clientX, y:e.clientY, cx:state.cam.x, cy:state.cam.y };
  });

  stage.addEventListener("pointermove", (e) => {
    if (!isPanning || pinch) return;
    // pan
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    state.cam.x = panStart.cx + dx;
    state.cam.y = panStart.cy + dy;
    applyCamera();
  });

  stage.addEventListener("pointerup", (e) => {
    try{ stage.releasePointerCapture(e.pointerId); }catch(_){}
    isPanning = false;
  });

  // Touch pinch using pointer events: track two active pointers
  const activePointers = new Map();
  stage.addEventListener("pointerdown", (e) => {
    if (e.pointerType!=="touch") return;
    if (isInteractiveTarget(e.target)) return;
    activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (activePointers.size===2){
      const pts = Array.from(activePointers.values());
      pinch = makePinchState(pts[0], pts[1]);
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerType!=="touch") return;
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if (activePointers.size===2 && pinch){
      const pts = Array.from(activePointers.values());
      applyPinch(pinch, pts[0], pts[1]);
    }
  });
  stage.addEventListener("pointerup", (e) => {
    if (e.pointerType!=="touch") return;
    activePointers.delete(e.pointerId);
    if (activePointers.size<2) pinch = null;
  });
  stage.addEventListener("pointercancel", (e) => {
    if (e.pointerType!=="touch") return;
    activePointers.delete(e.pointerId);
    if (activePointers.size<2) pinch = null;
  });

  function dist(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return Math.sqrt(dx*dx+dy*dy); }
  function mid(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }

  function makePinchState(p1,p2){
    const rect = boardShell.getBoundingClientRect();
    const m = mid(p1,p2);
    const mLocal = { x:m.x-rect.left, y:m.y-rect.top };
    return {
      startDist: dist(p1,p2),
      startScale: state.cam.scale,
      startX: state.cam.x,
      startY: state.cam.y,
      midLocal: mLocal
    };
  }
  function applyPinch(ps, p1, p2){
    const d = Math.max(10, dist(p1,p2));
    const factor = d / ps.startDist;
    const newScale = clamp(ps.startScale * factor, 0.35, 2.5);

    // zoom around initial mid point
    const mx = ps.midLocal.x;
    const my = ps.midLocal.y;

    state.cam.scale = newScale;
    // adjust translation so point under finger stays
    state.cam.x = mx - (mx - ps.startX) * (newScale/ps.startScale);
    state.cam.y = my - (my - ps.startY) * (newScale/ps.startScale);
    applyCamera();
  }

  function zoomAt(mx,my,factor){
    const old = state.cam.scale;
    const ns = clamp(old*factor, 0.35, 2.5);
    if (ns===old) return;
    // keep (mx,my) stable
    state.cam.x = mx - (mx - state.cam.x) * (ns/old);
    state.cam.y = my - (my - state.cam.y) * (ns/old);
    state.cam.scale = ns;
    applyCamera();
  }

  // ---------- Start ----------
  async function start(){
    try{
      initLogDock();
      ensureEventFieldStyles();
    ensureBarricadeStyles();
      setStatus("Lade Board…", "warn");
      state.board = await loadBoard();
      buildMaps();

      // set board title
      const bname = state.board?.meta?.name ? String(state.board.meta.name) : "spielbrett";
      pillBoard.textContent = `Board: ${bname}`;

      // camera fit
      computeFitCamera();

      resetGame();
      btnToggleLines.textContent = `Linien: ${state.showLines ? "AN" : "AUS"}`;
      applyCamera();
    }catch(e){
      console.error(e);
      setStatus(String(e?.message||e), "bad");
    }
  }

  // kick off
  start();

})();
