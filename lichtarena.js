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
  };

  const COLORS = ["red", "blue", "green", "yellow", "black", "white"];

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
  
const DEFAULT_BOARD = {"ui": {"gridSize": 30}, "nodes": [{"id": "n1", "kind": "normal", "x": 200, "y": 160, "color": "", "flags": {}}, {"id": "n2", "kind": "normal", "x": 280, "y": 160, "color": "", "flags": {}}, {"id": "n3", "kind": "normal", "x": 360, "y": 160, "color": "", "flags": {}}, {"id": "n4", "kind": "normal", "x": 440, "y": 160, "color": "", "flags": {}}, {"id": "n5", "kind": "normal", "x": 520, "y": 160, "color": "", "flags": {}}, {"id": "n6", "kind": "normal", "x": 600, "y": 160, "color": "", "flags": {}}, {"id": "n7", "kind": "normal", "x": 200, "y": 240, "color": "", "flags": {}}, {"id": "n8", "kind": "normal", "x": 280, "y": 240, "color": "", "flags": {"specialType": "event"}}, {"id": "n9", "kind": "normal", "x": 360, "y": 240, "color": "", "flags": {}}, {"id": "n10", "kind": "normal", "x": 440, "y": 240, "color": "", "flags": {}}, {"id": "n11", "kind": "normal", "x": 520, "y": 240, "color": "", "flags": {}}, {"id": "n12", "kind": "normal", "x": 600, "y": 240, "color": "", "flags": {}}, {"id": "n13", "kind": "normal", "x": 200, "y": 320, "color": "", "flags": {}}, {"id": "n14", "kind": "normal", "x": 280, "y": 320, "color": "", "flags": {"specialType": "event"}}, {"id": "n15", "kind": "normal", "x": 360, "y": 320, "color": "", "flags": {}}, {"id": "n16", "kind": "normal", "x": 440, "y": 320, "color": "", "flags": {}}, {"id": "n17", "kind": "normal", "x": 520, "y": 320, "color": "", "flags": {}}, {"id": "n18", "kind": "normal", "x": 600, "y": 320, "color": "", "flags": {}}, {"id": "n19", "kind": "normal", "x": 200, "y": 400, "color": "", "flags": {}}, {"id": "n20", "kind": "normal", "x": 280, "y": 400, "color": "", "flags": {}}, {"id": "n21", "kind": "normal", "x": 360, "y": 400, "color": "", "flags": {"specialType": "event"}}, {"id": "n22", "kind": "normal", "x": 440, "y": 400, "color": "", "flags": {}}, {"id": "n23", "kind": "normal", "x": 520, "y": 400, "color": "", "flags": {}}, {"id": "n24", "kind": "normal", "x": 600, "y": 400, "color": "", "flags": {}}, {"id": "n25", "kind": "normal", "x": 200, "y": 480, "color": "", "flags": {}}, {"id": "n26", "kind": "normal", "x": 280, "y": 480, "color": "", "flags": {}}, {"id": "n27", "kind": "normal", "x": 360, "y": 480, "color": "", "flags": {"specialType": "event"}}, {"id": "n28", "kind": "normal", "x": 440, "y": 480, "color": "", "flags": {}}, {"id": "n29", "kind": "normal", "x": 520, "y": 480, "color": "", "flags": {}}, {"id": "n30", "kind": "normal", "x": 600, "y": 480, "color": "", "flags": {}}, {"id": "n31", "kind": "normal", "x": 200, "y": 560, "color": "", "flags": {}}, {"id": "n32", "kind": "normal", "x": 280, "y": 560, "color": "", "flags": {}}, {"id": "n33", "kind": "normal", "x": 360, "y": 560, "color": "", "flags": {"specialType": "event"}}, {"id": "n34", "kind": "normal", "x": 440, "y": 560, "color": "", "flags": {}}, {"id": "n35", "kind": "normal", "x": 520, "y": 560, "color": "", "flags": {}}, {"id": "n36", "kind": "normal", "x": 600, "y": 560, "color": "", "flags": {}}, {"id": "s_red_1", "kind": "start", "x": 140.0, "y": 0.0, "color": "red", "flags": {"startColor": "red"}}, {"id": "s_red_2", "kind": "start", "x": 57.1, "y": 114.1, "color": "red", "flags": {"startColor": "red"}}, {"id": "s_red_3", "kind": "start", "x": -77.1, "y": 70.5, "color": "red", "flags": {"startColor": "red"}}, {"id": "s_red_4", "kind": "start", "x": -77.1, "y": -70.5, "color": "red", "flags": {"startColor": "red"}}, {"id": "s_red_5", "kind": "start", "x": 57.1, "y": -114.1, "color": "red", "flags": {"startColor": "red"}}, {"id": "s_blue_1", "kind": "start", "x": 900.0, "y": 0.0, "color": "blue", "flags": {"startColor": "blue"}}, {"id": "s_blue_2", "kind": "start", "x": 817.1, "y": 114.1, "color": "blue", "flags": {"startColor": "blue"}}, {"id": "s_blue_3", "kind": "start", "x": 682.9, "y": 70.5, "color": "blue", "flags": {"startColor": "blue"}}, {"id": "s_blue_4", "kind": "start", "x": 682.9, "y": -70.5, "color": "blue", "flags": {"startColor": "blue"}}, {"id": "s_blue_5", "kind": "start", "x": 817.1, "y": -114.1, "color": "blue", "flags": {"startColor": "blue"}}, {"id": "s_green_1", "kind": "start", "x": 320.0, "y": 720.0, "color": "green", "flags": {"startColor": "green"}}, {"id": "s_green_2", "kind": "start", "x": 237.1, "y": 834.1, "color": "green", "flags": {"startColor": "green"}}, {"id": "s_green_3", "kind": "start", "x": 102.9, "y": 790.5, "color": "green", "flags": {"startColor": "green"}}, {"id": "s_green_4", "kind": "start", "x": 102.9, "y": 649.5, "color": "green", "flags": {"startColor": "green"}}, {"id": "s_green_5", "kind": "start", "x": 237.1, "y": 605.9, "color": "green", "flags": {"startColor": "green"}}, {"id": "s_yellow_1", "kind": "start", "x": 720.0, "y": 720.0, "color": "yellow", "flags": {"startColor": "yellow"}}, {"id": "s_yellow_2", "kind": "start", "x": 637.1, "y": 834.1, "color": "yellow", "flags": {"startColor": "yellow"}}, {"id": "s_yellow_3", "kind": "start", "x": 502.9, "y": 790.5, "color": "yellow", "flags": {"startColor": "yellow"}}, {"id": "s_yellow_4", "kind": "start", "x": 502.9, "y": 649.5, "color": "yellow", "flags": {"startColor": "yellow"}}, {"id": "s_yellow_5", "kind": "start", "x": 637.1, "y": 605.9, "color": "yellow", "flags": {"startColor": "yellow"}}, {"id": "s_black_1", "kind": "start", "x": 380.0, "y": 320.0, "color": "black", "flags": {"startColor": "black"}}, {"id": "s_black_2", "kind": "start", "x": 297.1, "y": 434.1, "color": "black", "flags": {"startColor": "black"}}, {"id": "s_black_3", "kind": "start", "x": 162.9, "y": 390.5, "color": "black", "flags": {"startColor": "black"}}, {"id": "s_black_4", "kind": "start", "x": 162.9, "y": 249.5, "color": "black", "flags": {"startColor": "black"}}, {"id": "s_black_5", "kind": "start", "x": 297.1, "y": 205.9, "color": "black", "flags": {"startColor": "black"}}, {"id": "s_white_1", "kind": "start", "x": 660.0, "y": 400.0, "color": "white", "flags": {"startColor": "white"}}, {"id": "s_white_2", "kind": "start", "x": 577.1, "y": 514.1, "color": "white", "flags": {"startColor": "white"}}, {"id": "s_white_3", "kind": "start", "x": 442.9, "y": 470.5, "color": "white", "flags": {"startColor": "white"}}, {"id": "s_white_4", "kind": "start", "x": 442.9, "y": 329.5, "color": "white", "flags": {"startColor": "white"}}, {"id": "s_white_5", "kind": "start", "x": 577.1, "y": 285.9, "color": "white", "flags": {"startColor": "white"}}], "edges": [{"a": "n1", "b": "n2"}, {"a": "n1", "b": "n7"}, {"a": "n2", "b": "n3"}, {"a": "n2", "b": "n8"}, {"a": "n3", "b": "n4"}, {"a": "n3", "b": "n9"}, {"a": "n4", "b": "n5"}, {"a": "n4", "b": "n10"}, {"a": "n5", "b": "n6"}, {"a": "n5", "b": "n11"}, {"a": "n6", "b": "n12"}, {"a": "n7", "b": "n8"}, {"a": "n7", "b": "n13"}, {"a": "n8", "b": "n9"}, {"a": "n8", "b": "n14"}, {"a": "n9", "b": "n10"}, {"a": "n9", "b": "n15"}, {"a": "n10", "b": "n11"}, {"a": "n10", "b": "n16"}, {"a": "n11", "b": "n12"}, {"a": "n11", "b": "n17"}, {"a": "n12", "b": "n18"}, {"a": "n13", "b": "n14"}, {"a": "n13", "b": "n19"}, {"a": "n14", "b": "n15"}, {"a": "n14", "b": "n20"}, {"a": "n15", "b": "n16"}, {"a": "n15", "b": "n21"}, {"a": "n16", "b": "n17"}, {"a": "n16", "b": "n22"}, {"a": "n17", "b": "n18"}, {"a": "n17", "b": "n23"}, {"a": "n18", "b": "n24"}, {"a": "n19", "b": "n20"}, {"a": "n19", "b": "n25"}, {"a": "n20", "b": "n21"}, {"a": "n20", "b": "n26"}, {"a": "n21", "b": "n22"}, {"a": "n21", "b": "n27"}, {"a": "n22", "b": "n23"}, {"a": "n22", "b": "n28"}, {"a": "n23", "b": "n24"}, {"a": "n23", "b": "n29"}, {"a": "n24", "b": "n30"}, {"a": "n25", "b": "n26"}, {"a": "n25", "b": "n31"}, {"a": "n26", "b": "n27"}, {"a": "n26", "b": "n32"}, {"a": "n27", "b": "n28"}, {"a": "n27", "b": "n33"}, {"a": "n28", "b": "n29"}, {"a": "n28", "b": "n34"}, {"a": "n29", "b": "n30"}, {"a": "n29", "b": "n35"}, {"a": "n30", "b": "n36"}, {"a": "n31", "b": "n32"}, {"a": "n32", "b": "n33"}, {"a": "n33", "b": "n34"}, {"a": "n34", "b": "n35"}, {"a": "n35", "b": "n36"}, {"a": "n1", "b": "n8"}, {"a": "n3", "b": "n10"}, {"a": "n5", "b": "n12"}, {"a": "n8", "b": "n15"}, {"a": "n10", "b": "n17"}, {"a": "n13", "b": "n20"}, {"a": "n15", "b": "n22"}, {"a": "n17", "b": "n24"}, {"a": "n20", "b": "n27"}, {"a": "n22", "b": "n29"}, {"a": "n25", "b": "n32"}, {"a": "n27", "b": "n34"}, {"a": "n29", "b": "n36"}, {"a": "s_red_1", "b": "n1"}, {"a": "s_red_2", "b": "n1"}, {"a": "s_red_3", "b": "n1"}, {"a": "s_red_4", "b": "n1"}, {"a": "s_red_5", "b": "n1"}, {"a": "s_blue_1", "b": "n6"}, {"a": "s_blue_2", "b": "n6"}, {"a": "s_blue_3", "b": "n6"}, {"a": "s_blue_4", "b": "n6"}, {"a": "s_blue_5", "b": "n6"}, {"a": "s_green_1", "b": "n31"}, {"a": "s_green_2", "b": "n31"}, {"a": "s_green_3", "b": "n31"}, {"a": "s_green_4", "b": "n31"}, {"a": "s_green_5", "b": "n31"}, {"a": "s_yellow_1", "b": "n36"}, {"a": "s_yellow_2", "b": "n36"}, {"a": "s_yellow_3", "b": "n36"}, {"a": "s_yellow_4", "b": "n36"}, {"a": "s_yellow_5", "b": "n36"}, {"a": "s_black_1", "b": "n16"}, {"a": "s_black_2", "b": "n16"}, {"a": "s_black_3", "b": "n16"}, {"a": "s_black_4", "b": "n16"}, {"a": "s_black_5", "b": "n16"}, {"a": "s_white_1", "b": "n21"}, {"a": "s_white_2", "b": "n21"}, {"a": "s_white_3", "b": "n21"}, {"a": "s_white_4", "b": "n21"}, {"a": "s_white_5", "b": "n21"}]};

