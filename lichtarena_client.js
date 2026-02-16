/* lichtarena_client.js
   Offline-Client für Lichtarena.
   - lädt ./lichtarena_board_1.json (separat, Barikade-board.json bleibt unberührt)
   - rendert Nodes/Edges
   - verwaltet lokalen Game-State (später leicht server-authoritative zu ersetzen)

   WICHTIG (dein Plan):
   - Edges sind gerichtet (from -> to). Rückwärts verboten.
   - Figuren pro Farbe kommen aus board.meta.players[].pieces (Board1=4, Board2=5, Board3=6 ...)
   - Start: Figuren werden auf Startfelder verteilt (1 Figur pro Startfeld, falls genug Startfelder vorhanden).
*/

(() => {
  "use strict";

  const BOARD_URL = "./lichtarena_board_1.json";

  // ---------- DOM ----------
  const stage = document.getElementById("stage");
  const edgesSvg = document.getElementById("edgesSvg");
  const statusLine = document.getElementById("statusLine");

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

  
  // ---------- Pan/Zoom (Tablet friendly) ----------
  const boardViewport = document.getElementById("boardViewport");
  const boardPanZoom = document.getElementById("boardPanZoom");
  const btnZoomIn = document.getElementById("btnZoomIn");
  const btnZoomOut = document.getElementById("btnZoomOut");
  const btnZoomReset = document.getElementById("btnZoomReset");

  const panZoom = {
    enabled: !!(boardViewport && boardPanZoom),
    scale: 1,
    minScale: 0.6,
    maxScale: 2.6,
    tx: 0,
    ty: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
    pinch: false,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchCenter: {x:0, y:0},
  };

  function applyPanZoom(){
    if (!panZoom.enabled) return;
    boardPanZoom.style.transform = `translate(${panZoom.tx}px, ${panZoom.ty}px) scale(${panZoom.scale})`;
  }

  function clampPanZoom(){
    panZoom.scale = Math.max(panZoom.minScale, Math.min(panZoom.maxScale, panZoom.scale));
  }

  function zoomAt(factor, centerX, centerY){
    if (!panZoom.enabled) return;
    const prevScale = panZoom.scale;
    panZoom.scale *= factor;
    clampPanZoom();

    // keep point under finger stable:
    const rect = boardViewport.getBoundingClientRect();
    const cx = (centerX ?? (rect.left + rect.width/2)) - rect.left;
    const cy = (centerY ?? (rect.top + rect.height/2)) - rect.top;

    // transform origin is top-left, so adjust translation:
    const s = panZoom.scale / prevScale;
    panZoom.tx = cx - (cx - panZoom.tx) * s;
    panZoom.ty = cy - (cy - panZoom.ty) * s;

    applyPanZoom();
  }

  function resetPanZoom(){
    panZoom.scale = 1;
    panZoom.tx = 0;
    panZoom.ty = 0;
    applyPanZoom();
  }

  function isInteractiveTarget(el){
    // don't start dragging if user tries to click a piece/node/button
    if (!el) return false;
    return !!(el.closest && (el.closest(".node") || el.closest(".token") || el.closest("button") || el.closest("input") || el.closest("select") ));
  }

  function dist(t1, t2){
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }

  if (panZoom.enabled){
    // prevent browser from interpreting pan as scroll inside viewport
    boardViewport.style.touchAction = "none";

    boardViewport.addEventListener("pointerdown", (ev) => {
      if (isInteractiveTarget(ev.target)) return;
      panZoom.dragging = true;
      panZoom.lastX = ev.clientX;
      panZoom.lastY = ev.clientY;
      boardViewport.setPointerCapture(ev.pointerId);
    });

    boardViewport.addEventListener("pointermove", (ev) => {
      if (!panZoom.dragging) return;
      const dx = ev.clientX - panZoom.lastX;
      const dy = ev.clientY - panZoom.lastY;
      panZoom.lastX = ev.clientX;
      panZoom.lastY = ev.clientY;
      panZoom.tx += dx;
      panZoom.ty += dy;
      applyPanZoom();
    });

    boardViewport.addEventListener("pointerup", () => { panZoom.dragging = false; });
    boardViewport.addEventListener("pointercancel", () => { panZoom.dragging = false; });

    // Pinch zoom (touch)
    boardViewport.addEventListener("touchstart", (ev) => {
      if (ev.touches.length === 2){
        panZoom.pinch = true;
        panZoom.pinchStartDist = dist(ev.touches[0], ev.touches[1]);
        panZoom.pinchStartScale = panZoom.scale;
      }
    }, {passive:false});

    boardViewport.addEventListener("touchmove", (ev) => {
      if (!panZoom.pinch || ev.touches.length !== 2) return;
      ev.preventDefault();
      const d = dist(ev.touches[0], ev.touches[1]);
      const factor = d / Math.max(1, panZoom.pinchStartDist);
      const rect = boardViewport.getBoundingClientRect();
      const cx = (ev.touches[0].clientX + ev.touches[1].clientX)/2;
      const cy = (ev.touches[0].clientY + ev.touches[1].clientY)/2;
      panZoom.scale = panZoom.pinchStartScale * factor;
      clampPanZoom();
      // reuse zoomAt math by computing relative factor from current:
      // instead: call zoomAt with factor from previous scale
      const prev = boardPanZoom._prevScale ?? panZoom.pinchStartScale;
      const rel = panZoom.scale / prev;
      boardPanZoom._prevScale = panZoom.scale;
      zoomAt(rel, cx, cy);
    }, {passive:false});

    boardViewport.addEventListener("touchend", (ev) => {
      if (ev.touches.length < 2){
        panZoom.pinch = false;
        boardPanZoom._prevScale = undefined;
      }
    });

    // Mouse wheel zoom (desktop)
    boardViewport.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? 1.08 : 0.92;
      zoomAt(factor, ev.clientX, ev.clientY);
    }, {passive:false});

    // Buttons
    if (btnZoomIn) btnZoomIn.addEventListener("click", () => zoomAt(1.15));
    if (btnZoomOut) btnZoomOut.addEventListener("click", () => zoomAt(0.87));
    if (btnZoomReset) btnZoomReset.addEventListener("click", resetPanZoom);
  }
