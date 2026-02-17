/* lichtarena_client.js
   Lichtarena – Offline Client (modern & tablet-stabil)
   - lädt ./lichtarena_board_1.json (separat, Barikade-board.json bleibt unberührt)
   - rendert Nodes/Edges
   - Pan/Zoom per Pointer Events (touch-action:none) -> kein "weißes" Rubberbanding / kein Layout-Zerfall
   - UI: Turn + Joker Tabelle
*/
(() => {
  "use strict";

  const BOARD_URL = "./lichtarena_board_1.json";

  // ---------- Helpers ----------
  function $(id){ return document.getElementById(id); }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function clampInt(val, min, max){
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return clamp(n, min, max);
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[c]));
  }

  // ---------- RULES API ----------
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    console.error("Rules missing (game_rules_lights_barricades.js).");
  }

  // ---------- State ----------
  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const COLORS = ["red","blue","green","yellow"];
  const JOKER_DEFS = [
    { id:1, name:"Neu-Wurf", icon:"🎲" },
    { id:2, name:"Alle Farben", icon:"🌈" },
    { id:3, name:"Doppelwurf", icon:"➕" },
    { id:4, name:"Barikade versetzen", icon:"🧱" },
    { id:5, name:"Durch Barikade laufen", icon:"🚶" },
  ];

  const gameState = {
    pieces: [],                 // [{id,color,nodeId}]
    selectedPieceId: null,
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
    diceValue: 6,
    turnColor: "red",
    jokersByColor: {
      red:   {1:2,2:2,3:2,4:2,5:2},
      blue:  {1:2,2:2,3:2,4:2,5:2},
      green: {1:2,2:2,3:2,4:2,5:2},
      yellow:{1:2,2:2,3:2,4:2,5:2},
    }
  };

  // ---------- DOM refs (filled on init) ----------
  const dom = {};

  function setStatus(text, kind="good"){
    if (!dom.statusLine) return;
    const cls = (kind==="bad") ? "bad" : (kind==="warn") ? "warn" : "good";
    dom.statusLine.innerHTML = `Status: <span class="${cls}">${escapeHtml(text)}</span>`;
  }

  // ---------- Board load ----------
  async function loadBoard(){
    const url = `${BOARD_URL}?v=${Date.now()}`; // cache-bust
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden: ${BOARD_URL} (HTTP ${res.status})`);
    return await res.json();
  }

  function buildNodeMap(){
    nodeById = new Map();
    for (const n of (board?.nodes || [])) nodeById.set(String(n.id), n);
  }

  function buildAdjacency(){
    adjacency = new Map();
    const add = (a,b,gate) => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a).push({ to:b, gate: gate || null });
    };
    for (const e of (board?.edges || [])) {
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      // IMPORTANT: Board ist aktuell ungerichtet -> beide Richtungen
      // (Später: wenn du edges als gerichtet speichern willst: hier nur add(a,b) lassen)
      add(a,b,e.gate);
      add(b,a,e.gate);
    }
  }

  // ---------- Pan/Zoom (world transform) ----------
  const view = {
    scale: 1,
    tx: 0,
    ty: 0,
    minScale: 0.35,
    maxScale: 2.6,

    // pointer handling
    pointers: new Map(), // id -> {x,y}
    start: null,         // {scale, tx, ty, midX, midY, dist}
    showLines: true,
  };

  function applyWorldTransform(){
    if (!dom.world) return;
    dom.world.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`;
    if (dom.hudZoom) dom.hudZoom.textContent = `${Math.round(view.scale*100)}%`;
  }

  function screenToWorld(x,y){
    // inverse transform: world = (screen - translate) / scale
    return { x: (x - view.tx) / view.scale, y: (y - view.ty) / view.scale };
  }

  function fitToBoard(){
    if (!board || !dom.viewport) return;
    const W = dom.viewport.clientWidth;
    const H = dom.viewport.clientHeight;
    const pad = 70;

    const xs=[], ys=[];
    for (const n of nodeById.values()){
      if (typeof n.x==="number" && typeof n.y==="number"){
        xs.push(n.x); ys.push(n.y);
      }
    }
    if (!xs.length) {
      view.scale = 1; view.tx = pad; view.ty = pad;
      applyWorldTransform();
      return;
    }
    const minX=Math.min(...xs), maxX=Math.max(...xs);
    const minY=Math.min(...ys), maxY=Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const scale = clamp(Math.min((W - pad*2)/spanX, (H - pad*2)/spanY), view.minScale, view.maxScale);
    view.scale = scale;

    // center
    const bx = (minX + maxX)/2;
    const by = (minY + maxY)/2;
    view.tx = W/2 - bx*scale;
    view.ty = H/2 - by*scale;

    applyWorldTransform();
  }

  function resetView(){
    view.scale = 1;
    view.tx = 0;
    view.ty = 0;
    fitToBoard();
  }

  function zoomAt(screenX, screenY, newScale){
    newScale = clamp(newScale, view.minScale, view.maxScale);
    const before = screenToWorld(screenX, screenY);
    view.scale = newScale;
    // keep the world point under the cursor in place
    view.tx = screenX - before.x * view.scale;
    view.ty = screenY - before.y * view.scale;
    applyWorldTransform();
  }

  function attachPanZoom(){
    const el = dom.viewport;
    if (!el) return;

    // prevent browser gestures / rubberband
    const prevent = (e) => { e.preventDefault(); };
    el.addEventListener("touchmove", prevent, { passive:false });

    el.addEventListener("pointerdown", (e) => {
      el.setPointerCapture(e.pointerId);
      view.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

      if (view.pointers.size === 1){
        const p = view.pointers.values().next().value;
        view.start = { scale:view.scale, tx:view.tx, ty:view.ty, midX:p.x, midY:p.y, dist:0 };
      } else if (view.pointers.size === 2){
        const ps = Array.from(view.pointers.values());
        const midX = (ps[0].x + ps[1].x)/2;
        const midY = (ps[0].y + ps[1].y)/2;
        const dist = Math.hypot(ps[0].x-ps[1].x, ps[0].y-ps[1].y);
        view.start = { scale:view.scale, tx:view.tx, ty:view.ty, midX, midY, dist };
      }
    });

    el.addEventListener("pointermove", (e) => {
      if (!view.pointers.has(e.pointerId)) return;
      view.pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

      if (!view.start) return;

      if (view.pointers.size === 1){
        const p = view.pointers.values().next().value;
        const dx = p.x - view.start.midX;
        const dy = p.y - view.start.midY;
        view.tx = view.start.tx + dx;
        view.ty = view.start.ty + dy;
        applyWorldTransform();
      } else if (view.pointers.size === 2){
        const ps = Array.from(view.pointers.values());
        const midX = (ps[0].x + ps[1].x)/2;
        const midY = (ps[0].y + ps[1].y)/2;
        const dist = Math.hypot(ps[0].x-ps[1].x, ps[0].y-ps[1].y);
        const scaleFactor = (view.start.dist > 0) ? (dist / view.start.dist) : 1;

        const newScale = clamp(view.start.scale * scaleFactor, view.minScale, view.maxScale);

        // zoom around the start midpoint (stable pinch)
        zoomAt(view.start.midX, view.start.midY, newScale);

        // then pan by midpoint movement
        view.tx += (midX - view.start.midX);
        view.ty += (midY - view.start.midY);
        applyWorldTransform();
      }
    });

    const endPointer = (e) => {
      view.pointers.delete(e.pointerId);
      if (view.pointers.size === 0) view.start = null;
      else {
        // rebase start for remaining pointer
        const p = view.pointers.values().next().value;
        view.start = { scale:view.scale, tx:view.tx, ty:view.ty, midX:p.x, midY:p.y, dist:0 };
      }
    };
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);

    // mouse wheel zoom
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = -e.deltaY;
      const factor = delta > 0 ? 1.08 : 0.92;
      zoomAt(e.clientX, e.clientY, view.scale * factor);
    }, { passive:false });
  }

  // ---------- Rendering ----------
  function clearStage(){
    if (dom.edgesSvg) dom.edgesSvg.innerHTML = "";
    if (dom.stage){
      for (const el of Array.from(dom.stage.querySelectorAll(".node"))) el.remove();
    }
  }

  function colorToCss(color){
    const c = String(color || "").toLowerCase();
    if (c === "red") return "rgba(255,90,106,.95)";
    if (c === "blue") return "rgba(90,162,255,.95)";
    if (c === "green") return "rgba(46,229,157,.95)";
    if (c === "yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.85)";
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
      const c = String(n.color || "").toLowerCase();
      cls.push(`start-${c || "red"}`);
    }
    if (t === "light_start" || t === "light_spawn") cls.push("lightfield");
    if (t === "barricade_fixed") cls.push("barricade-fixed");
    if (gameState.lights.active.includes(String(n.id))) cls.push("activeLight");
    if (gameState.barricades.includes(String(n.id))) cls.push("dynamicBarricade");
    return cls.join(" ");
  }

  function renderEdges(){
    if (!dom.edgesSvg) return;
    dom.edgesSvg.innerHTML = "";
    dom.edgesSvg.style.opacity = view.showLines ? "1" : "0";

    const rendered = new Set();
    for (const e of (board?.edges || [])){
      const a = String(e.from), b = String(e.to);
      const key = (a < b) ? `${a}|${b}` : `${b}|${a}`;
      if (rendered.has(key)) continue;
      rendered.add(key);

      const na = nodeById.get(a), nb = nodeById.get(b);
      if (!na || !nb) continue;

      const line = document.createElementNS("http://www.w3.org/2000/svg","line");
      line.setAttribute("x1", na.x);
      line.setAttribute("y1", na.y);
      line.setAttribute("x2", nb.x);
      line.setAttribute("y2", nb.y);
      line.classList.add("edge");
      if (e.gate) line.classList.add("gated");
      dom.edgesSvg.appendChild(line);
    }
  }

  function renderNodes(){
    if (!dom.stage) return;
    for (const n of nodeById.values()){
      const el = document.createElement("div");
      el.className = nodeCssClasses(n);
      el.style.left = `${n.x}px`;
      el.style.top = `${n.y}px`;
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

      dom.stage.appendChild(el);
    }
    renderTokens();
  }

  function renderTokens(){
    if (!dom.stage) return;

    // clear tokens
    for (const nodeEl of Array.from(dom.stage.querySelectorAll(".node"))){
      const tokens = nodeEl.querySelector(".tokens");
      if (tokens) tokens.innerHTML = "";
      nodeEl.classList.remove("selectedNode");
    }

    const selectedPiece = gameState.pieces.find(p => p.id === gameState.selectedPieceId) || null;

    // group by nodeId
    const byNode = new Map();
    for (const p of gameState.pieces){
      const nid = String(p.nodeId);
      if (!byNode.has(nid)) byNode.set(nid, []);
      byNode.get(nid).push(p);
    }

    for (const [nid, pieces] of byNode.entries()){
      const nodeEl = dom.stage.querySelector(`.node[data-id="${CSS.escape(nid)}"]`);
      if (!nodeEl) continue;
      const tokens = nodeEl.querySelector(".tokens");
      if (!tokens) continue;

      for (const p of pieces.slice(0, 5)){
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
    for (const nodeEl of Array.from(dom.stage.querySelectorAll(".node"))){
      const id = nodeEl.dataset.id;
      const n = nodeById.get(String(id));
      if (!n) continue;
      nodeEl.className = nodeCssClasses(n);
    }
  }

  function renderHud(){
    if (dom.hudDice) dom.hudDice.textContent = String(gameState.diceValue);
    if (dom.diceValue) dom.diceValue.value = String(gameState.diceValue);
    if (dom.hudActiveLights) dom.hudActiveLights.textContent = String(gameState.lights.active.length);
    if (dom.hudLightTotal) dom.hudLightTotal.textContent = String(gameState.lights.totalCollected);
    if (dom.hudLightGoal) dom.hudLightGoal.textContent = String(gameState.lights.globalGoal);

    renderTurnUi();
    renderJokerTable();
  }

  function renderAll(){
    clearStage();
    renderEdges();
    renderNodes();
    renderHud();
    // ensure it fits after render
    fitToBoard();
  }

  // ---------- Game init ----------
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
        const c = String(n.color || "").toLowerCase();
        if (startsByColor[c]) startsByColor[c].push(String(n.id));
      }
    }

    const pieces = [];
    for (const color of COLORS){
      const starts = startsByColor[color];
      const startNodeId = starts[0] || findAnyNormalNodeId() || findAnyNodeId();
      for (let i=1;i<=5;i++){
        pieces.push({ id:`${color}_${i}`, color, nodeId:startNodeId });
      }
    }
    gameState.pieces = pieces;
    gameState.selectedPieceId = pieces[0]?.id || null;
  }

  function initLightsFromBoard(){
    const initial = [];
    for (const n of nodeById.values()){
      const t = String(n.type || "").toLowerCase();
      if (t === "light_start") initial.push(String(n.id));
    }

    if (Rules?.initLights){
      Rules.initLights(board, gameState, {
        globalGoal: 5,
        spawnAfterCollect: true,
        seed: (Date.now() >>> 0),
        initialActiveNodeIds: initial
      });
      if (gameState.lights.active.length === 0 && Rules.spawnOneLightOnRandomFreeNormal){
        Rules.spawnOneLightOnRandomFreeNormal(board, gameState, Rules.mulberry32(gameState.lights.seed));
      }
    } else {
      // fail-safe if Rules not loaded
      gameState.lights.active = initial.slice();
    }
  }

  // ---------- Turn + Joker UI ----------
  function setTurn(color){
    gameState.turnColor = String(color).toLowerCase();
    if (!COLORS.includes(gameState.turnColor)) gameState.turnColor = "red";
    renderTurnUi();
    renderJokerTable();
  }

  function renderTurnUi(){
    const c = gameState.turnColor;
    if (dom.turnName) dom.turnName.textContent = c.toUpperCase();
    if (dom.chipTurn) dom.chipTurn.textContent = c.toUpperCase();

    const setDot = (el) => {
      if (!el) return;
      el.classList.remove("red","blue","green","yellow");
      el.classList.add(c);
    };
    setDot(dom.turnDot);
    setDot(dom.chipDot);
  }

  function renderJokerTable(){
    if (!dom.jokerTableBody) return;
    const c = gameState.turnColor;
    const counts = gameState.jokersByColor[c] || {};
    dom.jokerTableBody.innerHTML = "";

    for (const j of JOKER_DEFS){
      const tr = document.createElement("tr");
      const tdName = document.createElement("td");
      const tdCount = document.createElement("td");

      const wrap = document.createElement("div");
      wrap.className = "la-jname";
      const badge = document.createElement("span");
      badge.className = "la-badge";
      badge.textContent = String(j.id);
      const label = document.createElement("span");
      label.textContent = `${j.icon} ${j.name}`;

      wrap.appendChild(badge);
      wrap.appendChild(label);
      tdName.appendChild(wrap);

      tdCount.textContent = String(counts[j.id] ?? 0);

      tr.appendChild(tdName);
      tr.appendChild(tdCount);
      dom.jokerTableBody.appendChild(tr);
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
    if (!check.ok){
      setStatus(check.reason, "warn");
      return;
    }

    piece.nodeId = to;

    if (Rules?.onPieceArrived){
      const res = Rules.onPieceArrived(board, gameState, piece.color, to);
      if (res?.picked){
        if (res.spawned) setStatus(`💡 Licht eingesammelt! Neues Licht gespawnt auf ${res.spawned}.`, "good");
        else setStatus(`💡 Licht eingesammelt! (${res.total}/${res.goal})`, "good");
      } else {
        setStatus(`Zug: ${piece.id} → ${to}`, "good");
      }
    } else {
      setStatus(`Zug: ${piece.id} → ${to}`, "good");
    }

    renderTokens();
    renderHud();
  }

  function onNodeClicked(nodeId){
    const piece = getSelectedPiece();
    if (!piece){
      setStatus("Keine Figur ausgewählt.", "warn");
      return;
    }
    moveSelectedPieceTo(nodeId);
  }

  // ---------- Events ----------
  function spawnRandomBarricade(){
    if (!Rules?.mulberry32 || !Rules?.spawnBarricadeOnRandomFreeNormal) return;
    const rng = Rules.mulberry32((gameState.barricadesSeed ?? 999) >>> 0);
    const placed = Rules.spawnBarricadeOnRandomFreeNormal(board, gameState, rng);
    gameState.barricadesSeed = ((gameState.barricadesSeed ?? 999) + 1) >>> 0;

    if (!placed){
      setStatus("Keine Barikade platzierbar (keine freien normalen Felder / max erreicht).", "warn");
      return;
    }
    setStatus(`🧱 Barikade gespawnt auf ${placed}`, "good");
    renderTokens();
  }

  function forceSpawnLight(){
    if (!Rules?.mulberry32 || !Rules?.spawnOneLightOnRandomFreeNormal) return;
    const rng = Rules.mulberry32((gameState.lights.seed ?? 123) >>> 0);
    const placed = Rules.spawnOneLightOnRandomFreeNormal(board, gameState, rng);
    gameState.lights.seed = ((gameState.lights.seed ?? 123) + 1) >>> 0;
    if (!placed){
      setStatus("Kein Licht platzierbar (keine freien normalen Felder).", "warn");
      return;
    }
    setStatus(`💡 Test: Licht gespawnt auf ${placed}`, "good");
    renderTokens();
    renderHud();
  }

  // ---------- Dice ----------
  function syncDiceFromInput(){
    gameState.diceValue = clampInt(dom.diceValue?.value ?? 6, 1, 6);
    if (dom.diceValue) dom.diceValue.value = String(gameState.diceValue);
    renderHud();
  }
  function rollDice(){
    const v = clampInt(1 + Math.floor(Math.random()*6), 1, 6);
    gameState.diceValue = v;
    if (dom.diceValue) dom.diceValue.value = String(v);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${v}`, "good");
  }

  // ---------- Save/Load ----------
  const LS_KEY = "lichtarena_offline_save_v2";

  function saveLocal(){
    try{
      const payload = {
        gameState: {
          pieces: gameState.pieces,
          selectedPieceId: gameState.selectedPieceId,
          barricades: gameState.barricades,
          barricadesMax: gameState.barricadesMax,
          barricadesSeed: gameState.barricadesSeed,
          lights: gameState.lights,
          diceValue: gameState.diceValue,
          turnColor: gameState.turnColor,
          jokersByColor: gameState.jokersByColor,
        }
      };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
      setStatus("✅ Gespeichert (LocalStorage).", "good");
    }catch(e){
      console.error(e);
      setStatus("Save fehlgeschlagen.", "bad");
    }
  }

  function loadLocal(){
    const raw = localStorage.getItem(LS_KEY);
    if (!raw){ setStatus("Kein Save gefunden.", "warn"); return; }
    try{
      const payload = JSON.parse(raw);
      const gs = payload?.gameState;
      if (!gs) throw new Error("bad save");

      if (Array.isArray(gs.pieces)) gameState.pieces = gs.pieces;
      if (typeof gs.selectedPieceId === "string") gameState.selectedPieceId = gs.selectedPieceId;
      if (Array.isArray(gs.barricades)) gameState.barricades = gs.barricades;
      if (typeof gs.barricadesMax === "number") gameState.barricadesMax = gs.barricadesMax;
      if (typeof gs.barricadesSeed === "number") gameState.barricadesSeed = gs.barricadesSeed;

      if (gs.lights && typeof gs.lights === "object") gameState.lights = gs.lights;
      if (typeof gs.diceValue === "number") gameState.diceValue = clampInt(gs.diceValue, 1, 6);
      if (typeof gs.turnColor === "string") gameState.turnColor = gs.turnColor;
      if (gs.jokersByColor && typeof gs.jokersByColor === "object") gameState.jokersByColor = gs.jokersByColor;

      renderAll();
      setStatus("✅ Save geladen.", "good");
    }catch(e){
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Wire UI ----------
  function wireUi(){
    // buttons
    dom.btnRoll?.addEventListener("click", rollDice);
    dom.diceValue?.addEventListener("change", syncDiceFromInput);
    dom.diceValue?.addEventListener("input", syncDiceFromInput);

    dom.btnSpawnBarricade?.addEventListener("click", spawnRandomBarricade);
    dom.btnClearDynamicBarricades?.addEventListener("click", () => {
      gameState.barricades = [];
      setStatus("Dynamische Barikaden gelöscht.", "good");
      renderTokens();
    });
    dom.btnForceSpawnLight?.addEventListener("click", forceSpawnLight);

    dom.btnSave?.addEventListener("click", saveLocal);
    dom.btnLoad?.addEventListener("click", loadLocal);

    dom.btnRestart?.addEventListener("click", async () => {
      setStatus("Board wird neu geladen…", "warn");
      await start();
    });

    // turn
    dom.btnNextTurn?.addEventListener("click", () => {
      const idx = COLORS.indexOf(gameState.turnColor);
      setTurn(COLORS[(idx + 1 + COLORS.length) % COLORS.length]);
    });
    dom.btnPrevTurn?.addEventListener("click", () => {
      const idx = COLORS.indexOf(gameState.turnColor);
      setTurn(COLORS[(idx - 1 + COLORS.length) % COLORS.length]);
    });

    // view controls
    dom.btnFit?.addEventListener("click", () => fitToBoard());
    dom.btnResetView?.addEventListener("click", () => resetView());
    dom.btnZoomIn?.addEventListener("click", () => zoomAt(dom.viewport.clientWidth/2, dom.viewport.clientHeight/2, view.scale*1.12));
    dom.btnZoomOut?.addEventListener("click", () => zoomAt(dom.viewport.clientWidth/2, dom.viewport.clientHeight/2, view.scale*0.88));
    dom.btnToggleLines?.addEventListener("click", () => {
      view.showLines = !view.showLines;
      dom.btnToggleLines.textContent = view.showLines ? "Linien: AN" : "Linien: AUS";
      renderEdges();
    });

    // keep fit on resize/orientation changes
    window.addEventListener("resize", () => {
      // do not reset, just keep current center-ish by fitting again
      fitToBoard();
    }, { passive:true });

    attachPanZoom();
  }

  // ---------- Start ----------
  async function start(){
    try{
      board = await loadBoard();
      buildNodeMap();
      buildAdjacency();

      // init state
      syncDiceFromInput();
      initPiecesFromStartNodes();
      initLightsFromBoard();

      // render
      renderAll();

      const bname = board?.meta?.name ? String(board.meta.name) : "(ohne Name)";
      setStatus(`Bereit. Board: ${bname} • Start-Lichter: ${gameState.lights.active.length}`, "good");
    }catch(e){
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  function initDom(){
    // fill dom refs (safe)
    dom.stage = $("stage");
    dom.edgesSvg = $("edgesSvg");
    dom.statusLine = $("statusLine");

    dom.viewport = $("viewport");
    dom.world = $("world");

    dom.btnRoll = $("btnRoll");
    dom.diceValue = $("diceValue");
    dom.hudDice = $("hudDice");

    dom.hudActiveLights = $("hudActiveLights");
    dom.hudLightTotal = $("hudLightTotal");
    dom.hudLightGoal = $("hudLightGoal");

    dom.btnForceSpawnLight = $("btnForceSpawnLight");
    dom.btnSpawnBarricade = $("btnSpawnBarricade");
    dom.btnClearDynamicBarricades = $("btnClearDynamicBarricades");

    dom.btnRestart = $("btnRestart");
    dom.btnSave = $("btnSave");
    dom.btnLoad = $("btnLoad");

    dom.btnFit = $("btnFit");
    dom.btnZoomOut = $("btnZoomOut");
    dom.btnZoomIn = $("btnZoomIn");
    dom.btnResetView = $("btnResetView");
    dom.btnToggleLines = $("btnToggleLines");
    dom.hudZoom = $("hudZoom");

    dom.btnPrevTurn = $("btnPrevTurn");
    dom.btnNextTurn = $("btnNextTurn");
    dom.turnDot = $("turnDot");
    dom.turnName = $("turnName");

    dom.chipTurn = $("chipTurn");
    dom.chipDot = $("chipDot");

    dom.jokerTableBody = $("jokerTableBody");
  }

  // boot when DOM ready (prevents null addEventListener errors on GitHub pages)
  window.addEventListener("DOMContentLoaded", () => {
    initDom();
    wireUi();
    start();
  });

})();