async function loadBoard() {
  // Robust loader:
  // 1) Try board_lichtarena.json
  // 2) Fallback to board.json
  // 3) If file missing OR invalid JSON (e.g. HTML/JS returned), use DEFAULT_BOARD so Offline always runs.
  const tryFetch = async (url) => {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    const txt = await res.text();
    // Quick sanity check before JSON.parse
    const t = txt.trim();
    if (!(t.startsWith("{") || t.startsWith("["))) {
      throw new Error("Not JSON from " + url + " (starts with: " + t.slice(0, 12) + ")");
    }
    return JSON.parse(t);
  };

  let raw = null;
  try {
    raw = await tryFetch("board_lichtarena.json?v=la");
  } catch (e1) {
    try {
      raw = await tryFetch("board.json?v=la");
    } catch (e2) {
      console.warn("Board JSON missing/invalid – using DEFAULT_BOARD.", e1, e2);
      log("⚠️ Board-JSON fehlt/kaputt → nutze eingebautes Demo-Board (DEFAULT_BOARD).");
      raw = DEFAULT_BOARD;
    }
  }

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

    if (S.light === nodeId) {
      pl.score += 1;
      log(`🏁 Punkt! ${pl.color} hat jetzt ${pl.score} Punkte.`);
      spawnLight("Punkt erreicht");
      endTurn("Punkt");
      return true;
    }

    if (isEventNode(nodeId) && S.barricades.size < RULES.barricadeMax) {
      S.phase = "place_barricade";
      log("🎴 Ereignisfeld: Du erhältst 1 Barikade – bitte jetzt platzieren (klick Feld).");
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
      S.phase = "need_roll";
      return;
    }
    if (isStartNode(nodeId)) {
      log("⛔ Barikaden dürfen nicht auf Startfeldern stehen.");
      return;
    }
    S.barricades.add(nodeId);
    log(`🧱 Barikade platziert auf ${nodeId} (${S.barricades.size}/${RULES.barricadeMax})`);
    endTurn("Barikade platziert");
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
    ui.lightBadge.textContent = "Licht: " + (S.light ?? "–");

    ui.diceVal.textContent = S.rollValue ?? "–";
    ui.stepsLeft.textContent = S.phase === "need_roll" ? "–" : String(S.stepsLeft);

    ui.j1.textContent = String(pl?.jokers.j1 ?? 0);
    ui.j2.textContent = String(pl?.jokers.j2 ?? 0);
    ui.j3.textContent = String(pl?.jokers.j3 ?? 0);
    ui.j4.textContent = String(pl?.jokers.j4 ?? 0);
    ui.j5.textContent = String(pl?.jokers.j5 ?? 0);
    ui.j5a.textContent = pl?.j5Active ? "ja" : "nein";

    ui.rollBtn.disabled = S.phase !== "need_roll";
    ui.endTurnBtn.disabled = S.phase === "place_barricade" || S.phase === "j2_pick_source" || S.phase === "j2_pick_target";
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
