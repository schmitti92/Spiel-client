/* Lichtarena Client – Engine v1 (STABLE)
   Ziel: Kein Crash bei UI-Änderungen, klare Architektur, Offline-first.
   Modus: Offline lokal (Online später möglich).
*/
(() => {
  "use strict";

  // ============================================================
  // Helpers
  // ============================================================
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  const now = () => performance.now();

  const $ = (id) => document.getElementById(id);
  const setText = (el, v) => { if (el) el.textContent = String(v); };
  const setHtml = (el, v) => { if (el) el.innerHTML = String(v); };
  const safeClear = (el) => { if (el) el.innerHTML = ""; };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ============================================================
  // UI Contract (IDs)
  // ============================================================
  function resolveUI() {
    return {
      // header pills
      pillMode: $("pillMode"),
      pillBoard: $("pillBoard"),
      pillRule: $("pillRule"),
      pillTurn: $("pillTurn"),
      btnToggleUI: $("btnToggleUI"),

      // game controls
      hudPlayer: $("hudPlayer"),
      hudDice: $("hudDice"),
      hudHint: $("hudHint"),
      btnRoll: $("btnRoll"),
      btnEndTurn: $("btnEndTurn"),

      // lights + players panel
      hudActiveLights: $("hudActiveLights"),
      hudGlobal: $("hudGlobal"),
      hudGoal: $("hudGoal"),
      playersPanel: $("playersPanel"),

      // jokers
      jokerTable: $("jokerTable"),

      // view
      btnFit: $("btnFit"),
      btnResetView: $("btnResetView"),
      btnToggleLines: $("btnToggleLines"),

      // local
      btnRestart: $("btnRestart"),
      btnSave: $("btnSave"),
      btnLoad: $("btnLoad"),
      statusLine: $("statusLine"),

      // board
      layout: $("layout"),
      side: $("side"),
      boardShell: $("boardShell"),
      stage: $("stage"),
      edgesSvg: $("edgesSvg"),

      // wheel modal
      wheelModal: $("wheelModal"),
      wheelCanvas: $("wheelCanvas"),
      wheelResult: $("wheelResult"),
      btnWheelClose: $("btnWheelClose"),

      // done modal
      doneModal: $("doneModal"),
      btnDoneClose: $("btnDoneClose"),
      btnGoBoard2: $("btnGoBoard2"),
    };
  }

  function setStatus(ui, text, cls) {
    if (!ui.statusLine) return;
    setHtml(ui.statusLine, `Status: <span class="${cls}">${escapeHtml(text)}</span>`);
  }

  // ============================================================
  // Engine State
  // ============================================================
  const JOKER_TYPES = [
    { key: "choose", label: "🎯 Choose" },
    { key: "sum", label: "➕ Summe" },
    { key: "allcolors", label: "🌈 Alle Farben" },
    { key: "barricade", label: "🧱 Barikade" },
    { key: "reroll", label: "🔁 Neu-Wurf" },
  ];

  const STORAGE_KEY = "lichtarena_save_v1";

  const state = {
    board: null,
    byId: new Map(),
    neighbors: new Map(),
    edges: [],
    ui: null,

    // camera/view
    view: { x: 40, y: 40, s: 1 },
    showLines: false,

    // gameplay
    players: [],
    turnIndex: 0,
    rolled: false,
    dice: 0,
    selectedPiece: null,  // { pieceIndex }
    reachable: new Set(),

    // lights & barricades
    gameState: {
      lights: {
        active: [],
        totalCollected: 0,
        globalGoal: 5,
        spawnAfterCollect: true,
        collectedByColor: { red:0, blue:0, green:0, yellow:0 }
      },
      barricades: [],
    },

    // wheel
    wheel: { spinning: false, startT: 0, dur: 5000, result: null },

    // runtime
    needsRender: true,
  };

  // ============================================================
  // Board Loading + Graph
  // ============================================================
  async function loadBoard(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Board load failed: ${res.status}`);
    return await res.json();
  }

  function buildIndex(board) {
    state.byId.clear();
    for (const n of board.nodes || []) state.byId.set(String(n.id), n);

    state.edges = (board.edges || []).map(e => {
      const a = String(e.from), b = String(e.to);
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      return { from: a, to: b, key };
    });

    state.neighbors = new Map();
    const add = (a, b) => {
      if (!state.neighbors.has(a)) state.neighbors.set(a, []);
      state.neighbors.get(a).push(b);
    };
    for (const e of state.edges) {
      add(e.from, e.to);
      add(e.to, e.from);
    }
  }

  function nodeType(id) {
    const n = state.byId.get(String(id));
    return n && n.type ? String(n.type).toLowerCase() : "normal";
  }

  function isBlockedNode(nodeId) {
    return state.gameState.barricades.includes(String(nodeId));
  }

  function initPlayersFromBoard(board) {
    const metaPlayers = (board.meta && board.meta.players) ? board.meta.players : [
      { color: "red", pieces: 4 },
      { color: "blue", pieces: 4 },
      { color: "green", pieces: 4 },
      { color: "yellow", pieces: 4 },
    ];

    state.players = metaPlayers.map(mp => {
      const color = String(mp.color || "").toLowerCase();
      const starts = (board.nodes || []).filter(n => String(n.type || "").toLowerCase() === "start" && String(n.color || "").toLowerCase() === color);
      starts.sort((a,b) => (a.x-b.x) || (a.y-b.y));
      const count = Math.max(1, Number(mp.pieces || 4));

      const pieces = [];
      for (let i=0;i<count;i++){
        const home = starts[i % Math.max(1, starts.length)];
        const homeId = home ? String(home.id) : "";
        pieces.push({
          id: `${color}_${i}`,
          nodeId: homeId,
          homeId,
          alive: true,
        });
      }

      const jokers = {};
      for (const jt of JOKER_TYPES) jokers[jt.key] = 2;

      return { color, pieces, jokers };
    });

    state.turnIndex = 0;
    state.rolled = false;
    state.dice = 0;
    state.selectedPiece = null;
    state.reachable = new Set();
  }

  function initLightsFromBoard(board) {
    const Rules = window.GameRulesLightsBarricades;
    const meta = board.meta || {};
    const lr = meta.lightRule || { globalGoal: 5, spawnAfterCollect: true };

    state.gameState.lights.active = [];
    state.gameState.lights.totalCollected = 0;
    state.gameState.lights.globalGoal = Number(lr.globalGoal || 5);
    state.gameState.lights.spawnAfterCollect = !!lr.spawnAfterCollect;
    state.gameState.lights.collectedByColor = { red:0, blue:0, green:0, yellow:0 };

    const initial = (board.nodes || [])
      .filter(n => ["lightfield","light"].includes(String(n.type || "").toLowerCase()))
      .map(n => String(n.id));

    if (Rules && typeof Rules.initLights === "function") {
      const pieces = [];
      for (const p of state.players) for (const pc of p.pieces) pieces.push({ nodeId: pc.nodeId });
      state.gameState.pieces = pieces;
      Rules.initLights(board, state.gameState, {
        globalGoal: state.gameState.lights.globalGoal,
        spawnAfterCollect: state.gameState.lights.spawnAfterCollect,
        initialActiveNodeIds: initial,
      });
    } else {
      state.gameState.lights.active = initial.slice();
    }
  }

  // ============================================================
  // Movement / Reachable (edge not twice)
  // ============================================================
  function computeReachableFrom(startId, steps) {
    const start = String(startId);
    const out = new Set();
    if (!start || steps <= 0) return out;

    const dfs = (nodeId, remaining, usedEdges) => {
      if (remaining === 0) {
        out.add(nodeId);
        return;
      }
      const ns = state.neighbors.get(nodeId) || [];
      for (const to of ns) {
        const a = nodeId, b = to;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        if (usedEdges.has(key)) continue;
        if (isBlockedNode(to)) continue;
        usedEdges.add(key);
        dfs(to, remaining - 1, usedEdges);
        usedEdges.delete(key);
      }
    };

    dfs(start, steps, new Set());
    out.delete(start);
    return out;
  }

  function findOwnPieceAt(nodeId, color) {
    const id = String(nodeId);
    const pl = state.players[state.turnIndex];
    if (!pl || pl.color !== color) return null;
    for (let i=0;i<pl.pieces.length;i++) {
      const pc = pl.pieces[i];
      if (pc.alive && String(pc.nodeId) === id) return { pieceIndex: i };
    }
    return null;
  }

  function findAnyPieceAt(nodeId) {
    const id = String(nodeId);
    for (let pi=0; pi<state.players.length; pi++) {
      const pl = state.players[pi];
      for (let i=0;i<pl.pieces.length;i++) {
        const pc = pl.pieces[i];
        if (pc.alive && String(pc.nodeId) === id) return { pIndex: pi, pieceIndex: i };
      }
    }
    return null;
  }

  // ============================================================
  // Rendering
  // ============================================================
  let worldLayer = null;

  function ensureWorld(ui) {
    if (!ui.stage) return null;
    if (worldLayer && worldLayer.parentElement === ui.stage) return worldLayer;
    worldLayer = document.createElement("div");
    worldLayer.id = "worldLayer";
    worldLayer.style.position = "absolute";
    worldLayer.style.inset = "0";
    worldLayer.style.pointerEvents = "none";
    ui.stage.appendChild(worldLayer);
    return worldLayer;
  }

  function colorToCss(color) {
    const c = String(color || "").toLowerCase();
    if (c === "red") return "rgba(255,90,106,1)";
    if (c === "blue") return "rgba(90,162,255,1)";
    if (c === "green") return "rgba(46,229,157,1)";
    if (c === "yellow") return "rgba(255,210,80,1)";
    return "rgba(255,255,255,0.9)";
  }

  function screenPos(node) {
    return {
      x: state.view.x + node.x * state.view.s,
      y: state.view.y + node.y * state.view.s,
    };
  }

  function renderEdges(ui) {
    if (!ui.edgesSvg) return;
    const svg = ui.edgesSvg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!state.showLines) return;

    for (const e of state.edges) {
      const a = state.byId.get(e.from);
      const b = state.byId.get(e.to);
      if (!a || !b) continue;
      const pa = screenPos(a), pb = screenPos(b);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(pa.x));
      line.setAttribute("y1", String(pa.y));
      line.setAttribute("x2", String(pb.x));
      line.setAttribute("y2", String(pb.y));
      line.setAttribute("class", "edgeLine");
      svg.appendChild(line);
    }
  }

  function renderNodes(ui) {
    const layer = ensureWorld(ui);
    if (!layer) return;
    safeClear(layer);

    for (const n of state.byId.values()) {
      const el = document.createElement("div");
      el.className = "node";
      const t = nodeType(n.id);
      if (t === "lightfield" || t === "light") el.classList.add("light");
      if (t === "start") el.classList.add(`start-${String(n.color||"").toLowerCase()}`);
      if (state.reachable.has(String(n.id))) el.classList.add("reachable");

      const p = screenPos(n);
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.pointerEvents = "auto";

      const stack = document.createElement("div");
      stack.className = "tokenStack";
      el.appendChild(stack);

      // barricade
      if (isBlockedNode(n.id)) {
        const b = document.createElement("div");
        b.className = "token big";
        b.style.background = "rgba(180,180,200,0.95)";
        b.style.borderColor = "rgba(255,255,255,0.35)";
        b.title = "Barikade";
        stack.appendChild(b);
      }

      // light
      if (state.gameState.lights?.active?.includes(String(n.id))) {
        const l = document.createElement("div");
        l.className = "token big";
        l.style.background = "rgba(244,200,74,0.95)";
        l.style.borderColor = "rgba(255,255,255,0.35)";
        l.title = "Licht";
        stack.appendChild(l);
      }

      // pieces
      for (const pl of state.players) {
        for (const pc of pl.pieces) {
          if (pc.alive && String(pc.nodeId) === String(n.id)) {
            const tok = document.createElement("div");
            tok.className = "token";
            tok.style.background = colorToCss(pl.color);
            tok.title = `Figur ${pl.color}`;
            stack.appendChild(tok);
          }
        }
      }

      el.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onNodeClicked(String(n.id));
      }, { passive: false });

      layer.appendChild(el);
    }
  }

  function renderAll() {
    const ui = state.ui;
    if (!ui) return;
    renderEdges(ui);
    renderNodes(ui);
    state.needsRender = false;
  }

  // ============================================================
  // HUD
  // ============================================================
  function updateHUD() {
    const ui = state.ui;
    if (!ui) return;

    const cur = state.players[state.turnIndex];
    const turn = cur ? cur.color.toUpperCase() : "–";

    setText(ui.pillMode, "Modus: Offline lokal");
    setText(ui.pillBoard, `Board: ${(state.board?.meta?.name || "–")}`);
    setText(ui.pillRule, `Regel: Sammle ${state.gameState.lights?.globalGoal ?? 5} Lichter global → Board 2`);
    setText(ui.pillTurn, `Am Zug: ${turn}`);

    setText(ui.hudPlayer, turn);
    setText(ui.hudDice, state.rolled ? String(state.dice) : "–");
    setText(ui.hudActiveLights, String(state.gameState.lights?.active?.length ?? 0));
    setText(ui.hudGlobal, String(state.gameState.lights?.totalCollected ?? 0));
    setText(ui.hudGoal, String(state.gameState.lights?.globalGoal ?? 5));

    if (ui.btnToggleLines) setText(ui.btnToggleLines, `Linien: ${state.showLines ? "AN" : "AUS"}`);

    // players panel
    if (ui.playersPanel) {
      safeClear(ui.playersPanel);
      for (const pl of state.players) {
        const card = document.createElement("div");
        card.className = "playerCard";

        const left = document.createElement("div");
        left.className = "pcLeft";

        const badge = document.createElement("div");
        badge.className = "badge";
        badge.style.background = colorToCss(pl.color);

        const name = document.createElement("div");
        name.innerHTML = `<div class="pcName">${pl.color.toUpperCase()}</div><div class="pcSub">Lichter: <span class="mono">${state.gameState.lights?.collectedByColor?.[pl.color] ?? 0}</span></div>`;

        left.appendChild(badge);
        left.appendChild(name);

        const right = document.createElement("div");
        right.className = "pcRight";
        right.innerHTML = `<div class="big">${pl.pieces.filter(p=>p.alive).length} Figuren</div><div class="small">${pl === state.players[state.turnIndex] ? "am Zug" : ""}</div>`;

        card.appendChild(left);
        card.appendChild(right);
        ui.playersPanel.appendChild(card);
      }
    }

    // joker table
    if (ui.jokerTable) {
      safeClear(ui.jokerTable);
      const pl = state.players[state.turnIndex];
      for (const jt of JOKER_TYPES) {
        const name = document.createElement("div");
        name.className = "jName";
        name.textContent = jt.label;
        const cnt = document.createElement("div");
        cnt.className = "jCount";
        cnt.textContent = String(pl?.jokers?.[jt.key] ?? 0);
        ui.jokerTable.appendChild(name);
        ui.jokerTable.appendChild(cnt);
      }
    }
  }

  // ============================================================
  // Input / Actions
  // ============================================================
  function clearSelection() {
    state.selectedPiece = null;
    state.reachable = new Set();
  }

  function rollDice() {
    if (state.rolled) return;
    state.dice = randInt(1, 6);
    
    // update 6er-Serie
    const cp = state.turn;
    if(cp && state.sixStreak){
      if(state.dice === 6) state.sixStreak[cp] = (state.sixStreak[cp]||0) + 1;
      else state.sixStreak[cp] = 0;
    }
state.rolled = true;
    updateHUD();
    state.needsRender = true;
  }

  function endTurn() {
    clearSelection();
    state.rolled = false;
    state.dice = 0;
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    updateHUD();
    state.needsRender = true;
  }

  function selectPieceAt(nodeId) {
    const cur = state.players[state.turnIndex];
    if (!cur) return false;

    const hit = findOwnPieceAt(nodeId, cur.color);
    if (!hit) return false;

    state.selectedPiece = hit;

    if (state.rolled && state.dice > 0) {
      const pc = cur.pieces[hit.pieceIndex];
      state.reachable = computeReachableFrom(pc.nodeId, state.dice);
      // cannot end on own pieces
      for (const pc2 of cur.pieces) state.reachable.delete(String(pc2.nodeId));
    } else {
      state.reachable = new Set();
    }

    return true;
  }

  function showDoneModal(on) {
    const ui = state.ui;
    if (!ui?.doneModal) return;
    ui.doneModal.classList.toggle("hidden", !on);
  }

  function showWheelModal(on) {
    const ui = state.ui;
    if (!ui?.wheelModal) return;
    ui.wheelModal.classList.toggle("hidden", !on);
  }

  function giveRandomJokerToCurrent() {
    const cur = state.players[state.turnIndex];
    if (!cur) return null;
    const pick = JOKER_TYPES[randInt(0, JOKER_TYPES.length-1)];
    cur.jokers[pick.key] = (cur.jokers[pick.key] || 0) + 1;
    return pick;
  }

  function startWheelReward() {
    const ui = state.ui;
    if (!ui?.wheelCanvas) {
      giveRandomJokerToCurrent();
      return;
    }
    state.wheel.spinning = true;
    state.wheel.startT = now();
    state.wheel.result = null;
    showWheelModal(true);
    setText(ui.wheelResult, "dreht…");
    state.needsRender = true;
  }

  function moveSelectedTo(targetNodeId) {
    const cur = state.players[state.turnIndex];
    if (!cur || !state.selectedPiece) return false;
    if (!state.rolled || !state.reachable.has(String(targetNodeId))) return false;

    const pc = cur.pieces[state.selectedPiece.pieceIndex];

    // capture?
    const victim = findAnyPieceAt(targetNodeId);
    if (victim && victim.pIndex !== state.turnIndex) {
      const vPl = state.players[victim.pIndex];
      const vPc = vPl.pieces[victim.pieceIndex];
      vPc.nodeId = vPc.homeId;
      startWheelReward();
    }

    pc.nodeId = String(targetNodeId);

    // rules arrival (lights)
    const Rules = window.GameRulesLightsBarricades;
    if (Rules && typeof Rules.onPieceArrived === "function") {
      const pieces = [];
      for (const p of state.players) for (const pcc of p.pieces) pieces.push({ nodeId: pcc.nodeId });
      state.gameState.pieces = pieces;
      Rules.onPieceArrived(state.board, state.gameState, cur.color, pc.nodeId);
    } else {
      const idx = state.gameState.lights.active.indexOf(String(pc.nodeId));
      if (idx >= 0) {
        state.gameState.lights.active.splice(idx,1);
        state.gameState.lights.totalCollected += 1;
        state.gameState.lights.collectedByColor[cur.color] = (state.gameState.lights.collectedByColor[cur.color]||0)+1;
      }
    }

    // board done?
    if ((state.gameState.lights.totalCollected || 0) >= (state.gameState.lights.globalGoal || 5)) {
      showDoneModal(true);
    }

    clearSelection();

    // Auto-turn: after a completed move, the next player is immediately on turn.
    // (Manual 'Zug beenden' button still exists for cases where a player cannot/does not want to move.)
    
    // 6er-Regel: Bei einer 6 darf der Spieler erneut würfeln – ABER 3×6 => zurück zum Start, Zug endet
    const cp = state.turn;
    const streak = (state.sixStreak && cp) ? (state.sixStreak[cp]||0) : 0;

    if(state.dice === 6){
        if(streak >= 3){
            // Strafe: die zuletzt gezogene Figur zurück zum Start
            try{
              const startId = getStartNodeIdForColor(cp);
              if(startId){
                // selectedPieceId ist in dieser Engine der aktuelle Steinindex (pieceIdx)
                // Wir schicken genau den Stein zurück, der eben gezogen wurde.
                const last = state.lastMovedPiece;
                if(last && last.color === cp && typeof last.idx === 'number'){
                  state.pieces[cp][last.idx].pos = startId;
                }
              }
            }catch(_e){}
            // Serie zurücksetzen und Zug beenden
            if(state.sixStreak && cp) state.sixStreak[cp] = 0;
            updateHUD();
            endTurn();
            return;
        }

        // normaler Extra-Wurf
        state.rolled = false;
        state.dice = null;
        updateHUD();
        return;
    }
    endTurn();
return true;
  }

  function onNodeClicked(nodeId) {
    if (state.selectedPiece && state.reachable.has(String(nodeId))) {
      moveSelectedTo(nodeId);
      return;
    }

    if (selectPieceAt(nodeId)) {
      updateHUD();
      state.needsRender = true;
    }
  }

  // ============================================================
  // View Controls
  // ============================================================
  function computeFitCamera() {
    const ui = state.ui;
    const container = ui?.boardShell || ui?.stage || document.body;
    if (!container || !container.getBoundingClientRect) return;

    const rect = container.getBoundingClientRect();
    const pad = 80;

    const xs = [], ys = [];
    for (const n of state.byId.values()) { xs.push(n.x); ys.push(n.y); }
    if (!xs.length) return;

    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);

    const s = Math.min((rect.width - pad*2)/spanX, (rect.height - pad*2)/spanY);
    state.view.s = clamp(s, 0.35, 2.2);

    const cx = (minX + maxX)/2;
    const cy = (minY + maxY)/2;
    state.view.x = rect.width/2 - cx * state.view.s;
    state.view.y = rect.height/2 - cy * state.view.s;

    state.needsRender = true;
  }

  function resetView() {
    state.view = { x: 40, y: 40, s: 1 };
    state.needsRender = true;
  }

  function bindPanZoom(ui) {
    if (!ui.stage) return;

    let panning = false;
    let last = { x:0, y:0 };

    ui.stage.addEventListener("pointerdown", (e) => {
      panning = true;
      last = { x:e.clientX, y:e.clientY };
      ui.stage.setPointerCapture(e.pointerId);
    });

    ui.stage.addEventListener("pointermove", (e) => {
      if (!panning) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x:e.clientX, y:e.clientY };
      state.view.x += dx;
      state.view.y += dy;
      state.needsRender = true;
    });

    ui.stage.addEventListener("pointerup", (e) => {
      panning = false;
      try { ui.stage.releasePointerCapture(e.pointerId); } catch(_){ }
    });

    ui.stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const k = e.deltaY > 0 ? 0.92 : 1.08;
      const rect = ui.stage.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const beforeX = (mx - state.view.x) / state.view.s;
      const beforeY = (my - state.view.y) / state.view.s;

      state.view.s = clamp(state.view.s * k, 0.3, 3.0);

      const afterX = beforeX * state.view.s + state.view.x;
      const afterY = beforeY * state.view.s + state.view.y;

      state.view.x += (mx - afterX);
      state.view.y += (my - afterY);

      state.needsRender = true;
    }, { passive:false });

    // basic pinch zoom
    let pinchActive = false;
    let pinchDist = 0;
    let pinchS = 1;

    ui.stage.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length === 2) {
        pinchActive = true;
        const a = e.touches[0], b = e.touches[1];
        pinchDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchS = state.view.s;
      }
    }, { passive:true });

    ui.stage.addEventListener("touchmove", (e) => {
      if (!pinchActive) return;
      if (e.touches && e.touches.length === 2) {
        const a = e.touches[0], b = e.touches[1];
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const ratio = d / Math.max(1, pinchDist);
        state.view.s = clamp(pinchS * ratio, 0.3, 3.0);
        state.needsRender = true;
      }
    }, { passive:true });

    ui.stage.addEventListener("touchend", (e) => {
      if (!e.touches || e.touches.length < 2) pinchActive = false;
    }, { passive:true });
  }

  // ============================================================
  // Wheel rendering
  // ============================================================
  function renderWheel() {
    const ui = state.ui;
    if (!ui?.wheelCanvas) return;
    if (!state.wheel.spinning) return;

    const ctx = ui.wheelCanvas.getContext("2d");
    const W = ui.wheelCanvas.width, H = ui.wheelCanvas.height;
    const cx = W/2, cy = H/2;
    const r = Math.min(W,H) * 0.42;

    ctx.clearRect(0,0,W,H);

    const slices = JOKER_TYPES.length;
    const ang0 = -Math.PI/2;
    const t = clamp((now() - state.wheel.startT) / state.wheel.dur, 0, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const rot = ease * Math.PI * 10;

    for (let i=0;i<slices;i++) {
      const a1 = ang0 + rot + (i * (Math.PI*2/slices));
      const a2 = ang0 + rot + ((i+1) * (Math.PI*2/slices));
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,a1,a2);
      ctx.closePath();
      ctx.fillStyle = `hsla(${(i*360/slices)},80%,55%,0.95)`;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate((a1+a2)/2);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(10,10,15,0.95)";
      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.fillText(JOKER_TYPES[i].label, r-14, 6);
      ctx.restore();
    }

    // pointer
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 10);
    ctx.lineTo(cx - 14, cy - r + 18);
    ctx.lineTo(cx + 14, cy - r + 18);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fill();

    if (t >= 1 && state.wheel.spinning) {
      state.wheel.spinning = false;
      const pick = giveRandomJokerToCurrent();
      if (pick) setText(ui.wheelResult, `Gewonnen: ${pick.label}`);
      updateHUD();
      setTimeout(() => showWheelModal(false), 700);
    }
  }

  // ============================================================
  // Save / Load
  // ============================================================
  function snapshot() {
    return {
      view: state.view,
      showLines: state.showLines,
      players: state.players,
      turnIndex: state.turnIndex,
      rolled: state.rolled,
      dice: state.dice,
      gameState: state.gameState,
    };
  }

  function restore(snap) {
    if (!snap) return;
    state.view = snap.view || state.view;
    state.showLines = !!snap.showLines;
    state.players = snap.players || state.players;
    state.turnIndex = snap.turnIndex || 0;
    state.rolled = !!snap.rolled;
    state.dice = Number(snap.dice || 0);
    state.gameState = snap.gameState || state.gameState;
    clearSelection();
    updateHUD();
    state.needsRender = true;
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    setStatus(state.ui, "Gespeichert", "good");
  }

  function loadLocal() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { setStatus(state.ui, "Kein Save gefunden", "warn"); return; }
    restore(JSON.parse(raw));
    setStatus(state.ui, "Geladen", "good");
  }

  // ============================================================
  // Reset
  // ============================================================
  async function resetGame() {
    // 6er-Serie pro Spieler: 3×6 => zurück zum Start, Zug endet
    state.sixStreak = {};
    for(const c of state.players){ state.sixStreak[c] = 0; }

    clearSelection();
    state.rolled = false;
    state.dice = 0;
    state.turnIndex = 0;

    initPlayersFromBoard(state.board);
    initLightsFromBoard(state.board);
    state.gameState.barricades = Array.isArray(state.gameState.barricades) ? state.gameState.barricades : [];

    updateHUD();
    computeFitCamera();
    state.needsRender = true;
    setStatus(state.ui, "Bereit", "good");
  }

  // ============================================================
  // Loop
  // ============================================================
  function tick() {
    if (state.needsRender) renderAll();
    renderWheel();
    requestAnimationFrame(tick);
  }

  // ============================================================
  // Startup
  // ============================================================
  async function start() {
    const ui = resolveUI();
    state.ui = ui;

    // basic checks
    const missing = [];
    if (!ui.stage) missing.push("stage");
    if (!ui.boardShell) missing.push("boardShell");
    if (!ui.edgesSvg) missing.push("edgesSvg");
    if (missing.length) setStatus(ui, `UI fehlt: ${missing.join(", ")}`, "bad");

    ui.btnRoll && ui.btnRoll.addEventListener("click", () => rollDice());
    ui.btnEndTurn && ui.btnEndTurn.addEventListener("click", () => endTurn());

    ui.btnFit && ui.btnFit.addEventListener("click", () => computeFitCamera());
    ui.btnResetView && ui.btnResetView.addEventListener("click", () => resetView());
    ui.btnToggleLines && ui.btnToggleLines.addEventListener("click", () => { state.showLines = !state.showLines; updateHUD(); state.needsRender = true; });

    ui.btnRestart && ui.btnRestart.addEventListener("click", () => resetGame());
    ui.btnSave && ui.btnSave.addEventListener("click", () => saveLocal());
    ui.btnLoad && ui.btnLoad.addEventListener("click", () => loadLocal());

    ui.btnWheelClose && ui.btnWheelClose.addEventListener("click", () => showWheelModal(false));
    ui.btnDoneClose && ui.btnDoneClose.addEventListener("click", () => showDoneModal(false));
    ui.btnGoBoard2 && ui.btnGoBoard2.addEventListener("click", () => { showDoneModal(false); setStatus(ui, "Board 2 kommt als nächster Schritt", "warn"); });

    ui.btnToggleUI && ui.btnToggleUI.addEventListener("click", () => {
      const on = ui.layout && !ui.layout.classList.contains("uiHidden");
      ui.layout && ui.layout.classList.toggle("uiHidden", on);
    });

    bindPanZoom(ui);

    try {
      state.board = await loadBoard("lichtarena_board_1.json");
      buildIndex(state.board);
      initPlayersFromBoard(state.board);
      initLightsFromBoard(state.board);
      updateHUD();
      computeFitCamera();
      setStatus(ui, "Board geladen", "good");
    } catch (e) {
      console.error(e);
      setStatus(ui, "Board laden fehlgeschlagen", "bad");
    }

    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
