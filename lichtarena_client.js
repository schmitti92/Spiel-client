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
  const devMode = (qs.get("dev") === "1");
  const gotoBoard = (k) => {
    const url = new URL(location.href);
    url.searchParams.set("board", String(k));
    if (devMode) url.searchParams.set("dev","1");
    url.searchParams.set("v", String(Date.now()));
    location.href = url.toString();
  };
  const gotoBoardDev = (k) => {
    // Dev/Test helper: always jumps to target board and forces dev=1 in URL
    const url = new URL(location.href);
    url.searchParams.set("board", String(k));
    url.searchParams.set("dev","1");
    url.searchParams.set("v", String(Date.now()));
    location.href = url.toString();
  };

  const LS_KEY = "lichtarena_offline_save_clean_v1";
  const COLORS = ["red","blue","green","yellow"];

  const JOKERS = [
    { id:"j1", name:"Neuwurf" },
    { id:"j2", name:"Alle Farben" },
    { id:"j3", name:"Doppelwurf" },
    { id:"j4", name:"Barikade versetzen" },
    { id:"j5", name:"Durch Barikaden laufen" },
    { id:"j6", name:"Schutzschild" },
    { id:"j7", name:"Spielertauschen" },
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
  // Dev tools (nur sichtbar mit ?dev=1)
  if (devMode && side){
    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `
      <h3>DEV</h3>
      <div class="row">
        <button class="btn" id="btnDevBoard2">TEST: Board 2 starten</button>
        <button class="btn" id="btnDevWin">TEST: +5 Licht</button>
      </div>
      <div class="hint">Nur für Tests. Im normalen Spiel unsichtbar.</div>
    `;
    side.insertBefore(card, side.firstChild);
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

  function isNodeBlocked(nodeId){
    const id = String(nodeId);
    const n = state.nodeById.get(id);
    if(!n) return true;
    const t = String(n.type||"normal").toLowerCase();
    if(t==="barricade_fixed") return true; // reserved for later boards
    // dynamic barricades (future): allow either Set or Array storage
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

    // game
    turnIndex: 0,
    dice: 0,
    rolled: false,
    canRollAgain: false,        // when dice==6
    selectedPieceId: null,

    // joker usage
    activeJokerId: null,        // currently selected joker (for this turn)
    jokerMode: null,            // {id, step, data} for multi-step jokers

    // pieces: {id,color,nodeId}
    pieces: [],

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
    moved: false,

    // Defensive shields per color (turns remaining)
    // Turn counter (increments at end of each player's turn)
    turnCounter: 0,

    // Shield protection per color: turn index until which protection is active (exclusive)
    shieldUntil: { red:0, blue:0, green:0, yellow:0 },

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
    state.turnCounter = (Number(state.turnCounter)||0) + 1;
    state.moved = false;
    state.turnCounter = 0;
    state.shieldUntil = { red:0, blue:0, green:0, yellow:0 };
    state.canRollAgain = false;
    state.moved = false;
    state.selectedPieceId = null;
    state.animating = false;
    state.moved = false;

    // pieces: Board 1 will use 4 pieces total? (dein späterer Plan)
    // Für saubere Basis: pro Farbe 1 Figur auf erstem Startfeld (4 Figuren).
    // Wenn du später 5 pro Farbe willst: hier umstellen.
    state.pieces = [];
    // 4 Spielfiguren pro Farbe (wie klassisches Barikade-Feeling)
    // Start: alle Figuren einer Farbe stehen auf dem ersten Startfeld dieser Farbe (Stacking erlaubt).
    const PIECES_PER_COLOR = 4;
    for (const color of COLORS){
      const starts = state.startByColor.get(color) || [];
      // Ziel: Jede Figur startet/steht im Haus auf einem eigenen Startfeld (keine Stapelung im Haus).
      // Fallback: Wenn ein Board weniger Startfelder hat, nutzen wir das erste verfügbare.
      const fallbackHome = String(starts[0] || findAnyNormalNodeId() || findAnyNodeId());

      for (let i = 1; i <= PIECES_PER_COLOR; i++){
        const homeNodeId = String(starts[i-1] || fallbackHome);
        state.pieces.push({
          id: `${color}_${i}`,
          color,
          homeNodeId,
          nodeId: homeNodeId
        });
      }
    }
    state.selectedPieceId = state.pieces[0]?.id || null;

    // jokers: 1× je Typ pro Spieler (Spielbeginn)
    for (const color of COLORS){
      state.jokers[color] = {};
      for (const j of JOKERS) state.jokers[color][j.id] = 1;
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
    return COLORS[state.turnIndex % COLORS.length];
  }

  // ---------- Save/Load ----------
  function saveLocal(){
    const payload = {
      v:1,
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
      dynamicBarricades: state.dynamicBarricades ? Array.from(state.dynamicBarricades) : [],
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

      state.turnIndex = p.turnIndex|0;
      state.dice = p.dice|0;
      state.rolled = !!p.rolled;
      state.canRollAgain = !!p.canRollAgain;
      state.selectedPieceId = p.selectedPieceId ?? null;

      state.pieces = Array.isArray(p.pieces) ? p.pieces : state.pieces;
      state.activeLights = new Set(Array.isArray(p.activeLights) ? p.activeLights.map(String) : []);
      state.collected = p.collected || state.collected;
      state.globalCollected = Number(p.globalCollected||0);
      state.globalGoal = Number(p.globalGoal||5);
      state.jokers = p.jokers || state.jokers;
      normalizeJokers(1);
      state.dynamicBarricades = new Set(Array.isArray(p.dynamicBarricades) ? p.dynamicBarricades.map(String) : []);

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
    if (t==="start"){
      const c = String(n?.color||"").toLowerCase();
      cls.push(`start-${c||"red"}`);
    }
    if (state.activeLights.has(String(nid))) cls.push("light");

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

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onNodeClicked(nid);
      });

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
        tok.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handleTokenClick(p.id);
        });
        stack.appendChild(tok);
      } else {
        const show = list.slice(0,4);
        for (const p of show){
          const tok = document.createElement("div");
          tok.className = "token" + (p.id===state.selectedPieceId ? " sel" : "");
          tok.style.background = colorToCss(p.color);
          tok.title = `Figur ${p.id}`;
          tok.addEventListener("click", (ev) => {
            ev.stopPropagation();
            handleTokenClick(p.id);
          });
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
    for (const color of COLORS){
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

    // joker table for active player (click to activate)
    const ac = activeColor();
    jokerTable.innerHTML = "";
    for (const j of JOKERS){
      const row = document.createElement("div");
      row.className = "jRow";
      row.dataset.jid = j.id;

      const name = document.createElement("div");
      name.className = "jName";
      name.textContent = j.name;

      const count = document.createElement("div");
      count.className = "jCount";
      const n = Number(state.jokers[ac]?.[j.id] ?? 0) || 0;
      count.textContent = String(n);

      // active styling
      if (state.activeJokerId === j.id) name.classList.add("active");

      const clicker = () => {
        if (state.animating) return;
        toggleJoker(j.id);
      };
      row.addEventListener("click", clicker);
      row.addEventListener("pointerup", (e)=>{ e.preventDefault(); clicker(); }, {passive:false});
      name.addEventListener("click", clicker);
      name.addEventListener("pointerup", (e)=>{ e.preventDefault(); clicker(); }, {passive:false});
      count.addEventListener("click", clicker);
      count.addEventListener("pointerup", (e)=>{ e.preventDefault(); clicker(); }, {passive:false});

      row.appendChild(name);
      row.appendChild(count);
      jokerTable.appendChild(row);
    }

    // hint
    const sp = getSelectedPiece();
    const spNum = sp ? (String(sp.id).split("_")[1] || "") : "";
    const spTag = sp ? `Ausgewählt: ${sp.color.toUpperCase()}${spNum ? " #" + spNum : ""}` : "";
    if (!state.rolled){
      hudHint.textContent = spTag
        ? `${spTag} — Würfeln → dann Ziel anklicken (exakt Würfel‑Schritte, ohne Hin‑und‑her‑Hüpfen).`
        : "Würfeln → dann Figur wählen → Ziel anklicken (exakt Würfel‑Schritte, ohne Hin‑und‑her‑Hüpfen).";
    } else if (!state.selectedPieceId){
      hudHint.textContent = "Figur anklicken (eigene Farbe), dann ein blau markiertes Ziel wählen.";
    } else {
      hudHint.textContent = spTag
        ? `${spTag} — Ziel anklicken (blau markiert).`
        : "Ziel anklicken (blau markiert).";
    }
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


function ensureDynamicBarricades(){
  if (!state.dynamicBarricades){
    state.dynamicBarricades = new Set();
  } else if (Array.isArray(state.dynamicBarricades)){
    state.dynamicBarricades = new Set(state.dynamicBarricades.map(String));
  } else if (!(state.dynamicBarricades instanceof Set)){
    // fallback
    state.dynamicBarricades = new Set();
  }
}

function clearJokerMode(){
  state.jokerMode = null;
}

function consumeJoker(color, jokerId){
  const inv = state.jokers[color] || (state.jokers[color] = {});
  inv[jokerId] = Math.max(0, (Number(inv[jokerId])||0) - 1);
  updateHUD();
}

function isShielded(piece){
  const until = Number(piece?.shieldUntilTurnIndex);
  if (!Number.isFinite(until)) return false;
  return state.turnIndex < until;
}

function clearExpiredShields(){
  for (const p of state.pieces){
    if (!p) continue;
    const until = Number(p.shieldUntilTurnIndex);
    if (Number.isFinite(until) && state.turnIndex >= until){
      delete p.shieldUntilTurnIndex;
    }
  }
}

function toggleJoker(jokerId){
  const c = activeColor();
  const count = Number(state.jokers[c]?.[jokerId] ?? 0) || 0;
  if (count <= 0){
    setStatus("Du hast diesen Joker nicht.", "warn");
    return;
  }

  // Multi-step jokers activate a mode and wait for user interaction
  if (jokerId === "j4"){ // Barikade versetzen
    ensureDynamicBarricades();
    if (state.dynamicBarricades.size === 0){
      setStatus("Es gibt aktuell keine Barikade zum Versetzen.", "warn");
      return;
    }
    state.activeJokerId = jokerId;
    state.jokerMode = { id:"j4", step:"pickSource", data:{} };
    setStatus("Barikade versetzen: tippe die Barikade an, die du bewegen willst.", "good");
    updateHUD();
    return;
  }

  if (jokerId === "j7"){ // Spielertauschen
    if (state.rolled){
      setStatus("Spielertauschen ist nur vor dem Würfeln möglich.", "warn");
      return;
    }
    if (state.moved){
      setStatus("Spielertauschen nur vor dem Laufen.", "warn");
      return;
    }
    state.activeJokerId = jokerId;
    state.jokerMode = { id:"j7", step:"pickOpponent", data:{} };
    setStatus("🔁 Spielertauschen aktiv: Wähle deine Figur (falls noch nicht), dann tippe eine gegnerische Figur an.", "good");
    updateHUD();
    return;
  }

  // Immediate jokers
  if (jokerId === "j1"){ // Neuwurf
    if (!state.rolled){
      setStatus("Neuwurf geht erst nach dem Würfeln.", "warn");
      return;
    }
    if (state.moved){
      setStatus("Neuwurf nur vor dem Laufen.", "warn");
      return;
    }
    const was = state.dice;
    state.dice = randInt(1,6);
    state.canRollAgain = (state.dice===6);
    consumeJoker(c, "j1");
    computeReachable();
    renderTokens();
    updateHUD();
    setStatus(`🎲 Neuwurf: ${was} → ${state.dice}`, "good");
    return;
  }

  if (jokerId === "j3"){ // Doppelwurf
    if (!state.rolled){
      setStatus("Doppelwurf geht erst nach dem Würfeln.", "warn");
      return;
    }
    if (state.moved){
      setStatus("Doppelwurf nur vor dem Laufen.", "warn");
      return;
    }

    const first = Number(state.dice) || 0;
    const second = randInt(1,6);
    const sum = first + second;

    // "6 nochmal" bleibt erhalten, wenn einer der beiden Würfe eine 6 war
    state.dice = sum;
    state.canRollAgain = (first === 6 || second === 6);

    consumeJoker(c, "j3");
    computeReachable();
    renderTokens();
    updateHUD();
    setStatus(`🎲 Doppelwurf: ${first} + ${second} = ${sum}`, "good");
    return;
  }

  if (jokerId === "j6"){ // Schutzschild
    const p = getSelectedPiece();
    if (!p || p.color !== c){
      setStatus("Schutzschild: bitte zuerst eine eigene Figur auswählen.", "warn");
      return;
    }
    // shield lasts until next time this color is active again
    p.shieldUntilTurnIndex = state.turnIndex + COLORS.length;
    consumeJoker(c, "j6");
    renderTokens();
    updateHUD();
    setStatus("🛡️ Schutzschild aktiv (bis zu deinem nächsten Zug).", "good");
    return;
  }

  // Toggleable jokers that affect movement this turn (consumed after a move)
  if (jokerId === "j2"){ // Alle Farben
    if (!state.rolled){
      setStatus("Alle Farben: zuerst würfeln, dann darfst du eine beliebige Figur auswählen.", "warn");
      return;
    }
    if (state.moved){
      setStatus("Alle Farben nur vor dem Laufen aktivierbar.", "warn");
      return;
    }
    state.activeJokerId = (state.activeJokerId === "j2") ? null : "j2";
    clearJokerMode();
    computeReachable();
    renderTokens();
    updateHUD();
    setStatus(state.activeJokerId ? "🌈 Alle Farben aktiv: du darfst eine beliebige Figur bewegen (für diesen Zug)." : "Alle Farben deaktiviert.", "good");
    return;
  }

  if (jokerId === "j5"){ // Durch Barikaden laufen
    if (!state.rolled){
      setStatus("Durch Barikaden laufen: erst würfeln.", "warn");
      return;
    }
    state.activeJokerId = (state.activeJokerId === "j5") ? null : "j5";
    clearJokerMode();
    computeReachable();
    renderTokens();
    updateHUD();
    setStatus(state.activeJokerId ? "🧱 Durch Barikaden laufen aktiv (für diesen Zug)." : "Durch Barikaden laufen deaktiviert.", "good");
    return;
  }

  // fallback
  setStatus("Dieser Joker ist noch nicht verdrahtet.", "warn");
}

  function pieceOfColor(color){
    return state.pieces.find(p => p.color===color) || null;
  }

  // ---------- Turn / Dice ----------
  function rollDice(){
    if (state.animating) return;
    const c = activeColor();
    // only active player's piece can be moved
    state.dice = randInt(1,6);
    state.rolled = true;
    state.moved = false;
    state.canRollAgain = (state.dice===6);
    setStatus(`🎲 ${c.toUpperCase()} würfelt: ${state.dice}` + (state.canRollAgain ? " (6 → Bonuswurf möglich)" : ""), "good");
    computeReachable();
    updateHUD();
  }

  function endTurn(){
    if (state.animating) return;
    // If dice==6 and player hasn't used bonus roll yet, allow to keep turn if they roll again:
    // We'll implement: ending turn always passes, bonus roll is optional by pressing Würfeln again after move (we keep same turn).
    state.turnIndex = (state.turnIndex + 1) % COLORS.length;
    state.rolled = false;
    state.moved = false;
    state.dice = 0;
    state.canRollAgain = false;
    // clear one-turn joker selection/modes
    state.activeJokerId = null;
    clearJokerMode();
    clearExpiredShields();

    state.selectedPieceId = pieceOfColor(activeColor())?.id ?? null;
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

    // Allow selecting other colors only if "Alle Farben" joker is active and we are in this turn before moving.
    const canAny = (state.activeJokerId === "j2") && state.rolled && !state.moved;
    if (p.color !== activeColor() && !canAny){
      setStatus("Du kannst nur die Figur des aktiven Spielers bewegen (außer mit Joker „Alle Farben“ nach dem Würfeln).", "warn");
      return;
    }

    state.selectedPieceId = id;
    if (state.rolled) computeReachable();
    renderTokens();
    updateHUD();
  }



function handleTokenClick(pieceId){
  if (state.animating) return;

  // Joker j7: Spielertauschen (nur vor dem Würfeln)
  if (state.jokerMode && state.jokerMode.id === "j7"){
    if (state.rolled){
      setStatus("Spielertauschen ist nur vor dem Würfeln möglich.", "warn");
      return;
    }
    if (state.moved){
      setStatus("Spielertauschen nur vor dem Laufen.", "warn");
      return;
    }

    const c = activeColor();
    const a = getSelectedPiece(); // eigene ausgewählte Figur
    const b = state.pieces.find(p => p.id === pieceId) || null; // angeklickte Figur

    if (!b){
      setStatus("Spielertauschen: ungültige Figur.", "warn");
      return;
    }

    // Wenn noch keine eigene Figur gewählt ist oder falsche Farbe: erst auswählen
    if (!a || a.color !== c){
      if (b.color === c){
        selectPiece(b.id);
        setStatus("🔁 Spielertauschen: Jetzt eine gegnerische Figur antippen.", "good");
      } else {
        setStatus("Spielertauschen: Wähle zuerst eine deiner Figuren aus.", "warn");
      }
      return;
    }

    // Eigene Figur ist gewählt: Klick auf eigene Figur -> Auswahl wechseln
    if (b.color === c){
      selectPiece(b.id);
      setStatus("🔁 Spielertauschen: Jetzt eine gegnerische Figur antippen.", "good");
      return;
    }

    // Gegner angeklickt -> Swap
    const aPos = String(a.nodeId);
    const bPos = String(b.nodeId);
    a.nodeId = bPos;
    b.nodeId = aPos;

    consumeJoker(c, "j7");
    clearJokerMode();
    state.activeJokerId = null;

    renderTokens();
    updateHUD();
    setStatus(`🔁 Getauscht: ${a.color.toUpperCase()} ↔ ${b.color.toUpperCase()}`, "good");
    return;
  }

  // normal selection
  selectPiece(pieceId);
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

    // Multi-step Joker: Barikade versetzen
    if (state.jokerMode && state.jokerMode.id === "j4"){
      const c = activeColor();
      ensureDynamicBarricades();
      const id = String(nodeId);
      if (state.jokerMode.step === "pickSource"){
        if (!state.dynamicBarricades.has(id)){
          setStatus("Barikade versetzen: tippe zuerst auf eine bestehende Barikade.", "warn");
          return;
        }
        state.jokerMode.data = { from:id };
        state.jokerMode.step = "pickTarget";
        setStatus("Barikade versetzen: jetzt ein freies Zielfeld antippen.", "good");
        return;
      }
      if (state.jokerMode.step === "pickTarget"){
        const from = state.jokerMode.data?.from;
        const n = state.nodeById.get(id);
        const t = String(n?.type||"normal").toLowerCase();
        const occupied = piecesAt(id).length > 0;
        if (!n || t !== "normal" || occupied){
          setStatus("Barikade versetzen: Ziel muss ein freies Normalfeld sein.", "warn");
          return;
        }
        // move barricade
        if (from) state.dynamicBarricades.delete(String(from));
        state.dynamicBarricades.add(id);
        consumeJoker(c, "j4");
        clearJokerMode();
        state.activeJokerId = null;
        computeReachable();
        renderTokens();
        updateHUD();
        setStatus("🧱 Barikade versetzt.", "good");
        return;
      }
    }


    // Multi-step Joker: Spielertauschen (j7) – vor dem Würfeln
    if (state.jokerMode && state.jokerMode.id === "j7"){
      const me = activeColor();
      const sel = getSelectedPiece();
      if (!sel || sel.color !== me){
        setStatus("Spielertauschen: wähle zuerst deine eigene Figur aus.", "warn");
        return;
      }
      const here = piecesAt(nodeId);
      const opponents = here.filter(p => p.color !== me);
      if (opponents.length === 0){
        setStatus("Spielertauschen: tippe eine gegnerische Figur an.", "warn");
        return;
      }
      opponents.sort((a,b) => String(a.id).localeCompare(String(b.id)));
      // Zyklisch: wiederholt auf dasselbe Feld tippen wechselt den Gegner
      let k = Number(state.jokerMode.data?.k || 0) || 0;
      const lastNode = String(state.jokerMode.data?.lastNode ?? "");
      if (lastNode !== String(nodeId)) k = 0;
      const opp = opponents[k % opponents.length];
      state.jokerMode.data = { k: (k+1), lastNode: String(nodeId) };

      // Schutzschild: geschützte Figuren dürfen nicht getauscht werden
      if (isShielded(sel.color) || isShielded(opp.color)){
        setStatus("Aktion nicht möglich.", "warn");
        return;
      }

      // swap node positions
      const aNode = String(sel.nodeId);
      const bNode = String(opp.nodeId);
      sel.nodeId = bNode;
      opp.nodeId = aNode;

      // consume joker and exit mode
      consumeJoker(me, "j7");
      clearJokerMode();
      state.activeJokerId = null;
      computeReachable();
      renderTokens();
      updateHUD();
      setStatus(`🔁 Getauscht: ${sel.color.toUpperCase()} ↔ ${opp.color.toUpperCase()}`, "good");
      return;
    }
    const myColor = activeColor();

    // Auswahl-Usability: Klick auf ein Feld mit eigenen Figuren (vor dem Würfeln oder auf dem aktuellen Feld)
    // wechselt die ausgewählte Figur (zyklisch), damit man sie klar auswählen kann.
    const sp0 = getSelectedPiece();
    const canAny = (state.activeJokerId === "j2") && state.rolled && !state.moved; // Joker „Alle Farben“
    const selectableHere = piecesAt(nodeId).filter(p => canAny ? true : (p.color === myColor));

    // Auswahl ist jederzeit erlaubt, solange noch nicht gelaufen wurde:
    // Klick auf ein Feld mit (eigener) Figur(en) = NUR Auswahl, kein Zug – auch nach dem Würfeln.
    if (selectableHere.length > 0){
      selectableHere.sort((a,b) => String(a.id).localeCompare(String(b.id)));
      let next = selectableHere[0];

      // Zyklisch durchwechseln, wenn man erneut dasselbe Feld anklickt
      if (sp0 && String(sp0.nodeId) === String(nodeId)){
        const i = selectableHere.findIndex(p => p.id === sp0.id);
        next = selectableHere[(i + 1) % selectableHere.length];
      }

      selectPiece(next.id);
      setStatus(`Ausgewählt: ${String(next.color).toUpperCase()} ${String(next.id)}`, "good");
      return;
    }

    const piece = state.pieces.find(p => p.id === state.selectedPieceId);

    const allowAnyColor = (state.activeJokerId === "j2") && state.rolled && !state.moved; // Alle Farben
    if (!piece || (!allowAnyColor && piece.color !== myColor)){
      setStatus("Erst eine Figur auswählen (eigene Farbe – außer mit Joker „Alle Farben“ nach dem Würfeln).","warn");
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
    const fromNode = String(piece.nodeId);

    state.moved = true;
    await moveAlongPath(piece, path);

    // Nach Ankunft: ggf. Rausschmeißen (Capture) + Glücksrad
    const occ = piecesAt(to).filter(p => p.id !== piece.id);
    if (occ.length){
      const victim = occ[0];
      if (victim.color !== piece.color){
        const starts = state.startByColor.get(victim.color) || [];
        victim.nodeId = String(victim.homeNodeId || starts[0] || victim.nodeId);
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

    // Consume turn-jokers that are applied on movement
    if (state.activeJokerId === "j2" || state.activeJokerId === "j5"){
      consumeJoker(myColor, state.activeJokerId);
      state.activeJokerId = null;
    }

    // Zug-Reset / Bonuswurf bei 6
    state.rolled = false;
    state.moved = false;
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
        if (isNodeBlocked(to) && !(state.activeJokerId === "j5")) continue;

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
      normals.push(id);
    }
    if (!normals.length) return null;
    const pick = normals[randInt(0, normals.length-1)];
    state.activeLights.add(pick);
    renderTokens();
    updateHUD();
    return pick;
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
  // Dev/Test: Board 2 button (always available; does not change gameplay unless clicked)
  const btnDevBoard2 = $("btnDevBoard2");
  bindBtn(btnDevBoard2, () => gotoBoardDev(2));

  // Extra dev helpers only when dev=1
  if (devMode){
    const btnDevWin = $("btnDevWin");
    bindBtn(btnDevWin, () => {
      state.globalCollected = state.globalGoal;
      renderHud();
      openDoneModal();
    });
  }

  bindBtn(btnGoBoard2, () => {
    // Weiterleitung auf Board 2 (Datei: lichtarena_board_2.json)
    closeDoneModal();
    const url = new URL(location.href);
    gotoBoard(2);
  });

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