const btnToggleEdges = document.getElementById("btnToggleEdges");

  // turn + jokers UI
  const hudTurn = document.getElementById("hudTurn");
  const hudTurnName = document.getElementById("hudTurnName");
  const hudTurnDot = document.getElementById("hudTurnDot");
  const jokerTableBody = document.getElementById("jokerTable");
  const btnPrevTurn = document.getElementById("btnPrevTurn");
  const btnNextTurn = document.getElementById("btnNextTurn");

  // ---------- RULES API ----------
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    setStatus("game_rules_lights_barricades.js nicht geladen.", "bad");
    throw new Error("Rules missing");
  }

  // ---------- State ----------
  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const gameState = {
    pieces: [], // [{id,color,nodeId}]
    selectedPieceId: null,

    // turn system (offline): server later authoritative
    turn: {
      order: ["red","blue","green","yellow"],
      index: 0
    },

    // jokers per color
    jokers: {
      red:   { j1:2, j2:2, j3:2, j4:2, j5:2 },
      blue:  { j1:2, j2:2, j3:2, j4:2, j5:2 },
      green: { j1:2, j2:2, j3:2, j4:2, j5:2 },
      yellow:{ j1:2, j2:2, j3:2, j4:2, j5:2 }
    },

    barricades: [],
    barricadesMax: 15,
    barricadesSeed: 999,

    lights: {
      active: [],
      collectedByColor: { red:0, blue:0, green:0, yellow:0 },
      totalCollected: 0,
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: 123456789
    },

    diceValue: 6
  };

  // ---------- Helpers ----------
  function setStatus(text, kind="good"){
    const cls = (kind === "bad") ? "bad" : (kind === "warn") ? "warn" : "good";
    statusLine.innerHTML = `Status: <b class="${cls}">${escapeHtml(text)}</b>`;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  function clampInt(val, min, max){
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function gateLabel(gate){
    if (!gate) return "";
    if (gate.mode === "exact") return `🔒 🎲=${gate.value}`;
    if (gate.mode === "range") return `🔒 🎲 ${gate.min}–${gate.max}`;
    return "🔒 🎲 ?";
  }


  function activeColor() {
    const order = gameState.turn.order;
    const idx = gameState.turn.index % order.length;
    return order[idx] || "red";
  }

  function jokerName(key){
    // names aligned to your list
    if (key === "j1") return "1) Neuwurf";
    if (key === "j2") return "2) Alle Farben";
    if (key === "j3") return "3) Doppelwurf";
    if (key === "j4") return "4) Barikade versetzen";
    if (key === "j5") return "5) Durch Barikade";
    return key;
  }

  function renderTurnAndJokers(){
    const c = activeColor();
    const pretty = c.toUpperCase();
    if (hudTurn) hudTurn.textContent = pretty;
    if (hudTurnName) hudTurnName.textContent = pretty;
    if (hudTurnDot){
      hudTurnDot.className = "turnDot " + c;
    }

    if (jokerTableBody){
      const j = gameState.jokers[c] || {j1:0,j2:0,j3:0,j4:0,j5:0};
      const rows = ["j1","j2","j3","j4","j5"].map(k => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = jokerName(k);
        const td2 = document.createElement("td");
        td2.textContent = String(j[k] ?? 0);
        tr.appendChild(td1); tr.appendChild(td2);
        return tr;
      });
      jokerTableBody.innerHTML = "";
      for (const r of rows) jokerTableBody.appendChild(r);
    }
  }

  function nextTurn(delta=1){
    const len = gameState.turn.order.length || 4;
    gameState.turn.index = (gameState.turn.index + delta + len) % len;

    // auto-select a piece of that color if current selection isn't matching
    const c = activeColor();
    const selected = getSelectedPiece();
    if (!selected || String(selected.color).toLowerCase() !== c) {
      const p = gameState.pieces.find(x => String(x.color).toLowerCase() === c);
      if (p) gameState.selectedPieceId = p.id;
    }

    renderTurnAndJokers();
    renderTokens();
    setStatus(`Am Zug: ${c.toUpperCase()}`, "good");
  }


  // ---------- Board load ----------
  async function loadBoard() {
    // Cache-bust ist bei GitHub Pages wichtig
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden: ${BOARD_URL} (HTTP ${res.status})`);
    return await res.json();
  }

  function buildNodeMap() {
    nodeById = new Map();
    for (const n of (board.nodes || [])) nodeById.set(String(n.id), n);
  }

  function buildAdjacency() {
    adjacency = new Map();
    const add = (a, b, gate) => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a).push({ to: b, gate: gate || null });
    };

    // WICHTIG: nur from -> to (gerichtet)
    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      add(a, b, e.gate);
    }
  }

  // ---------- Rendering ----------
  function clearStage() {
    edgesSvg.innerHTML = "";
    for (const el of Array.from(stage.querySelectorAll(".node"))) el.remove();
  }

  function computeTransform() {
    const W = stage.clientWidth;
    const H = stage.clientHeight;
    const pad = 60;

    const xs = [];
    const ys = [];
    for (const n of nodeById.values()) {
      if (typeof n.x === "number" && typeof n.y === "number") {
        xs.push(n.x); ys.push(n.y);
      }
    }

    if (!xs.length) return { scale: 1, ox: pad, oy: pad, minX:0, minY:0 };

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const scale = Math.min((W - pad*2) / spanX, (H - pad*2) / spanY);
    const ox = pad - minX * scale;
    const oy = pad - minY * scale;

    return { scale, ox, oy };
  }

  function toStagePoint(n, tf) {
    const x = (typeof n.x === "number") ? (n.x * tf.scale + tf.ox) : 100;
    const y = (typeof n.y === "number") ? (n.y * tf.scale + tf.oy) : 100;
    return { x, y };
  }

  function renderEdges(tf) {
    edgesSvg.innerHTML = "";

    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
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

  function nodeCssClasses(n) {
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

  function nodeLabel(n) {
    const t = String(n.type || "normal").toLowerCase();
    if (t === "start") return String(n.color || "start").toUpperCase();
    if (t === "light_start") return "💡";
    if (t === "light_spawn") return "✨";
    if (t === "barricade_fixed") return "B";
    if (t === "goal") return "ZIEL";
    if (t === "portal") return `P${n.portalId || "?"}`;
    return "";
  }

  function renderNodes(tf) {
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
        ev.stopPropagation();
        onNodeClicked(String(n.id));
      });

      stage.appendChild(el);
    }

    renderTokens();
  }

  function colorToCss(color) {
    const c = String(color || "").toLowerCase();
    if (c === "red") return "rgba(255,90,106,.95)";
    if (c === "blue") return "rgba(90,162,255,.95)";
    if (c === "green") return "rgba(46,229,157,.95)";
    if (c === "yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.85)";
  }

  function renderTokens() {
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))) {
      const tokens = nodeEl.querySelector(".tokens");
      if (tokens) tokens.innerHTML = "";
      nodeEl.classList.remove("selectedNode");
    }

    const selectedPiece = gameState.pieces.find(p => p.id === gameState.selectedPieceId) || null;

    const byNode = new Map();
    for (const p of gameState.pieces) {
      const nid = String(p.nodeId);
      if (!byNode.has(nid)) byNode.set(nid, []);
      byNode.get(nid).push(p);
    }

    for (const [nid, pieces] of byNode.entries()) {
      const nodeEl = stage.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
      if (!nodeEl) continue;

      const tokens = nodeEl.querySelector(".tokens");
      if (!tokens) continue;

      // Zeig maximal 1 großen Token (Board1: wenig Figuren). Später können wir stacking wieder bauen.
      const p = pieces[0];
      if (p) {
        const tok = document.createElement("div");
        tok.className = "token";
        tok.style.background = colorToCss(p.color);
        if (p.id === gameState.selectedPieceId) tok.classList.add("selected");

        tok.title = `Figur ${p.id} (${p.color})`;
        tok.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectPiece(p.id);
        });

        tokens.appendChild(tok);
      }

      if (selectedPiece && selectedPiece.nodeId === nid) nodeEl.classList.add("selectedNode");
    }

    // update classes (lights/barricades)
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))) {
      const id = nodeEl.dataset.id;
      const n = nodeById.get(String(id));
      if (!n) continue;
      nodeEl.className = nodeCssClasses(n);
    }
  }

  function renderHud() {
    hudDice.textContent = String(gameState.diceValue);
    hudActiveLights.textContent = String(gameState.lights.active.length);
    hudLightTotal.textContent = String(gameState.lights.totalCollected);
    hudLightGoal.textContent = String(gameState.lights.globalGoal);
    renderTurnAndJokers();
  }

  function renderAll() {
    clearStage();
    const tf = computeTransform();
    renderEdges(tf);
    renderNodes(tf);
    renderHud();
  
    applyPanZoom();
  }

  
  function initTurnOrderFromBoard(){
    const metaPlayers = board?.meta?.players;
    if (Array.isArray(metaPlayers) && metaPlayers.length){
      const order = [];
      for (const p of metaPlayers){
        const c = String(p?.color || "").toLowerCase();
        if (c && !order.includes(c)) order.push(c);
      }
      if (order.length) gameState.turn.order = order;
    }
    // ensure current index valid
    gameState.turn.index = 0;
  }

// ---------- Game init ----------
  function initPiecesFromStartNodes() {
    const startsByColor = { red: [], blue: [], green: [], yellow: [] };

    for (const n of nodeById.values()) {
      if (String(n.type || "").toLowerCase() === "start") {
        const c = String(n.color || "").toLowerCase();
        if (startsByColor[c]) startsByColor[c].push(String(n.id));
      }
    }

    // Figuren pro Farbe aus board.meta.players (dein Plan Board1=4, Board2=5, Board3=6)
    const piecesByColor = { red: 5, blue: 5, green: 5, yellow: 5 };
    const metaPlayers = board?.meta?.players;
    if (Array.isArray(metaPlayers)) {
      for (const p of metaPlayers) {
        const c = String(p?.color || "").toLowerCase();
        const k = Number(p?.pieces);
        if (piecesByColor[c] != null && Number.isFinite(k) && k > 0) {
          piecesByColor[c] = Math.floor(k);
        }
      }
    }

    // Reihenfolge stabil (nach x)
    for (const c of Object.keys(startsByColor)) {
      startsByColor[c].sort((idA, idB) => {
        const a = nodeById.get(String(idA));
        const b = nodeById.get(String(idB));
        const ax = (a && typeof a.x === "number") ? a.x : 0;
        const bx = (b && typeof b.x === "number") ? b.x : 0;
        return ax - bx;
      });
    }

    const colors = ["red","blue","green","yellow"];
    const pieces = [];

    for (const color of colors) {
      const startList = startsByColor[color] || [];
      const need = piecesByColor[color] ?? 5;
      const fallback = startList[0] || findAnyNormalNodeId() || findAnyNodeId();

      if (startList.length < need) {
        setStatus(`Warnung: ${color} hat nur ${startList.length} Startfelder, braucht aber ${need}.`, "warn");
      }

      for (let i = 0; i < need; i++) {
        const startNodeId = startList[i] || fallback;
        pieces.push({ id: `${color}_${i+1}`, color, nodeId: startNodeId });
      }
    }

    gameState.pieces = pieces;
    gameState.selectedPieceId = pieces[0]?.id || null;
  }

  function findAnyNormalNodeId() {
    for (const n of nodeById.values()) {
      if (String(n.type || "normal").toLowerCase() === "normal") return String(n.id);
    }
    return null;
  }

  function findAnyNodeId() {
    for (const n of nodeById.values()) return String(n.id);
    return null;
  }

  function initLightsFromBoard() {
    const initial = [];
    for (const n of nodeById.values()) {
      const t = String(n.type || "").toLowerCase();
      if (t === "light_start") initial.push(String(n.id));
    }

    // Ziel kommt aus meta.lightRule falls gesetzt
    const goal = Number(board?.meta?.lightRule?.globalGoal);
    const spawnAfterCollect = (board?.meta?.lightRule?.spawnAfterCollect !== false);

    Rules.initLights(board, gameState, {
      globalGoal: Number.isFinite(goal) && goal > 0 ? goal : 5,
      spawnAfterCollect,
      seed: (Date.now() >>> 0),
      initialActiveNodeIds: initial
    });

    if (gameState.lights.active.length === 0) {
      Rules.spawnOneLightOnRandomFreeNormal(board, gameState, Rules.mulberry32(gameState.lights.seed));
    }
  }

  // ---------- Movement / Validation ----------
  function selectPiece(pieceId) {
    const p = gameState.pieces.find(x => x.id === pieceId);
    const c = activeColor();
    if (p && String(p.color).toLowerCase() !== c) {
      setStatus(`Nur Figuren der aktiven Farbe (${c.toUpperCase()}) wählbar.`, "warn");
      return;
    }
    gameState.selectedPieceId = pieceId;
    renderTokens();
    setStatus(`Ausgewählt: ${pieceId}`, "good");
  }

  function getSelectedPiece() {
    return gameState.pieces.find(p => p.id === gameState.selectedPieceId) || null;
  }

  function isNodeBlockedByBarricade(nodeId) {
    const n = nodeById.get(String(nodeId));
    if (!n) return true;

    const t = String(n.type || "normal").toLowerCase();
    if (t === "barricade_fixed") return true;

    return gameState.barricades.includes(String(nodeId));
  }

  function isNodeOccupiedByAnyPiece(nodeId) {
    const id = String(nodeId);
    return gameState.pieces.some(p => String(p.nodeId) === id);
  }

  function canMoveOneStep(fromId, toId, diceValue) {
    const list = adjacency.get(String(fromId)) || [];
    const link = list.find(x => String(x.to) === String(toId));
    if (!link) return { ok:false, reason:"Nicht verbunden (oder Rückwärts verboten)." };

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

  function moveSelectedPieceTo(nodeId) {
    const piece = getSelectedPiece();
    if (!piece) return;

    const c = activeColor();
    if (String(piece.color).toLowerCase() !== c) {
      setStatus(`Nur aktive Farbe darf ziehen: ${c.toUpperCase()}`, "warn");
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
      if (res.spawned) setStatus(`💡 Licht eingesammelt! Neues Licht gespawnt auf ${res.spawned}.`, "good");
      else setStatus(`💡 Licht eingesammelt! (${res.total}/${res.goal})`, "good");
    } else {
      setStatus(`Zug: ${piece.id} → ${to}`, "good");
    }

    renderTokens();
    renderHud();

    // offline: nach jedem gültigen Zug nächster Spieler
    nextTurn(1);
  }

  function onNodeClicked(nodeId) {
    const piece = getSelectedPiece();
    if (!piece) {
      setStatus("Keine Figur ausgewählt.", "warn");
      return;
    }
    moveSelectedPieceTo(nodeId);
  }

  // ---------- Events ----------
  function spawnRandomBarricade() {
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

  function forceSpawnLight() {
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

    // offline: nach jedem gültigen Zug nächster Spieler
    nextTurn(1);
  }

  // ---------- Dice ----------
  function syncDiceFromInput() {
    gameState.diceValue = clampInt(diceValueInp.value, 1, 6);
    diceValueInp.value = String(gameState.diceValue);
    renderHud();
  }

  function rollDice() {
    const v = clampInt(1 + Math.floor(Math.random() * 6), 1, 6);
    gameState.diceValue = v;
    diceValueInp.value = String(v);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${v}`, "good");
  }

  // ---------- Save/Load Local ----------
  const LS_KEY = "lichtarena_offline_save_v1";

  function saveLocal() {
    const payload = {
      gameState: {
        pieces: gameState.pieces,
        selectedPieceId: gameState.selectedPieceId,
        barricades: gameState.barricades,
        barricadesMax: gameState.barricadesMax,
        barricadesSeed: gameState.barricadesSeed,
        lights: gameState.lights,
        diceValue: gameState.diceValue
      }
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    setStatus("✅ Gespeichert (LocalStorage).", "good");
  }

  function loadLocal() {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      setStatus("Kein Save gefunden.", "warn");
      return;
    }
    try {
      const payload = JSON.parse(raw);
      if (!payload?.gameState) throw new Error("bad save");

      const gs = payload.gameState;

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

      renderAll();
      setStatus("✅ Save geladen.", "good");
    } catch (e) {
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Edges toggle ----------
  function setEdgesVisible(isOn) {
    // body.edgesOff => hidden
    document.body.classList.toggle("edgesOff", !isOn);
    btnToggleEdges.textContent = isOn ? "Linien: AN" : "Linien: AUS";
    // persist per browser
    localStorage.setItem("lichtarena_edges_visible", isOn ? "1" : "0");
  }

  function initEdgesToggle() {
    const saved = localStorage.getItem("lichtarena_edges_visible");
    const isOn = (saved === "1");
    setEdgesVisible(isOn);
    btnToggleEdges.addEventListener("click", () => {
      const nowOn = document.body.classList.contains("edgesOff");
      setEdgesVisible(nowOn);
    });
  }

  // ---------- Wire UI ----------
  btnRoll.addEventListener("click", rollDice);

  if (btnPrevTurn) btnPrevTurn.addEventListener("click", () => nextTurn(-1));
  if (btnNextTurn) btnNextTurn.addEventListener("click", () => nextTurn(1));
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

  // ---------- Start ----------
  async function start() {
    try {
      board = await loadBoard();
      buildNodeMap();
      buildAdjacency();
      initTurnOrderFromBoard();

      // reset state
      gameState.pieces = [];
      gameState.selectedPieceId = null;
      gameState.barricades = [];

      syncDiceFromInput();

      initPiecesFromStartNodes();
      initLightsFromBoard();
      nextTurn(0);

      renderAll();

      const bname = board?.meta?.name ? String(board.meta.name) : "(ohne Name)";
      setStatus(`Bereit. Board: ${bname} • Start-Lichter aktiv: ${gameState.lights.active.length}`, "good");
    } catch (e) {
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  initEdgesToggle();
  start();
})();
