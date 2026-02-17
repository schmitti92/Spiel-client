/* lichtarena_client.js (REBUILD1)
   - Loads ./lichtarena_board_1.json
   - Renders nodes/edges
   - Right fixed UI, board left large
   - Pan/Zoom: mouse drag + wheel, touch 1-finger pan, 2-finger pinch
   - Local state: pieces, lights (via existing game_rules_lights_barricades.js), dynamic barricades, basic turn + jokers table
*/
(() => {
  "use strict";

  let BOARD_URL = "./lichtarena_board_1.json";

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  const stage = $("stage");
  const edgesSvg = $("edgesSvg");
  const statusLine = $("statusLine");
  
  const btnRoll = $("btnRoll");
  const diceValueInp = $("diceValue");
  const hudDice = $("hudDice");

  const hudActiveLights = $("hudActiveLights");
  const hudLightTotal = $("hudLightTotal");
  const hudLightGoal = $("hudLightGoal");
  const btnForceSpawnLight = $("btnForceSpawnLight");

  const btnSpawnBarricade = $("btnSpawnBarricade");
  const btnClearDynamicBarricades = $("btnClearDynamicBarricades");

  const btnRestart = $("btnRestart");
  const btnSave = $("btnSave");
  const btnLoad = $("btnLoad");

  const btnPrevTurn = $("btnPrevTurn");
  const btnNextTurn = $("btnNextTurn");
  const turnBadge = $("turnBadge");
  const turnLabel = $("turnLabel");
  const turnDot = $("turnDot");
  const turnText = $("turnText");

  const jokerTableBody = $("jokerTableBody");

  const boardShell = $("boardShell");
  const btnFit = $("btnFit");
  const btnZoomOut = $("btnZoomOut");
  const btnZoomIn = $("btnZoomIn");
  const btnResetView = $("btnResetView");
  const btnToggleLines = $("btnToggleLines");
  const zoomPct = $("zoomPct");
  const linesState = $("linesState");

  // ---------- RULES API ----------
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    statusLine.textContent = "Status: game_rules_lights_barricades.js nicht geladen.";
    throw new Error("Rules missing");
  }

  // ---------- State ----------
  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const COLORS = ["red", "blue", "green", "yellow"];

  const state = {
    // selection
    selectedPieceId: null,

    // board flow (board 1 -> board 2)
    boardFlow: { current: 1, nextUrl: "./lichtarena_board_2.json" },

    // pieces
    pieces: [], // {id,color,nodeId}

    // turn
    turnIndex: 0,
    players: COLORS.slice(),

    // jokers per color
    jokers: {
      red:   { "Neuwurf": 2, "Alle Farben": 2, "Doppelwurf": 2, "Barikade versetzen": 2, "Durch Barikade": 2 },
      blue:  { "Neuwurf": 2, "Alle Farben": 2, "Doppelwurf": 2, "Barikade versetzen": 2, "Durch Barikade": 2 },
      green: { "Neuwurf": 2, "Alle Farben": 2, "Doppelwurf": 2, "Barikade versetzen": 2, "Durch Barikade": 2 },
      yellow:{ "Neuwurf": 2, "Alle Farben": 2, "Doppelwurf": 2, "Barikade versetzen": 2, "Durch Barikade": 2 },
    },

    // dynamic barricades (node ids)
    barricades: [],
    barricadesMax: 15,
    barricadesSeed: 123,

    // lights
    lights: {
      active: [],
      collectedByColor: { red:0, blue:0, green:0, yellow:0 },
      totalCollected: 0,
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: 123456789
    },

    // dice
    diceValue: 6,

    // rendering
    showLines: true,

    // camera
    cam: { scale: 1, ox: 0, oy: 0, minScale: 0.12, maxScale: 6 }
  };

  
  function activeColor(){
    const c = state.players[state.turnIndex % state.players.length] || "red";
    return String(c).toLowerCase();
  }

  function updateTurnUI(){
    const c = activeColor();
    const up = c.toUpperCase();
    if (turnLabel) turnLabel.textContent = up;
    if (turnText) turnText.textContent = up;
    if (turnDot) {
      turnDot.className = "turnDot " + c;
    }
    // top pill dot
    if (turnBadge){
      const d = turnBadge.querySelector(".dot");
      if (d) d.style.background = (c==="red")?"var(--red)":(c==="blue")?"var(--blue)":(c==="green")?"var(--green)":"var(--yellow)";
    }
    renderJokerTable();
  }

  function renderJokerTable(){
    if (!jokerTableBody) return;
    const c = activeColor();
    const j = state.jokers[c] || {};
    const order = ["Neuwurf","Alle Farben","Doppelwurf","Barikade versetzen","Durch Barikade"];
    jokerTableBody.innerHTML = "";
    for (const name of order){
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      td1.textContent = (name==="Neuwurf")?"1) Neuwurf":
                        (name==="Alle Farben")?"2) Alle Farben":
                        (name==="Doppelwurf")?"3) Doppelwurf":
                        (name==="Barikade versetzen")?"4) Barikade versetzen":
                        (name==="Durch Barikade")?"5) Durch Barikade": name;
      const td2 = document.createElement("td");
      td2.className = "right";
      td2.textContent = String(j[name] ?? 0);
      tr.appendChild(td1); tr.appendChild(td2);
      jokerTableBody.appendChild(tr);
    }
  }

  function nextTurn(delta){
    const len = state.players.length || 4;
    state.turnIndex = (state.turnIndex + delta + len) % len;
    // auto-select a piece of active color
    const c = activeColor();
    const p = state.pieces.find(x => String(x.color).toLowerCase() === c);
    if (p) state.selectedPieceId = p.id;
    updateTurnUI();
  }

  // ---------- Helpers ----------
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function setStatus(msg, kind="good"){
    const prefix = (kind==="bad") ? "❌ " : (kind==="warn") ? "⚠️ " : "✅ ";
    statusLine.innerHTML = `<span class="${kind}">${escapeHtml(prefix + msg)}</span>`;
  }

  function clampInt(val, min, max){
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function canonEdgeKey(a,b){
    return (a < b) ? `${a}|${b}` : `${b}|${a}`;
  }

  function currentColor(){
    return state.players[state.turnIndex % state.players.length];
  }

  function setTurnUI(){
    const c = currentColor();
    pillTurn.textContent = `Am Zug: ${c.toUpperCase()}`;
    turnName.textContent = c.toUpperCase();
    const dot = turnBadge.querySelector(".dot");
    if (dot){
      dot.style.background = cssColor(c);
      dot.style.boxShadow = `0 0 14px ${cssColorGlow(c)}`;
    }
  }

  function cssColor(c){
    c = String(c||"").toLowerCase();
    if (c==="red") return "var(--red)";
    if (c==="blue") return "var(--blue)";
    if (c==="green") return "var(--green)";
    if (c==="yellow") return "var(--yellow)";
    return "white";
  }
  function cssColorGlow(c){
    c = String(c||"").toLowerCase();
    if (c==="red") return "rgba(255,77,90,.55)";
    if (c==="blue") return "rgba(77,157,255,.55)";
    if (c==="green") return "rgba(53,210,138,.55)";
    if (c==="yellow") return "rgba(255,216,77,.55)";
    return "rgba(255,255,255,.35)";
  }

  // ---------- Board load ----------
  async function loadBoard(){
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden (${res.status})`);
    return await res.json();
  }

  function buildMaps(){
    nodeById = new Map();
    adjacency = new Map();

    for (const n of (board.nodes || [])){
      nodeById.set(String(n.id), n);
    }
    const add = (a,b,gate) => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a).push({ to: b, gate: gate || null });
    };
    for (const e of (board.edges || [])){
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      add(a,b,e.gate);
      add(b,a,e.gate);
    }
  }

  // ---------- Camera / Transform ----------
  function computeBoardBounds(){
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    let ok=false;
    for (const n of nodeById.values()){
      if (typeof n.x==="number" && typeof n.y==="number"){
        ok=true;
        minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
        maxX=Math.max(maxX,n.x); maxY=Math.max(maxY,n.y);
      }
    }
    if (!ok) return {minX:0,minY:0,maxX:100,maxY:100};
    return {minX,minY,maxX,maxY};
  }

  function fitCamera(){
    const shellRect = boardShell.getBoundingClientRect();
    const pad = 90;
    const b = computeBoardBounds();
    const spanX = Math.max(1, b.maxX - b.minX);
    const spanY = Math.max(1, b.maxY - b.minY);
    const scale = Math.min((shellRect.width - pad*2)/spanX, (shellRect.height - pad*2)/spanY);
    state.cam.scale = clamp(scale, state.cam.minScale, state.cam.maxScale);
    state.cam.ox = pad - b.minX * state.cam.scale;
    state.cam.oy = pad - b.minY * state.cam.scale;
    applyCamera();
  }

  function resetCamera(){
    state.cam.scale = 1;
    state.cam.ox = 60;
    state.cam.oy = 60;
    applyCamera();
  }

  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  function applyCamera(){
    stage.style.transform = `translate(${state.cam.ox}px, ${state.cam.oy}px) scale(${state.cam.scale})`;
    edgesSvg.style.transform = `translate(${state.cam.ox}px, ${state.cam.oy}px) scale(${state.cam.scale})`;
    zoomPct.textContent = `${Math.round(state.cam.scale*100)}%`;
  }

  function zoomAt(cx, cy, factor){
    const old = state.cam.scale;
    const next = clamp(old * factor, state.cam.minScale, state.cam.maxScale);
    if (next === old) return;

    // Keep point (cx,cy) stable in screen space
    const dx = cx - state.cam.ox;
    const dy = cy - state.cam.oy;
    const k = next / old;
    state.cam.ox = cx - dx * k;
    state.cam.oy = cy - dy * k;
    state.cam.scale = next;
    applyCamera();
  }

  // ---------- Rendering ----------
  function clearBoard(){
    edgesSvg.innerHTML = "";
    stage.innerHTML = "";
  }

  function toStagePoint(n){
    const x = (typeof n.x==="number") ? n.x : 0;
    const y = (typeof n.y==="number") ? n.y : 0;
    return {x,y};
  }

  function gateLabel(g){
    if (!g) return "";
    if (g.mode==="exact") return `🔒 🎲=${g.value}`;
    if (g.mode==="range") return `🔒 🎲 ${g.min}–${g.max}`;
    return "🔒";
  }

  function renderEdges(){
    edgesSvg.innerHTML = "";
    if (!state.showLines) return;

    const rendered = new Set();
    for (const e of (board.edges || [])){
      const a = String(e.from), b = String(e.to);
      const key = canonEdgeKey(a,b);
      if (rendered.has(key)) continue;
      rendered.add(key);

      const na = nodeById.get(a), nb = nodeById.get(b);
      if (!na || !nb) continue;
      const A = toStagePoint(na), B = toStagePoint(nb);

      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1", A.x);
      line.setAttribute("y1", A.y);
      line.setAttribute("x2", B.x);
      line.setAttribute("y2", B.y);
      line.setAttribute("class", "edgeLine" + (e.gate ? " gated" : ""));
      edgesSvg.appendChild(line);

      if (e.gate){
        const mx = (A.x + B.x)/2;
        const my = (A.y + B.y)/2;
        const text = document.createElementNS("http://www.w3.org/2000/svg","text");
        text.setAttribute("x", mx);
        text.setAttribute("y", my - 6);
        text.setAttribute("text-anchor","middle");
        text.setAttribute("fill","rgba(235,240,255,.85)");
        text.setAttribute("font-size","12");
        text.textContent = gateLabel(e.gate);
        edgesSvg.appendChild(text);
      }
    }
  }

  function nodeCss(n){
    const t = String(n.type || "normal").toLowerCase();
    const cls = ["node"];
    if (t==="start") cls.push(`start-${String(n.color||"red").toLowerCase()}`);
    if (t==="light_start" || t==="light_spawn") cls.push("lightfield");
    if (t==="barricade_fixed") cls.push("barricade-fixed");
    if (state.lights.active.includes(String(n.id))) cls.push("activeLight");
    if (state.barricades.includes(String(n.id))) cls.push("dynamicBarricade");
    return cls.join(" ");
  }

  function nodeLabel(n){
    const t = String(n.type || "normal").toLowerCase();
    if (t==="start") return String(n.color||"").toUpperCase();
    if (t==="goal") return "ZIEL";
    if (t==="light_start") return "💡";
    if (t==="light_spawn") return "✨";
    if (t==="barricade_fixed") return "B";
    if (t==="portal") return `P${n.portalId||"?"}`;
    return "";
  }

  function renderNodes(){
    for (const n of nodeById.values()){
      const p = toStagePoint(n);
      const el = document.createElement("div");
      el.className = nodeCss(n);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.dataset.id = String(n.id);

      const label = document.createElement("div");
      label.className = "label";
      label.textContent = nodeLabel(n);
      el.appendChild(label);

      const tokens = document.createElement("div");
      tokens.className = "tokens";
      el.appendChild(tokens);

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onNodeClicked(String(n.id));
      });

      stage.appendChild(el);
    }
    renderTokens();
  }

  function renderTokens(){
    // clear
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const t = nodeEl.querySelector(".tokens");
      if (t) t.innerHTML = "";
      nodeEl.classList.remove("selectedNode");
      // refresh classes for light/barricade state
      const nid = nodeEl.dataset.id;
      const n = nodeById.get(String(nid));
      if (n) nodeEl.className = nodeCss(n);
    }

    const selected = state.pieces.find(p => p.id === state.selectedPieceId) || null;
    const byNode = new Map();
    for (const p of state.pieces){
      const nid = String(p.nodeId);
      if (!byNode.has(nid)) byNode.set(nid, []);
      byNode.get(nid).push(p);
    }

    for (const [nid, pieces] of byNode.entries()){
      const nodeEl = stage.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
      if (!nodeEl) continue;
      const tokens = nodeEl.querySelector(".tokens");
      if (!tokens) continue;

      for (const p of pieces.slice(0,5)){
        const tok = document.createElement("div");
        tok.className = "token" + (p.id === state.selectedPieceId ? " selected" : "");
        tok.style.background = tokenCss(p.color);
        tok.title = `Figur ${p.id} (${p.color})`;
        tok.addEventListener("click",(ev)=>{
          ev.stopPropagation();
          selectPiece(p.id);
        });
        tokens.appendChild(tok);
      }

      if (selected && String(selected.nodeId) === nid){
        nodeEl.classList.add("selectedNode");
      }
    }
  }

  function tokenCss(color){
    color = String(color||"").toLowerCase();
    if (color==="red") return "rgba(255,77,90,.95)";
    if (color==="blue") return "rgba(77,157,255,.95)";
    if (color==="green") return "rgba(53,210,138,.95)";
    if (color==="yellow") return "rgba(255,216,77,.95)";
    return "rgba(255,255,255,.85)";
  }

  function renderHud(){
    updateTurnUI();
    hudDice.textContent = String(state.diceValue);
    hudActiveLights.textContent = String(state.lights.active.length);
    hudLightTotal.textContent = String(state.lights.totalCollected);
    hudLightGoal.textContent = String(state.lights.globalGoal);
    renderJokerTable();
  }

  function renderJokerTable(){
    const c = currentColor();
    const jok = state.jokers[c] || {};
    const entries = Object.entries(jok);
    jokerTableBody.innerHTML = "";
    entries.forEach(([name, count], idx) => {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      td1.textContent = `${idx+1}) ${name}`;
      const td2 = document.createElement("td");
      td2.textContent = String(count);
      td2.className = "right";
      tr.appendChild(td1);
      tr.appendChild(td2);
      jokerTableBody.appendChild(tr);
    });
  }

  function renderAll(){
    clearBoard();
    renderEdges();
    renderNodes();
    applyCamera();
    renderHud();
    setTurnUI();
  }

  // ---------- Game init ----------
  function initPiecesFromStartNodes(){
    const startsByColor = { red:[], blue:[], green:[], yellow:[] };
    for (const n of nodeById.values()){
      if (String(n.type||"").toLowerCase() === "start"){
        const c = String(n.color||"").toLowerCase();
        if (startsByColor[c]) startsByColor[c].push(String(n.id));
      }
    }
    const pieces = [];
    for (const c of COLORS){
      const startNode = startsByColor[c][0] || findAnyNormalNodeId() || findAnyNodeId();
      for (let i=1;i<=5;i++){
        pieces.push({ id:`${c}_${i}`, color:c, nodeId:startNode });
      }
    }
    state.pieces = pieces;
    state.selectedPieceId = pieces[0]?.id || null;
  }

  function findAnyNormalNodeId(){
    for (const n of nodeById.values()){
      if (String(n.type||"normal").toLowerCase() === "normal") return String(n.id);
    }
    return null;
  }
  function findAnyNodeId(){
    for (const n of nodeById.values()) return String(n.id);
    return null;
  }

  function initLightsFromBoard(){
    const initial = [];
    for (const n of nodeById.values()){
      if (String(n.type||"").toLowerCase() === "light_start"){
        initial.push(String(n.id));
      }
    }
    Rules.initLights(board, state, {
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: (Date.now() >>> 0),
      initialActiveNodeIds: initial
    });
    // if none, spawn one
    if (state.lights.active.length === 0){
      Rules.spawnOneLightOnRandomFreeNormal(board, state, Rules.mulberry32(state.lights.seed));
    }
  }

  function resetDynamicBarricades(){
    state.barricades = [];
  }

  
  function findStartNodeForColor(color){
    const c = String(color||"").toLowerCase();
    for (const n of nodeById.values()) {
      if (String(n.type||"").toLowerCase()==="start" && String(n.color||"").toLowerCase()===c) return String(n.id);
    }
    return findAnyNormalNodeId() || findAnyNodeId();
  }

  async function spinWheelAndGrantJoker(){
    if (!wheelOverlay || !wheelEl || !wheelResult || !wheelBtnClose) return null;
    wheelOverlay.classList.remove("hidden");
    wheelOverlay.setAttribute("aria-hidden","false");
    wheelBtnClose.disabled = true;
    wheelResult.textContent = "dreht…";

    const options = [
      { key:"j1", name:"1) Neuwurf" },
      { key:"j2", name:"2) Alle Farben" },
      { key:"j3", name:"3) Doppelwurf" },
      { key:"j4", name:"4) Barikade versetzen" },
      { key:"j5", name:"5) Durch Barikade" },
    ];

    const rng = Rules.mulberry32((gameState.wheelSeed ?? (Date.now()>>>0)));
    gameState.wheelSeed = ((gameState.wheelSeed ?? (Date.now()>>>0)) + 1) >>> 0;

    const pickIndex = Math.floor(rng() * options.length);
    const picked = options[pickIndex];

    const segDeg = 360 / options.length;
    const targetDeg = 360*7 + (pickIndex * segDeg) + (segDeg/2);

    wheelEl.style.transition = "transform 5s cubic-bezier(.1,.9,.0,1)";
    wheelEl.style.transform = `rotate(${targetDeg}deg)`;

    await new Promise(r => setTimeout(r, 5000));

    const c = activeColor();
    if (!gameState.jokers[c]) gameState.jokers[c] = { j1:0,j2:0,j3:0,j4:0,j5:0 };
    gameState.jokers[c][picked.key] = (gameState.jokers[c][picked.key] ?? 0) + 1;

    wheelResult.textContent = `✅ ${c.toUpperCase()} gewinnt: ${picked.name}`;
    wheelBtnClose.disabled = false;
    renderTurnAndJokers();
    return picked;
  }

  function closeWheel(){
    if (!wheelOverlay) return;
    wheelOverlay.classList.add("hidden");
    wheelOverlay.setAttribute("aria-hidden","true");
  }

  async function handleKnockoutIfAny(targetNodeId){
    const occ = pieceAtNode(targetNodeId);
    if (!occ) return null;

    const ac = activeColor();
    if (String(occ.color).toLowerCase() === String(ac).toLowerCase()) return null;

    const startId = findStartNodeForColor(occ.color);
    occ.nodeId = startId;
    renderTokens();

    await spinWheelAndGrantJoker();
    return occ;
  }


// ---------- Movement / Validation ----------
  function selectPiece(pieceId){
    const ac = activeColor();
    const p = state.pieces.find(x => x.id === pieceId);
    if (p && String(p.color).toLowerCase() !== ac) {
      setStatus(`Nur aktive Farbe (${ac.toUpperCase()}) darf ziehen.`, "warn");
      return;
    }
    state.selectedPieceId = pieceId;
    renderTokens();
    setStatus(`Ausgewählt: ${pieceId}`, "good");
  }

  function getSelectedPiece(){
    return state.pieces.find(p => p.id === state.selectedPieceId) || null;
  }

  function isNodeBlocked(nodeId){
    const n = nodeById.get(String(nodeId));
    if (!n) return true;
    const t = String(n.type||"normal").toLowerCase();
    if (t === "barricade_fixed") return true;
    return state.barricades.includes(String(nodeId));
  }

  function isOccupied(nodeId){
    const id = String(nodeId);
    return state.pieces.some(p => String(p.nodeId) === id);
  }

  function canMoveOneStep(fromId, toId, diceValue){
    const list = adjacency.get(String(fromId)) || [];
    const link = list.find(x => String(x.to) === String(toId));
    if (!link) return { ok:false, reason:"Nicht verbunden." };

    // gate check (local)
    if (link.gate){
      const d = Number(diceValue);
      if (link.gate.mode === "exact"){
        if (d !== Number(link.gate.value)) return { ok:false, reason:`Tor: nur bei exakt ${link.gate.value}.` };
      } else if (link.gate.mode === "range"){
        const mn = Math.min(Number(link.gate.min), Number(link.gate.max));
        const mx = Math.max(Number(link.gate.min), Number(link.gate.max));
        if (d < mn || d > mx) return { ok:false, reason:`Tor: nur bei ${mn}–${mx}.` };
      } else {
        return { ok:false, reason:"Tor: unbekanntes Format." };
      }
    }

    if (isNodeBlocked(toId)) return { ok:false, reason:"Ziel ist durch Barikade blockiert." };
    if (isOccupied(toId)) return { ok:false, reason:"Ziel ist besetzt." };
    return { ok:true, reason:"OK" };
  }

  function moveSelectedPieceTo(nodeId){
    const piece = getSelectedPiece();
    if (!piece) { setStatus("Keine Figur ausgewählt.", "warn"); return; }

    const from = String(piece.nodeId);
    const to = String(nodeId);

    const check = canMoveOneStep(from, to, state.diceValue);
    if (!check.ok){ setStatus(check.reason, "warn"); return; }

    piece.nodeId = to;

    // lights rules
    const res = Rules.onPieceArrived(board, state, piece.color, to);
    if (res?.picked){
      if (res.spawned){
        setStatus(`💡 Licht eingesammelt! Neues Licht auf ${res.spawned}.`, "good");
      } else {
        setStatus(`💡 Licht eingesammelt! (${res.total}/${res.goal})`, "good");
      }
    } else {
      setStatus(`Zug: ${piece.id} → ${to}`, "good");
    }

    renderTokens();
    renderHud();
    // offline: bei 6 darf man nochmal würfeln (gleicher Spieler bleibt dran)
    if (gameState.diceValue === 6) {
      setStatus(`🎲 6! Du darfst nochmal würfeln.`, "good");
      renderTurnAndJokers();
    } else {
      nextTurn(1);
    }
  }

  function onNodeClicked(nodeId){
    moveSelectedPieceTo(nodeId);
  }

  // ---------- Events (Barricade / Light spawn) ----------
  function spawnRandomBarricade(){
    const rng = Rules.mulberry32((state.barricadesSeed ?? 999) >>> 0);
    const placed = Rules.spawnBarricadeOnRandomFreeNormal(board, state, rng);
    state.barricadesSeed = ((state.barricadesSeed ?? 999) + 1) >>> 0;
    if (!placed){
      setStatus("Keine Barikade platzierbar (keine freien normalen Felder / max erreicht).", "warn");
      return;
    }
    setStatus(`🧱 Barikade gespawnt auf ${placed}`, "good");
    renderTokens();
  }

  function forceSpawnLight(){
    const rng = Rules.mulberry32((state.lights.seed ?? 123) >>> 0);
    const placed = Rules.spawnOneLightOnRandomFreeNormal(board, state, rng);
    state.lights.seed = ((state.lights.seed ?? 123) + 1) >>> 0;
    if (!placed){
      setStatus("Kein Licht platzierbar (keine freien normalen Felder).", "warn");
      return;
    }
    setStatus(`💡 Test: Licht gespawnt auf ${placed}`, "good");
    renderTokens();
    renderHud();
    // offline: bei 6 darf man nochmal würfeln (gleicher Spieler bleibt dran)
    if (gameState.diceValue === 6) {
      setStatus(`🎲 6! Du darfst nochmal würfeln.`, "good");
      renderTurnAndJokers();
    } else {
      nextTurn(1);
    }
  }

  // ---------- Dice ----------
  function syncDiceFromInput(){
    state.diceValue = clampInt(diceValueInp.value, 1, 6);
    diceValueInp.value = String(state.diceValue);
    renderHud();
    // offline: bei 6 darf man nochmal würfeln (gleicher Spieler bleibt dran)
    if (gameState.diceValue === 6) {
      setStatus(`🎲 6! Du darfst nochmal würfeln.`, "good");
      renderTurnAndJokers();
    } else {
      nextTurn(1);
    }
  }

  function rollDice(){
    const v = clampInt(1 + Math.floor(Math.random()*6), 1, 6);
    state.diceValue = v;
    diceValueInp.value = String(v);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${v}`, "good");
  }

  // ---------- Save/Load ----------
  const LS_KEY = "lichtarena_rebuild_save_v1";
  function saveLocal(){
    const payload = {
      selectedPieceId: state.selectedPieceId,
      pieces: state.pieces,
      turnIndex: state.turnIndex,
      jokers: state.jokers,
      barricades: state.barricades,
      barricadesMax: state.barricadesMax,
      barricadesSeed: state.barricadesSeed,
      lights: state.lights,
      diceValue: state.diceValue,
      showLines: state.showLines,
      cam: state.cam
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setStatus("Gespeichert (LocalStorage).", "good");
  }

  function loadLocal(){
    const raw = localStorage.getItem(LS_KEY);
    if (!raw){ setStatus("Kein Save gefunden.", "warn"); return; }
    try{
      const p = JSON.parse(raw);
      if (p && typeof p === "object"){
        state.selectedPieceId = p.selectedPieceId ?? state.selectedPieceId;
        state.pieces = Array.isArray(p.pieces) ? p.pieces : state.pieces;
        state.turnIndex = typeof p.turnIndex === "number" ? p.turnIndex : state.turnIndex;
        if (p.jokers && typeof p.jokers === "object") state.jokers = p.jokers;
        state.barricades = Array.isArray(p.barricades) ? p.barricades : [];
        state.barricadesMax = typeof p.barricadesMax === "number" ? p.barricadesMax : state.barricadesMax;
        state.barricadesSeed = typeof p.barricadesSeed === "number" ? p.barricadesSeed : state.barricadesSeed;
        if (p.lights && typeof p.lights === "object") state.lights = p.lights;
        state.diceValue = typeof p.diceValue === "number" ? p.diceValue : state.diceValue;
        diceValueInp.value = String(clampInt(state.diceValue,1,6));
        state.showLines = (typeof p.showLines === "boolean") ? p.showLines : state.showLines;
        if (p.cam && typeof p.cam === "object") state.cam = p.cam;
        setStatus("Save geladen.", "good");
        renderAll();
      }
    }catch(e){
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Player turn controls ----------
  showLinesButtonLabel();
  function prevPlayer(){
    state.turnIndex = (state.turnIndex - 1 + state.players.length) % state.players.length;
    setTurnUI();
    renderJokerTable();
  }
  function nextPlayer(){
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    setTurnUI();
    renderJokerTable();
  }

  function showLinesButtonLabel(){
    if (!linesState) return;
    linesState.textContent = state.showLines ? "AN" : "AUS";
  }`;
  }

  // ---------- Pan/Zoom input ----------
  const PZ = {
    pointers: new Map(),
    isPanning: false,
    panStart: { x:0, y:0, ox:0, oy:0 },
    pinchStart: { dist:0, scale:1, cx:0, cy:0 }
  };

  function dist(a,b){
    const dx = a.x-b.x, dy=a.y-b.y;
    return Math.hypot(dx,dy);
  }

  boardShell.addEventListener("pointerdown", (e)=>{
    boardShell.setPointerCapture(e.pointerId);
    PZ.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (PZ.pointers.size === 1){
      PZ.isPanning = true;
      PZ.panStart = { x:e.clientX, y:e.clientY, ox:state.cam.ox, oy:state.cam.oy };
    } else if (PZ.pointers.size === 2){
      const pts = Array.from(PZ.pointers.values());
      PZ.pinchStart.dist = dist(pts[0], pts[1]);
      PZ.pinchStart.scale = state.cam.scale;
      PZ.pinchStart.cx = (pts[0].x + pts[1].x)/2;
      PZ.pinchStart.cy = (pts[0].y + pts[1].y)/2;
    }
  });

  boardShell.addEventListener("pointermove",(e)=>{
    if (!PZ.pointers.has(e.pointerId)) return;
    PZ.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

    if (PZ.pointers.size === 1 && PZ.isPanning){
      const dx = e.clientX - PZ.panStart.x;
      const dy = e.clientY - PZ.panStart.y;
      state.cam.ox = PZ.panStart.ox + dx;
      state.cam.oy = PZ.panStart.oy + dy;
      applyCamera();
    } else if (PZ.pointers.size === 2){
      const pts = Array.from(PZ.pointers.values());
      const d = dist(pts[0], pts[1]);
      const factor = (d / Math.max(10, PZ.pinchStart.dist));
      const nextScale = clamp(PZ.pinchStart.scale * factor, state.cam.minScale, state.cam.maxScale);

      // zoom around pinch center
      const cx = PZ.pinchStart.cx;
      const cy = PZ.pinchStart.cy;
      const old = state.cam.scale;
      const k = nextScale / old;
      state.cam.ox = cx - (cx - state.cam.ox) * k;
      state.cam.oy = cy - (cy - state.cam.oy) * k;
      state.cam.scale = nextScale;
      applyCamera();
    }
  });

  function endPointer(e){
    if (PZ.pointers.has(e.pointerId)) PZ.pointers.delete(e.pointerId);
    if (PZ.pointers.size === 0){
      PZ.isPanning = false;
    }
    if (PZ.pointers.size === 1){
      // re-arm pan start
      const pt = Array.from(PZ.pointers.values())[0];
      if (pt){
        PZ.panStart = { x:pt.x, y:pt.y, ox:state.cam.ox, oy:state.cam.oy };
      }
    }
  }
  boardShell.addEventListener("pointerup", endPointer);
  boardShell.addEventListener("pointercancel", endPointer);

  // wheel zoom
  boardShell.addEventListener("wheel",(e)=>{
    e.preventDefault();
    const factor = (e.deltaY > 0) ? 0.92 : 1.08;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive:false });

  // ---------- Wire UI ----------
  if (btnRoll) btnRoll.addEventListener("click", rollDice);
  if (diceValueInp) diceValueInp.addEventListener("change", syncDiceFromInput);
  if (diceValueInp) diceValueInp.addEventListener("input", syncDiceFromInput);

  if (btnSpawnBarricade) btnSpawnBarricade.addEventListener("click", spawnRandomBarricade);
  if (btnClearDynamicBarricades) btnClearDynamicBarricades.addEventListener("click", () => {
    state.barricades = [];
    setStatus("Dynamische Barikaden gelöscht.", "good");
    renderTokens();
  });

  if (btnForceSpawnLight) btnForceSpawnLight.addEventListener("click", forceSpawnLight);

  if (btnRestart) btnRestart.addEventListener("click", async () => {
    setStatus("Board wird neu geladen…", "warn");
    await start();
  });

  if (btnSave) btnSave.addEventListener("click", saveLocal);
  if (btnLoad) btnLoad.addEventListener("click", loadLocal);

  if (btnPrevTurn) btnPrevTurn.addEventListener("click", () => nextTurn(-1));
  if (btnNextTurn) btnNextTurn.addEventListener("click", () => nextTurn(1));

  if (wheelBtnClose) wheelBtnClose.addEventListener("click", () => closeWheel());

  if (btnFit) btnFit.addEventListener("click", () => { fitCamera(); });
  if (btnResetView) btnResetView.addEventListener("click", () => { resetCamera(); fitCamera(); });
  if (btnZoomOut) btnZoomOut.addEventListener("click", () => { const r=boardShell.getBoundingClientRect(); zoomAt(r.left+r.width/2, r.top+r.height/2, 0.9); });
  if (btnZoomIn) btnZoomIn.addEventListener("click", () => { const r=boardShell.getBoundingClientRect(); zoomAt(r.left+r.width/2, r.top+r.height/2, 1.1); });
  if (btnToggleLines) btnToggleLines.addEventListener("click", () => {
    state.showLines = !state.showLines;
    showLinesButtonLabel();
    renderEdges();
  });

  // ---------- Start ----------
  async function start(){
    try{
      board = await loadBoard();
      buildMaps();

      const bname = board?.meta?.name ? String(board.meta.name) : "spielbrett";
      pillRule.textContent = "Regel: Board 1 startet mit Licht auf allen Lichtfeldern";
      setStatus(`Board geladen: ${bname} • Nodes: ${(board.nodes||[]).length} • Edges: ${(board.edges||[]).length}`, "good");

      // reset state parts
      state.pieces = [];
      state.selectedPieceId = null;
      resetDynamicBarricades();
      syncDiceFromInput();

      initPiecesFromStartNodes();
      initLightsFromBoard();

      // camera
      resetCamera();
      fitCamera();

      renderAll();
      setStatus(`Bereit. Start-Lichter aktiv: ${state.lights.active.length}`, "good");
    }catch(e){
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  // kick off
  start();
})();
