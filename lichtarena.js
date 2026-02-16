(() => {
  // =========================
  // Helpers
  // =========================
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

  // =========================
  // Canvas
  // =========================
  const canvas = $("c");
  const ctx = canvas.getContext("2d", { alpha: true });

  // =========================
  // UI
  // =========================
  const ui = {
    pCount: $("pCount"),
    turnLabel: $("turnLabel"),
    bCount: $("bCount"),
    playersSel: $("playersSel"),
    log: $("log"),
    lightBadge: $("lightBadge"),
    phaseBadge: $("phaseBadge"),
    scoreBadge: $("scoreBadge"),

    diceVal: $("diceVal"),
    stepsLeft: $("stepsLeft"),
    rollBtn: $("rollBtn"),
    endTurnBtn: $("endTurnBtn"),

    j1: $("j1"),
    j2: $("j2"),
    j3: $("j3"),
    j4: $("j4"),
    j5: $("j5"),
    j5a: $("j5a"),
    giveJ1: $("giveJ1"),
    giveJ2: $("giveJ2"),
    giveJ3: $("giveJ3"),
    giveJ4: $("giveJ4"),
    giveJ5: $("giveJ5"),
    useJ1: $("useJ1"),
    useJ2: $("useJ2"),
    useJ3: $("useJ3"),
    useJ4: $("useJ4"),
    useJ5: $("useJ5"),

    resetBtn: $("resetBtn"),
    nextTurnBtn: $("nextTurnBtn"),

    fitBtn: $("fitBtn"),
    zoomIn: $("zoomIn"),
    zoomOut: $("zoomOut"),
    zoomPct: $("zoomPct"),
  };

  function log(msg) {
    const d = document.createElement("div");
    d.textContent = msg;
    ui.log.appendChild(d);
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  // =========================
  // Event Card Overlay (3s)
  // =========================
  const EVT = {
    el: null,
    titleEl: null,
    textEl: null,
    timer: null,
  };

  function initEventOverlay() {
    EVT.el = $("eventOverlay");
    EVT.titleEl = $("eventTitle");
    EVT.textEl = $("eventText");
  }

  function showEventOverlay(card) {
    if (!EVT.el) initEventOverlay();
    if (!EVT.el) return;
    EVT.titleEl.textContent = `🎴 Ereigniskarte #${card.id}`;
    EVT.textEl.textContent = card.title;
    EVT.el.classList.add("show");

    if (EVT.timer) clearTimeout(EVT.timer);
    EVT.timer = setTimeout(() => {
      EVT.el.classList.remove("show");
    }, 3000);
  }

  // =========================
  // Rules
  // =========================
  const RULES = {
    barricadeMax: 15,
    respawnAfterTurnsPerPlayer: 5,
    spawnWeights: { center: 0.5, mid: 0.3, outer: 0.2 },
    forbidSpawnKinds: new Set(["house", "start"]),
    forbidBarricadeKinds: new Set(["house", "start"]),
    spawnDifferentFromLast: true,
    diceSides: 6,
    piecesPerPlayer: 6,
    startFieldsPerColor: 5,
  };

  // =========================
  // State
  // =========================
  const S = {
    board: null,
    nodes: [],
    edges: [],
    adj: new Map(),
    nodeById: new Map(),
    zoneOf: new Map(),

    lastLight: null,
    light: null,
    barricades: new Set(),

    playerCount: 4,
    players: [],
    turnIndex: 0,

    pieces: [],
    selectedPiece: null,

    phase: "need_roll", // need_roll | need_piece | moving | place_barricade | j2_pick_source | j2_pick_target
    stepsLeft: 0,
    rollValue: null,

    j2Source: null,

    // events
    pendingEvent: false,
    pendingEventPieceId: null,
    pendingEventNodeId: null,
    eventCard: null,

    // optional extra light
    light2: null,
  };

  const COLORS = ["red", "blue", "green", "yellow", "black", "white"];
  // =========================
  // Event deck (22 Karten, immer neu gemischt = 1/22)
  // Reihenfolge am Ereignisfeld:
  // 1) Feld betreten (Event triggert)
  // 2) Barikade platzieren
  // 3) Karte wird aufgedeckt (3s sichtbar)
  // 4) Effekt wird ausgeführt / Joker ins Inventar
  // =========================
  const EVENT_DECK = [
    { id: 1,  title: "Erhalte Joker: Farbwechsel", kind: "give_joker", joker: "j1" },
    { id: 2,  title: "Erhalte Joker: Barikade versetzen", kind: "give_joker", joker: "j2" },
    { id: 3,  title: "Erhalte Joker: Neuwurf", kind: "give_joker", joker: "j3" },
    { id: 4,  title: "Erhalte Joker: Doppelwurf", kind: "give_joker", joker: "j4" },
    { id: 5,  title: "Erhalte Joker: Ignorieren", kind: "give_joker", joker: "j5" },
    { id: 6,  title: "Erhalte Joker: Farbwechsel", kind: "give_joker", joker: "j1" },
    { id: 7,  title: "Erhalte Joker: Barikade versetzen", kind: "give_joker", joker: "j2" },
    { id: 8,  title: "Erhalte Joker: Neuwurf", kind: "give_joker", joker: "j3" },
    { id: 9,  title: "Erhalte Joker: Doppelwurf", kind: "give_joker", joker: "j4" },
    { id: 10, title: "Erhalte Joker: Ignorieren", kind: "give_joker", joker: "j5" },
    { id: 11, title: "Erhalte alle 5 Joker (+1 je Joker)", kind: "give_all_jokers" },
    { id: 12, title: "Alle anderen Spieler erhalten 2 zufällige Joker", kind: "others_get_random_jokers", count: 2 },
    { id: 13, title: "Alle Spielfiguren werden neu gemischt", kind: "shuffle_all_pieces" },
    { id: 14, title: "Startfiguren werden zufällig aufs Brett gespawnt", kind: "scatter_start_pieces" },
    { id: 15, title: "+5 Felder laufen", kind: "extra_steps", steps: 5 },
    { id: 16, title: "+10 Felder laufen", kind: "extra_steps", steps: 10 },
    { id: 17, title: "Tausche Position mit eigener Figur", kind: "swap_with_own" },
    { id: 18, title: "Figur zurück auf Start", kind: "back_to_start" },
    { id: 19, title: "Du verlierst alle Joker", kind: "lose_all_jokers" },
    { id: 20, title: "Klaue 1 Punkt von Mitspieler", kind: "steal_point" },
    { id: 21, title: "Zusätzliches Lichtfeld erscheint", kind: "spawn_extra_light" },
    { id: 22, title: "Spieler mit den wenigsten Punkten erhält 1 Punkt", kind: "lowest_get_point" },
  ];

  function drawRandomEventCard() {
    return EVENT_DECK[Math.floor(Math.random() * EVENT_DECK.length)];
  }


  function currentPlayer() {
    return S.players[S.turnIndex];
  }

  // =========================
  // Camera (Google-Maps-ish)
  // - LMB drag: pan (after small threshold)
  // - Wheel: zoom
  // - Touch: 1 finger pan, 2 finger pinch zoom
  // - Clamp so board can never fully disappear (at least one node stays visible)
  // =========================
  const CAM = {
    scale: 1,
    ox: 0,
    oy: 0,
    minScale: 0.12,
    maxScale: 6,
    autoFit: true,
  };

  const PZ = {
    pointers: new Map(),
    isDown: false,
    isPanning: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    dragThreshold: 7, // px
    pinchStartDist: 0,
    pinchStartScale: 1,
  };

  function fitCamera(viewW, viewH) {
    if (!S.nodes.length) return;
    const pad = 90;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const n of S.nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const sx = (viewW - pad * 2) / bw;
    const sy = (viewH - pad * 2) / bh;
    CAM.scale = clamp(Math.min(sx, sy), CAM.minScale, CAM.maxScale);
    CAM.ox = pad - minX * CAM.scale;
    CAM.oy = pad - minY * CAM.scale;
    CAM.autoFit = false;
    clampPan();
    updateZoomPct();
  }

  function screenToBoard(sx, sy) {
    return { x: (sx - CAM.ox) / CAM.scale, y: (sy - CAM.oy) / CAM.scale };
  }

  function zoomAt(sx, sy, factor) {
    const before = screenToBoard(sx, sy);
    CAM.scale = clamp(CAM.scale * factor, CAM.minScale, CAM.maxScale);
    const after = screenToBoard(sx, sy);
    // keep point under cursor stable
    CAM.ox += (after.x - before.x) * CAM.scale;
    CAM.oy += (after.y - before.y) * CAM.scale;
    CAM.autoFit = false;
    clampPan();
    updateZoomPct();
  }

  function clampPan() {
    // Ensure at least one node stays visible.
    if (!S.nodes.length) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const vis = 34; // margin in px that must still overlap with board bbox

    let minSX = Infinity,
      minSY = Infinity,
      maxSX = -Infinity,
      maxSY = -Infinity;
    for (const n of S.nodes) {
      const sx = n.x * CAM.scale + CAM.ox;
      const sy = n.y * CAM.scale + CAM.oy;
      minSX = Math.min(minSX, sx);
      minSY = Math.min(minSY, sy);
      maxSX = Math.max(maxSX, sx);
      maxSY = Math.max(maxSY, sy);
    }

    // allow panning until bbox still overlaps viewport with 'vis'
    // If bbox is left of viewport entirely, pull it back, etc.
    if (maxSX < vis) CAM.ox += vis - maxSX;
    if (minSX > w - vis) CAM.ox -= minSX - (w - vis);
    if (maxSY < vis) CAM.oy += vis - maxSY;
    if (minSY > h - vis) CAM.oy -= minSY - (h - vis);
  }

  function updateZoomPct() {
    const pct = Math.round(CAM.scale * 100);
    ui.zoomPct.textContent = `${pct}%`;
  }

  // prevent browser double-click zoom jitter
  canvas.addEventListener(
    "dblclick",
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      zoomAt(sx, sy, e.deltaY > 0 ? 0.9 : 1.1);
      draw();
    },
    { passive: false }
  );

  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    PZ.pointers.set(e.pointerId, { x: sx, y: sy, type: e.pointerType });

    if (e.pointerType === "mouse" && e.button !== 0) return; // only left

    // Start a possible pan (becomes real pan after threshold)
    PZ.isDown = true;
    PZ.isPanning = false;
    PZ.downX = sx;
    PZ.downY = sy;
    PZ.lastX = sx;
    PZ.lastY = sy;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!PZ.pointers.has(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const prev = PZ.pointers.get(e.pointerId);
    PZ.pointers.set(e.pointerId, { x: sx, y: sy, type: e.pointerType });

    // Touch: 2-finger pinch zoom + pan
    const touches = [...PZ.pointers.values()].filter((p) => p.type === "touch");
    if (touches.length >= 2) {
      const a = touches[0],
        b = touches[1];
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      // init pinch
      if (!PZ.pinchStartDist) {
        const dx0 = a.x - b.x;
        const dy0 = a.y - b.y;
        PZ.pinchStartDist = Math.hypot(dx0, dy0) || 1;
        PZ.pinchStartScale = CAM.scale;
        PZ.lastX = midX;
        PZ.lastY = midY;
      }

      // pan
      CAM.ox += midX - PZ.lastX;
      CAM.oy += midY - PZ.lastY;
      PZ.lastX = midX;
      PZ.lastY = midY;

      // zoom
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx, dy) || 1;
      const factor = dist / (PZ.pinchStartDist || 1);
      const targetScale = clamp(PZ.pinchStartScale * factor, CAM.minScale, CAM.maxScale);
      const before = screenToBoard(midX, midY);
      CAM.scale = targetScale;
      const after = screenToBoard(midX, midY);
      CAM.ox += (after.x - before.x) * CAM.scale;
      CAM.oy += (after.y - before.y) * CAM.scale;

      CAM.autoFit = false;
      clampPan();
      updateZoomPct();
      draw();
      return;
    }

    // Mouse / single touch pan with threshold
    if (!PZ.isDown) return;

    const dxTotal = sx - PZ.downX;
    const dyTotal = sy - PZ.downY;
    const moved = Math.hypot(dxTotal, dyTotal);

    if (!PZ.isPanning && moved >= PZ.dragThreshold) {
      PZ.isPanning = true;
    }

    if (!PZ.isPanning) return;

    const dxStep = sx - PZ.lastX;
    const dyStep = sy - PZ.lastY;
    PZ.lastX = sx;
    PZ.lastY = sy;

    CAM.ox += dxStep;
    CAM.oy += dyStep;
    CAM.autoFit = false;
    clampPan();
    draw();
  });

  function stopPointer(e) {
    PZ.pointers.delete(e.pointerId);
    const touches = [...PZ.pointers.values()].filter((p) => p.type === "touch");
    if (touches.length < 2) {
      PZ.pinchStartDist = 0;
    }
    // We'll handle tap on pointerup only if NOT panning.
    if (PZ.isDown && e.pointerType !== "touch") {
      // keep state
    }
  }
  canvas.addEventListener("pointercancel", stopPointer);
  canvas.addEventListener("pointerup", (e) => {
    // tap
    const wasPanning = PZ.isPanning;
    PZ.isDown = false;
    PZ.isPanning = false;

    // reset pinch state when last touch ends
    stopPointer(e);

    if (wasPanning) return;

    // treat as click/tap
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    handleBoardTap(sx, sy);
  });

  // =========================
  // Board loading
  // =========================
  async function loadBoard() {
    let res;
    try {
      res = await fetch("board_lichtarena.json?v=la", { cache: "no-store" });
      if (!res.ok) throw new Error("no board_lichtarena.json");
    } catch {
      res = await fetch("board.json?v=la", { cache: "no-store" });
    }
    const raw = await res.json();

    // Normalize to {ui,nodes,edges}
    const b = normalizeBoard(raw);
    S.board = b;

    S.nodes = b.nodes.map((n) => ({
      id: String(n.id),
      kind: String(n.kind || n.type || "normal").toLowerCase(),
      x: Number(n.x ?? 0),
      y: Number(n.y ?? 0),
      color: String(n.color || n.flags?.houseColor || n.flags?.startColor || "").toLowerCase(),
      flags: n.flags || {},
    }));

    S.edges = (b.edges || []).map((e) => ({ a: String(e.a), b: String(e.b) }));

    S.nodeById = new Map(S.nodes.map((n) => [n.id, n]));
    S.adj = new Map();
    for (const n of S.nodes) S.adj.set(n.id, []);
    for (const e of S.edges) {
      if (S.adj.has(e.a) && S.adj.has(e.b)) {
        S.adj.get(e.a).push(e.b);
        S.adj.get(e.b).push(e.a);
      }
    }

    computeZonesPrototype();
  }

  function normalizeBoard(raw) {
    if (!raw) throw new Error("board missing");

    // board-designer-pro schema
    if (raw.meta && raw.meta.tool === "board-designer-pro" && Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
      const nodes = raw.nodes.map((n) => {
        const id = String(n.id);
        const kind = String(n.type || "normal");
        const flags = {
          label: typeof n.label === "string" ? n.label : "",
          specialType: n.specialType || "",
          boostSteps: n.boostSteps == null ? undefined : n.boostSteps,
          eventDeckId: n.eventDeckId || "",
          start: n.type === "start",
          startColor: n.color || "",
        };
        return { id, x: n.x, y: n.y, kind, color: n.color || "", flags };
      });
      const edges = raw.edges.map((e) => ({ a: String(e.a), b: String(e.b) }));
      const ui = { gridSize: raw.grid?.size ?? 30 };
      return { ui, nodes, edges };
    }

    // legacy
    if (Array.isArray(raw.nodes) && Array.isArray(raw.edges)) {
      const nodes = raw.nodes.map((n) => {
        const id = String(n.id ?? n.nodeId ?? n.name);
        const kind = String(n.kind ?? n.type ?? "normal");
        const flags = n.flags ?? {};
        return { ...n, id, kind, flags };
      });
      const edges = raw.edges.map((e) => ({ a: String(e.a ?? e.from), b: String(e.b ?? e.to) }));
      const ui = raw.ui ?? raw.grid ?? {};
      return { ui, nodes, edges };
    }

    throw new Error("unknown board schema");
  }

  function computeZonesPrototype() {
    const pts = S.nodes.filter((n) => n.kind !== "house" && n.kind !== "start");
    const cx = pts.reduce((a, n) => a + n.x, 0) / Math.max(1, pts.length);
    const cy = pts.reduce((a, n) => a + n.y, 0) / Math.max(1, pts.length);
    const dists = pts
      .map((n) => ({ id: n.id, d: Math.hypot(n.x - cx, n.y - cy) }))
      .sort((a, b) => a.d - b.d);
    const n = dists.length;
    const iCenter = Math.floor(n * 0.5);
    const iMid = Math.floor(n * 0.8);
    S.zoneOf = new Map();
    for (let i = 0; i < n; i++) {
      const z = i < iCenter ? "center" : i < iMid ? "mid" : "outer";
      S.zoneOf.set(dists[i].id, z);
    }
  }

  // =========================
  // Players & Pieces
  // =========================
  function resetPlayers() {
    S.players = [];
    for (let i = 0; i < S.playerCount; i++) {
      S.players.push({
        id: i,
        color: COLORS[i],
        score: 0,
        turnsSinceLight: 0,
        jokers: { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0 },
        j5Active: false,
        pendingDouble: false,
        lastRoll: null,
      });
    }
    S.turnIndex = 0;
  }

  function resetPieces() {
    const pieces = [];

    // Collect start fields per color
    const startsByColor = new Map();
    for (const n of S.nodes) {
      if (n.kind === "start") {
        const c = String(n.color || n.flags?.houseColor || n.flags?.startColor || "").toLowerCase();
        if (!startsByColor.has(c)) startsByColor.set(c, []);
        startsByColor.get(c).push(n.id);
      }
    }

    // stable order
    for (const [c, arr] of startsByColor.entries()) {
      arr.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
      startsByColor.set(c, arr);
    }

    for (const p of S.players) {
      const starts = startsByColor.get(p.color) || [];

      // 5 on starts
      for (let i = 0; i < Math.min(RULES.startFieldsPerColor, RULES.piecesPerPlayer); i++) {
        pieces.push({
          id: `pc_${p.color}_${i + 1}`,
          owner: p.id,
          color: p.color,
          nodeId: starts[i] ?? starts[0] ?? pickRandomNormalNodeId(pieces),
        });
      }

      // 6th random (normal field)
      if (RULES.piecesPerPlayer > RULES.startFieldsPerColor) {
        pieces.push({
          id: `pc_${p.color}_${RULES.startFieldsPerColor + 1}`,
          owner: p.id,
          color: p.color,
          nodeId: pickRandomNormalNodeId(pieces),
        });
      }
    }

    S.pieces = pieces;
  }

  function pickRandomNormalNodeId(existingPieces) {
    const occupied = new Set((existingPieces || S.pieces || []).map((pc) => pc.nodeId));
    const arr = S.nodes
      .filter((n) => n.kind === "normal")
      .filter((n) => !occupied.has(n.id))
      .map((n) => n.id);
    if (!arr.length) {
      const fallback = S.nodes
        .filter((n) => !RULES.forbidSpawnKinds.has(n.kind))
        .map((n) => n.id);
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function isStartNode(id) {
    const n = S.nodeById.get(id);
    return !!n && RULES.forbidSpawnKinds.has(n.kind);
  }

  // =========================
  // Light spawn
  // =========================
  function spawnLight(reason) {
    const prev = S.light;
    const pick = weightedPickLightNode(prev);
    S.lastLight = prev;
    S.light = pick;
    for (const pl of S.players) pl.turnsSinceLight = 0;
    log(`✨ Lichtfeld spawnt (${reason}): ${S.light}`);
    syncUI();
    draw();
  }

  function weightedPickLightNode(prevId) {
    const candidates = { center: [], mid: [], outer: [] };
    for (const n of S.nodes) {
      if (RULES.forbidSpawnKinds.has(n.kind)) continue;
      if (RULES.spawnDifferentFromLast && prevId && n.id === prevId) continue;
      const z = S.zoneOf.get(n.id) || "mid";
      candidates[z].push(n.id);
    }
    const zone = pickWeightedZones(candidates);
    const arr = candidates[zone];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function pickWeightedZones(candidates) {
    const opts = [
      { k: "center", w: RULES.spawnWeights.center },
      { k: "mid", w: RULES.spawnWeights.mid },
      { k: "outer", w: RULES.spawnWeights.outer },
    ];
    let z = pickWeighted(opts);
    if (!candidates[z].length) {
      z = opts.map((o) => o.k).find((k) => candidates[k].length) || "mid";
    }
    return z;
  }

  function pickWeighted(items) {
    const total = items.reduce((a, i) => a + i.w, 0);
    let r = Math.random() * total;
    for (const it of items) {
      r -= it.w;
      if (r <= 0) return it.k;
    }
    return items[items.length - 1].k;
  }

  // =========================
  // Turn flow
  // =========================
  function startTurn() {
    S.phase = "need_roll";
    S.selectedPiece = null;
    S.stepsLeft = 0;
    S.rollValue = null;
    syncUI();
    draw();
  }

  function endTurn(reason) {
    const pl = currentPlayer();
    if (pl.j5Active) {
      pl.j5Active = false;
      log(`🃏 Joker 5 endet für ${pl.color}.`);
    }
    pl.pendingDouble = false;
    pl.lastRoll = S.rollValue;

    S.turnIndex = (S.turnIndex + 1) % S.players.length;
    const np = currentPlayer();
    np.turnsSinceLight += 1;

    const all = S.players.every((p) => p.turnsSinceLight >= RULES.respawnAfterTurnsPerPlayer);
    if (all) spawnLight("5-Runden-Regel");

    log(`⏭️ Zugwechsel (${reason}) → ${np.color}`);
    startTurn();
  }

  function rollDice() {
    const pl = currentPlayer();
    if (S.phase !== "need_roll") {
      log("ℹ️ Du hast bereits gewürfelt oder bist mitten im Zug.");
      return;
    }

    const roll1 = randInt(1, RULES.diceSides);
    if (pl.pendingDouble) {
      const roll2 = randInt(1, RULES.diceSides);
      S.rollValue = roll1 + roll2;
      pl.pendingDouble = false;
      log(`🎲 Doppelwurf: ${roll1} + ${roll2} = ${S.rollValue}`);
    } else {
      S.rollValue = roll1;
      log(`🎲 Wurf: ${S.rollValue}`);
    }

    S.stepsLeft = S.rollValue;
    S.phase = "need_piece";
    syncUI();
    draw();
  }

  // =========================
  // Movement (direct like Barikade)
  // Click a reachable destination. We compute shortest path distance.
  // =========================
  function canEnter(nodeId) {
    const pl = currentPlayer();
    if (pl.j5Active) return true;
    return !S.barricades.has(nodeId);
  }

  function isEventNode(nodeId) {
    const n = S.nodeById.get(nodeId);
    const f = n?.flags || {};
    const st = String(f.specialType || "");
    return !!(st === "event" || f.event === true || f.isEvent === true || f.eventDeckId);
  }

    function onReachNode(piece, nodeId) {
    const pl = currentPlayer();

    // scoring: main OR extra light
    if (S.light === nodeId || (S.light2 && S.light2 === nodeId)) {
      const which = (S.light2 && S.light2 === nodeId) ? "Lichtfeld (Extra)" : "Lichtfeld";
      pl.score += 1;
      log(`🏁 Punkt! (${which}) ${pl.color} hat jetzt ${pl.score} Punkte.`);

      if (S.light2 && S.light2 === nodeId) {
        // only respawn the extra light
        S.light2 = weightedPickLightNode(S.light2);
        log(`✨ Extra-Lichtfeld spawnt neu: ${S.light2}`);
      } else {
        spawnLight("Punkt erreicht");
      }

      endTurn("Punkt");
      return true;
    }

    // event -> 1) force barricade placement, then reveal card
    if (isEventNode(nodeId) && S.barricades.size < RULES.barricadeMax) {
      S.pendingEvent = true;
      S.pendingEventPieceId = piece.id;
      S.pendingEventNodeId = nodeId;

      S.phase = "place_barricade";
      log("🎴 Ereignisfeld: 1) Barikade platzieren (klick Feld) → 2) Karte wird aufgedeckt.");
      syncUI();
      draw();
      return true;
    }

    return false;
  }

  function shortestDistance(fromId, toId) {
    if (fromId === toId) return 0;
    const pl = currentPlayer();

    const q = [fromId];
    const dist = new Map([[fromId, 0]]);

    while (q.length) {
      const cur = q.shift();
      const d = dist.get(cur);
      const neigh = S.adj.get(cur) || [];
      for (const nx of neigh) {
        if (dist.has(nx)) continue;
        // You can step onto barricaded nodes only if J5 active.
        if (!pl.j5Active && S.barricades.has(nx)) continue;
        dist.set(nx, d + 1);
        if (nx === toId) return d + 1;
        // small pruning: don't explore beyond remaining steps
        if (d + 1 < S.stepsLeft) q.push(nx);
      }
    }
    return Infinity;
  }

  function tryMoveDirectTo(targetNodeId) {
    if (S.phase !== "moving") return;
    const pl = currentPlayer();
    const piece = S.pieces.find((pc) => pc.id === S.selectedPiece);
    if (!piece) return;

    const from = piece.nodeId;
    const dist = shortestDistance(from, targetNodeId);
    if (!isFinite(dist) || dist === Infinity) {
      log("⛔ Nicht erreichbar (Barikade blockiert oder kein Weg)." + (pl.j5Active ? "" : " (Nur mit Joker 5 überschreitbar)"));
      return;
    }
    if (dist > S.stepsLeft) {
      log(`ℹ️ Zu weit: Distanz ${dist}, aber nur ${S.stepsLeft} Schritte.`);
      return;
    }

    // Move
    piece.nodeId = targetNodeId;
    S.stepsLeft -= dist;
    log(`➡️ ${pl.color} läuft ${dist} Schritte → ${targetNodeId} (Rest: ${S.stepsLeft})`);

    const handled = onReachNode(piece, targetNodeId);
    if (handled) return;

    if (S.stepsLeft <= 0) {
      endTurn("Zug fertig");
      return;
    }

    syncUI();
    draw();
  }

  // =========================
  // Barricades
  // =========================
    function placeBarricade(nodeId) {
    if (S.phase !== "place_barricade") return;

    if (S.barricades.size >= RULES.barricadeMax) {
      log("ℹ️ Max 15 Barikaden erreicht – keine neue Barikade.");
      // even if max reached, continue (event still reveals)
    } else {
      if (isStartNode(nodeId)) {
        log("⛔ Barikaden dürfen nicht auf Startfeldern stehen.");
        return;
      }
      S.barricades.add(nodeId);
      log(
        `🧱 Barikade platziert auf ${nodeId} (${S.barricades.size}/${RULES.barricadeMax})`
      );
    }

    // If this was triggered by an event, reveal + resolve a card BEFORE ending turn
    if (S.pendingEvent) {
      const card = drawRandomEventCard();
      S.eventCard = card;
      S.phase = "event_reveal";

      showEventOverlay(card);
      log(`🎴 Karte gezogen: ${card.title}`);

      // Wait 3 seconds, then resolve
      setTimeout(() => {
        resolveEventCard(card);
      }, 3000);

      syncUI();
      draw();
      return;
    }

    endTurn("Barikade platziert");
  }

  // ---------- Event resolution ----------
  function resolveEventCard(card) {
    // guard: still in event flow
    if (!S.pendingEvent) return;

    const pl = currentPlayer();
    const piece = S.pieces.find((pc) => pc.id === S.pendingEventPieceId) || null;

    // Reset pending event flags now; some cards may set follow-up phases
    S.pendingEvent = false;
    S.pendingEventNodeId = null;

    const give = (jk, n = 1) => {
      pl.jokers[jk] = (pl.jokers[jk] || 0) + n;
      log(`🃏 +${n} ${jk.toUpperCase()} (${pl.color})`);
    };

    const randomJokerKey = () => ["j1", "j2", "j3", "j4", "j5"][Math.floor(Math.random() * 5)];

    switch (card.kind) {
      case "give_joker": {
        give(card.joker, 1);
        break;
      }
      case "give_all_jokers": {
        give("j1", 1); give("j2", 1); give("j3", 1); give("j4", 1); give("j5", 1);
        break;
      }
      case "others_get_random_jokers": {
        for (const op of S.players) {
          if (op.id === pl.id) continue;
          for (let i = 0; i < (card.count || 2); i++) {
            const jk = randomJokerKey();
            op.jokers[jk] = (op.jokers[jk] || 0) + 1;
          }
        }
        log("🎁 Alle anderen Spieler bekommen 2 zufällige Joker.");
        break;
      }
      case "shuffle_all_pieces": {
        shuffleAllPieces();
        log("🔀 Alle Figuren wurden neu gemischt.");
        break;
      }
      case "scatter_start_pieces": {
        scatterStartPieces();
        log("🎯 Startfiguren wurden zufällig aufs Brett gespawnt.");
        break;
      }
      case "extra_steps": {
        if (!piece) break;
        S.selectedPiece = piece.id;
        S.stepsLeft += card.steps || 0;
        S.phase = "moving";
        log(`⚡ Bonus: +${card.steps} Schritte! (Rest: ${S.stepsLeft})`);
        syncUI(); draw();
        return; // do NOT end turn
      }
      case "swap_with_own": {
        if (!piece) break;
        // require a click: select another own piece to swap
        S.phase = "event_swap_select";
        S.eventCard = card;
        S.pendingEventPieceId = piece.id; // reuse as "source"
        log("🔁 Karte: Tausche Position. Klick eine DEINER anderen Figuren zum Tauschen.");
        syncUI(); draw();
        return;
      }
      case "back_to_start": {
        if (!piece) break;
        const startId = getFirstStartForColor(pl.color);
        if (startId) {
          piece.nodeId = startId;
          log("↩️ Figur zurück auf Start.");
        } else {
          log("ℹ️ Kein Startfeld gefunden – Effekt übersprungen.");
        }
        break;
      }
      case "lose_all_jokers": {
        pl.jokers = { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0 };
        pl.j5Active = false;
        pl.pendingDouble = false;
        log("💥 Du verlierst alle Joker.");
        break;
      }
      case "steal_point": {
        const victims = S.players.filter((p) => p.id !== pl.id && p.score > 0);
        if (!victims.length) {
          log("ℹ️ Niemand hat Punkte zum Klauen.");
          break;
        }
        const v = victims[Math.floor(Math.random() * victims.length)];
        v.score -= 1;
        pl.score += 1;
        log(`🧤 Punkt geklaut: ${v.color} -1 / ${pl.color} +1`);
        break;
      }
      case "spawn_extra_light": {
        if (!S.light2) {
          S.light2 = weightedPickLightNode(S.light);
          log(`✨ Extra-Lichtfeld erscheint: ${S.light2}`);
        } else {
          log("✨ Extra-Lichtfeld ist bereits aktiv.");
        }
        break;
      }
      case "lowest_get_point": {
        const min = Math.min(...S.players.map((p) => p.score));
        const lows = S.players.filter((p) => p.score === min);
        const w = lows[Math.floor(Math.random() * lows.length)];
        w.score += 1;
        log(`🏅 Ausgleich: ${w.color} bekommt 1 Punkt.`);
        break;
      }
      default:
        log("ℹ️ Unbekannte Ereigniskarte (ignored).");
    }

    // finish turn after event (standard)
    S.pendingEventPieceId = null;
    S.eventCard = null;
    endTurn("Ereignis");
  }

  function shuffleAllPieces() {
    const ids = pickManyNormalNodeIds(S.pieces.length, true);
    for (let i = 0; i < S.pieces.length; i++) {
      S.pieces[i].nodeId = ids[i] || ids[0];
    }
  }

  function scatterStartPieces() {
    const normalIds = pickManyNormalNodeIds(S.pieces.length, true);
    let idx = 0;
    for (const pc of S.pieces) {
      if (isStartNode(pc.nodeId)) {
        pc.nodeId = normalIds[idx++] || pc.nodeId;
      }
    }
  }

  function pickManyNormalNodeIds(count, allowDuplicates) {
    const normals = S.nodes
      .filter((n) => String(n.kind).toLowerCase() === "normal")
      .map((n) => n.id);

    if (!normals.length) return [pickAnyNonStartNodeId()];

    if (allowDuplicates) {
      const arr = [];
      for (let i = 0; i < count; i++) arr.push(normals[Math.floor(Math.random() * normals.length)]);
      return arr;
    }

    // unique
    const pool = normals.slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  function getFirstStartForColor(color) {
    // Board-Designer: kind="start" + node.color
    const starts = S.nodes
      .filter((n) => String(n.kind).toLowerCase() === "start" && String(n.color || "").toLowerCase() === String(color).toLowerCase())
      .map((n) => n.id);

    // stable sort (numeric if possible)
    starts.sort((a, b) => {
      const na = parseInt(String(a).match(/\d+/)?.[0] || "0", 10);
      const nb = parseInt(String(b).match(/\d+/)?.[0] || "0", 10);
      return na - nb;
    });

    return starts[0] || null;
  }

  // =========================
  // Jokers
  // =========================
  function giveJ(k) {
    const pl = currentPlayer();
    pl.jokers[k] += 1;
    log(`🃏 +1 ${k.toUpperCase()}`);
    syncUI();
  }

  function useJ5() {
    const pl = currentPlayer();
    if (pl.jokers.j5 <= 0) {
      log("🃏 Joker 5 fehlt.");
      return;
    }
    if (pl.j5Active) {
      log("ℹ️ Joker 5 ist bereits aktiv.");
      return;
    }
    pl.jokers.j5 -= 1;
    pl.j5Active = true;
    log(`🃏 Joker 5 aktiv: Barikaden werden in diesem Zug ignoriert. (Rest J5: ${pl.jokers.j5})`);
    syncUI();
    draw();
  }

  function useJ4() {
    const pl = currentPlayer();
    if (pl.jokers.j4 <= 0) {
      log("🃏 Joker 4 fehlt.");
      return;
    }
    if (S.phase !== "need_roll") {
      log("⛔ Joker 4 nur vor dem Würfeln nutzbar.");
      return;
    }
    if (pl.pendingDouble) {
      log("ℹ️ Doppelwurf ist schon aktiv.");
      return;
    }
    pl.jokers.j4 -= 1;
    pl.pendingDouble = true;
    log(`🃏 Joker 4 aktiv: Nächster Wurf ist Doppelwurf. (Rest J4: ${pl.jokers.j4})`);
    syncUI();
  }

  function useJ3() {
    const pl = currentPlayer();
    if (pl.jokers.j3 <= 0) {
      log("🃏 Joker 3 fehlt.");
      return;
    }
    if (S.phase === "need_roll") {
      log("⛔ Joker 3 erst nach einem Wurf nutzbar.");
      return;
    }
    pl.jokers.j3 -= 1;
    const roll = randInt(1, RULES.diceSides);
    S.rollValue = roll;
    S.stepsLeft = roll;
    S.selectedPiece = null;
    S.phase = "need_piece";
    log(`🃏 Neuwurf: ${roll} (Rest J3: ${pl.jokers.j3})`);
    syncUI();
    draw();
  }

  function useJ2() {
    const pl = currentPlayer();
    if (pl.jokers.j2 <= 0) {
      log("🃏 Joker 2 fehlt.");
      return;
    }
    S.phase = "j2_pick_source";
    S.j2Source = null;
    log("🃏 Joker 2 aktiv: Klick Barikade-Quelle. (Nochmal Quelle = entfernen).");
    syncUI();
    draw();
  }

  function handleJ2Click(nodeId) {
    const pl = currentPlayer();
    if (S.phase === "j2_pick_source") {
      if (!S.barricades.has(nodeId)) {
        log("⛔ Keine Barikade auf diesem Feld.");
        return;
      }
      S.j2Source = nodeId;
      S.phase = "j2_pick_target";
      log("🃏 Quelle gewählt. Klick Ziel-Feld (nicht Startfeld) ODER klick Quelle nochmal = entfernen.");
      return;
    }
    if (S.phase === "j2_pick_target") {
      if (nodeId === S.j2Source) {
        S.barricades.delete(S.j2Source);
        pl.jokers.j2 -= 1;
        log(`🧱 Barikade entfernt (J2). Rest J2: ${pl.jokers.j2}`);
        S.phase = "need_roll";
        S.j2Source = null;
        startTurn();
        return;
      }
      if (isStartNode(nodeId)) {
        log("⛔ Ziel ist Startfeld – nicht erlaubt.");
        return;
      }
      S.barricades.delete(S.j2Source);
      S.barricades.add(nodeId);
      pl.jokers.j2 -= 1;
      log(`🧱 Barikade versetzt (J2) → ${nodeId}. Rest J2: ${pl.jokers.j2}`);
      S.phase = "need_roll";
      S.j2Source = null;
      startTurn();
      return;
    }
  }

  function useJ1() {
    const pl = currentPlayer();
    if (pl.jokers.j1 <= 0) {
      log("🃏 Joker 1 fehlt.");
      return;
    }
    pl.jokers.j1 -= 1;
    log("🃏 Joker 1 genutzt (Prototype-Platzhalter). In der Online-Version geben wir J1 eine feste Regel.");
    syncUI();
  }

  // =========================
  // UI sync
  // =========================
  function syncUI() {
    ui.pCount.textContent = String(S.playerCount);
    const pl = currentPlayer();
    ui.turnLabel.textContent = pl ? `${pl.color} (Spieler ${pl.id + 1})` : "–";
    ui.bCount.textContent = `${S.barricades.size}/${RULES.barricadeMax}`;
    ui.phaseBadge.textContent = "Phase: " + S.phase;
    ui.scoreBadge.textContent = "Punkte: " + S.players.map((p) => `${p.color}:${p.score}`).join(" · ");
    ui.lightBadge.textContent = "Licht: " + (S.light ?? "–") + (S.light2 ? " · Extra: " + S.light2 : "");

    ui.diceVal.textContent = S.rollValue ?? "–";
    ui.stepsLeft.textContent = S.phase === "need_roll" ? "–" : String(S.stepsLeft);

    ui.j1.textContent = String(pl?.jokers.j1 ?? 0);
    ui.j2.textContent = String(pl?.jokers.j2 ?? 0);
    ui.j3.textContent = String(pl?.jokers.j3 ?? 0);
    ui.j4.textContent = String(pl?.jokers.j4 ?? 0);
    ui.j5.textContent = String(pl?.jokers.j5 ?? 0);
    ui.j5a.textContent = pl?.j5Active ? "ja" : "nein";

    ui.rollBtn.disabled = S.phase !== "need_roll";
    ui.endTurnBtn.disabled = S.phase === "place_barricade" || S.phase === "j2_pick_source" || S.phase === "j2_pick_target" || S.phase === "event_reveal" || S.phase === "event_swap_select";
  }

  // =========================
  // Drawing (no numbers on fields; clearer pieces)
  // =========================
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (CAM.autoFit) fitCamera(rect.width, rect.height);
    clampPan();
    updateZoomPct();
    draw();
  }
  window.addEventListener("resize", resize);

  function drawGrid(w, h) {
    const grid = S.board?.ui?.gridSize ?? 20;
    const scale = CAM.scale;
    const ox = CAM.ox;
    const oy = CAM.oy;
    const X = (x) => x * scale + ox;
    const Y = (y) => y * scale + oy;

    ctx.save();
    ctx.lineWidth = 1;

    const inv = 1 / scale;
    const left = (0 - ox) * inv;
    const top = (0 - oy) * inv;
    const right = (w - ox) * inv;
    const bot = (h - oy) * inv;
    const startGX = Math.floor(left / grid) * grid;
    const endGX = Math.ceil(right / grid) * grid;
    const startGY = Math.floor(top / grid) * grid;
    const endGY = Math.ceil(bot / grid) * grid;

    for (let gx = startGX; gx <= endGX; gx += grid) {
      const major = Math.round(gx / grid) % 5 === 0;
      ctx.strokeStyle = major ? "rgba(56,189,248,.14)" : "rgba(148,163,184,.06)";
      ctx.beginPath();
      ctx.moveTo(X(gx), 0);
      ctx.lineTo(X(gx), h);
      ctx.stroke();
    }

    for (let gy = startGY; gy <= endGY; gy += grid) {
      const major = Math.round(gy / grid) % 5 === 0;
      ctx.strokeStyle = major ? "rgba(56,189,248,.14)" : "rgba(148,163,184,.06)";
      ctx.beginPath();
      ctx.moveTo(0, Y(gy));
      ctx.lineTo(w, Y(gy));
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw() {
    if (!S.board) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);

    const scale = CAM.scale;
    const ox = CAM.ox;
    const oy = CAM.oy;
    const X = (x) => x * scale + ox;
    const Y = (y) => y * scale + oy;

    drawGrid(w, h);

    // edges
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(148,163,184,.30)";
    for (const e of S.edges) {
      const a = S.nodeById.get(e.a);
      const b = S.nodeById.get(e.b);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(X(a.x), Y(a.y));
      ctx.lineTo(X(b.x), Y(b.y));
      ctx.stroke();
    }
    ctx.restore();

    // nodes
    for (const n of S.nodes) {
      const r = n.kind === "start" ? 19 : 15;
      const isLight = S.light === n.id;
      const hasBarr = S.barricades.has(n.id);

      const f = n.flags || {};
      const st = String(f.specialType || "");
      const isEvent = st === "event" || f.event === true || f.isEvent === true;
      const isBoost = st === "boost" || f.boost === true || !!f.boostSteps;

      // Light glow
      if (isLight) {
        ctx.beginPath();
        ctx.arc(X(n.x), Y(n.y), r + 18, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34,197,94,.12)";
        ctx.fill();
      }

      // node base (always crisp at any zoom: radius in screen px)
      ctx.beginPath();
      ctx.arc(X(n.x), Y(n.y), r, 0, Math.PI * 2);
      ctx.fillStyle = n.kind === "start" ? "rgba(59,130,246,.12)" : "rgba(2,6,23,.55)";
      ctx.fill();

      // border
      ctx.lineWidth = isLight ? 4 : 3;
      ctx.strokeStyle = isLight ? "rgba(34,197,94,.85)" : "rgba(148,163,184,.65)";
      ctx.stroke();

      // special rings (no numbers, only rings)
      if (isEvent) {
        ctx.beginPath();
        ctx.arc(X(n.x), Y(n.y), r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(59,130,246,.80)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // card icon
        ctx.font = `${Math.max(14, r + 2)}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(226,232,240,.92)";
        ctx.fillText("🂠", X(n.x), Y(n.y));
      }
      if (isBoost) {
        ctx.beginPath();
        ctx.arc(X(n.x), Y(n.y), r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(34,197,94,.65)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // barricade
      if (hasBarr) {
        ctx.beginPath();
        ctx.arc(X(n.x), Y(n.y), r * 0.75, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(239,68,68,.92)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }

    // pieces (better readability, with stacking)
    drawPieces(X, Y);

    // selected piece halo on top
    const selPc = S.pieces.find((p) => p.id === S.selectedPiece);
    if (selPc) {
      const n = S.nodeById.get(selPc.nodeId);
      if (n) {
        ctx.beginPath();
        ctx.arc(X(n.x), Y(n.y), 18, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  function drawPieces(X, Y) {
    // group pieces per node
    const byNode = new Map();
    for (const pc of S.pieces) {
      if (!byNode.has(pc.nodeId)) byNode.set(pc.nodeId, []);
      byNode.get(pc.nodeId).push(pc);
    }

    for (const [nodeId, pcs] of byNode.entries()) {
      const n = S.nodeById.get(nodeId);
      if (!n) continue;

      // spread pieces a bit if stacked
      const k = pcs.length;
      const baseR = 9;
      const spread = k <= 1 ? 0 : 10;

      for (let i = 0; i < k; i++) {
        const pc = pcs[i];
        const ang = k <= 1 ? 0 : (i / k) * Math.PI * 2;
        const dx = Math.cos(ang) * spread;
        const dy = Math.sin(ang) * spread;

        const cx = X(n.x) + dx;
        const cy = Y(n.y) + dy;

        // shadow
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy + 1.5, baseR + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.fill();

        // body
        ctx.beginPath();
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
        ctx.fillStyle = colorTo(pc.color, 0.96);
        ctx.fill();

        // rim
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,.55)";
        ctx.stroke();

        // small highlight
        ctx.beginPath();
        ctx.arc(cx - 3.2, cy - 3.5, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,.42)";
        ctx.fill();

        ctx.restore();
      }
    }
  }

  function colorTo(c, a) {
    const map = {
      red: [239, 68, 68],
      blue: [59, 130, 246],
      green: [34, 197, 94],
      yellow: [245, 158, 11],
      black: [17, 24, 39],
      white: [226, 232, 240],
    };
    const rgb = map[c] || [148, 163, 184];
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  // =========================
  // Input: tap/click selection (zoom independent)
  // =========================
  function findHitNode(sx, sy) {
    // Use screen-space hit radius that feels the same at every zoom.
    const HIT_R = 24; // px
    let best = null;
    let bestD = Infinity;
    for (const n of S.nodes) {
      const nx = n.x * CAM.scale + CAM.ox;
      const ny = n.y * CAM.scale + CAM.oy;
      const d = Math.hypot(nx - sx, ny - sy);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (!best || bestD > HIT_R) return null;
    return best;
  }

  function handleBoardTap(sx, sy) {
    if (!S.board) return;

    const hit = findHitNode(sx, sy);
    if (!hit) return;
    const nodeId = hit.id;

    // phases
    if (S.phase === "place_barricade") {
      placeBarricade(nodeId);
      return;
    }
    if (S.phase === "j2_pick_source" || S.phase === "j2_pick_target") {
      handleJ2Click(nodeId);
      syncUI();
      draw();
      return;
    }

    if (S.phase === "event_swap_select") {
      const pl = currentPlayer();
      const srcId = S.pendingEventPieceId;
      const src = S.pieces.find((pc) => pc.id === srcId);
      const targets = S.pieces.filter((pc) => pc.owner === pl.id && pc.id !== srcId && pc.nodeId === nodeId);

      if (!src) {
        log("ℹ️ Swap fehlgeschlagen: Quelle nicht gefunden.");
        S.phase = "need_roll";
        S.pendingEventPieceId = null;
        endTurn("Ereignis");
        return;
      }
      if (!targets.length) {
        log("ℹ️ Klick eine DEINER anderen Figuren zum Tauschen.");
        return;
      }

      const tgt = targets[0];
      const tmp = src.nodeId;
      src.nodeId = tgt.nodeId;
      tgt.nodeId = tmp;

      log("🔁 Positionen getauscht.");
      S.phase = "need_roll";
      S.pendingEventPieceId = null;
      S.eventCard = null;
      endTurn("Ereignis");
      return;
    }

    const pl = currentPlayer();

    // choose a piece
    if (S.phase === "need_piece") {
      // prioritize piece under cursor: if stacked, pick your own first
      const pcsHere = S.pieces.filter((pc) => pc.nodeId === nodeId && pc.owner === pl.id);
      if (!pcsHere.length) {
        log("ℹ️ Wähle eine eigene Figur.");
        return;
      }
      S.selectedPiece = pcsHere[0].id;
      S.phase = "moving";
      log(`✅ Figur gewählt (${S.selectedPiece}). Jetzt Ziel-Feld klicken. (Rest: ${S.stepsLeft})`);
      syncUI();
      draw();
      return;
    }

    // move
    if (S.phase === "moving" && S.selectedPiece) {
      tryMoveDirectTo(nodeId);
      syncUI();
      draw();
      return;
    }
  }

  // =========================
  // Buttons
  // =========================
  ui.playersSel.onchange = () => {
    S.playerCount = parseInt(ui.playersSel.value, 10);
    ui.pCount.textContent = String(S.playerCount);
    hardReset();
  };

  ui.resetBtn.onclick = () => hardReset();
  ui.nextTurnBtn.onclick = () => {
    log("⏭️ Nächster Zug (manuell).");
    endTurn("manuell");
  };

  ui.rollBtn.onclick = () => rollDice();
  ui.endTurnBtn.onclick = () => endTurn("manuell beendet");

  ui.giveJ1.onclick = () => giveJ("j1");
  ui.giveJ2.onclick = () => giveJ("j2");
  ui.giveJ3.onclick = () => giveJ("j3");
  ui.giveJ4.onclick = () => giveJ("j4");
  ui.giveJ5.onclick = () => giveJ("j5");

  ui.useJ1.onclick = () => useJ1();
  ui.useJ2.onclick = () => useJ2();
  ui.useJ3.onclick = () => useJ3();
  ui.useJ4.onclick = () => useJ4();
  ui.useJ5.onclick = () => useJ5();

  ui.fitBtn.onclick = () => {
    const rect = canvas.getBoundingClientRect();
    fitCamera(rect.width, rect.height);
    draw();
  };

  ui.zoomIn.onclick = () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width * 0.5, rect.height * 0.5, 1.15);
    draw();
  };
  ui.zoomOut.onclick = () => {
    const rect = canvas.getBoundingClientRect();
    zoomAt(rect.width * 0.5, rect.height * 0.5, 1 / 1.15);
    draw();
  };

  // =========================
  // Reset
  // =========================
  function hardReset() {
    ui.log.innerHTML = "";
    S.barricades = new Set();
    resetPlayers();
    resetPieces();
    S.lastLight = null;
    S.light = null;
    S.j2Source = null;

    spawnLight("Spielstart");
    startTurn();
    syncUI();

    // keep camera stable but ensure playable
    const rect = canvas.getBoundingClientRect();
    fitCamera(rect.width, rect.height);
    draw();

    log("✅ Lichtarena Offline bereit.");
  }

  // =========================
  // Init
  // =========================
  (async function init() {
    try {
      await loadBoard();
    } catch (e) {
      console.error(e);
      log("❌ Board konnte nicht geladen werden. (board_lichtarena.json / board.json)");
      return;
    }

    S.playerCount = parseInt(ui.playersSel.value, 10);
    resetPlayers();
    resetPieces();

    // initial camera
    resize();
    const rect = canvas.getBoundingClientRect();
    fitCamera(rect.width, rect.height);

    spawnLight("Spielstart");
    startTurn();
    syncUI();
    draw();

    log("✅ Lichtarena Offline bereit.");
  })();
})();
