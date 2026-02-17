/* lichtarena_client.js (B-REPLACE / Board1-Core)
   Offline Client – später server-authoritative.
   - lädt eigenes Board: ./lichtarena_board_1.json (Barikade board.json bleibt unberührt)
   - Turn-System (offline): red->blue->green->yellow (aus board.meta.players Reihenfolge)
   - Knockout: Gegner auf Ziel? -> Gegner zurück auf Start + Glücksrad 5s -> aktiver Spieler erhält Joker
   - Würfel 6: nochmal würfeln (Turn bleibt)
   - Licht: gold/aktiv, verschwindet beim Einsammeln; wenn keine aktiven Lichter -> spawn zufällig auf freies normales Feld
   - Anzeige: Du (aktive Farbe) + Global (Ziel 5)
*/

(() => {
  "use strict";

  // -------- Settings --------
  let BOARD_URL = "./lichtarena_board_1.json";
  const NEXT_BOARD_URL = "./lichtarena_board_2.json"; // später anlegen
  const GLOBAL_LIGHT_GOAL_DEFAULT = 5;

  // -------- DOM helpers --------
  const $ = (id) => document.getElementById(id);

  // Core DOM
  const stage = $("stage");
  const edgesSvg = $("edgesSvg");
  const statusLine = $("statusLine");

  // HUD
  const btnRoll = $("btnRoll");
  const diceValueInp = $("diceValue");
  const hudDice = $("hudDice");

  const hudActiveLights = $("hudActiveLights");
  const hudMyLights = $("hudMyLights");
  const hudLightTotal = $("hudLightTotal");
  const hudLightGoal = $("hudLightGoal");

  // Turn + jokers (from your tablet UI)
  const turnLabel = $("turnLabel");        // top pill label (if exists)
  const turnText = $("turnText");          // bottom "Am Zug:" text
  const turnDot = $("turnDot");            // bottom dot
  const jokerTableBody = $("jokerTable");  // tbody
  const btnPrevTurn = $("btnPrevTurn");
  const btnNextTurn = $("btnNextTurn");

  // Debug/camera
  const btnFit = $("btnFit");
  const btnResetView = $("btnResetView");
  const btnZoomOut = $("btnZoomOut");
  const btnZoomIn = $("btnZoomIn");
  const btnToggleLines = $("btnToggleLines");
  const linesState = $("linesState");

  // Save/load
  const btnRestart = $("btnRestart");
  const btnSave = $("btnSave");
  const btnLoad = $("btnLoad");

  // Wheel overlay
  const wheelOverlay = $("wheelOverlay");
  const wheelEl = $("wheel");
  const wheelResult = $("wheelResult");
  const wheelBtnClose = $("wheelBtnClose");

  // Rules API
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    if (statusLine) statusLine.textContent = "game_rules_lights_barricades.js nicht geladen.";
    throw new Error("Rules missing");
  }

  // -------- State --------
  let board = null;
  let nodeById = new Map();
  let outEdges = new Map(); // directed adjacency: from -> [{to, gate}]

  const state = {
    // turn
    players: ["red", "blue", "green", "yellow"],
    turnIndex: 0,

    // pieces
    pieces: [], // {id,color,nodeId}
    selectedPieceId: null,

    // lights
    lights: {
      active: [], // nodeIds with active light
      collectedByColor: { red:0, blue:0, green:0, yellow:0 },
      totalCollected: 0,
      globalGoal: GLOBAL_LIGHT_GOAL_DEFAULT,
      seed: (Date.now() >>> 0),
    },

    // jokers per player color (no cap)
    jokers: {
      red:   { j1:2, j2:2, j3:2, j4:2, j5:2 },
      blue:  { j1:2, j2:2, j3:2, j4:2, j5:2 },
      green: { j1:2, j2:2, j3:2, j4:2, j5:2 },
      yellow:{ j1:2, j2:2, j3:2, j4:2, j5:2 },
    },

    // dice
    diceValue: 6,

    // view
    showLines: false,

    // wheel
    wheelSeed: (Date.now() >>> 0),
  };

  // -------- Utilities --------
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function setStatus(msg, kind="good"){
    if (!statusLine) return;
    statusLine.innerHTML = `<span class="${kind}">${escapeHtml(String(msg))}</span>`;
  }

  function clampInt(val, min, max){
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function activeColor(){
    const c = state.players[state.turnIndex % state.players.length] || "red";
    return String(c).toLowerCase();
  }

  function jokerName(key){
    if (key === "j1") return "1) Neuwurf";
    if (key === "j2") return "2) Alle Farben";
    if (key === "j3") return "3) Doppelwurf";
    if (key === "j4") return "4) Barikade versetzen";
    if (key === "j5") return "5) Durch Barikade";
    return key;
  }

  function gateLabel(gate){
    if (!gate) return "";
    if (gate.mode === "exact") return `🔒 🎲=${gate.value}`;
    if (gate.mode === "range") return `🔒 🎲 ${gate.min}–${gate.max}`;
    return "🔒 🎲 ?";
  }

  // -------- Board load / build --------
  async function loadBoard(){
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden: ${BOARD_URL} (HTTP ${res.status})`);
    return await res.json();
  }

  function buildMaps(){
    nodeById = new Map();
    for (const n of (board.nodes || [])) nodeById.set(String(n.id), n);

    outEdges = new Map();
    const add = (a, b, gate) => {
      if (!outEdges.has(a)) outEdges.set(a, []);
      outEdges.get(a).push({ to: b, gate: gate || null });
    };

    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      // directed: only from->to
      add(a, b, e.gate);
    }
  }

  function initTurnOrderFromBoard(){
    const metaPlayers = board?.meta?.players;
    if (Array.isArray(metaPlayers) && metaPlayers.length){
      const order = [];
      for (const p of metaPlayers){
        const c = String(p?.color || "").toLowerCase();
        if (c && !order.includes(c)) order.push(c);
      }
      if (order.length) state.players = order;
    }
    state.turnIndex = 0;
  }

  // -------- Rendering (simple) --------
  function clearStage(){
    if (edgesSvg) edgesSvg.innerHTML = "";
    if (!stage) return;
    for (const el of Array.from(stage.querySelectorAll(".node"))) el.remove();
  }

  function computeTransform(){
    if (!stage) return { scale:1, ox:60, oy:60 };
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const pad = 60;
    const xs=[], ys=[];
    for (const n of nodeById.values()){
      if (typeof n.x === "number" && typeof n.y === "number") { xs.push(n.x); ys.push(n.y); }
    }
    if (!xs.length) return { scale:1, ox:pad, oy:pad };
    const minX=Math.min(...xs), maxX=Math.max(...xs);
    const minY=Math.min(...ys), maxY=Math.max(...ys);
    const spanX=Math.max(1, maxX-minX), spanY=Math.max(1, maxY-minY);
    const scale = Math.min((W-pad*2)/spanX, (H-pad*2)/spanY);
    const ox = pad - minX*scale;
    const oy = pad - minY*scale;
    return { scale, ox, oy };
  }

  function toStagePoint(n, tf){
    const x = (typeof n.x === "number") ? (n.x*tf.scale + tf.ox) : 100;
    const y = (typeof n.y === "number") ? (n.y*tf.scale + tf.oy) : 100;
    return { x, y };
  }

  function canonEdgeKey(a,b){
    return (a < b) ? `${a}|${b}` : `${b}|${a}`;
  }

  function renderEdges(tf){
    if (!edgesSvg) return;
    edgesSvg.innerHTML = "";
    if (!state.showLines) return;

    const rendered = new Set();
    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      const key = canonEdgeKey(a,b);
      if (rendered.has(key)) continue;
      rendered.add(key);

      const na = nodeById.get(a);
      const nb = nodeById.get(b);
      if (!na || !nb) continue;

      const A = toStagePoint(na, tf);
      const B = toStagePoint(nb, tf);

      const g = document.createElementNS("http://www.w3.org/2000/svg","g");

      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1", A.x);
      line.setAttribute("y1", A.y);
      line.setAttribute("x2", B.x);
      line.setAttribute("y2", B.y);
      line.classList.add("edge");
      if (e.gate) line.classList.add("gated");
      g.appendChild(line);

      if (e.gate) {
        const midX = (A.x + B.x)/2;
        const midY = (A.y + B.y)/2;
        const txt = gateLabel(e.gate);
        const approxW = Math.max(70, 13.5*txt.length);
        const approxH = 28;

        const bg = document.createElementNS("http://www.w3.org/2000/svg","rect");
        bg.setAttribute("x", midX - approxW/2);
        bg.setAttribute("y", midY - approxH/2);
        bg.setAttribute("width", approxW);
        bg.setAttribute("height", approxH);
        bg.classList.add("gateLabelBg");

        const t = document.createElementNS("http://www.w3.org/2000/svg","text");
        t.setAttribute("x", midX);
        t.setAttribute("y", midY);
        t.setAttribute("text-anchor","middle");
        t.setAttribute("dominant-baseline","middle");
        t.classList.add("gateLabelText");
        t.textContent = txt;

        g.appendChild(bg);
        g.appendChild(t);
      }

      edgesSvg.appendChild(g);
    }
  }

  function nodeLabel(n){
    const t = String(n.type || "normal").toLowerCase();
    if (t === "start") return String(n.color || "start").toUpperCase();
    if (t === "light_start") return "💡";
    if (t === "light_spawn") return "✨";
    return "";
  }

  function nodeCssClasses(n){
    const t = String(n.type || "normal").toLowerCase();
    const cls = ["node"];
    if (t === "start") cls.push(`start-${String(n.color||"red").toLowerCase()}`);
    if (t === "light_start" || t === "light_spawn") cls.push("lightfield");
    if (state.lights.active.includes(String(n.id))) cls.push("activeLight");
    return cls.join(" ");
  }

  function renderNodes(tf){
    if (!stage) return;
    for (const n of nodeById.values()){
      const p = toStagePoint(n, tf);
      const el = document.createElement("div");
      el.className = nodeCssClasses(n);
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

  function colorToCss(color){
    const c = String(color||"").toLowerCase();
    if (c === "red") return "rgba(255,90,106,.95)";
    if (c === "blue") return "rgba(90,162,255,.95)";
    if (c === "green") return "rgba(46,229,157,.95)";
    if (c === "yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.85)";
  }

  function renderTokens(){
    if (!stage) return;

    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const tokens = nodeEl.querySelector(".tokens");
      if (tokens) tokens.innerHTML = "";
      nodeEl.classList.remove("selectedNode");
    }

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

      for (const p of pieces.slice(0, 5)){
        const tok = document.createElement("div");
        tok.className = "token";
        tok.style.background = colorToCss(p.color);
        if (p.id === state.selectedPieceId) tok.classList.add("selected");
        tok.title = `Figur ${p.id} (${p.color})`;
        tok.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectPiece(p.id);
        });
        tokens.appendChild(tok);
      }

      const sel = getSelectedPiece();
      if (sel && String(sel.nodeId) === nid) nodeEl.classList.add("selectedNode");
    }

    // refresh node classes (light highlights)
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const id = nodeEl.dataset.id;
      const n = nodeById.get(String(id));
      if (!n) continue;
      nodeEl.className = nodeCssClasses(n);
    }
  }

  function renderHud(){
    if (hudDice) hudDice.textContent = String(state.diceValue);
    if (hudActiveLights) hudActiveLights.textContent = String(state.lights.active.length);
    if (hudLightTotal) hudLightTotal.textContent = String(state.lights.totalCollected);
    if (hudLightGoal) hudLightGoal.textContent = String(state.lights.globalGoal);

    const c = activeColor();
    if (hudMyLights) hudMyLights.textContent = String(state.lights.collectedByColor?.[c] ?? 0);

    renderTurnAndJokers();
  
    const turnColor = state.players[state.turnIndex] || "red";
    if (hudMyLights) hudMyLights.textContent = String(state.lights.collectedByColor?.[turnColor] ?? 0);
    if (hudLightGoal2) hudLightGoal2.textContent = String(state.lights.globalGoal);

  }

  function renderTurnAndJokers(){
    const c = activeColor();
    const up = c.toUpperCase();
    if (turnLabel) turnLabel.textContent = up;
    if (turnText) turnText.textContent = up;
    if (turnDot) turnDot.className = "turnDot " + c;

    if (jokerTableBody){
      const j = state.jokers[c] || { j1:0,j2:0,j3:0,j4:0,j5:0 };
      jokerTableBody.innerHTML = "";
      for (const key of ["j1","j2","j3","j4","j5"]){
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = jokerName(key);
        const td2 = document.createElement("td");
        td2.className = "right";
        td2.textContent = String(j[key] ?? 0);
        tr.appendChild(td1);
        tr.appendChild(td2);
        jokerTableBody.appendChild(tr);
      }
    }
  }

  function showLinesButtonLabel(){
    if (!linesState) return;
    linesState.textContent = state.showLines ? "AN" : "AUS";
  }

  function renderAll(){
    clearStage();
    const tf = computeTransform();
    renderEdges(tf);
    renderNodes(tf);
    renderHud();
  }

  // -------- Game init --------
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

  function initPiecesFromStartNodes(){
    const startsByColor = { red:[], blue:[], green:[], yellow:[] };
    for (const n of nodeById.values()){
      if (String(n.type||"").toLowerCase() === "start"){
        const c = String(n.color||"").toLowerCase();
        if (startsByColor[c]) startsByColor[c].push(String(n.id));
      }
    }

    const pieces = [];
    for (const color of state.players){
      const startNodeId = (startsByColor[color] && startsByColor[color][0]) || findAnyNormalNodeId() || findAnyNodeId();
      const piecesCount = Number(board?.meta?.players?.find(p => String(p.color).toLowerCase()===color)?.pieces ?? 4);
      for (let i=1;i<=piecesCount;i++){
        pieces.push({ id: `${color}_${i}`, color, nodeId: startNodeId });
      }
    }

    state.pieces = pieces;
    // select first active player piece
    const c = activeColor();
    state.selectedPieceId = state.pieces.find(p => String(p.color).toLowerCase() === c)?.id || pieces[0]?.id || null;
  }

  function initLightsFromBoard(){
    const initial = [];
    for (const n of nodeById.values()){
      if (String(n.type||"").toLowerCase() === "light_start") initial.push(String(n.id));
    }
    const goal = Number(board?.meta?.lightRule?.globalGoal ?? GLOBAL_LIGHT_GOAL_DEFAULT);
    state.lights.globalGoal = goal;
    state.lights.active = initial.slice();
    state.lights.totalCollected = 0;
    state.lights.collectedByColor = { red:0, blue:0, green:0, yellow:0 };
    state.lights.seed = (Date.now() >>> 0);

    // fallback: if none defined, spawn one
    if (state.lights.active.length === 0){
      spawnOneLight();
    }
  }

  function nextTurn(delta){
    const len = state.players.length || 4;
    state.turnIndex = (state.turnIndex + delta + len) % len;

    const c = activeColor();
    const sel = getSelectedPiece();
    if (!sel || String(sel.color).toLowerCase() !== c){
      const p = state.pieces.find(x => String(x.color).toLowerCase() === c);
      if (p) state.selectedPieceId = p.id;
    }

    renderHud();
    renderTokens();
    setStatus(`Am Zug: ${activeColor().toUpperCase()}`, "good");
  }

  // -------- Movement / rules --------
  function getSelectedPiece(){
    return state.pieces.find(p => p.id === state.selectedPieceId) || null;
  }

  function selectPiece(pieceId){
    const p = state.pieces.find(x => x.id === pieceId) || null;
    const c = activeColor();
    if (p && String(p.color).toLowerCase() !== c){
      setStatus(`Nur aktive Farbe (${c.toUpperCase()}) darf ziehen.`, "warn");
      return;
    }
    state.selectedPieceId = pieceId;
    renderTokens();
  }

  function pieceAtNode(nodeId){
    const id = String(nodeId);
    return state.pieces.find(p => String(p.nodeId) === id) || null;
  }

  function findStartNodeForColor(color){
    const c = String(color||"").toLowerCase();
    for (const n of nodeById.values()){
      if (String(n.type||"").toLowerCase()==="start" && String(n.color||"").toLowerCase()===c){
        return String(n.id);
      }
    }
    return findAnyNormalNodeId() || findAnyNodeId();
  }

  function gateAllows(gate, diceValue){
    if (!gate) return true;
    const d = Number(diceValue);
    if (gate.mode === "exact") return d === Number(gate.value);
    if (gate.mode === "range") {
      const mn = Math.min(Number(gate.min), Number(gate.max));
      const mx = Math.max(Number(gate.min), Number(gate.max));
      return d >= mn && d <= mx;
    }
    return false;
  }

  function canMoveOneStep(fromId, toId){
    const list = outEdges.get(String(fromId)) || [];
    const link = list.find(x => String(x.to) === String(toId));
    if (!link) return { ok:false, reason:"Nicht verbunden (Richtung beachten)." };

    if (link.gate && !gateAllows(link.gate, state.diceValue)){
      return { ok:false, reason:"Tor blockiert (falsche Würfelzahl)." };
    }

    // same-color occupied blocks; opponent ok (knockout)
    const occ = pieceAtNode(toId);
    const sel = getSelectedPiece();
    if (occ && sel && String(occ.color).toLowerCase() === String(sel.color).toLowerCase()){
      return { ok:false, reason:"Ziel ist von eigener Figur besetzt." };
    }

    return { ok:true, reason:"OK" };
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

    const rng = Rules.mulberry32((state.wheelSeed >>> 0));
    state.wheelSeed = (state.wheelSeed + 1) >>> 0;
    const pickIndex = Math.floor(rng() * options.length);
    const picked = options[pickIndex];

    const segDeg = 360 / options.length;
    const targetDeg = 360*6 + (pickIndex * segDeg) + (segDeg/2);
    wheelEl.style.transition = "transform 5s cubic-bezier(.1,.9,.0,1)";
    wheelEl.style.transform = `rotate(${targetDeg}deg)`;

    await new Promise(r => setTimeout(r, 5000));

    const c = activeColor();
    if (!state.jokers[c]) state.jokers[c] = { j1:0,j2:0,j3:0,j4:0,j5:0 };
    state.jokers[c][picked.key] = (state.jokers[c][picked.key] ?? 0) + 1;

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

  function spawnOneLight(){
    const rng = Rules.mulberry32((state.lights.seed >>> 0));
    state.lights.seed = (state.lights.seed + 1) >>> 0;

    // pick random free normal node (not start, not occupied)
    const candidates = [];
    for (const n of nodeById.values()){
      const t = String(n.type||"normal").toLowerCase();
      if (t !== "normal") continue;
      const id = String(n.id);
      if (state.lights.active.includes(id)) continue;
      if (pieceAtNode(id)) continue;
      candidates.push(id);
    }
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(rng() * candidates.length)];
    state.lights.active.push(pick);
    return pick;
  }

  function collectLightIfPresent(color, nodeId){
    const id = String(nodeId);
    const idx = state.lights.active.indexOf(id);
    if (idx === -1) return { picked:false, spawned:null };

    state.lights.active.splice(idx, 1);
    const c = String(color).toLowerCase();
    state.lights.collectedByColor[c] = (state.lights.collectedByColor[c] ?? 0) + 1;
    state.lights.totalCollected = (state.lights.totalCollected ?? 0) + 1;

    // if no active lights -> spawn one
    let spawned = null;
    if (state.lights.active.length === 0){
      spawned = spawnOneLight();
    }
    return { picked:true, spawned };
  }

  async function handleKnockoutIfAny(targetNodeId){
    const occ = pieceAtNode(targetNodeId);
    if (!occ) return null;

    const ac = activeColor();
    if (String(occ.color).toLowerCase() === ac) return null;

    // send to start
    occ.nodeId = findStartNodeForColor(occ.color);
    renderTokens();

    // spin wheel, grant joker to active
    await spinWheelAndGrantJoker();
    return occ;
  }

  async function moveSelectedPieceTo(nodeId){
    const piece = getSelectedPiece();
    if (!piece) return;

    const ac = activeColor();
    if (String(piece.color).toLowerCase() !== ac){
      setStatus(`Nur aktive Farbe darf ziehen: ${ac.toUpperCase()}`, "warn");
      return;
    }

    const from = String(piece.nodeId);
    const to = String(nodeId);

    const check = canMoveOneStep(from, to);
    if (!check.ok){
      setStatus(check.reason, "warn");
      return;
    }

    // knockout if needed
    await handleKnockoutIfAny(to);

    // move
    piece.nodeId = to;

    // light logic
    const res = collectLightIfPresent(piece.color, to);
    if (res.picked){
      if (res.spawned){
        setStatus(`💡 Licht eingesammelt! Neues Licht gespawnt.`, "good");
      } else {
        setStatus(`💡 Licht eingesammelt!`, "good");
      }
    } else {
      setStatus(`Zug: ${piece.id} → ${to}`, "good");
    }

    renderTokens();
    renderHud();

    // board completion
    if ((state.lights.totalCollected ?? 0) >= (state.lights.globalGoal ?? GLOBAL_LIGHT_GOAL_DEFAULT)){
      setStatus("🏁 5 Lichter erreicht! Wechsel zu Board 2…", "good");
      // try load board 2 (if file exists)
      BOARD_URL = NEXT_BOARD_URL;
      await start(); // if load fails, start() will show error
      return;
    }

    // reroll on 6
    if (state.diceValue === 6){
      setStatus("🎲 6! Du darfst nochmal würfeln.", "good");
      return;
    }

    nextTurn(1);
  }

  function onNodeClicked(nodeId){
    moveSelectedPieceTo(nodeId);
  }

  // -------- Dice --------
  function syncDiceFromInput(){
    state.diceValue = clampInt(diceValueInp ? diceValueInp.value : 6, 1, 6);
    if (diceValueInp) diceValueInp.value = String(state.diceValue);
    renderHud();
  }

  function rollDice(){
    const v = 1 + Math.floor(Math.random() * 6);
    state.diceValue = clampInt(v, 1, 6);
    if (diceValueInp) diceValueInp.value = String(state.diceValue);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${state.diceValue}`, "good");
  }

  // -------- Camera / view --------
  // Minimal camera from your tablet build: rely on existing functions if present
  const boardShell = $("boardShell");
  let cam = { x:0, y:0, s:1 };

  function applyCamera(){
    if (!boardShell) return;
    boardShell.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`;
    const zoomPct = $("zoomPct");
    if (zoomPct) zoomPct.textContent = `${Math.round(cam.s*100)}%`;
  }

  function resetCamera(){ cam = { x:0, y:0, s:1 }; applyCamera(); }

  function fitCamera(){
    // keep simple: reset for now
    resetCamera();
  }

  function zoomAt(cx, cy, factor){
    cam.s = Math.max(0.35, Math.min(3.0, cam.s * factor));
    applyCamera();
  }

  // -------- Save/Load --------
  const LS_KEY = "lichtarena_offline_save_vB1";

  function saveLocal(){
    const payload = {
      BOARD_URL,
      state: {
        players: state.players,
        turnIndex: state.turnIndex,
        pieces: state.pieces,
        selectedPieceId: state.selectedPieceId,
        lights: state.lights,
        jokers: state.jokers,
        diceValue: state.diceValue,
        showLines: state.showLines,
        wheelSeed: state.wheelSeed,
      }
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setStatus("✅ Gespeichert (LocalStorage).", "good");
  }

  function loadLocal(){
    const raw = localStorage.getItem(LS_KEY);
    if (!raw){ setStatus("Kein Save gefunden.", "warn"); return; }
    try{
      const payload = JSON.parse(raw);
      if (payload?.BOARD_URL) BOARD_URL = String(payload.BOARD_URL);
      const st = payload?.state || {};
      if (Array.isArray(st.players) && st.players.length) state.players = st.players;
      if (typeof st.turnIndex === "number") state.turnIndex = st.turnIndex;
      if (Array.isArray(st.pieces)) state.pieces = st.pieces;
      state.selectedPieceId = st.selectedPieceId ?? state.selectedPieceId;
      if (st.lights) state.lights = st.lights;
      if (st.jokers) state.jokers = st.jokers;
      if (typeof st.diceValue === "number") state.diceValue = clampInt(st.diceValue,1,6);
      if (typeof st.showLines === "boolean") state.showLines = st.showLines;
      if (typeof st.wheelSeed === "number") state.wheelSeed = st.wheelSeed;

      if (diceValueInp) diceValueInp.value = String(state.diceValue);
      showLinesButtonLabel();

      renderAll();
      setStatus("✅ Save geladen.", "good");
    }catch(e){
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // -------- Wire UI --------
  if (btnRoll) btnRoll.addEventListener("click", rollDice);
  if (diceValueInp) diceValueInp.addEventListener("change", syncDiceFromInput);
  if (diceValueInp) diceValueInp.addEventListener("input", syncDiceFromInput);

  if (btnPrevTurn) btnPrevTurn.addEventListener("click", () => nextTurn(-1));
  if (btnNextTurn) btnNextTurn.addEventListener("click", () => nextTurn(1));

  if (btnToggleLines) btnToggleLines.addEventListener("click", () => {
    state.showLines = !state.showLines;
    showLinesButtonLabel();
    renderAll();
  });

  if (btnFit) btnFit.addEventListener("click", fitCamera);
  if (btnResetView) btnResetView.addEventListener("click", () => { resetCamera(); fitCamera(); });
  if (btnZoomOut) btnZoomOut.addEventListener("click", () => {
    if (!boardShell) return;
    const r = boardShell.getBoundingClientRect();
    zoomAt(r.left + r.width/2, r.top + r.height/2, 0.9);
  });
  if (btnZoomIn) btnZoomIn.addEventListener("click", () => {
    if (!boardShell) return;
    const r = boardShell.getBoundingClientRect();
    zoomAt(r.left + r.width/2, r.top + r.height/2, 1.1);
  });

  if (btnRestart) btnRestart.addEventListener("click", async () => {
    setStatus("Board wird neu geladen…", "warn");
    await start();
  });

  if (btnSave) btnSave.addEventListener("click", saveLocal);
  if (btnLoad) btnLoad.addEventListener("click", loadLocal);

  if (wheelBtnClose) wheelBtnClose.addEventListener("click", closeWheel);

  // -------- Start --------
  async function start(){
    try{
      board = await loadBoard();
      buildMaps();
      initTurnOrderFromBoard();

      // reset
      syncDiceFromInput();
      initPiecesFromStartNodes();
      initLightsFromBoard();

      showLinesButtonLabel();
      renderAll();

      setStatus(`Board geladen: ${board?.meta?.name || "spielbrett"} • Start-Lichter: ${state.lights.active.length}`, "good");
    }catch(e){
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  start();
})();
  // --- New responsive UI (bottom bar + sheets) ---
  const sheetOverlay = $("sheetOverlay");
  const sheetClose = $("sheetClose");
  const sheetTitle = $("sheetTitle");
  const btnOpenUi = $("btnOpenUi");

  const bbRoll = $("bbRoll");
  const bbJokers = $("bbJokers");
  const bbTurn = $("bbTurn");
  const bbDev = $("bbDev");

  const sheetTurn = $("sheetTurn");
  const sheetDice = $("sheetDice");
  const sheetJokers = $("sheetJokers");
  const sheetDev = $("sheetDev");

  const hudMyLights = $("hudMyLights");
  const hudLightGoal2 = $("hudLightGoal2");

  // ---------- Sheets (UI) ----------
  function hideAllSheets(){
    if (sheetTurn) sheetTurn.style.display = "none";
    if (sheetDice) sheetDice.style.display = "none";
    if (sheetJokers) sheetJokers.style.display = "none";
    if (sheetDev) sheetDev.style.display = "none";
  }

  function openSheet(which){
    if (!sheetOverlay) return;
    hideAllSheets();
    const key = String(which || "");
    if (sheetTitle){
      sheetTitle.textContent =
        key === "jokers" ? "Joker" :
        key === "dev" ? "Debug / Local" :
        key === "dice" ? "Würfel" :
        "Spieler";
    }
    if (key === "jokers" && sheetJokers) sheetJokers.style.display = "";
    else if (key === "dev" && sheetDev) sheetDev.style.display = "";
    else if (key === "dice" && sheetDice) sheetDice.style.display = "";
    else if (sheetTurn) sheetTurn.style.display = "";

    sheetOverlay.classList.add("show");
    sheetOverlay.setAttribute("aria-hidden","false");
  }

  function closeSheet(){
    if (!sheetOverlay) return;
    sheetOverlay.classList.remove("show");
    sheetOverlay.setAttribute("aria-hidden","true");
  }

  // Bottom bar shortcuts
  if (bbRoll) bbRoll.addEventListener("click", () => { rollDice(); });
  if (bbJokers) bbJokers.addEventListener("click", () => { openSheet("jokers"); });
  if (bbTurn) bbTurn.addEventListener("click", () => { openSheet("turn"); });
  if (bbDev) bbDev.addEventListener("click", () => { openSheet("dev"); });
  if (btnOpenUi) btnOpenUi.addEventListener("click", () => { openSheet("turn"); });

  if (sheetClose) sheetClose.addEventListener("click", closeSheet);
  if (sheetOverlay) sheetOverlay.addEventListener("click", (ev) => {
    // click outside sheet closes
    if (ev.target === sheetOverlay) closeSheet();
  });

