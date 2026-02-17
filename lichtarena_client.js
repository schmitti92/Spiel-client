/* lichtarena_client.js
   Lichtarena – Offline Client (server-ready Architektur)
   - lädt ./lichtarena_board_1.json
   - rendert Nodes/Edges
   - verwaltet lokalen Game-State (später server-authoritative)
   - robustes Pan/Zoom (Pointer Events) für Tablet/Touch (kein "weißes Rubberbanding")
*/
(() => {
  "use strict";

  const BOARD_URL = "./lichtarena_board_1.json";

  // ---------- DOM (alles optional, damit nichts mehr crasht) ----------
  const $ = (id) => document.getElementById(id);

  const boardPanel = $("boardPanel");
  const boardViewport = $("boardViewport");
  const world = $("world");
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

  const btnToggleLines = $("btnToggleLines");

  const btnFit = $("btnFit");
  const btnZoomIn = $("btnZoomIn");
  const btnZoomOut = $("btnZoomOut");
  const btnResetView = $("btnResetView");
  const zoomPct = $("zoomPct");

  const btnPrevPlayer = $("btnPrevPlayer");
  const btnNextPlayer = $("btnNextPlayer");
  const activeColorLabel = $("activeColorLabel");
  const activeDot = $("activeDot");
  const turnText = $("turnText");
  const turnDot = $("turnDot");

  const jokerTable = $("jokerTable");

  // ---------- RULES ----------
  const Rules = window.GameRulesLightsBarricades;
  if (!Rules) {
    console.error("game_rules_lights_barricades.js fehlt");
  }

  // ---------- State ----------
  let board = null;
  let nodeById = new Map();
  let adjacency = new Map();

  const COLORS = ["red", "blue", "green", "yellow"];

  const gameState = {
    pieces: [], // [{id,color,nodeId}]
    selectedPieceId: null,

    barricades: [],
    barricadesMax: 15,

    lights: {
      active: [],
      collectedByColor: { red: 0, blue: 0, green: 0, yellow: 0 },
      totalCollected: 0,
      globalGoal: 5,
      spawnAfterCollect: true,
      seed: 123456789
    },

    diceValue: 6,

    // Turn
    turnIndex: 0,

    // Jokers (keine Obergrenze)
    jokersByColor: {
      red:   { j1:2, j2:2, j3:2, j4:2, j5:2 },
      blue:  { j1:2, j2:2, j3:2, j4:2, j5:2 },
      green: { j1:2, j2:2, j3:2, j4:2, j5:2 },
      yellow:{ j1:2, j2:2, j3:2, j4:2, j5:2 }
    }
  };

  // ---------- View (Pan/Zoom) ----------
  const view = {
    x: 0,
    y: 0,
    scale: 1,
    minScale: 0.35,
    maxScale: 2.5
  };

  // Board bounds in "world px" after computeTransform placement
  let boardBounds = { minX: 0, minY: 0, maxX: 1, maxY: 1 };

  // ---------- Helpers ----------
  function setStatus(text, kind = "good") {
    const cls = kind === "bad" ? "bad" : kind === "warn" ? "warn" : "good";
    if (!statusLine) return;
    statusLine.innerHTML = `Status: <span class="${cls}"> ${escapeHtml(text)} </span>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function clampInt(val, min, max) {
    const n = Math.round(Number(val));
    if (!Number.isFinite(n)) return min;
    return clamp(n, min, max);
  }

  function colorToCss(color) {
    const c = String(color || "").toLowerCase();
    if (c === "red") return "rgba(255,90,106,.95)";
    if (c === "blue") return "rgba(90,162,255,.95)";
    if (c === "green") return "rgba(46,229,157,.95)";
    if (c === "yellow") return "rgba(255,210,80,.95)";
    return "rgba(255,255,255,.85)";
  }

  function canonEdgeKey(a, b) {
    return (a < b) ? `${a}|${b}` : `${b}|${a}`;
  }

  function gateLabel(gate) {
    if (!gate) return "";
    if (gate.mode === "exact") return `🔒 🎲=${gate.value}`;
    if (gate.mode === "range") return `🔒 🎲 ${gate.min}–${gate.max}`;
    return "🔒 🎲 ?";
  }

  function activeColor() {
    return COLORS[gameState.turnIndex % COLORS.length];
  }

  function setTurn(index) {
    gameState.turnIndex = ((index % COLORS.length) + COLORS.length) % COLORS.length;
    const c = activeColor();
    if (activeColorLabel) activeColorLabel.textContent = c.toUpperCase();
    if (turnText) turnText.textContent = c.toUpperCase();
    if (activeDot) activeDot.className = `dot ${c}`;
    if (turnDot) turnDot.className = `dot ${c}`;
    renderJokers();
  }

  // ---------- Board load ----------
  async function loadBoard() {
    const url = `${BOARD_URL}?v=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Board konnte nicht geladen werden: ${BOARD_URL} (HTTP ${res.status})`);
    return await res.json();
  }

  function buildNodeMap() {
    nodeById = new Map();
    for (const n of (board.nodes || [])) nodeById.set(String(n.id), n);
  }

  // IMPORTANT: Edges werden als gerichtet gespeichert (from -> to). Rückwärts verboten.
  function buildAdjacencyDirected() {
    adjacency = new Map();
    const add = (a, b, gate) => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a).push({ to: b, gate: gate || null });
    };
    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      if (!nodeById.has(a) || !nodeById.has(b)) continue;
      add(a, b, e.gate);
    }
  }

  // ---------- Rendering ----------
  function clearStage() {
    if (edgesSvg) edgesSvg.innerHTML = "";
    if (stage) {
      for (const el of Array.from(stage.querySelectorAll(".node"))) el.remove();
    }
  }

  function computePlacementTransform() {
    // Map board coordinates to stage pixels, with padding
    const pad = 80;
    const W = boardViewport ? boardViewport.clientWidth : 1000;
    const H = boardViewport ? boardViewport.clientHeight : 700;

    const xs = [];
    const ys = [];
    for (const n of nodeById.values()) {
      if (typeof n.x === "number" && typeof n.y === "number") {
        xs.push(n.x); ys.push(n.y);
      }
    }
    if (!xs.length) return { scale: 1, ox: pad, oy: pad };

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
    const ox = pad - minX * scale;
    const oy = pad - minY * scale;
    return { scale, ox, oy };
  }

  function toStagePoint(n, tf) {
    const x = (typeof n.x === "number") ? (n.x * tf.scale + tf.ox) : 100;
    const y = (typeof n.y === "number") ? (n.y * tf.scale + tf.oy) : 100;
    return { x, y };
  }

  function updateBoardBounds(tf) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodeById.values()) {
      const p = toStagePoint(n, tf);
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 1; maxY = 1; }
    // include node size
    const pad = 80;
    boardBounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function renderEdges(tf) {
    if (!edgesSvg) return;
    edgesSvg.innerHTML = "";

    const rendered = new Set();
    for (const e of (board.edges || [])) {
      const a = String(e.from), b = String(e.to);
      const key = canonEdgeKey(a, b);
      if (rendered.has(key)) continue;
      rendered.add(key);

      const na = nodeById.get(a);
      const nb = nodeById.get(b);
      if (!na || !nb) continue;

      const A = toStagePoint(na, tf);
      const B = toStagePoint(nb, tf);

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
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

        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("x", midX - approxW / 2);
        bg.setAttribute("y", midY - approxH / 2);
        bg.setAttribute("width", approxW);
        bg.setAttribute("height", approxH);
        bg.classList.add("gateLabelBg");

        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
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
    if (!stage) return;

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

  function renderTokens() {
    if (!stage) return;

    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))) {
      const tokens = nodeEl.querySelector(".tokens");
      if (tokens) tokens.innerHTML = "";
    }

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

      for (const p of pieces.slice(0, 5)) {
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
    }

    // refresh node classes for light/barricade highlights
    for (const nodeEl of Array.from(stage.querySelectorAll(".node"))) {
      const id = nodeEl.dataset.id;
      const n = nodeById.get(String(id));
      if (!n) continue;
      nodeEl.className = nodeCssClasses(n);
    }
  }

  function renderHud() {
    if (hudDice) hudDice.textContent = String(gameState.diceValue);
    if (hudActiveLights) hudActiveLights.textContent = String(gameState.lights.active.length);
    if (hudLightTotal) hudLightTotal.textContent = String(gameState.lights.totalCollected);
    if (hudLightGoal) hudLightGoal.textContent = String(gameState.lights.globalGoal);
  }

  function renderAll() {
    clearStage();
    const tf = computePlacementTransform();
    updateBoardBounds(tf);
    renderEdges(tf);
    renderNodes(tf);
    renderHud();
    fitView(); // important: initial fit after each render
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

    const pieces = [];
    // pro Farbe 5 Figuren (wie bisher)
    for (const color of COLORS) {
      const startList = startsByColor[color];
      // Wenn du pro Board später weniger Startfelder hast: wir nehmen trotzdem Startfelder reihum.
      for (let i = 1; i <= 5; i++) {
        const startNodeId = startList[(i - 1) % Math.max(1, startList.length)] || findAnyNormalNodeId() || findAnyNodeId();
        pieces.push({ id: `${color}_${i}`, color, nodeId: startNodeId });
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
    if (!Rules) return;

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

  // ---------- Jokers UI ----------
  const JOKERS = [
    { key: "j1", name: "Joker 1 – Neuwurf", short: "Neuwurf" },
    { key: "j2", name: "Joker 2 – Alle Farben", short: "Alle Farben" },
    { key: "j3", name: "Joker 3 – Doppelwurf", short: "Doppelwurf" },
    { key: "j4", name: "Joker 4 – Barikade versetzen", short: "Versetzen" },
    { key: "j5", name: "Joker 5 – Durch Barikade laufen", short: "Durchlaufen" },
  ];

  function renderJokers() {
    if (!jokerTable) return;
    const c = activeColor();
    const inv = gameState.jokersByColor[c] || {};

    const tbody = jokerTable.querySelector("tbody") || jokerTable.appendChild(document.createElement("tbody"));
    tbody.innerHTML = "";

    for (const j of JOKERS) {
      const tr = document.createElement("tr");

      const tdA = document.createElement("td");
      tdA.textContent = j.name;

      const tdB = document.createElement("td");
      tdB.style.textAlign = "right";
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = String(inv[j.key] ?? 0);
      tdB.appendChild(pill);

      tr.appendChild(tdA);
      tr.appendChild(tdB);
      tbody.appendChild(tr);
    }
  }

  // ---------- Movement / Validation ----------
  function selectPiece(pieceId) {
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
    // directed adjacency: only from -> to allowed
    const list = adjacency.get(String(fromId)) || [];
    const link = list.find(x => String(x.to) === String(toId));
    if (!link) return { ok: false, reason: "Nicht verbunden (oder Rückwärts verboten)." };

    if (link.gate) {
      const d = Number(diceValue);
      if (link.gate.mode === "exact") {
        if (d !== Number(link.gate.value)) return { ok: false, reason: `Tor: nur bei exakt ${link.gate.value}.` };
      } else if (link.gate.mode === "range") {
        const mn = Math.min(Number(link.gate.min), Number(link.gate.max));
        const mx = Math.max(Number(link.gate.min), Number(link.gate.max));
        if (d < mn || d > mx) return { ok: false, reason: `Tor: nur bei ${mn}–${mx}.` };
      } else {
        return { ok: false, reason: "Tor: unbekanntes Format." };
      }
    }

    if (isNodeBlockedByBarricade(toId)) return { ok: false, reason: "Ziel ist durch Barikade blockiert." };
    if (isNodeOccupiedByAnyPiece(toId)) return { ok: false, reason: "Ziel ist besetzt." };

    return { ok: true, reason: "OK" };
  }

  function moveSelectedPieceTo(nodeId) {
    const piece = getSelectedPiece();
    if (!piece) return;

    // nur wenn Figur zur aktiven Farbe gehört
    const c = activeColor();
    if (piece.color !== c) {
      setStatus(`Du bist ${c.toUpperCase()} am Zug.`, "warn");
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

    if (Rules) {
      const res = Rules.onPieceArrived(board, gameState, piece.color, to);

      if (res?.picked) {
        if (res.spawned) {
          setStatus(`💡 Licht eingesammelt! Neues Licht gespawnt auf ${res.spawned}.`, "good");
        } else {
          setStatus(`💡 Licht eingesammelt! (${res.total}/${res.goal})`, "good");
        }

        // Wenn globalGoal erreicht -> später Board 2 (hier nur Status)
        if (gameState.lights.totalCollected >= gameState.lights.globalGoal) {
          setStatus(`✅ Ziel erreicht: ${gameState.lights.totalCollected}/${gameState.lights.globalGoal}. (Board 2 kommt als nächstes)`, "good");
        }
      } else {
        setStatus(`Zug: ${piece.id} → ${to}`, "good");
      }
    } else {
      setStatus(`Zug: ${piece.id} → ${to}`, "good");
    }

    renderTokens();
    renderHud();
  }

  function onNodeClicked(nodeId) {
    const piece = getSelectedPiece();
    if (!piece) {
      setStatus("Keine Figur ausgewählt.", "warn");
      return;
    }
    moveSelectedPieceTo(nodeId);
  }

  // ---------- Events (Barricade/Light) ----------
  function spawnRandomBarricade() {
    if (!Rules) return;
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
    if (!Rules) return;
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
  function syncDiceFromInput() {
    if (!diceValueInp) return;
    gameState.diceValue = clampInt(diceValueInp.value, 1, 6);
    diceValueInp.value = String(gameState.diceValue);
    renderHud();
  }

  function rollDice() {
    const v = clampInt(1 + Math.floor(Math.random() * 6), 1, 6);
    gameState.diceValue = v;
    if (diceValueInp) diceValueInp.value = String(v);
    renderHud();
    setStatus(`🎲 Gewürfelt: ${v}`, "good");
  }

  // ---------- Save/Load ----------
  const LS_KEY = "lichtarena_offline_save_v2";

  function saveLocal() {
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
        jokersByColor: gameState.jokersByColor
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
      gameState.barricadesSeed = typeof gs.barricadesSeed === "number" ? gs.barricadesSeed : (Date.now() >>> 0);

      if (gs.lights && typeof gs.lights === "object") {
        gameState.lights = gs.lights;
        if (!Array.isArray(gameState.lights.active)) gameState.lights.active = [];
      }

      gameState.diceValue = typeof gs.diceValue === "number" ? gs.diceValue : 6;
      if (diceValueInp) diceValueInp.value = String(clampInt(gameState.diceValue, 1, 6));
      syncDiceFromInput();

      if (typeof gs.turnIndex === "number") gameState.turnIndex = gs.turnIndex;
      if (gs.jokersByColor) gameState.jokersByColor = gs.jokersByColor;

      renderAll();
      setTurn(gameState.turnIndex);
      setStatus("✅ Save geladen.", "good");
    } catch (e) {
      console.error(e);
      setStatus("Save ist kaputt/ungültig.", "bad");
    }
  }

  // ---------- Lines toggle ----------
  let linesOn = true;
  function setLines(on) {
    linesOn = !!on;
    if (boardPanel) boardPanel.classList.toggle("linesHidden", !linesOn);
    if (btnToggleLines) btnToggleLines.textContent = linesOn ? "Linien: AN" : "Linien: AUS";
  }

  // ---------- Pan/Zoom (Pointer Events, kein Browser-Rubberband) ----------
  const pointers = new Map(); // pointerId -> {x,y}
  let lastPan = null;
  let pinchStart = null;

  function applyView() {
    if (!world) return;
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    if (zoomPct) zoomPct.textContent = `${Math.round(view.scale * 100)}%`;
  }

  function fitView() {
    if (!boardViewport) return;
    const vw = boardViewport.clientWidth;
    const vh = boardViewport.clientHeight;
    const bw = Math.max(1, boardBounds.maxX - boardBounds.minX);
    const bh = Math.max(1, boardBounds.maxY - boardBounds.minY);

    const s = clamp(Math.min(vw / bw, vh / bh) * 0.92, view.minScale, view.maxScale);
    view.scale = s;

    // center bounds
    const cx = (boardBounds.minX + boardBounds.maxX) / 2;
    const cy = (boardBounds.minY + boardBounds.maxY) / 2;

    view.x = (vw / 2) - cx * s;
    view.y = (vh / 2) - cy * s;

    applyView();
  }

  function resetView() {
    view.scale = 1;
    view.x = 0;
    view.y = 0;
    fitView();
  }

  function zoomAt(screenX, screenY, factor) {
    if (!boardViewport) return;
    const rect = boardViewport.getBoundingClientRect();
    const px = screenX - rect.left;
    const py = screenY - rect.top;

    const old = view.scale;
    const next = clamp(old * factor, view.minScale, view.maxScale);
    const k = next / old;

    // keep point under cursor stable:
    view.x = px - (px - view.x) * k;
    view.y = py - (py - view.y) * k;
    view.scale = next;

    applyView();
  }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function onPointerDown(ev) {
    if (!boardViewport) return;
    // only left click / touch
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    boardViewport.setPointerCapture?.(ev.pointerId);

    if (pointers.size === 1) {
      lastPan = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y };
      pinchStart = null;
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchStart = {
        d: dist(pts[0], pts[1]),
        mid: midpoint(pts[0], pts[1]),
        x: view.x, y: view.y, s: view.scale
      };
      lastPan = null;
    }

    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!pointers.has(ev.pointerId)) return;

    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    if (pointers.size === 1 && lastPan) {
      const dx = ev.clientX - lastPan.x;
      const dy = ev.clientY - lastPan.y;
      view.x = lastPan.vx + dx;
      view.y = lastPan.vy + dy;
      applyView();
    } else if (pointers.size === 2 && pinchStart) {
      const pts = Array.from(pointers.values());
      const d2 = dist(pts[0], pts[1]);
      const mid2 = midpoint(pts[0], pts[1]);

      const factor = clamp(d2 / Math.max(1, pinchStart.d), 0.5, 2.0);
      const nextScale = clamp(pinchStart.s * factor, view.minScale, view.maxScale);

      // zoom around midpoint
      const k = nextScale / pinchStart.s;

      view.x = mid2.x - (mid2.x - pinchStart.x) * k;
      view.y = mid2.y - (mid2.y - pinchStart.y) * k;

      // plus pan difference of midpoint (two-finger translate)
      view.x += (mid2.x - pinchStart.mid.x);
      view.y += (mid2.y - pinchStart.mid.y);

      view.scale = nextScale;
      applyView();
    }

    ev.preventDefault();
  }

  function onPointerUp(ev) {
    if (!pointers.has(ev.pointerId)) return;
    pointers.delete(ev.pointerId);

    if (pointers.size === 0) {
      lastPan = null;
      pinchStart = null;
    } else if (pointers.size === 1) {
      // continue with pan from remaining pointer
      const remain = Array.from(pointers.values())[0];
      lastPan = { x: remain.x, y: remain.y, vx: view.x, vy: view.y };
      pinchStart = null;
    } else if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      pinchStart = {
        d: dist(pts[0], pts[1]),
        mid: midpoint(pts[0], pts[1]),
        x: view.x, y: view.y, s: view.scale
      };
      lastPan = null;
    }

    ev.preventDefault();
  }

  function onWheel(ev) {
    if (!boardViewport) return;
    const factor = ev.deltaY > 0 ? 0.9 : 1.1;
    zoomAt(ev.clientX, ev.clientY, factor);
    ev.preventDefault();
  }

  function wirePanZoom() {
    if (!boardViewport) return;

    // Important: prevent browser scroll/zoom
    boardViewport.addEventListener("pointerdown", onPointerDown, { passive: false });
    boardViewport.addEventListener("pointermove", onPointerMove, { passive: false });
    boardViewport.addEventListener("pointerup", onPointerUp, { passive: false });
    boardViewport.addEventListener("pointercancel", onPointerUp, { passive: false });
    boardViewport.addEventListener("wheel", onWheel, { passive: false });

    // Also block touchmove on document while pointer active (Android browser quirks)
    document.addEventListener("touchmove", (e) => {
      if (pointers.size > 0) e.preventDefault();
    }, { passive: false });
  }

  // ---------- Wire UI ----------
  if (btnRoll) btnRoll.addEventListener("click", rollDice);
  if (diceValueInp) {
    diceValueInp.addEventListener("change", syncDiceFromInput);
    diceValueInp.addEventListener("input", syncDiceFromInput);
  }

  if (btnSpawnBarricade) btnSpawnBarricade.addEventListener("click", spawnRandomBarricade);
  if (btnClearDynamicBarricades) btnClearDynamicBarricades.addEventListener("click", () => {
    gameState.barricades = [];
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

  if (btnToggleLines) btnToggleLines.addEventListener("click", () => setLines(!linesOn));

  if (btnFit) btnFit.addEventListener("click", fitView);
  if (btnResetView) btnResetView.addEventListener("click", resetView);
  if (btnZoomIn) btnZoomIn.addEventListener("click", () => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.12));
  if (btnZoomOut) btnZoomOut.addEventListener("click", () => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.88));

  if (btnPrevPlayer) btnPrevPlayer.addEventListener("click", () => setTurn(gameState.turnIndex - 1));
  if (btnNextPlayer) btnNextPlayer.addEventListener("click", () => setTurn(gameState.turnIndex + 1));

  window.addEventListener("resize", () => {
    // Keep view consistent after rotate / resize
    renderAll();
  });

  // ---------- Start ----------
  async function start() {
    try {
      board = await loadBoard();
      buildNodeMap();
      buildAdjacencyDirected();

      // reset state
      gameState.pieces = [];
      gameState.selectedPieceId = null;
      gameState.barricades = [];

      // dice
      syncDiceFromInput();

      // pieces + lights
      initPiecesFromStartNodes();
      initLightsFromBoard();

      // view + render
      renderAll();
      setTurn(gameState.turnIndex);
      setLines(true);

      const bname = board?.meta?.name ? String(board.meta.name) : "(ohne Name)";
      setStatus(`Bereit. Board: ${bname} • Start-Lichter aktiv: ${gameState.lights.active.length}`, "good");
    } catch (e) {
      console.error(e);
      setStatus(String(e?.message || e), "bad");
    }
  }

  // kick off
  wirePanZoom();
  applyView();
  start();
})();
