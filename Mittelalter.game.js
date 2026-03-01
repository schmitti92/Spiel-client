// Mittelalter Prototyp – Phase 1 (Basis-Mechanik)
// - Board laden (Mitteralter.board.json)
// - Auf ALLEN Startfeldern steht eine Figur
// - Pro Feld max. 1 Figur
// - 1 Würfel, bei 6 nochmal würfeln
// - Gegner dürfen rausgeworfen werden (zur Reserve/Start zurück, wenn frei)
// - Zielfelder (genau Wurfweite) leuchten
// - Anti-Hüpfen: ein Zug darf NICHT direkt aufs Feld zurück, wo die Figur vorher stand

(() => {
  const $ = (id) => document.getElementById(id);

  console.log("[Mittelalter] game.js geladen – Phase 1 – build 2026-03-01");
  // --- Safety guard: HTML mismatch detection (prevents null addEventListener crashes) ---
  const requiredIds = ["boardCanvas","btnRoll","btnFit","dieBox","statusLine","curPlayer","curPhase","reserveInfo"];
  const missing = requiredIds.filter(id => !document.getElementById(id));
  if (missing.length){
    console.error("[Mittelalter] HTML mismatch – missing IDs:", missing);
    const status = document.getElementById("statusLine");
    if (status) status.textContent = "Fehler: HTML/JS passen nicht zusammen (fehlende IDs: " + missing.join(", ") + ")";
    return;
  }

  const canvas = $("boardCanvas");
  const ctx = canvas.getContext("2d");

  const btnRoll = $("btnRoll");
  const btnFit = $("btnFit");
  const dieBox = $("dieBox");
  const statusLine = $("statusLine");
  const curPlayerEl = $("curPlayer");
  const curPhaseEl = $("curPhase");
  const reserveInfo = $("reserveInfo");

  const TEAM_COLORS = {
    1: "#ff5151", // rot
    2: "#3aa0ff", // blau
    3: "#42d17a", // grün
    4: "#ffd166"  // gelb
  };

  // ---------- Resize ----------
  function resizeCanvasToDisplaySize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(320, Math.floor(rect.height));
    const need = (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr));
    if (need) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS px coords
    }
    return { w, h, dpr };
  }

  // ---------- Camera ----------
  const cam = {
    x: 0,
    y: 0,
    scale: 1,
    minScale: 0.35,
    maxScale: 2.8
  };

  function worldToScreen(wx, wy) {
    return { x: (wx - cam.x) * cam.scale, y: (wy - cam.y) * cam.scale };
  }
  function screenToWorld(sx, sy) {
    return { x: sx / cam.scale + cam.x, y: sy / cam.scale + cam.y };
  }

  // ---------- Board data ----------
  let board = null;
  let nodes = [];
  let edges = [];
  let nodesById = new Map();
  let adj = new Map();
  let bounds = null;

  // ---------- Game state ----------
  const state = {
    players: [1,2,3,4],      // teams 1..4
    turnIndex: 0,            // index in players
    phase: "loading",        // loading | needRoll | choosePiece | chooseTarget
    roll: null,
    selectedPieceId: null,
    highlightedTargets: new Set(), // nodeId
    highlightedPaths: new Map(),   // nodeId -> prev map for reconstruct (optional)
    pieces: [],              // {id, team, nodeId|null, homeStartId, prevNodeId|null}
    occupied: new Map(),     // nodeId -> pieceId
    reserve: []              // pieceIds currently offboard
  };

  // ---------- Helpers ----------
  function setStatus(text) { statusLine.textContent = text; }
  function setDie(v) { dieBox.textContent = v == null ? "–" : String(v); }
  function setSidebar() {
    const team = state.players[state.turnIndex];
    curPlayerEl.textContent = team ? `Team ${team}` : "–";
    curPhaseEl.textContent = ({
      loading:"Lade…",
      needRoll:"Würfeln",
      choosePiece:"Figur wählen",
      chooseTarget:"Zielfeld wählen"
    })[state.phase] || state.phase;

    // Reserve list compact
    const grouped = {};
    for (const pid of state.reserve) {
      const p = state.piecesById.get(pid);
      if (!p) continue;
      grouped[p.team] = (grouped[p.team] || 0) + 1;
    }
    const parts = Object.keys(grouped).sort().map(t => `Team ${t}: ${grouped[t]}`);
    reserveInfo.textContent = parts.length ? parts.join(" • ") : "Keine";
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function isObstacle(node) { return node.type === "obstacle"; }
  function minRollFor(node) {
    if (!node.props) return null;
    if (typeof node.props.minRoll === "number") return node.props.minRoll;
    const v = parseInt(node.props.minRoll, 10);
    return Number.isFinite(v) ? v : null;
  }
  function canEnterNode(node, rollValue) {
    if (isObstacle(node)) {
      const mr = minRollFor(node) ?? 0;
      return rollValue >= mr;
    }
    return true;
  }

  // Store fast lookup for pieces
  state.piecesById = new Map();

  // ---------- Init pieces: one on EVERY start node ----------
  function initPiecesOnStarts() {
    state.pieces.length = 0;
    state.piecesById.clear();
    state.occupied.clear();
    state.reserve.length = 0;

    const startNodes = nodes.filter(n => n.type === "start" && n.props && n.props.startTeam);
    let i = 0;
    for (const s of startNodes) {
      const team = Number(s.props.startTeam);
      const id = `p_${++i}`;
      const piece = {
        id,
        team,
        nodeId: s.id,
        homeStartId: s.id,
        prevNodeId: null
      };
      state.pieces.push(piece);
      state.piecesById.set(id, piece);
      state.occupied.set(s.id, id);
    }
  }

  function currentTeam() {
    return state.players[state.turnIndex];
  }

  function clearHighlights() {
    state.highlightedTargets.clear();
    state.highlightedPaths.clear();
  }

  function nextTurn() {
    state.turnIndex = (state.turnIndex + 1) % state.players.length;
    state.roll = null;
    state.selectedPieceId = null;
    clearHighlights();
    setDie(null);
    state.phase = "needRoll";
    setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
    setSidebar();
  }

  // ---------- Compute reachable targets exactly N steps ----------
  // Constraint: first step cannot go back to prevNodeId (anti-hop).
  function computeTargetsForPiece(piece, steps) {
    clearHighlights();
    if (!piece || piece.nodeId == null) return;

    const start = piece.nodeId;
    const prev = piece.prevNodeId;

    // BFS by depth
    const q = [{ id: start, depth: 0 }];
    const visited = new Set([`${start}|0`]);
    // For reconstruct: store parent by (node|depth) -> parentNodeId
    const parent = new Map();

    while (q.length) {
      const cur = q.shift();
      if (cur.depth === steps) {
        // end node candidate
        if (cur.id !== start) { // must move
          state.highlightedTargets.add(cur.id);
        }
        continue;
      }

      const neigh = adj.get(cur.id) || [];
      for (const nb of neigh) {
        // anti-hop: first step cannot go to prev
        if (cur.depth === 0 && prev && nb === prev) continue;

        const nbNode = nodesById.get(nb);
        if (!nbNode) continue;

        // obstacle gating
        if (!canEnterNode(nbNode, steps)) continue;

        // one per field rule (but allow occupied by opponent at END only)
        // for intermediate steps we also disallow stepping through occupied fields to keep it clean:
        const occ = state.occupied.get(nb);
        const occPiece = occ ? state.piecesById.get(occ) : null;
        if (occPiece && occPiece.id !== piece.id) {
          // if not last step -> cannot pass through
          if (cur.depth + 1 < steps) continue;
          // if last step -> can land only if opponent
          if (occPiece.team === piece.team) continue;
        }

        const key = `${nb}|${cur.depth + 1}`;
        if (visited.has(key)) continue;
        visited.add(key);
        parent.set(key, `${cur.id}|${cur.depth}`);
        q.push({ id: nb, depth: cur.depth + 1 });
      }
    }

    // build path map for endpoints (optional)
    for (const endId of state.highlightedTargets) {
      // store backtracking chain keyed by nodeId for quick usage; we just store parent map
      state.highlightedPaths.set(endId, parent);
    }
  }

  function pickPieceAt(nodeId) {
    const pid = state.occupied.get(nodeId);
    if (!pid) return null;
    return state.piecesById.get(pid) || null;
  }

  function kickPiece(kickedPiece) {
    if (!kickedPiece || kickedPiece.nodeId == null) return;

    // Remove from board
    state.occupied.delete(kickedPiece.nodeId);
    kickedPiece.nodeId = null;
    kickedPiece.prevNodeId = null;

    // Try respawn to home start if free
    const home = kickedPiece.homeStartId;
    if (home && !state.occupied.has(home)) {
      kickedPiece.nodeId = home;
      state.occupied.set(home, kickedPiece.id);
      return;
    }

    // Else any free start of same team
    const starts = nodes.filter(n => n.type === "start" && n.props && Number(n.props.startTeam) === kickedPiece.team);
    for (const s of starts) {
      if (!state.occupied.has(s.id)) {
        kickedPiece.nodeId = s.id;
        state.occupied.set(s.id, kickedPiece.id);
        return;
      }
    }

    // Else reserve
    if (!state.reserve.includes(kickedPiece.id)) state.reserve.push(kickedPiece.id);
  }

  function movePieceTo(piece, targetNodeId) {
    if (!piece || piece.nodeId == null) return false;
    if (!state.highlightedTargets.has(targetNodeId)) return false;

    const from = piece.nodeId;
    const occ = state.occupied.get(targetNodeId);
    if (occ && occ !== piece.id) {
      const other = state.piecesById.get(occ);
      if (!other) return false;
      if (other.team === piece.team) return false;
      // Kick opponent
      kickPiece(other);
      // make sure target is now free
      if (state.occupied.has(targetNodeId)) return false;
    }

    // Move
    state.occupied.delete(from);
    piece.prevNodeId = from;
    piece.nodeId = targetNodeId;
    state.occupied.set(targetNodeId, piece.id);

    // Remove from reserve if it was there
    const idx = state.reserve.indexOf(piece.id);
    if (idx >= 0) state.reserve.splice(idx, 1);

    return true;
  }

  function endMoveAndAdvance() {
    const team = currentTeam();
    const wasSix = state.roll === 6;
    state.selectedPieceId = null;
    clearHighlights();

    if (wasSix) {
      state.roll = null;
      setDie(null);
      state.phase = "needRoll";
      setStatus(`Team ${team}: Du hast eine 6! Nochmal würfeln.`);
      setSidebar();
      return;
    }
    nextTurn();
  }

  // ---------- Input: click/tap ----------
  function findNodeAtWorld(wx, wy) {
    // pick nearest node within radius
    const r = (board?.ui?.radius ?? 18);
    const pickR = r * 1.35;
    let best = null;
    let bestD2 = Infinity;
    for (const n of nodes) {
      const dx = wx - n.x;
      const dy = wy - n.y;
      const d2 = dx*dx + dy*dy;
      if (d2 <= pickR*pickR && d2 < bestD2) {
        best = n;
        bestD2 = d2;
      }
    }
    return best;
  }

  function onTap(sx, sy) {
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const n = findNodeAtWorld(wx, wy);
    if (!n) return;

    if (state.phase === "needRoll") {
      // allow selecting piece before rolling to reduce taps
      const piece = pickPieceAt(n.id);
      if (piece && piece.team === currentTeam()) {
        state.selectedPieceId = piece.id;
        setStatus(`Team ${currentTeam()}: Figur gewählt. Jetzt würfeln.`);
        setSidebar();
      }
      return;
    }

    if (state.phase === "choosePiece") {
      const piece = pickPieceAt(n.id);
      if (!piece) return;
      if (piece.team !== currentTeam()) return;
      state.selectedPieceId = piece.id;
      computeTargetsForPiece(piece, state.roll);
      state.phase = "chooseTarget";
      setStatus(`Team ${currentTeam()}: Zielfeld wählen (${state.roll} Felder).`);
      setSidebar();
      return;
    }

    if (state.phase === "chooseTarget") {
      // click target
      if (!state.selectedPieceId) return;
      const piece = state.piecesById.get(state.selectedPieceId);
      if (!piece) return;

      if (!state.highlightedTargets.has(n.id)) {
        // allow reselect piece
        const maybePiece = pickPieceAt(n.id);
        if (maybePiece && maybePiece.team === currentTeam()) {
          state.selectedPieceId = maybePiece.id;
          computeTargetsForPiece(maybePiece, state.roll);
          setStatus(`Team ${currentTeam()}: Zielfeld wählen (${state.roll} Felder).`);
          setSidebar();
        }
        return;
      }

      const ok = movePieceTo(piece, n.id);
      if (!ok) return;

      setStatus(`Team ${currentTeam()}: Zug ausgeführt (${state.roll}).`);
      setSidebar();
      endMoveAndAdvance();
    }
  }

  // ---------- Pan/Zoom (touch + mouse) ----------
  let pointers = new Map(); // pointerId -> {x,y}
  let lastTapTime = 0;

  function pointerDown(e) {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Double-tap to fit
    const now = Date.now();
    if (now - lastTapTime < 280) {
      fitToBoard();
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  }

  function pointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const cur = { x: e.clientX, y: e.clientY };
    pointers.set(e.pointerId, cur);

    const arr = Array.from(pointers.values());
    if (arr.length === 1) {
      // pan
      const dx = (cur.x - prev.x) / cam.scale;
      const dy = (cur.y - prev.y) / cam.scale;
      cam.x -= dx;
      cam.y -= dy;
    } else if (arr.length === 2) {
      // pinch zoom
      const [a,b] = arr;
      const prevA = prev; // not perfect, but ok for prototype
      const dist = Math.hypot(a.x-b.x, a.y-b.y);

      // store dist per move using lastPinchDist
      if (pointerMove.lastPinchDist == null) pointerMove.lastPinchDist = dist;

      const ratio = dist / pointerMove.lastPinchDist;
      pointerMove.lastPinchDist = dist;

      const center = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
      zoomAtScreen(center.x, center.y, ratio);
    }
  }
  pointerMove.lastPinchDist = null;

  function pointerUp(e) {
    if (pointers.has(e.pointerId)) pointers.delete(e.pointerId);
    if (pointers.size < 2) pointerMove.lastPinchDist = null;

    // treat as tap if it was quick and not moved much
    // (we keep it simple: use click handler for mouse/touch)
  }

  function zoomAtScreen(sx, sy, factor) {
    const before = screenToWorld(sx, sy);
    cam.scale = clamp(cam.scale * factor, cam.minScale, cam.maxScale);
    const after = screenToWorld(sx, sy);
    cam.x += (before.x - after.x);
    cam.y += (before.y - after.y);
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", pointerUp);

  // Click/tap selection
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    onTap(sx, sy);
  });

  // Wheel zoom (desktop)
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const factor = Math.pow(1.0015, -e.deltaY);
    zoomAtScreen(sx, sy, factor);
  }, { passive:false });

  // ---------- Drawing ----------
  function draw() {
    const { w, h } = resizeCanvasToDisplaySize();
    ctx.clearRect(0,0,w,h);

    if (!board) {
      requestAnimationFrame(draw);
      return;
    }

    // background grid hint (subtle)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    const grid = 100;
    for (let x = (-(cam.x*cam.scale)%grid); x < w; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = (-(cam.y*cam.scale)%grid); y < h; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    // edges
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    for (const e of edges) {
      const a = nodesById.get(e.a);
      const b = nodesById.get(e.b);
      if (!a || !b) continue;
      const sa = worldToScreen(a.x, a.y);
      const sb = worldToScreen(b.x, b.y);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
    ctx.restore();

    const r = board.ui?.radius ?? 18;

    // node glow for targets
    ctx.save();
    for (const nid of state.highlightedTargets) {
      const n = nodesById.get(nid);
      if (!n) continue;
      const s = worldToScreen(n.x, n.y);
      // big glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, r*1.55*cam.scale, 0, Math.PI*2);
      ctx.fillStyle = "rgba(124,92,255,.12)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, r*1.15*cam.scale, 0, Math.PI*2);
      ctx.fillStyle = "rgba(124,92,255,.20)";
      ctx.fill();

      // ring
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(200,180,255,.7)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, r*0.95*cam.scale, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();

    // nodes
    for (const n of nodes) {
      const s = worldToScreen(n.x, n.y);
      const rr = r * cam.scale;

      // base
      ctx.beginPath();
      ctx.arc(s.x, s.y, rr, 0, Math.PI*2);

      let fill = "rgba(255,255,255,.10)";
      if (n.type === "start") fill = "rgba(65,209,122,.18)";
      if (n.type === "barricade") fill = "rgba(255,204,102,.18)";
      if (n.type === "obstacle") fill = "rgba(255,107,107,.16)";
      if (n.type === "portal") fill = "rgba(124,92,255,.18)";
      if (n.type === "boss") fill = "rgba(255,107,107,.11)";

      ctx.fillStyle = fill;
      ctx.fill();

      // outline
      ctx.lineWidth = Math.max(1, 2 * cam.scale);
      ctx.strokeStyle = "rgba(255,255,255,.14)";
      ctx.stroke();

      // special marks
      if (n.type === "obstacle") {
        const mr = minRollFor(n) ?? "?";
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.font = `${Math.max(10, 12*cam.scale)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(mr), s.x, s.y);
      }
      if (n.type === "portal") {
        ctx.strokeStyle = "rgba(180,160,255,.75)";
        ctx.lineWidth = Math.max(2, 3*cam.scale);
        ctx.beginPath();
        ctx.arc(s.x, s.y, rr*0.62, 0, Math.PI*2);
        ctx.stroke();
      }
      if (n.type === "boss") {
        ctx.strokeStyle = "rgba(255,107,107,.7)";
        ctx.lineWidth = Math.max(2, 3*cam.scale);
        ctx.beginPath();
        ctx.moveTo(s.x-rr*0.55, s.y);
        ctx.lineTo(s.x+rr*0.55, s.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.x, s.y-rr*0.55);
        ctx.lineTo(s.x, s.y+rr*0.55);
        ctx.stroke();
      }
      if (n.type === "barricade") {
        ctx.strokeStyle = "rgba(255,204,102,.75)";
        ctx.lineWidth = Math.max(2, 3*cam.scale);
        ctx.beginPath();
        ctx.rect(s.x-rr*0.38, s.y-rr*0.38, rr*0.76, rr*0.76);
        ctx.stroke();
      }
    }

    // pieces
    for (const p of state.pieces) {
      if (p.nodeId == null) continue;
      const n = nodesById.get(p.nodeId);
      if (!n) continue;
      const s = worldToScreen(n.x, n.y);
      const rr = r*0.62*cam.scale;

      ctx.beginPath();
      ctx.arc(s.x, s.y, rr, 0, Math.PI*2);
      ctx.fillStyle = TEAM_COLORS[p.team] || "#fff";
      ctx.globalAlpha = 0.92;
      ctx.fill();
      ctx.globalAlpha = 1;

      // selection ring
      if (state.selectedPieceId === p.id) {
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.lineWidth = Math.max(2, 3*cam.scale);
        ctx.beginPath();
        ctx.arc(s.x, s.y, rr*1.25, 0, Math.PI*2);
        ctx.stroke();
      }
      // tiny outline
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = Math.max(1, 2*cam.scale);
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  // ---------- Fit to board ----------
  function computeBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    }
    return { minX, minY, maxX, maxY };
  }

  function fitToBoard() {
    if (!bounds) return;
    const { w, h } = resizeCanvasToDisplaySize();
    const pad = 80;
    const bw = (bounds.maxX - bounds.minX) + pad*2;
    const bh = (bounds.maxY - bounds.minY) + pad*2;
    const sx = w / bw;
    const sy = h / bh;
    cam.scale = clamp(Math.min(sx, sy), cam.minScale, cam.maxScale);
    cam.x = bounds.minX - pad;
    cam.y = bounds.minY - pad;
  }

  btnFit.addEventListener("click", () => fitToBoard());

  // ---------- Roll ----------
  btnRoll.addEventListener("click", () => {
    if (state.phase === "loading") return;

    if (state.phase !== "needRoll") {
      // allow re-roll only if in needRoll (prevents mistakes)
      return;
    }

    state.roll = randInt(1, 6);
    setDie(state.roll);

    // If no piece selected yet -> choosePiece
    if (!state.selectedPieceId) {
      state.phase = "choosePiece";
      setStatus(`Team ${currentTeam()}: Wurf = ${state.roll}. Figur wählen.`);
    } else {
      // piece already selected -> show targets immediately
      const p = state.piecesById.get(state.selectedPieceId);
      if (p && p.team === currentTeam() && p.nodeId != null) {
        computeTargetsForPiece(p, state.roll);
        state.phase = "chooseTarget";
        setStatus(`Team ${currentTeam()}: Wurf = ${state.roll}. Zielfeld wählen.`);
      } else {
        state.selectedPieceId = null;
        state.phase = "choosePiece";
        setStatus(`Team ${currentTeam()}: Wurf = ${state.roll}. Figur wählen.`);
      }
    }
    setSidebar();
  });

  // ---------- Load board ----------
  async function loadBoard() {
    state.phase = "loading";
    setSidebar();
    setStatus("Lade Board…");

    const res = await fetch("Mitteralter.board.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Board JSON konnte nicht geladen werden.");
    board = await res.json();

    nodes = board.nodes || [];
    edges = board.edges || [];

    nodesById = new Map(nodes.map(n => [n.id, n]));
    adj = new Map();
    for (const n of nodes) adj.set(n.id, []);
    for (const e of edges) {
      if (!adj.has(e.a)) adj.set(e.a, []);
      if (!adj.has(e.b)) adj.set(e.b, []);
      adj.get(e.a).push(e.b);
      adj.get(e.b).push(e.a);
    }

    bounds = computeBounds();
    initPiecesOnStarts();
    fitToBoard();

    // Determine which teams exist (from start nodes)
    const teams = new Set();
    for (const n of nodes) {
      if (n.type === "start" && n.props && n.props.startTeam) teams.add(Number(n.props.startTeam));
    }
    state.players = Array.from(teams).sort((a,b)=>a-b);
    state.turnIndex = 0;

    state.phase = "needRoll";
    state.roll = null;
    state.selectedPieceId = null;
    clearHighlights();
    setDie(null);

    setStatus(`Team ${currentTeam()} ist dran: Würfeln.`);
    setSidebar();
  }

  loadBoard().catch(err => {
    console.error(err);
    setStatus("Fehler beim Laden. Prüfe Console.");
    state.phase = "loading";
    setSidebar();
  });

  // Kick-start render loop
  window.addEventListener("resize", () => resizeCanvasToDisplaySize());
  requestAnimationFrame(draw);
})();
