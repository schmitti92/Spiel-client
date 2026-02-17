/* lichtarena_client.js (la4 rebuild)
   - lädt ./lichtarena_board_1.json
   - rendert Nodes/Edges
   - pan/zoom stabil auf Tablet (Pointer Events + touch-action none)
   - Turn Anzeige (rot/blau/grün/gelb)
   - Joker Anzeige Tabelle (nur Anzeige)
*/
(() => {
  "use strict";

  const BOARD_URL = "./lichtarena_board_1.json";

  // ---------- Safe DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const must = (id) => {
    const el = $(id);
    if (!el) throw new Error(`Missing element #${id} (HTML nicht aktuell?)`);
    return el;
  };
  const setText = (el, v) => { if (el) el.textContent = String(v); };
  const setHTML = (el, v) => { if (el) el.innerHTML = String(v); };

  // ---------- DOM ----------
  const viewport = must("viewport");
  const world = must("world");
  const stage = must("stage");
  const edgesSvg = must("edgesSvg");
  const statusLine = must("statusLine");

  const hudBoardName = $("hudBoardName");
  const btnFit = $("btnFit");
  const btnZoomOut = $("btnZoomOut");
  const btnZoomIn = $("btnZoomIn");
  const btnResetView = $("btnResetView");
  const btnToggleLines = $("btnToggleLines");
  const hudZoom = $("hudZoom");

  const btnRestart = $("btnRestart");
  const btnSave = $("btnSave");
  const btnLoad = $("btnLoad");

  const btnPrevTurn = $("btnPrevTurn");
  const btnNextTurn = $("btnNextTurn");
  const turnDot = $("turnDot");
  const turnName = $("turnName");
  const chipDot = $("chipDot");
  const chipTurn = $("chipTurn");

  const btnRoll = $("btnRoll");
  const diceValueInp = $("diceValue");
  const hudDice = $("hudDice");

  const hudActiveLights = $("hudActiveLights");
  const hudLightTotal = $("hudLightTotal");
  const hudLightGoal = $("hudLightGoal");

  const btnForceSpawnLight = $("btnForceSpawnLight");
  const btnSpawnBarricade = $("btnSpawnBarricade");
  const btnClearDynamicBarricades = $("btnClearDynamicBarricades");

  const jokerTableBody = $("jokerTableBody");

  // ---------- RULES API ----------
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    setStatus("game_rules_lights_barricades.js nicht geladen.", "bad");
    return;
  }

  // ---------- Utils ----------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clampInt = (val, min, max) => {
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  };
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  function setStatus(text, kind = "good") {
    const cls = kind === "bad" ? "bad" : kind === "warn" ? "warn" : "good";
    setHTML(statusLine, `Status: <span class="${cls}">${escapeHtml(text)}</span>`);
  }

  function colorKey(c){
    const x = String(c||"").toLowerCase();
    if (x === "red" || x === "blue" || x === "green" || x === "yellow") return x;
    return "red";
  }

  function setTurnUI(color){
    const c = colorKey(color);
    if (turnDot) turnDot.dataset.color = c;
    if (chipDot) chipDot.dataset.color = c;
    setText(turnName, c.toUpperCase());
    setText(chipTurn, c.toUpperCase());
  }

  // ---------- Board + Game State ----------
  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const COLORS = ["red","blue","green","yellow"];

  const gameState = {
    pieces: [], // [{id,color,nodeId}]
    selectedPieceId: null,

    barricades: [],
    barricadesMax: 15,
    barricadesSeed: 777,

    lights: {
      active: [],
      collectedByColor: { red:0, blue:0, green:0, yellow:0 },
      totalCollected: 0,
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: 123456789
    },

    diceValue: 6,

    turn: { index: 0 }, // 0..3
    jokers: { // counts per color
      red:   { reroll:2, allcolors:2, double:2, move_barricade:2, pass_barricade:2 },
      blue:  { reroll:2, allcolors:2, double:2, move_barricade:2, pass_barricade:2 },
      green: { reroll:2, allcolors:2, double:2, move_barricade:2, pass_barricade:2 },
      yellow:{ reroll:2, allcolors:2, double:2, move_barricade:2, pass_barricade:2 }
    }
  };

  const JOKER_META = [
    { key:"reroll", label:"Neu‑Wurf", icon:"🎲" },
    { key:"allcolors", label:"Alle Farben", icon:"🌈" },
    { key:"double", label:"Doppelwurf", icon:"✨" },
    { key:"move_barricade", label:"Barikade versetzen", icon:"🧱" },
    { key:"pass_barricade", label:"Durch Barikade laufen", icon:"🚪" },
  ];

  function currentTurnColor(){
    return COLORS[gameState.turn.index % COLORS.length];
  }

  // ---------- View (Pan/Zoom) ----------
  const view = { x: 0, y: 0, s: 1 };
  let isPanning = false;
  let panPointerId = null;
  let startPan = { x:0, y:0, vx:0, vy:0 };

  function applyView(){
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    if (hudZoom) setText(hudZoom, `${Math.round(view.s*100)}%`);
  }

  function fitToBoard(){
    // compute bounds of nodes in "board space"
    const xs = [];
    const ys = [];
    for (const n of nodeById.values()){
      if (typeof n.x === "number" && typeof n.y === "number"){
        xs.push(n.x); ys.push(n.y);
      }
    }
    if (!xs.length){ view.x = 0; view.y = 0; view.s = 1; applyView(); return; }

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const pad = 120; // in screen px

    const s = Math.min((vw - pad) / spanX, (vh - pad) / spanY);
    view.s = clamp(s, 0.25, 2.5);

    // center
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    view.x = vw/2 - cx * view.s;
    view.y = vh/2 - cy * view.s;

    applyView();
  }

  function resetView(){
    view.x = 0; view.y = 0; view.s = 1;
    applyView();
    fitToBoard();
  }

  function zoomAt(screenX, screenY, factor){
    const rect = viewport.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;

    const oldS = view.s;
    const newS = clamp(oldS * factor, 0.25, 3.0);

    // world coords under pointer before zoom
    const wx = (x - view.x) / oldS;
    const wy = (y - view.y) / oldS;

    view.s = newS;
    view.x = x - wx * newS;
    view.y = y - wy * newS;

    applyView();
  }

  // pointer pan
  viewport.addEventListener("pointerdown", (e) => {
    // only left button (mouse) or touch/pen
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isPanning = true;
    panPointerId = e.pointerId;
    viewport.setPointerCapture(panPointerId);

    startPan = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
  }, { passive: false });

  viewport.addEventListener("pointermove", (e) => {
    if (!isPanning || e.pointerId !== panPointerId) return;
    const dx = e.clientX - startPan.x;
    const dy = e.clientY - startPan.y;
    view.x = startPan.vx + dx;
    view.y = startPan.vy + dy;
    applyView();
  }, { passive: false });

  viewport.addEventListener("pointerup", (e) => {
    if (e.pointerId === panPointerId){
      isPanning = false;
      panPointerId = null;
    }
  });

  viewport.addEventListener("pointercancel", (e) => {
    if (e.pointerId === panPointerId){
      isPanning = false;
      panPointerId = null;
    }
  });

  // wheel zoom
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // pinch zoom (two touches)
  let pinch = null; // {d0,s0,cx,cy}
  function dist(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }
  function center(a,b){ return { x:(a.clientX+b.clientX)/2, y:(a.clientY+b.clientY)/2 }; }

  viewport.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2){
      pinch = { d0: dist(e.touches[0], e.touches[1]), s0: view.s, c: center(e.touches[0], e.touches[1]) };
    }
  }, { passive: false });

  viewport.addEventListener("touchmove", (e) => {
    if (pinch && e.touches.length === 2){
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const c = center(e.touches[0], e.touches[1]);
      const factor = d / Math.max(10, pinch.d0);
      const target = clamp(pinch.s0 * factor, 0.25, 3.0);

      // zoom around current pinch center (use c)
      const rect = viewport.getBoundingClientRect();
      const x = c.x - rect.left;
      const y = c.y - rect.top;

      const oldS = view.s;
      const wx = (x - view.x) / oldS;
      const wy = (y - view.y) / oldS;

      view.s = target;
      view.x = x - wx * target;
      view.y = y - wy * target;
      applyView();
    }
  }, { passive: false });

  viewport.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) pinch = null;
  });

  // ---------- Board loading ----------
  async function loadBoard(){
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache:"no-store" });
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
    for (const e of (board.edges || [])){
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

  function canonEdgeKey(a,b){ return (a < b) ? `${a}|${b}` : `${b}|${a}`; }

  function gateLabel(gate){
    if (!gate) return "";
    if (gate.mode === "exact") return `🔒 🎲=${gate.value}`;
    if (gate.mode === "range") return `🔒 🎲 ${gate.min}–${gate.max}`;
    return "🔒 🎲 ?";
  }

  function toPoint(n){
    const x = (typeof n.x === "number") ? n.x : 100;
    const y = (typeof n.y === "number") ? n.y : 100;
    return { x, y };
  }

  function renderEdges(){
    edgesSvg.innerHTML = "";
    const rendered = new Set();
    for (const e of (board.edges || [])){
      const a = String(e.from), b = String(e.to);
      const key = canonEdgeKey(a,b);
      if (rendered.has(key)) continue;
      rendered.add(key);

      const na = nodeById.get(a), nb = nodeById.get(b);
      if (!na || !nb) continue;
      const A = toPoint(na), B = toPoint(nb);

      const g = document.createElementNS("http://www.w3.org/2000/svg","g");
      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1", A.x); line.setAttribute("y1", A.y);
      line.setAttribute("x2", B.x); line.setAttribute("y2", B.y);
      line.classList.add("edge");
      if (e.gate) line.classList.add("gated");
      g.appendChild(line);

      if (e.gate){
        const midX = (A.x+B.x)/2;
        const midY = (A.y+B.y)/2;
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
        t.setAttribute("text-anchor","middle");
        t.setAttribute("dominant-baseline","middle");
        t.classList.add("gateLabelText");
        t.textContent = txt;

        g.appendChild(bg); g.appendChild(t);
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
    if (t === "start"){
      cls.push(`start-${colorKey(n.color)}`);
    }
    if (t === "light_start" || t === "light_spawn") cls.push("lightfield");
    if (t === "barricade_fixed") cls.push("barricade-fixed");
    if (gameState.lights.active.includes(String(n.id))) cls.push("activeLight");
    if (gameState.barricades.includes(String(n.id))) cls.push("dynamicBarricade");
    return cls.join(" ");
  }

  function renderNodes(){
    for (const n of nodeById.values()){
      const p = toPoint(n);
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
    const c = colorKey(color);
    if (c === "red") return "rgba(255,90,106,.95)";
    if (c === "blue") return "rgba(90,162,255,.95)";
    if (c === "green") return "rgba(46,229,157,.95)";
    if (c === "yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.85)";
  }

  function renderTokens(){
    // clear
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const tokens = nodeEl.querySelector(".tokens");
      if (tokens) tokens.innerHTML = "";
      nodeEl.classList.remove("selectedNode");
    }

    const selectedPiece = gameState.pieces.find(p => p.id === gameState.selectedPieceId) || null;

    const byNode = new Map();
    for (const p of gameState.pieces){
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

      if (selectedPiece && String(selectedPiece.nodeId) === nid){
        nodeEl.classList.add("selectedNode");
      }
    }

    // refresh node classes (lights/barricades)
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))){
      const id = nodeEl.dataset.id;
      const n = nodeById.get(String(id));
      if (!n) continue;
      nodeEl.className = nodeCssClasses(n);
    }
  }

  function renderHud(){
    setText(hudDice, gameState.diceValue);
    setText(hudActiveLights, gameState.lights.active.length);
    setText(hudLightTotal, gameState.lights.totalCollected);
    setText(hudLightGoal, gameState.lights.globalGoal);
  }

  function renderJokers(){
    if (!jokerTableBody) return;
    const c = currentTurnColor();
    const inv = gameState.jokers[c] || {};
    const rows = JOKER_META.map((j, idx) => {
      const n = Number(inv[j.key] ?? 0);
      return `<tr>
        <td>${escapeHtml(j.icon)} <span class="muted">Joker ${idx+1}</span> – ${escapeHtml(j.label)}</td>
        <td class="right"><span class="pill">${n}</span></td>
      </tr>`;
    }).join("");
    setHTML(jokerTableBody, rows);
  }

  function renderAll(){
    clearStage();
    renderEdges();
    renderNodes();
    renderHud();
    renderJokers();
    resetView();
  }

  // ---------- Game Init ----------
  function findAnyNormalNodeId(){
    for (const n of nodeById.values()){
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
    for (const n of nodeById.values()){
      if (String(n.type || "").toLowerCase() === "start"){
        const c = colorKey(n.color);
        startsByColor[c].push(String(n.id));
      }
    }

    const pieces = [];
    for (const color of COLORS){
      const startList = startsByColor[color];
      const startNodeId = startList[0] || findAnyNormalNodeId() || findAnyNodeId();
      for (let i=1;i<=5;i++){
        pieces.push({ id:`${color}_${i}`, color, nodeId: startNodeId });
      }
    }
    gameState.pieces = pieces;
    gameState.selectedPieceId = pieces[0]?.id || null;
  }

  function initLightsFromBoard(){
    const initial = [];
    for (const n of nodeById.values()){
      if (String(n.type || "").toLowerCase() === "light_start") initial.push(String(n.id));
    }
    Rules.initLights(board, gameState, {
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: (Date.now() >>> 0),
      initialActiveNodeIds: initial
    });

    if (gameState.lights.active.length === 0){
      Rules.spawnOneLightOnRandomFreeNormal(board, gameState, Rules.mulberry32(gameState.lights.seed));
    }
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

    if (isNodeBlockedByBarricade(toId)) return { ok:false, reason:"Ziel ist durch Barikade blockiert." };
    if (isNodeOccupiedByAnyPiece(toId)) return { ok:false, reason:"Ziel ist besetzt." };
    return { ok:true, reason:"OK" };
  }

  function moveSelectedPieceTo(nodeId){
    const piece = getSelectedPiece();
    if (!piece) return;

    const from = String(piece.nodeId);
    const to = String(nodeId);

    const check = canMoveOneStep(from, to, gameState.diceValue);
    if (!check.ok){ setStatus(check.reason, "warn"); return; }

    piece.nodeId = to;

    const res = Rules.onPieceArrived(board, gameState, piece.color, to);
    if (res.picked){
      if (res.spawned){
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
    if (!piece){ setStatus("Keine Figur ausgewählt.", "warn"); return; }

    // optional: enforce current turn color selection
    const turnC = currentTurnColor();
    if (colorKey(piece.color) !== turnC){
      setStatus(`Du bist ${turnC.toUpperCase()} am Zug.`, "warn");
      return;
    }
    moveSelectedPieceTo(nodeId);
  }

  // ---------- Buttons ----------
  function syncDiceFromInput(){
    if (!diceValueInp) return;
    gameState.diceValue = clampInt(diceValueInp.value, 1, 6);
    diceValueInp.value = String(gameState.diceValue);
    renderHud();
  }

  function rollDice(){
    const v = clampInt(1 + Math.floor(Math.random() * 6), 1, 6);
    gameState.diceValue = v;
    if (diceValueInp) diceValueInp.value = String(v);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${v}`, "good");
  }

  function spawnRandomBarricade(){
    const rng = Rules.mulberry32((gameState.barricadesSeed ?? 999) >>> 0);
    const placed = Rules.spawnBarricadeOnRandomFreeNormal(board, gameState, rng);
    gameState.barricadesSeed = ((gameState.barricadesSeed ?? 999) + 1) >>> 0;
    if (!placed){ setStatus("Keine Barikade platzierbar (keine freien normalen Felder / max erreicht).", "warn"); return; }
    setStatus(`🧱 Barikade gespawnt auf ${placed}`, "good");
    renderTokens();
  }

  function forceSpawnLight(){
    const rng = Rules.mulberry32((gameState.lights.seed ?? 123) >>> 0);
    const placed = Rules.spawnOneLightOnRandomFreeNormal(board, gameState, rng);
    gameState.lights.seed = ((gameState.lights.seed ?? 123) + 1) >>> 0;
    if (!placed){ setStatus("Kein Licht platzierbar (keine freien normalen Felder).", "warn"); return; }
    setStatus(`💡 Test: Licht gespawnt auf ${placed}`, "good");
    renderTokens(); renderHud();
  }

  function prevTurn(){
    gameState.turn.index = (gameState.turn.index + COLORS.length - 1) % COLORS.length;
    setTurnUI(currentTurnColor());
    renderJokers();
    setStatus(`Am Zug: ${currentTurnColor().toUpperCase()}`, "good");
  }

  function nextTurn(){
    gameState.turn.index = (gameState.turn.index + 1) % COLORS.length;
    setTurnUI(currentTurnColor());
    renderJokers();
    setStatus(`Am Zug: ${currentTurnColor().toUpperCase()}`, "good");
  }

  // ---------- Save/Load ----------
  const LS_KEY = "lichtarena_offline_save_la4";

  function saveLocal(){
    const payload = {
      v: "la4",
      gameState: {
        pieces: gameState.pieces,
        selectedPieceId: gameState.selectedPieceId,
        barricades: gameState.barricades,
        barricadesMax: gameState.barricadesMax,
        barricadesSeed: gameState.barricadesSeed,
        lights: gameState.lights,
        diceValue: gameState.diceValue,
        turn: gameState.turn,
        jokers: gameState.jokers
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
      const gs = payload?.gameState;
      if (!gs) throw new Error("bad save");

      gameState.pieces = Array.isArray(gs.pieces) ? gs.pieces : gameState.pieces;
      gameState.selectedPieceId = gs.selectedPieceId ?? gameState.selectedPieceId;

      gameState.barricades = Array.isArray(gs.barricades) ? gs.barricades : [];
      gameState.barricadesMax = typeof gs.barricadesMax === "number" ? gs.barricadesMax : 15;
      gameState.barricadesSeed = typeof gs.barricadesSeed === "number" ? gs.barricadesSeed : 777;

      if (gs.lights && typeof gs.lights === "object"){
        gameState.lights = gs.lights;
        if (!Array.isArray(gameState.lights.active)) gameState.lights.active = [];
      }

      gameState.diceValue = typeof gs.diceValue === "number" ? gs.diceValue : 6;
      if (diceValueInp) diceValueInp.value = String(clampInt(gameState.diceValue,1,6));

      if (gs.turn && typeof gs.turn.index === "number") gameState.turn.index = gs.turn.index;
      if (gs.jokers && typeof gs.jokers === "object") gameState.jokers = gs.jokers;

      setTurnUI(currentTurnColor());
      renderAll();
      setStatus("✅ Save geladen.", "good");
    }catch(e){
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Lines toggle ----------
  let linesOn = true;
  function toggleLines(){
    linesOn = !linesOn;
    edgesSvg.style.display = linesOn ? "" : "none";
    if (btnToggleLines) btnToggleLines.textContent = linesOn ? "Linien: AN" : "Linien: AUS";
  }

  // ---------- Start ----------
  async function start(){
    try{
      setStatus("Lade Board…", "warn");

      board = await loadBoard();
      buildNodeMap();
      buildAdjacency();

      setText(hudBoardName, board?.meta?.name ? String(board.meta.name) : "unbenannt");
      setStatus(`Bereit. Nodes: ${(board.nodes||[]).length} • Edges: ${(board.edges||[]).length}`, "good");

      // reset game state (keep jokers/turn as is)
      gameState.pieces = [];
      gameState.selectedPieceId = null;
      gameState.barricades = [];
      syncDiceFromInput();

      initPiecesFromStartNodes();
      initLightsFromBoard();

      setTurnUI(currentTurnColor());
      renderAll();

      setStatus(`Bereit. Start‑Lichter aktiv: ${gameState.lights.active.length}`, "good");
    }catch(e){
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  // ---------- Wire events safely ----------
  function on(el, ev, fn){
    if (el) el.addEventListener(ev, fn);
  }

  on(btnFit, "click", fitToBoard);
  on(btnZoomOut, "click", () => zoomAt(viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2, 0.92));
  on(btnZoomIn, "click", () => zoomAt(viewport.getBoundingClientRect().left + viewport.clientWidth/2, viewport.getBoundingClientRect().top + viewport.clientHeight/2, 1.08));
  on(btnResetView, "click", resetView);
  on(btnToggleLines, "click", toggleLines);

  on(btnRestart, "click", start);
  on(btnSave, "click", saveLocal);
  on(btnLoad, "click", loadLocal);

  on(btnPrevTurn, "click", prevTurn);
  on(btnNextTurn, "click", nextTurn);

  on(btnRoll, "click", rollDice);
  on(diceValueInp, "input", syncDiceFromInput);
  on(diceValueInp, "change", syncDiceFromInput);

  on(btnSpawnBarricade, "click", spawnRandomBarricade);
  on(btnClearDynamicBarricades, "click", () => { gameState.barricades = []; renderTokens(); setStatus("Dynamische Barikaden gelöscht.", "good"); });
  on(btnForceSpawnLight, "click", forceSpawnLight);

  // Stop click-through on viewport background (avoid accidental moves while panning)
  viewport.addEventListener("click", (e) => {
    // if user clicked empty space, do nothing
  });

  // kick off
  start();
})();
