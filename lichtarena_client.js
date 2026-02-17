/*
  lichtarena_client.js – Offline-Client für Lichtarena
  - lädt ./lichtarena_board_1.json (separat; Barikade board.json bleibt unberührt)
  - rendert Nodes/Edges
  - lokaler Game-State (server-ready später)

  Tablet-Fix:
  - Pan/Zoom über #world (SVG + Nodes zusammen) -> keine „Zerreiß“-Artefakte
  - Browser-Pinch/Scroll wird aktiv unterdrückt (passive:false)
*/

(() => {
  "use strict";

  const BOARD_URL = "./lichtarena_board_1.json";

  // ---------- DOM ----------
  const stage = document.getElementById("stage");
  const edgesSvg = document.getElementById("edgesSvg");
  const world = document.getElementById("world");
  const boardViewport = document.getElementById("boardViewport");
  const statusLine = document.getElementById("statusLine");

  const btnToggleUi = document.getElementById("btnToggleUi");
  const uiCol = document.getElementById("uiCol");

  const btnRoll = document.getElementById("btnRoll");
  const diceValueInp = document.getElementById("diceValue");
  const hudDice = document.getElementById("hudDice");

  const hudActiveLights = document.getElementById("hudActiveLights");
  const hudLightTotal = document.getElementById("hudLightTotal");
  const hudLightGoal = document.getElementById("hudLightGoal");

  const btnForceSpawnLight = document.getElementById("btnForceSpawnLight");
  const btnSpawnBarricade = document.getElementById("btnSpawnBarricade");
  const btnClearDynamicBarricades = document.getElementById("btnClearDynamicBarricades");

  const btnRestart = document.getElementById("btnRestart");
  const btnSave = document.getElementById("btnSave");
  const btnLoad = document.getElementById("btnLoad");

  const btnFit = document.getElementById("btnFit");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnResetCam = document.getElementById("btnResetCam");
  const btnToggleLines = document.getElementById("btnToggleLines");
  const hudZoom = document.getElementById("hudZoom");

  const btnPrevPlayer = document.getElementById("btnPrevPlayer");
  const btnNextPlayer = document.getElementById("btnNextPlayer");
  const hudTurnColor = document.getElementById("hudTurnColor");
  const hudTurnColor2 = document.getElementById("hudTurnColor2");
  const hudTurnDot = document.getElementById("hudTurnDot");
  const turnBadge = document.getElementById("turnBadge");

  const jokerTableBody = document.getElementById("jokerTableBody");

  // ---------- RULES API ----------
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    // fail fast
    alert("game_rules_lights_barricades.js nicht geladen.");
    throw new Error("Rules missing");
  }

  // ---------- State ----------
  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const turnOrder = ["red", "blue", "green", "yellow"];

  const JOKER_TYPES = [
    { key: "extra", name: "Extra-Zug" },
    { key: "swap",  name: "Tausch" },
    { key: "block", name: "Block (Barikade)" },
    { key: "gate",  name: "Tor umgehen" },
  ];

  const gameState = {
    pieces: [],                 // [{id,color,nodeId}]
    selectedPieceId: null,

    barricades: [],
    barricadesMax: 15,

    lights: {
      active: [],
      collectedByColor: { red:0, blue:0, green:0, yellow:0 },
      totalCollected: 0,
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: 123456789
    },

    diceValue: 6,

    turnIndex: 0,

    jokersByColor: {
      red:   { extra:2, swap:2, block:2, gate:2 },
      blue:  { extra:2, swap:2, block:2, gate:2 },
      green: { extra:2, swap:2, block:2, gate:2 },
      yellow:{ extra:2, swap:2, block:2, gate:2 },
    }
  };

  // ---------- Helpers ----------
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function setStatus(text, kind="good"){
    const icon = kind === "bad" ? "❌" : kind === "warn" ? "⚠️" : "✅";
    statusLine.textContent = `Status: ${icon} ${text}`;
  }

  function clampInt(val, min, max){
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function canonEdgeKey(a,b){
    return (a < b) ? `${a}|${b}` : `${b}|${a}`;
  }

  function gateLabel(gate){
    if (!gate) return "";
    if (gate.mode === "exact") return `🔒 🎲=${gate.value}`;
    if (gate.mode === "range") return `🔒 🎲 ${gate.min}–${gate.max}`;
    return "🔒 🎲 ?";
  }

  function currentTurnColor(){
    return turnOrder[gameState.turnIndex % turnOrder.length];
  }

  function setTurn(index){
    gameState.turnIndex = (index + turnOrder.length) % turnOrder.length;
    const c = currentTurnColor();
    const label = c.toUpperCase();
    hudTurnColor.textContent = label;
    hudTurnColor2.textContent = label;

    // dot class
    hudTurnDot.className = `dot dot-${c}`;
    // pill dot
    const pillDot = turnBadge.querySelector(".dot");
    if (pillDot) pillDot.className = `dot dot-${c}`;

    // if selected piece belongs to other color -> auto-select first of current player
    const sel = getSelectedPiece();
    if (!sel || sel.color !== c) {
      const first = gameState.pieces.find(p => p.color === c);
      gameState.selectedPieceId = first ? first.id : null;
    }

    renderTokens();
    renderJokerTable();
  }

  function renderJokerTable(){
    if (!jokerTableBody) return;
    const c = currentTurnColor();
    const pool = gameState.jokersByColor[c] || {};
    jokerTableBody.innerHTML = "";
    for (const jt of JOKER_TYPES) {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      td1.textContent = jt.name;
      td2.textContent = String(pool[jt.key] ?? 0);
      tr.appendChild(td1);
      tr.appendChild(td2);
      jokerTableBody.appendChild(tr);
    }
  }

  // ---------- Board load ----------
  async function loadBoard(){
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden: ${BOARD_URL} (HTTP ${res.status})`);
    return await res.json();
  }

  function buildNodeMap(){
    nodeById = new Map();
    for (const n of (board.nodes || [])) nodeById.set(String(n.id), n);
  }

  function buildAdjacency(){
    adjacency = new Map();
    const add = (a,b,gate) => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a).push({ to:b, gate: gate || null });
    };
    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      add(a,b,e.gate);
      add(b,a,e.gate);
    }
  }

  // ---------- Rendering ----------
  function clearStage(){
    edgesSvg.innerHTML = "";
    for (const el of Array.from(stage.querySelectorAll(".node"))) el.remove();
  }

  function computeTransformToPixels(){
    // board coords -> stage pixels
    const W = boardViewport.clientWidth;
    const H = boardViewport.clientHeight;
    const pad = 80;

    const xs = [], ys = [];
    for (const n of nodeById.values()) {
      if (typeof n.x === "number" && typeof n.y === "number") {
        xs.push(n.x); ys.push(n.y);
      }
    }
    if (!xs.length) return { scale:1, ox:pad, oy:pad };

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const scale = Math.min((W - pad*2)/spanX, (H - pad*2)/spanY);
    const ox = pad - minX * scale;
    const oy = pad - minY * scale;
    return { scale, ox, oy, minX, minY, maxX, maxY };
  }

  function toStagePoint(n, tf){
    const x = (typeof n.x === "number") ? (n.x * tf.scale + tf.ox) : 100;
    const y = (typeof n.y === "number") ? (n.y * tf.scale + tf.oy) : 100;
    return { x, y };
  }

  function renderEdges(tf){
    edgesSvg.innerHTML = "";
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
        const midX = (A.x + B.x) / 2;
        const midY = (A.y + B.y) / 2;
        const txt = gateLabel(e.gate);
        const approxW = Math.max(70, 13.5 * txt.length);
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
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("dominant-baseline", "middle");
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
    if (t === "barricade_fixed") return "B";
    if (t === "goal") return "ZIEL";
    if (t === "portal") return `P${n.portalId || "?"}`;
    return "";
  }

  function nodeCssClasses(n){
    const t = String(n.type || "normal").toLowerCase();
    const cls = ["node"];

    if (t === "start") {
      const c = String(n.color || "").toLowerCase();
      cls.push(`start-${c || "red"}`);
    }
    if (t === "light_start" || t === "light_spawn") cls.push("lightfield");
    if (t === "barricade_fixed") cls.push("barricade-fixed");

    if (gameState.lights.active.includes(String(n.id))) cls.push("activeLight");
    if (gameState.barricades.includes(String(n.id))) cls.push("dynamicBarricade");

    return cls.join(" ");
  }

  function renderNodes(tf){
    for (const n of nodeById.values()) {
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
        // click wird durch Pan/Zoom blockiert (siehe pointer handler)
        ev.stopPropagation();
        onNodeClicked(String(n.id));
      });

      stage.appendChild(el);
    }

    renderTokens();
  }

  function colorToCss(color){
    const c = String(color || "").toLowerCase();
    if (c === "red") return "rgba(255,90,106,.95)";
    if (c === "blue") return "rgba(90,162,255,.95)";
    if (c === "green") return "rgba(46,229,157,.95)";
    if (c === "yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.85)";
  }

  function renderTokens(){
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))) {
      const tokens = nodeEl.querySelector(".tokens");
      if (tokens) tokens.innerHTML = "";
      nodeEl.classList.remove("selectedNode");
    }

    const selectedPiece = getSelectedPiece();

    const byNode = new Map();
    for (const p of gameState.pieces) {
      const nid = String(p.nodeId);
      if (!byNode.has(nid)) byNode.set(nid, []);
      byNode.get(nid).push(p);
    }

    const turn = currentTurnColor();

    for (const [nid, pieces] of byNode.entries()) {
      const nodeEl = stage.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
      if (!nodeEl) continue;
      const tokens = nodeEl.querySelector(".tokens");
      if (!tokens) continue;

      for (const p of pieces.slice(0, 5)) {
        const tok = document.createElement("div");
        tok.className = "token";
        tok.style.background = colorToCss(p.color);
        if (p.id === gameState.selectedPieceId) tok.classList.add("selected");

        tok.title = `Figur ${p.id} (${p.color})`;
        tok.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (p.color !== turn) {
            setStatus(`Nicht dein Zug. Am Zug: ${turn.toUpperCase()}`, "warn");
            return;
          }
          selectPiece(p.id);
        });

        tokens.appendChild(tok);
      }

      if (selectedPiece && selectedPiece.nodeId === nid) nodeEl.classList.add("selectedNode");
    }

    // update node classes for light/barricade highlights
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))) {
      const id = nodeEl.dataset.id;
      const n = nodeById.get(String(id));
      if (!n) continue;
      nodeEl.className = nodeCssClasses(n);
    }
  }

  function renderHud(){
    hudDice.textContent = String(gameState.diceValue);
    hudActiveLights.textContent = String(gameState.lights.active.length);
    hudLightTotal.textContent = String(gameState.lights.totalCollected);
    hudLightGoal.textContent = String(gameState.lights.globalGoal);
  }

  function renderAll(){
    clearStage();
    const tf = computeTransformToPixels();
    renderEdges(tf);
    renderNodes(tf);
    renderHud();
  }

  // ---------- Game init ----------
  function findAnyNormalNodeId(){
    for (const n of nodeById.values()) {
      if (String(n.type || "normal").toLowerCase() === "normal") return String(n.id);
    }
    return null;
  }

  function findAnyNodeId(){
    for (const n of nodeById.values()) return String(n.id);
    return null;
  }

  function initPiecesFromStartNodes(){
    const startsByColor = { red:[], blue:[], green:[], yellow:[] };

    for (const n of nodeById.values()) {
      if (String(n.type || "").toLowerCase() === "start") {
        const c = String(n.color || "").toLowerCase();
        if (startsByColor[c]) startsByColor[c].push(String(n.id));
      }
    }

    const pieces = [];
    for (const color of turnOrder) {
      const startList = startsByColor[color];
      const startNodeId = startList[0] || findAnyNormalNodeId() || findAnyNodeId();
      for (let i=1;i<=5;i++) pieces.push({ id: `${color}_${i}`, color, nodeId: startNodeId });
    }

    gameState.pieces = pieces;
    gameState.selectedPieceId = pieces.find(p => p.color === currentTurnColor())?.id || pieces[0]?.id || null;
  }

  function initLightsFromBoard(){
    const initial = [];
    for (const n of nodeById.values()) {
      const t = String(n.type || "").toLowerCase();
      if (t === "light_start") initial.push(String(n.id));
    }

    Rules.initLights(board, gameState, {
      globalGoal: board?.meta?.lightRule?.globalGoal ?? 5,
      spawnAfterCollect: board?.meta?.lightRule?.spawnAfterCollect ?? true,
      seed: (Date.now() >>> 0),
      initialActiveNodeIds: initial
    });

    if (gameState.lights.active.length === 0) {
      Rules.spawnOneLightOnRandomFreeNormal(board, gameState, Rules.mulberry32(gameState.lights.seed));
    }
  }

  function resetDynamicBarricades(){
    gameState.barricades = [];
  }

  // ---------- Movement / Validation ----------
  function selectPiece(pieceId){
    gameState.selectedPieceId = pieceId;
    renderTokens();
    setStatus(`Ausgewählt: ${pieceId}`, "good");
  }

  function getSelectedPiece(){
    return gameState.pieces.find(p => p.id === gameState.selectedPieceId) || null;
  }

  function isNodeBlockedByBarricade(nodeId){
    const n = nodeById.get(String(nodeId));
    if (!n) return true;

    const t = String(n.type || "normal").toLowerCase();
    if (t === "barricade_fixed") return true;

    return gameState.barricades.includes(String(nodeId));
  }

  function isNodeOccupiedByAnyPiece(nodeId){
    const id = String(nodeId);
    return gameState.pieces.some(p => String(p.nodeId) === id);
  }

  function canMoveOneStep(fromId, toId, diceValue){
    const list = adjacency.get(String(fromId)) || [];
    const link = list.find(x => String(x.to) === String(toId));
    if (!link) return { ok:false, reason:"Nicht verbunden." };

    if (link.gate) {
      const d = Number(diceValue);
      if (link.gate.mode === "exact") {
        if (d !== Number(link.gate.value)) return { ok:false, reason:`Tor: nur bei exakt ${link.gate.value}.` };
      } else if (link.gate.mode === "range") {
        const mn = Math.min(Number(link.gate.min), Number(link.gate.max));
        const mx = Math.max(Number(link.gate.min), Number(link.gate.max));
        if (d < mn || d > mx) return { ok:false, reason:`Tor: nur bei ${mn}–${mx}.` };
      } else {
        return { ok:false, reason:"Tor: unbekanntes Format." };
      }
    }

    if (isNodeBlockedByBarricade(toId)) return { ok:false, reason:"Ziel ist durch Barikade blockiert." };
    if (isNodeOccupiedByAnyPiece(toId)) return { ok:false, reason:"Ziel ist besetzt." };

    return { ok:true, reason:"OK" };
  }

  function moveSelectedPieceTo(nodeId){
    const turn = currentTurnColor();
    const piece = getSelectedPiece();
    if (!piece) return;

    if (piece.color !== turn) {
      setStatus(`Nicht dein Zug. Am Zug: ${turn.toUpperCase()}`, "warn");
      return;
    }

    const from = String(piece.nodeId);
    const to = String(nodeId);

    const check = canMoveOneStep(from, to, gameState.diceValue);
    if (!check.ok) {
      setStatus(check.reason, "warn");
      return;
    }

    piece.nodeId = to;

    const res = Rules.onPieceArrived(board, gameState, piece.color, to);

    if (res.picked) {
      if (res.spawned) {
        setStatus(`💡 Licht eingesammelt! Neues Licht gespawnt auf ${res.spawned}.`, "good");
      } else {
        setStatus(`💡 Licht eingesammelt! (${res.total}/${res.goal})`, "good");
      }
    } else {
      setStatus(`Zug: ${piece.id} → ${to}`, "good");
    }

    renderTokens();
    renderHud();
  }

  function onNodeClicked(nodeId){
    const piece = getSelectedPiece();
    if (!piece) {
      setStatus("Keine Figur ausgewählt.", "warn");
      return;
    }
    moveSelectedPieceTo(nodeId);
  }

  // ---------- Events (Barricade / Light) ----------
  function spawnRandomBarricade(){
    const rng = Rules.mulberry32((gameState.barricadesSeed ?? 999) >>> 0);
    const placed = Rules.spawnBarricadeOnRandomFreeNormal(board, gameState, rng);
    gameState.barricadesSeed = ((gameState.barricadesSeed ?? 999) + 1) >>> 0;

    if (!placed) {
      setStatus("Keine Barikade platzierbar (keine freien normalen Felder / max erreicht).", "warn");
      return;
    }

    setStatus(`🧱 Barikade gespawnt auf ${placed}`, "good");
    renderTokens();
  }

  function forceSpawnLight(){
    const rng = Rules.mulberry32((gameState.lights.seed ?? 123) >>> 0);
    const placed = Rules.spawnOneLightOnRandomFreeNormal(board, gameState, rng);
    gameState.lights.seed = ((gameState.lights.seed ?? 123) + 1) >>> 0;

    if (!placed) {
      setStatus("Kein Licht platzierbar (keine freien normalen Felder).", "warn");
      return;
    }

    setStatus(`💡 Test: Licht gespawnt auf ${placed}`, "good");
    renderTokens();
    renderHud();
  }

  // ---------- Dice ----------
  function syncDiceFromInput(){
    gameState.diceValue = clampInt(diceValueInp.value, 1, 6);
    diceValueInp.value = String(gameState.diceValue);
    renderHud();
  }

  function rollDice(){
    const v = clampInt(1 + Math.floor(Math.random()*6), 1, 6);
    gameState.diceValue = v;
    diceValueInp.value = String(v);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${v}`, "good");
  }

  // ---------- Save/Load ----------
  const LS_KEY = "lichtarena_offline_save_v2";

  function saveLocal(){
    const payload = {
      gameState: {
        pieces: gameState.pieces,
        selectedPieceId: gameState.selectedPieceId,
        barricades: gameState.barricades,
        barricadesMax: gameState.barricadesMax,
        barricadesSeed: gameState.barricadesSeed,
        lights: gameState.lights,
        diceValue: gameState.diceValue,
        turnIndex: gameState.turnIndex,
        jokersByColor: gameState.jokersByColor,
        camera: camera
      }
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setStatus("✅ Gespeichert (LocalStorage).", "good");
  }

  function loadLocal(){
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      setStatus("Kein Save gefunden.", "warn");
      return;
    }
    try {
      const payload = JSON.parse(raw);
      const gs = payload?.gameState;
      if (!gs) throw new Error("bad save");

      gameState.pieces = Array.isArray(gs.pieces) ? gs.pieces : gameState.pieces;
      gameState.selectedPieceId = gs.selectedPieceId ?? gameState.selectedPieceId;
      gameState.barricades = Array.isArray(gs.barricades) ? gs.barricades : [];
      gameState.barricadesMax = typeof gs.barricadesMax === "number" ? gs.barricadesMax : 15;
      gameState.barricadesSeed = typeof gs.barricadesSeed === "number" ? gs.barricadesSeed : (Date.now()>>>0);

      if (gs.lights && typeof gs.lights === "object") {
        gameState.lights = gs.lights;
        if (!Array.isArray(gameState.lights.active)) gameState.lights.active = [];
      }

      gameState.diceValue = typeof gs.diceValue === "number" ? gs.diceValue : 6;
      diceValueInp.value = String(clampInt(gameState.diceValue, 1, 6));
      syncDiceFromInput();

      gameState.turnIndex = typeof gs.turnIndex === "number" ? gs.turnIndex : 0;
      if (gs.jokersByColor && typeof gs.jokersByColor === "object") gameState.jokersByColor = gs.jokersByColor;

      if (gs.camera && typeof gs.camera === "object") {
        camera.x = Number(gs.camera.x) || camera.x;
        camera.y = Number(gs.camera.y) || camera.y;
        camera.scale = Number(gs.camera.scale) || camera.scale;
      }

      renderAll();
      applyCamera();
      setTurn(gameState.turnIndex);
      setStatus("✅ Save geladen.", "good");
    } catch (e) {
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Lines toggle ----------
  const LS_LINES = "lichtarena_lines";
  let linesOn = (localStorage.getItem(LS_LINES) ?? "1") === "1";

  function applyLines(){
    edgesSvg.style.display = linesOn ? "block" : "none";
    btnToggleLines.textContent = linesOn ? "Linien: AN" : "Linien: AUS";
    localStorage.setItem(LS_LINES, linesOn ? "1" : "0");
  }

  // ---------- Camera (Pan/Zoom) ----------
  const camera = {
    x: 0,
    y: 0,
    scale: 0.70,
    minScale: 0.35,
    maxScale: 2.2,
  };

  function setZoomHud(){
    hudZoom.textContent = `${Math.round(camera.scale*100)}%`;
  }

  function applyCamera(){
    // Ein Transform für SVG + Nodes gemeinsam
    world.style.transform = `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`;
    setZoomHud();
  }

  function resetCamera(){
    camera.x = 0;
    camera.y = 0;
    camera.scale = 0.70;
    applyCamera();
  }

  function zoomAtViewportPoint(factor, vx, vy){
    const old = camera.scale;
    const next = Math.max(camera.minScale, Math.min(camera.maxScale, old * factor));
    if (Math.abs(next - old) < 1e-6) return;

    // Zoom um (vx,vy) im Viewport
    const wx = (vx - camera.x) / old;
    const wy = (vy - camera.y) / old;

    camera.scale = next;
    camera.x = vx - wx * next;
    camera.y = vy - wy * next;

    applyCamera();
  }

  function fitToBoard(){
    const tf = computeTransformToPixels();
    // bounding box in stage coords
    const pts = [];
    for (const n of nodeById.values()) pts.push(toStagePoint(n, tf));
    if (!pts.length) return resetCamera();

    const minX = Math.min(...pts.map(p=>p.x));
    const maxX = Math.max(...pts.map(p=>p.x));
    const minY = Math.min(...pts.map(p=>p.y));
    const maxY = Math.max(...pts.map(p=>p.y));

    const pad = 80;
    const vw = boardViewport.clientWidth;
    const vh = boardViewport.clientHeight;

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const s = Math.max(camera.minScale, Math.min(camera.maxScale, Math.min((vw - pad*2)/spanX, (vh - pad*2)/spanY)));

    camera.scale = s;
    camera.x = (vw/2) - ((minX + maxX)/2) * s;
    camera.y = (vh/2) - ((minY + maxY)/2) * s;

    applyCamera();
  }

  // Pointer handling (Pan + Pinch)
  const pointers = new Map(); // id -> {x,y}
  let isInteracting = false;
  let movedSinceDown = 0;

  function dist(a,b){
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function mid(a,b){
    return { x: (a.x+b.x)/2, y: (a.y+b.y)/2 };
  }

  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let pinchStartCamX = 0;
  let pinchStartCamY = 0;
  let pinchStartMid = {x:0,y:0};

  function onPointerDown(ev){
    if (!boardViewport) return;
    // nur linke Taste (Maus) / Touch / Pen
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    ev.preventDefault();

    boardViewport.setPointerCapture(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    isInteracting = true;
    movedSinceDown = 0;

    if (pointers.size === 2) {
      const arr = Array.from(pointers.values());
      pinchStartDist = dist(arr[0], arr[1]);
      pinchStartScale = camera.scale;
      pinchStartCamX = camera.x;
      pinchStartCamY = camera.y;
      pinchStartMid = mid(arr[0], arr[1]);
    }
  }

  function onPointerMove(ev){
    if (!pointers.has(ev.pointerId)) return;
    ev.preventDefault();

    const prev = pointers.get(ev.pointerId);
    const next = { x: ev.clientX, y: ev.clientY };
    pointers.set(ev.pointerId, next);

    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    movedSinceDown += Math.abs(dx) + Math.abs(dy);

    if (pointers.size === 1) {
      // pan
      camera.x += dx;
      camera.y += dy;
      applyCamera();
      return;
    }

    if (pointers.size === 2) {
      const arr = Array.from(pointers.values());
      const d = dist(arr[0], arr[1]);
      const m = mid(arr[0], arr[1]);

      const factor = d / Math.max(1, pinchStartDist);
      const newScale = Math.max(camera.minScale, Math.min(camera.maxScale, pinchStartScale * factor));

      // zoom around midpoint
      const oldScale = pinchStartScale;
      const wx = (pinchStartMid.x - pinchStartCamX) / oldScale;
      const wy = (pinchStartMid.y - pinchStartCamY) / oldScale;

      camera.scale = newScale;
      camera.x = m.x - wx * newScale;
      camera.y = m.y - wy * newScale;

      applyCamera();
    }
  }

  function onPointerUp(ev){
    if (!pointers.has(ev.pointerId)) return;
    ev.preventDefault();

    pointers.delete(ev.pointerId);
    if (pointers.size < 2) {
      pinchStartDist = 0;
    }

    // wenn der User wirklich gezogen hat -> nächste Clicks (Node) werden ignoriert
    if (movedSinceDown > 10) {
      // very small delay so that click following pointerup is swallowed
      swallowNextClick();
    }

    if (pointers.size === 0) isInteracting = false;
  }

  let swallow = 0;
  function swallowNextClick(){
    swallow = 2;
  }

  // Board click catcher
  boardViewport.addEventListener("click", (e) => {
    if (swallow > 0) {
      swallow--;
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // Android/Samsung Internet: zusätzlich Touch-Events verhindern (wichtig gegen Browser-Scroll/Zoom)
  function hardPrevent(ev){
    if (isInteracting) {
      ev.preventDefault();
    }
  }

  boardViewport.addEventListener("touchstart", hardPrevent, { passive:false });
  boardViewport.addEventListener("touchmove", hardPrevent, { passive:false });
  boardViewport.addEventListener("touchend", hardPrevent, { passive:false });

  boardViewport.addEventListener("pointerdown", onPointerDown, { passive:false });
  boardViewport.addEventListener("pointermove", onPointerMove, { passive:false });
  boardViewport.addEventListener("pointerup", onPointerUp, { passive:false });
  boardViewport.addEventListener("pointercancel", onPointerUp, { passive:false });

  // Mouse wheel zoom
  boardViewport.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const factor = ev.deltaY > 0 ? 0.92 : 1.08;
    zoomAtViewportPoint(factor, ev.clientX, ev.clientY);
  }, { passive:false });

  // ---------- Wire UI ----------
  btnToggleUi?.addEventListener("click", () => {
    uiCol.classList.toggle("open");
  });

  btnRoll.addEventListener("click", rollDice);
  diceValueInp.addEventListener("change", syncDiceFromInput);
  diceValueInp.addEventListener("input", syncDiceFromInput);

  btnSpawnBarricade.addEventListener("click", spawnRandomBarricade);
  btnClearDynamicBarricades.addEventListener("click", () => {
    gameState.barricades = [];
    setStatus("Dynamische Barikaden gelöscht.", "good");
    renderTokens();
  });

  btnForceSpawnLight.addEventListener("click", forceSpawnLight);

  btnRestart.addEventListener("click", async () => {
    setStatus("Board wird neu geladen…", "warn");
    await start();
  });

  btnSave.addEventListener("click", saveLocal);
  btnLoad.addEventListener("click", loadLocal);

  btnFit.addEventListener("click", () => fitToBoard());
  btnZoomOut.addEventListener("click", () => zoomAtViewportPoint(0.90, boardViewport.clientWidth/2, boardViewport.clientHeight/2));
  btnZoomIn.addEventListener("click", () => zoomAtViewportPoint(1.10, boardViewport.clientWidth/2, boardViewport.clientHeight/2));
  btnResetCam.addEventListener("click", () => resetCamera());

  btnToggleLines.addEventListener("click", () => {
    linesOn = !linesOn;
    applyLines();
  });

  btnPrevPlayer.addEventListener("click", () => setTurn(gameState.turnIndex - 1));
  btnNextPlayer.addEventListener("click", () => setTurn(gameState.turnIndex + 1));

  // ---------- Start ----------
  async function start(){
    try {
      board = await loadBoard();
      buildNodeMap();
      buildAdjacency();

      // reset state
      gameState.pieces = [];
      gameState.selectedPieceId = null;
      resetDynamicBarricades();

      // dice
      syncDiceFromInput();

      // pieces + lights
      initPiecesFromStartNodes();
      initLightsFromBoard();

      renderAll();

      // ui
      applyLines();
      setTurn(gameState.turnIndex);
      renderJokerTable();

      // camera
      resetCamera();
      // leichter Autopass: Fit nur beim ersten Start
      fitToBoard();

      const bname = board?.meta?.name ? String(board.meta.name) : "(ohne Name)";
      setStatus(`Bereit. Board: ${bname} · Start-Lichter aktiv: ${gameState.lights.active.length}`, "good");
    } catch (e) {
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  // kick off
  start();
})();
