(() => {
  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const canvas = $("c");
  const ctx = canvas.getContext("2d");

  // =========================
  // Camera (Pan/Zoom)
  // =========================
  // Google-Maps-UX (no rule changes):
  // - PC: Left mouse drag = pan, Mousewheel = zoom.
  // - Touch: 1-finger drag = pan, Pinch = zoom.
  const CAM = {
    scale: 1,
    ox: 0,
    oy: 0,
    minScale: 0.15,
    maxScale: 6,
    autoFit: true,
  };

  function boardBounds(){
    // Bounding box in BOARD coordinates
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const n of S.nodes || []){
      if (!n) continue;
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x); maxY=Math.max(maxY,n.y);
    }
    if (!isFinite(minX)) return null;
    return {minX,minY,maxX,maxY};
  }

  function clampCamera(viewW, viewH){
    // Prevent the board from fully disappearing.
    // We keep at least a small margin of the board bbox visible.
    const bb = boardBounds();
    if (!bb) return;
    // Allow panning until at least one field remains visible.
    // Smaller margin = more freedom; we just prevent the board from fully disappearing.
    const margin = 28;

    const left   = bb.minX * CAM.scale + CAM.ox;
    const right  = bb.maxX * CAM.scale + CAM.ox;
    const top    = bb.minY * CAM.scale + CAM.oy;
    const bottom = bb.maxY * CAM.scale + CAM.oy;

    const bw = right - left;
    const bh = bottom - top;

    // If board smaller than viewport -> keep centered.
    if (bw + margin*2 <= viewW){
      CAM.ox += (viewW/2) - (left + bw/2);
    } else {
      // Clamp so right is not left of margin and left is not right of (viewW - margin)
      const minOx = (viewW - margin) - bb.maxX * CAM.scale;
      const maxOx = margin - bb.minX * CAM.scale;
      CAM.ox = clamp(CAM.ox, minOx, maxOx);
    }

    if (bh + margin*2 <= viewH){
      CAM.oy += (viewH/2) - (top + bh/2);
    } else {
      const minOy = (viewH - margin) - bb.maxY * CAM.scale;
      const maxOy = margin - bb.minY * CAM.scale;
      CAM.oy = clamp(CAM.oy, minOy, maxOy);
    }
  }

  function fitCamera(viewW, viewH){
    if (!S.board || !S.nodes || !S.nodes.length) return;
    const pad = 70;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const n of S.nodes){
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x); maxY=Math.max(maxY,n.y);
    }
    const bw=Math.max(1, maxX-minX);
    const bh=Math.max(1, maxY-minY);
    const sx=(viewW-pad*2)/bw;
    const sy=(viewH-pad*2)/bh;
    CAM.scale = clamp(Math.min(sx,sy), CAM.minScale, CAM.maxScale);
    CAM.ox = pad - minX*CAM.scale;
    CAM.oy = pad - minY*CAM.scale;
  }

  function screenToBoard(sx, sy){
    return { x: (sx - CAM.ox) / CAM.scale, y: (sy - CAM.oy) / CAM.scale };
  }
  function zoomAt(sx, sy, factor){
    const before = screenToBoard(sx, sy);
    CAM.scale = clamp(CAM.scale * factor, CAM.minScale, CAM.maxScale);
    const after = screenToBoard(sx, sy);
    // keep point under cursor stable
    CAM.ox += (after.x - before.x) * CAM.scale;
    CAM.oy += (after.y - before.y) * CAM.scale;
    CAM.autoFit = false;
    const w = canvas.width/(window.devicePixelRatio||1);
    const h = canvas.height/(window.devicePixelRatio||1);
    clampCamera(w, h);
  }

  const PZ = {
    isPointerDown: false,
    isPanning: false,
    suppressClick: false,
    downX: 0,
    downY: 0,
    lastX: 0,
    lastY: 0,
    pointers: new Map(),
    pinchStartDist: 0,
    pinchStartScale: 1,
  };

  canvas.addEventListener("wheel", (e)=>{
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    zoomAt(sx, sy, e.deltaY > 0 ? 0.9 : 1.1);
    draw();
  }, {passive:false});

  // Prevent default double-click behavior ("wobble" / accidental zoom)
  canvas.addEventListener("dblclick", (e)=>{ e.preventDefault(); }, {passive:false});

  canvas.addEventListener("pointerdown", (e)=>{
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    PZ.pointers.set(e.pointerId, {x:sx,y:sy,type:e.pointerType});

    PZ.isPointerDown = true;
    PZ.isPanning = false;
    PZ.suppressClick = false;
    PZ.downX = sx;
    PZ.downY = sy;
    PZ.lastX = sx;
    PZ.lastY = sy;
    CAM.autoFit = false;
  });

  canvas.addEventListener("pointermove", (e)=>{
    if (!PZ.pointers.has(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    PZ.pointers.set(e.pointerId, {x:sx,y:sy,type:e.pointerType});

    // Touch: pinch zoom (2 fingers) + pan by midpoint
    const touches = [...PZ.pointers.values()].filter(p=>p.type==="touch");
    if (touches.length >= 2){
      const a = touches[0], b = touches[1];
      const midX = (a.x + b.x)/2;
      const midY = (a.y + b.y)/2;
      if (!PZ.isPanning){
        const dx0 = a.x - b.x;
        const dy0 = a.y - b.y;
        PZ.pinchStartDist = Math.hypot(dx0,dy0) || 1;
        PZ.pinchStartScale = CAM.scale;
        PZ.isPanning = true;
        PZ.lastX = midX;
        PZ.lastY = midY;
      }

      // pan
      CAM.ox += (midX - PZ.lastX);
      CAM.oy += (midY - PZ.lastY);
      PZ.lastX = midX;
      PZ.lastY = midY;

      // zoom
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx,dy) || 1;
      const factor = dist / (PZ.pinchStartDist || 1);
      const targetScale = clamp(PZ.pinchStartScale * factor, CAM.minScale, CAM.maxScale);
      const before = screenToBoard(midX, midY);
      CAM.scale = targetScale;
      const after = screenToBoard(midX, midY);
      CAM.ox += (after.x - before.x) * CAM.scale;
      CAM.oy += (after.y - before.y) * CAM.scale;

      const w = canvas.width/(window.devicePixelRatio||1);
      const h = canvas.height/(window.devicePixelRatio||1);
      clampCamera(w,h);
      draw();
      return;
    }

    // Pan (mouse OR 1-finger touch): start panning after small threshold.
    // "Drag erst ab X Pixel" -> Klicks bleiben sichere Klicks.
    const DRAG_THRESHOLD_PX = 7; // 6–8px fühlt sich sehr "Google-Maps" an
    if (!PZ.isPointerDown) return;
    const moved = Math.hypot(sx - PZ.downX, sy - PZ.downY);
    if (!PZ.isPanning && moved > DRAG_THRESHOLD_PX){
      PZ.isPanning = true;
      PZ.suppressClick = true;
    }
    if (!PZ.isPanning) return;
    const dx = sx - PZ.lastX;
    const dy = sy - PZ.lastY;
    PZ.lastX = sx;
    PZ.lastY = sy;
    CAM.ox += dx;
    CAM.oy += dy;

    const w = canvas.width/(window.devicePixelRatio||1);
    const h = canvas.height/(window.devicePixelRatio||1);
    clampCamera(w,h);
    draw();
  });

  function stopPointer(e){
    // --- Tap selection on pointerup (more precise than "click") ---
    if (e.type === "pointerup" && S.board){
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const moved = Math.hypot(sx - PZ.downX, sy - PZ.downY);
      const DRAG_THRESHOLD_PX = 7;

      // Treat as "tap/click" only if we didn't pan and stayed under threshold.
      if (!PZ.isPanning && moved <= DRAG_THRESHOLD_PX && !PZ.suppressClick){
        // nearest node in current camera screen space
        const scale = CAM.scale;
        const ox = CAM.ox;
        const oy = CAM.oy;

        // 1) Prefer piece-hit first (so selecting a piece doesn't require "perfect" node click)
        const pl = currentPlayer();
        let bestPiece = null, bestPD = 1e9;
        for (const pc of S.pieces){
          const n = S.nodeById.get(pc.nodeId);
          if (!n) continue;
          const x = n.x*scale+ox, y = n.y*scale+oy;
          const d = Math.hypot(x - sx, y - sy);
          if (d < bestPD){ bestPD = d; bestPiece = pc; }
        }

        // Hit radii in SCREEN px (tuned for PC+Tablet)
        const PIECE_HIT = 18;
        const NODE_HIT  = 26;

        // If we are in "need_piece", allow selecting the nearest OWN piece within PIECE_HIT
        if (S.phase === "need_piece" && bestPiece && bestPD <= PIECE_HIT && bestPiece.owner === pl.id){
          S.selectedPiece = bestPiece.id;
          S.phase = "choose_target";
          log(`✅ Figur gewählt (${S.selectedPiece}). Klick jetzt ein Ziel-Feld, das GENAU ${S.stepsLeft} Schritte entfernt ist.`);
          syncUI(); draw();
          // continue with stopPointer cleanup
        } else {
          // Otherwise: normal node hit test
          let best=null, bestD=1e9;
          for (const n of S.nodes){
            const x=n.x*scale+ox, y=n.y*scale+oy;
            const d=Math.hypot(x-sx,y-sy);
            if (d<bestD){ bestD=d; best=n; }
          }
          if (best && bestD <= NODE_HIT){
            const nodeId = best.id;

            // special phases
            if (S.phase === "place_barricade"){ placeBarricade(nodeId); }
            else if (S.phase === "j2_pick_source" || S.phase === "j2_pick_target"){ handleJ2Click(nodeId); syncUI(); draw(); }
            else if (S.phase === "need_piece"){
              const pcsHere = S.pieces.filter(pc => pc.nodeId===nodeId && pc.owner===pl.id);
              if (!pcsHere.length){
                log("ℹ️ Wähle eine eigene Figur.");
              } else {
                S.selectedPiece = pcsHere[0].id;
                S.phase = "choose_target";
                log(`✅ Figur gewählt (${S.selectedPiece}). Klick jetzt ein Ziel-Feld, das GENAU ${S.stepsLeft} Schritte entfernt ist.`);
                syncUI(); draw();
              }
            }
            else if (S.phase === "choose_target" && S.selectedPiece){
              tryMoveTo(nodeId);
              syncUI(); draw();
            }
          }
        }
      }
    }

    PZ.pointers.delete(e.pointerId);
    const touches = [...PZ.pointers.values()].filter(p=>p.type==="touch");
    if (touches.length < 2){
      PZ.pinchStartDist = 0;
    }
    PZ.isPointerDown = false;
    // If we dragged, suppress the next click (tap selection) to avoid accidental moves.
    if (PZ.suppressClick){
      // reset shortly after, so normal clicks work again
      setTimeout(()=>{ PZ.suppressClick = false; }, 0);
    }
    PZ.isPanning = false;
  }
  canvas.addEventListener("pointerup", stopPointer);
  canvas.addEventListener("pointercancel", stopPointer);

  const ui = {
    pCount: $("pCount"),
    turnLabel: $("turnLabel"),
    bCount: $("bCount"),
    playersSel: $("playersSel"),
    log: $("log"),
    lightBadge: $("lightBadge"),
    phaseBadge: $("phaseBadge"),
    scoreBadge: $("scoreBadge"),

    // dice
    diceVal: $("diceVal"),
    stepsLeft: $("stepsLeft"),
    rollBtn: $("rollBtn"),
    endTurnBtn: $("endTurnBtn"),

    // jokers
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
  };

  // ---------- Core rules (as decided) ----------
  const RULES = {
    barricadeMax: 15,
    respawnAfterTurnsPerPlayer: 5,
    spawnWeights: { center: 0.50, mid: 0.30, outer: 0.20 },
    forbidSpawnKinds: new Set(["house","start"]), // startfields
    forbidBarricadeKinds: new Set(["house","start"]),
    spawnDifferentFromLast: true,
    diceSides: 6,
  };

  // ---------- State ----------
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
    players: [], // {id,color,score,turnsSinceLight, jokers:{j1,j2,j3,j4,j5}, j5Active:boolean, pendingDouble:boolean, lastRoll:number|null}
    turnIndex: 0,

    pieces: [], // {id,owner,color,nodeId}
    selectedPiece: null,

    phase: "need_roll", // need_roll | need_piece | choose_target | place_barricade | j2_pick_source | j2_pick_target
    stepsLeft: 0,
    rollValue: null,

    j2Source: null,
  };

  const COLORS = ["red","blue","green","yellow","black","white"];

  function log(msg){
    const d = document.createElement("div");
    d.textContent = msg;
    ui.log.appendChild(d);
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  // ---------- Load board.json ----------
  
  function normalizeBoard(raw){
    // Supports:
    // 1) Legacy Barikade board.json (nodes/edges with various fields)
    // 2) board-designer-pro export (meta.tool === "board-designer-pro")
    if (!raw) throw new Error("board missing");

    // board-designer-pro schema
    if (raw.meta && raw.meta.tool === "board-designer-pro" && Array.isArray(raw.nodes) && Array.isArray(raw.edges)){
      const nodes = raw.nodes.map(n => {
        const id = String(n.id);
        const kind = (n.type === "start") ? "house" : "normal";
        const flags = {
          label: (typeof n.label === "string" ? n.label : String(n.id)),
          specialType: (n.specialType || ""),
          boostSteps: (n.boostSteps == null ? undefined : n.boostSteps),
          eventDeckId: (n.eventDeckId || ""),
          start: (n.type === "start"),
          startColor: (n.color || "")
        };
        return { id, x: n.x, y: n.y, kind, flags };
      });
      const edges = raw.edges.map(e => ({ a: String(e.a), b: String(e.b) }));
      const ui = { gridSize: raw.grid?.size ?? 30 };
      return { ui, nodes, edges };
    }

    // legacy: best-effort normalize
    if (Array.isArray(raw.nodes) && Array.isArray(raw.edges)){
      const nodes = raw.nodes.map(n => {
        const id = String(n.id ?? n.nodeId ?? n.name);
        const kind = n.kind ?? n.type ?? "normal";
        const flags = n.flags ?? {};
        return { ...n, id, kind, flags };
      });
      const edges = raw.edges.map(e => ({
        a: String(e.a ?? e.from),
        b: String(e.b ?? e.to)
      }));
      const ui = raw.ui ?? raw.grid ?? {};
      return { ui, nodes, edges };
    }

    throw new Error("unknown board schema");
  }

async function loadBoard(){
    let res;
    try {
      res = await fetch("board_lichtarena.json?v=la4");
      if (!res.ok) throw new Error("no board_lichtarena.json");
    } catch (e) {
      res = await fetch("board.json?v=la3");
    }
    const b = await res.json();
    S.board = b;

    const nodes = b.nodes || b.nodesById || b?.board?.nodes || [];
    if (Array.isArray(nodes)) {
      S.nodes = nodes.map(n => ({
        id: n.id,
        kind: n.kind || n.type || "board",
        x: n.x ?? n.pos?.x ?? 0,
        y: n.y ?? n.pos?.y ?? 0,
        // Board-Designer / Barikade-Kompat:
        color: (n.color || n.flags?.houseColor || "").toLowerCase(),
        label: n.label ?? "",
        specialType: n.specialType ?? n.flags?.specialType ?? "",
        boostSteps: (n.boostSteps ?? n.flags?.boostSteps ?? null),
        eventDeckId: (n.eventDeckId ?? n.flags?.eventDeckId ?? ""),
        flags: n.flags || {},
      }));
    } else {
      S.nodes = Object.values(nodes).map(n => ({
        id: n.id,
        kind: n.kind || n.type || "board",
        x: n.x ?? n.pos?.x ?? 0,
        y: n.y ?? n.pos?.y ?? 0,
        color: (n.color || n.flags?.houseColor || "").toLowerCase(),
        label: n.label ?? "",
        specialType: n.specialType ?? n.flags?.specialType ?? "",
        boostSteps: (n.boostSteps ?? n.flags?.boostSteps ?? null),
        eventDeckId: (n.eventDeckId ?? n.flags?.eventDeckId ?? ""),
        flags: n.flags || {},
      }));
    }

    const edges = b.edges || b.links || [];
    S.edges = edges.map(e => ({ a: e.a || e.from, b: e.b || e.to }));

    S.nodeById = new Map(S.nodes.map(n => [n.id, n]));
    S.adj = new Map();
    for (const n of S.nodes) S.adj.set(n.id, []);
    for (const e of S.edges){
      if (S.adj.has(e.a) && S.adj.has(e.b)){
        S.adj.get(e.a).push(e.b);
        S.adj.get(e.b).push(e.a);
      }
    }

    computeZonesPrototype();
  }

  // Prototype zones by distance to centroid (later we tag zones in board designer)
  function computeZonesPrototype(){
    const pts = S.nodes.filter(n => n.kind !== "house");
    const cx = pts.reduce((a,n)=>a+n.x,0)/Math.max(1,pts.length);
    const cy = pts.reduce((a,n)=>a+n.y,0)/Math.max(1,pts.length);
    const dists = pts.map(n => ({id:n.id, d: Math.hypot(n.x-cx, n.y-cy)})).sort((a,b)=>a.d-b.d);
    const n = dists.length;
    const iCenter = Math.floor(n*0.50);
    const iMid = Math.floor(n*0.80);
    S.zoneOf = new Map();
    for (let i=0;i<n;i++){
      const z = (i < iCenter) ? "center" : (i < iMid) ? "mid" : "outer";
      S.zoneOf.set(dists[i].id, z);
    }
  }

  function resetPlayers(){
    S.players = [];
    for (let i=0;i<S.playerCount;i++){
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

  function currentPlayer(){ return S.players[S.turnIndex]; }

  // Pieces: 4 per player on house nodes for that color (fallback: any non-start)
  function resetPieces(){
    const pieces = [];

    // Startfelder pro Farbe sammeln (Board-Designer: kind="start" + color)
    const startsByColor = new Map();
    for (const n of S.nodes){
      if (String(n.kind).toLowerCase() === "start"){
        const c = String(n.color || n.flags?.houseColor || "").toLowerCase();
        if (!startsByColor.has(c)) startsByColor.set(c, []);
        startsByColor.get(c).push(n.id);
      }
    }

    // stabil sortieren, damit Startfeld-Positionen immer gleich bleiben (nicht "wandern")
    for (const [c, arr] of startsByColor.entries()){
      arr.sort((a,b)=>a-b);
      startsByColor.set(c, arr);
    }

    // 6 Figuren pro Spieler:
    // - 5 Stück auf die 5 Startfelder (falls vorhanden)
    // - 6. Figur: zufällig auf ein normales Feld (nicht Start, nicht Special) -> unbesetzt
    const PIECES_PER_PLAYER = 6;
    const START_PIECES = 5;

    for (const p of S.players){
      const starts = startsByColor.get(p.color) || [];
      // Start-5
      for (let i=0;i<Math.min(START_PIECES, PIECES_PER_PLAYER);i++){
        pieces.push({
          id: `pc_${p.color}_${i+1}`,
          owner: p.id,
          color: p.color,
          nodeId: starts[i] ?? starts[0] ?? pickRandomNormalNodeId(pieces),
        });
      }
      // 6te (random)
      if (PIECES_PER_PLAYER > START_PIECES){
        pieces.push({
          id: `pc_${p.color}_${START_PIECES+1}`,
          owner: p.id,
          color: p.color,
          nodeId: pickRandomNormalNodeId(pieces),
        });
      }
    }

    S.pieces = pieces;
  }

  function pickRandomNormalNodeId(existingPieces){
    const occupied = new Set((existingPieces || S.pieces || []).map(pc => pc.nodeId));
    const arr = S.nodes
      .filter(n => String(n.kind).toLowerCase() === "normal") // NUR normale Felder
      .filter(n => !occupied.has(n.id))
      .map(n => n.id);

    // Fallback (sollte nicht passieren): irgendein Nicht-Start
    if (!arr.length){
      const fallback = S.nodes
        .filter(n => !RULES.forbidSpawnKinds.has(String(n.kind).toLowerCase() === "start" ? "start" : n.kind))
        .map(n=>n.id);
      return fallback[Math.floor(Math.random()*fallback.length)];
    }
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function pickAnyNonStartNodeId(){
    const arr = S.nodes.filter(n => !RULES.forbidSpawnKinds.has(n.kind)).map(n=>n.id);
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function isStartNode(id){
    const n = S.nodeById.get(id);
    return !!n && RULES.forbidSpawnKinds.has(n.kind);
  }

  // ---------- Light spawn ----------
  function spawnLight(reason){
    const prev = S.light;
    const pick = weightedPickLightNode(prev);
    S.lastLight = prev;
    S.light = pick;
    for (const pl of S.players) pl.turnsSinceLight = 0;
    log(`✨ Lichtfeld spawnt (${reason}): ${S.light}`);
    syncUI();
    draw();
  }

  function weightedPickLightNode(prevId){
    const candidates = { center: [], mid: [], outer: [] };
    for (const n of S.nodes){
      if (RULES.forbidSpawnKinds.has(n.kind)) continue;
      if (RULES.spawnDifferentFromLast && prevId && n.id === prevId) continue;
      const z = S.zoneOf.get(n.id) || "mid";
      candidates[z].push(n.id);
    }
    const zone = pickWeightedZones(candidates);
    const arr = candidates[zone];
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function pickWeightedZones(candidates){
    const opts = [
      {k:"center", w: RULES.spawnWeights.center},
      {k:"mid", w: RULES.spawnWeights.mid},
      {k:"outer", w: RULES.spawnWeights.outer},
    ];
    // pick but ensure non-empty
    let z = pickWeighted(opts);
    if (!candidates[z].length){
      z = opts.map(o=>o.k).find(k=>candidates[k].length) || "mid";
    }
    return z;
  }

  function pickWeighted(items){
    const total = items.reduce((a,i)=>a+i.w,0);
    let r = Math.random()*total;
    for (const it of items){
      r -= it.w;
      if (r <= 0) return it.k;
    }
    return items[items.length-1].k;
  }

  // ---------- Turn flow ----------
  function startTurn(){
    const pl = currentPlayer();
    S.phase = "need_roll";
    S.selectedPiece = null;
    S.stepsLeft = 0;
    S.rollValue = null;

    // consume J5 at start of next turn? -> We chose: J5 active for ONE TURN only.
    // So we end it when the turn ends (endTurn())

    syncUI();
    draw();
  }

  function endTurn(reason){
    const pl = currentPlayer();
    if (pl.j5Active){
      pl.j5Active = false;
      log(`🃏 Joker 5 endet für ${pl.color}.`);
    }
    pl.pendingDouble = false;
    pl.lastRoll = S.rollValue;

    // advance turnIndex
    S.turnIndex = (S.turnIndex + 1) % S.players.length;
    const np = currentPlayer();
    np.turnsSinceLight += 1;

    // respawn check
    const all = S.players.every(p => p.turnsSinceLight >= RULES.respawnAfterTurnsPerPlayer);
    if (all){
      spawnLight("5-Runden-Regel");
    }

    log(`⏭️ Zugwechsel (${reason}) → ${np.color}`);
    startTurn();
  }

  function rollDice(){
    const pl = currentPlayer();
    if (S.phase !== "need_roll"){
      log("ℹ️ Du hast bereits gewürfelt oder bist mitten im Zug.");
      return;
    }

    let roll1 = randInt(1, RULES.diceSides);
    let roll2 = null;

    if (pl.pendingDouble){
      roll2 = randInt(1, RULES.diceSides);
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

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  // ---------- Movement (step-by-step clicking) ----------
  function canEnter(nodeId){
    const pl = currentPlayer();
    if (pl.j5Active) return true;
    return !S.barricades.has(nodeId);
  }

  function isEventNode(nodeId){
    const n = S.nodeById.get(nodeId);
    // support future designer fields: flags.specialType === "event" OR label "E" or "eventDeckId" etc.
    const f = n?.flags || {};
    return !!(f.specialType === "event" || f.event === true || f.isEvent === true || f.eventDeckId);
  }

  function onReachNode(piece, nodeId){
    const pl = currentPlayer();

    // scoring
    if (S.light === nodeId){
      pl.score += 1;
      log(`🏁 Punkt! ${pl.color} hat jetzt ${pl.score} Punkte.`);
      spawnLight("Punkt erreicht");
      // end immediately after scoring
      endTurn("Punkt");
      return true;
    }

    // event -> award barricade immediately (if available)
    if (isEventNode(nodeId) && S.barricades.size < RULES.barricadeMax){
      S.phase = "place_barricade";
      log("🎴 Ereignisfeld: Du erhältst 1 Barikade – bitte jetzt platzieren (klick Feld).");
      syncUI(); draw();
      return true;
    }

    return false;
  }

  function reachableExact(fromId, steps){
    // Returns a Set of nodeIds reachable in EXACTLY `steps` moves.
    // Respects barricades unless Joker 5 is active for current player.
    let frontier = new Set([fromId]);
    for (let i=0;i<steps;i++){
      const next = new Set();
      for (const v of frontier){
        const neighbors = S.adj.get(v) || [];
        for (const nb of neighbors){
          if (!canEnter(nb)) continue;
          next.add(nb);
        }
      }
      frontier = next;
      if (!frontier.size) break;
    }
    return frontier;
  }

  function tryMoveTo(targetNodeId){
    if (S.phase !== "choose_target") return;
    const pl = currentPlayer();
    const piece = S.pieces.find(pc => pc.id === S.selectedPiece);
    if (!piece) return;

    const steps = S.stepsLeft || 0;
    if (steps <= 0){
      log("ℹ️ Keine Schritte mehr übrig.");
      return;
    }

    const reachable = reachableExact(piece.nodeId, steps);
    if (!reachable.has(targetNodeId)){
      log(`⛔ Ziel nicht erreichbar in genau ${steps} Schritt(en).`);
      return;
    }

    piece.nodeId = targetNodeId;
    S.stepsLeft = 0;
    log(`➡️ ${pl.color} läuft direkt auf ${targetNodeId} (Wurf: ${S.rollValue}).`);

    // handle arrival effects (score/event)
    const handled = onReachNode(piece, targetNodeId);
    if (handled) return;

    endTurn("Zug fertig");
  }


  // ---------- Barricades ----------
  function placeBarricade(nodeId){
    if (S.phase !== "place_barricade") return;
    if (S.barricades.size >= RULES.barricadeMax){
      log("ℹ️ Max 15 Barikaden erreicht – keine neue Barikade.");
      S.phase = "need_roll";
      return;
    }
    if (isStartNode(nodeId)){
      log("⛔ Barikaden dürfen nicht auf Startfeldern stehen.");
      return;
    }
    S.barricades.add(nodeId);
    log(`🧱 Barikade platziert auf ${nodeId} (${S.barricades.size}/${RULES.barricadeMax})`);
    // continue the turn end (event ends your turn, as in our earlier prototype)
    endTurn("Barikade platziert");
  }

  // ---------- Jokers ----------
  function giveJ(k){
    const pl = currentPlayer();
    pl.jokers[k] += 1;
    log(`🃏 +1 ${k.toUpperCase()}`);
    syncUI();
  }

  function useJ5(){
    const pl = currentPlayer();
    if (pl.jokers.j5 <= 0){ log("🃏 Joker 5 fehlt."); return; }
    if (pl.j5Active){ log("ℹ️ Joker 5 ist bereits aktiv."); return; }
    pl.jokers.j5 -= 1;
    pl.j5Active = true;
    log(`🃏 Joker 5 aktiv: Barikaden werden in diesem Zug ignoriert. (Rest J5: ${pl.jokers.j5})`);
    syncUI(); draw();
  }

  // Joker 4: Doppelwurf (activate before rolling)
  function useJ4(){
    const pl = currentPlayer();
    if (pl.jokers.j4 <= 0){ log("🃏 Joker 4 fehlt."); return; }
    if (S.phase !== "need_roll"){ log("⛔ Joker 4 nur vor dem Würfeln nutzbar."); return; }
    if (pl.pendingDouble){ log("ℹ️ Doppelwurf ist schon aktiv."); return; }
    pl.jokers.j4 -= 1;
    pl.pendingDouble = true;
    log(`🃏 Joker 4 aktiv: Nächster Wurf ist Doppelwurf. (Rest J4: ${pl.jokers.j4})`);
    syncUI();
  }

  // Joker 3: Neuwurf (after rolling, replaces roll and resets steps)
  function useJ3(){
    const pl = currentPlayer();
    if (pl.jokers.j3 <= 0){ log("🃏 Joker 3 fehlt."); return; }
    if (S.phase === "need_roll"){ log("⛔ Joker 3 erst nach einem Wurf nutzbar."); return; }
    // allow in need_piece or moving (reroll sets new steps and cancels selection/movement)
    pl.jokers.j3 -= 1;
    const roll = randInt(1, RULES.diceSides);
    S.rollValue = roll;
    S.stepsLeft = roll;
    S.selectedPiece = null;
    S.phase = "need_piece";
    log(`🃏 Neuwurf: ${roll} (Rest J3: ${pl.jokers.j3})`);
    syncUI(); draw();
  }

  // Joker 2: move/remove barricade (same as v1)
  function useJ2(){
    const pl = currentPlayer();
    if (pl.jokers.j2 <= 0){ log("🃏 Joker 2 fehlt."); return; }
    S.phase = "j2_pick_source";
    S.j2Source = null;
    log("🃏 Joker 2 aktiv: Klick Barikade-Quelle. (Nochmal Quelle = entfernen).");
    syncUI(); draw();
  }

  function handleJ2Click(nodeId){
    const pl = currentPlayer();
    if (S.phase === "j2_pick_source"){
      if (!S.barricades.has(nodeId)){ log("⛔ Keine Barikade auf diesem Feld."); return; }
      S.j2Source = nodeId;
      S.phase = "j2_pick_target";
      log("🃏 Quelle gewählt. Klick Ziel-Feld (nicht Startfeld) ODER klick Quelle nochmal = entfernen.");
      return;
    }
    if (S.phase === "j2_pick_target"){
      if (nodeId === S.j2Source){
        S.barricades.delete(S.j2Source);
        pl.jokers.j2 -= 1;
        log(`🧱 Barikade entfernt (J2). Rest J2: ${pl.jokers.j2}`);
        S.phase = "need_roll";
        S.j2Source = null;
        startTurn(); // reset to safe
        return;
      }
      if (isStartNode(nodeId)){ log("⛔ Ziel ist Startfeld – nicht erlaubt."); return; }
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

  // Joker 1 (placeholder in prototype)
  function useJ1(){
    const pl = currentPlayer();
    if (pl.jokers.j1 <= 0){ log("🃏 Joker 1 fehlt."); return; }
    pl.jokers.j1 -= 1;
    log("🃏 Joker 1 genutzt (Prototype-Platzhalter). In der Online-Version geben wir J1 eine feste Regel.");
    syncUI();
  }

  // ---------- UI sync ----------
  function syncUI(){
    ui.pCount.textContent = String(S.playerCount);
    const pl = currentPlayer();
    ui.turnLabel.textContent = pl ? `${pl.color} (Spieler ${pl.id+1})` : "–";
    ui.bCount.textContent = `${S.barricades.size}/${RULES.barricadeMax}`;
    ui.phaseBadge.textContent = "Phase: " + S.phase;
    ui.phaseBadge.className = "badge on";
    ui.scoreBadge.textContent = "Punkte: " + S.players.map(p=>`${p.color}:${p.score}`).join(" · ");
    ui.lightBadge.textContent = "Licht: " + (S.light ?? "–");

    ui.diceVal.textContent = (S.rollValue ?? "–");
    ui.stepsLeft.textContent = (S.phase === "need_roll") ? "–" : String(S.stepsLeft);

    ui.j1.textContent = String(pl?.jokers.j1 ?? 0);
    ui.j2.textContent = String(pl?.jokers.j2 ?? 0);
    ui.j3.textContent = String(pl?.jokers.j3 ?? 0);
    ui.j4.textContent = String(pl?.jokers.j4 ?? 0);
    ui.j5.textContent = String(pl?.jokers.j5 ?? 0);
    ui.j5a.textContent = pl?.j5Active ? "ja" : "nein";

    // enable/disable key buttons for clarity
    ui.rollBtn.disabled = (S.phase !== "need_roll");
    ui.endTurnBtn.disabled = (S.phase === "place_barricade" || S.phase === "j2_pick_source" || S.phase === "j2_pick_target");
  }

  // ---------- Draw ----------
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    canvas.width = Math.round(rect.width*dpr);
    canvas.height= Math.round(rect.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (CAM.autoFit){
      fitCamera(rect.width, rect.height);
    }
    clampCamera(rect.width, rect.height);
    draw();
  }
  window.addEventListener("resize", resize);

  function draw(){
    if (!S.board) return;
    const w = canvas.width/(window.devicePixelRatio||1);
    const h = canvas.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);

    // Auto-fit once after load/reset, then keep manual pan/zoom.
    if (CAM.autoFit){
      fitCamera(w,h);
    }

    const scale = CAM.scale;
    const ox = CAM.ox;
    const oy = CAM.oy;
    const X=(x)=>x*scale+ox;
    const Y=(y)=>y*scale+oy;

    // --- Background grid (like designer) ---
    const grid = (S.board?.ui?.gridSize ?? 20);
    // draw in screen space using board coordinates to align
    ctx.save();
    ctx.lineWidth = 1;
    // compute visible grid range in board units
    const inv = 1/scale;
    const left = (0 - ox)*inv;
    const top  = (0 - oy)*inv;
    const right= (w - ox)*inv;
    const bot  = (h - oy)*inv;
    const startGX = Math.floor(left/grid)*grid;
    const endGX   = Math.ceil(right/grid)*grid;
    const startGY = Math.floor(top/grid)*grid;
    const endGY   = Math.ceil(bot/grid)*grid;

    for (let gx=startGX; gx<=endGX; gx+=grid){
      const major = (Math.round(gx/grid) % 5 === 0);
      ctx.strokeStyle = major ? "rgba(56,189,248,.18)" : "rgba(148,163,184,.08)";
      ctx.beginPath();
      ctx.moveTo(X(gx), 0);
      ctx.lineTo(X(gx), h);
      ctx.stroke();
    }
    for (let gy=startGY; gy<=endGY; gy+=grid){
      const major = (Math.round(gy/grid) % 5 === 0);
      ctx.strokeStyle = major ? "rgba(56,189,248,.18)" : "rgba(148,163,184,.08)";
      ctx.beginPath();
      ctx.moveTo(0, Y(gy));
      ctx.lineTo(w, Y(gy));
      ctx.stroke();
    }
    ctx.restore();

    // edges
    ctx.lineWidth=3;
    ctx.strokeStyle="rgba(148,163,184,.35)";
    for (const e of S.edges){
      const a=S.nodeById.get(e.a), b=S.nodeById.get(e.b);
      if (!a||!b) continue;
      ctx.beginPath();
      ctx.moveTo(X(a.x),Y(a.y));
      ctx.lineTo(X(b.x),Y(b.y));
      ctx.stroke();
    }

    // nodes
    for (const n of S.nodes){
      const r = (n.kind==="house"||n.kind==="start") ? 18 : 14;
      const isLight = (S.light===n.id);
      const hasBarr = S.barricades.has(n.id);
      const isGoal = !!(n.flags && n.flags.goal);
      const specialType = String(n.flags?.specialType || "");
      const isEvent = !!(specialType==="event" || n.flags?.event===true || n.flags?.isEvent===true);
      const isBoost = !!(specialType==="boost" || n.flags?.boost===true || n.flags?.boostSteps);

      // light glow
      if (isLight){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), (r+14), 0, Math.PI*2);
        ctx.fillStyle = "rgba(34,197,94,.12)";
        ctx.fill();
      }

      // base fill
      ctx.beginPath();
      ctx.arc(X(n.x),Y(n.y), r, 0, Math.PI*2);
      if (n.kind==="house"||n.kind==="start" || n.kind==="start"){
        ctx.fillStyle = "rgba(59,130,246,.10)";
      } else {
        ctx.fillStyle = "rgba(15,23,42,.70)";
      }
      ctx.fill();

      // border
      ctx.lineWidth = isLight ? 4 : 3;
      ctx.strokeStyle = isLight ? "rgba(34,197,94,.85)" : "rgba(148,163,184,.60)";
      ctx.stroke();

      // goal ring
      if (isGoal){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), r+6, 0, Math.PI*2);
        ctx.strokeStyle="rgba(245,158,11,.55)";
        ctx.lineWidth=3;
        ctx.stroke();
      }

      // special rings
      if (isEvent){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), r+4, 0, Math.PI*2);
        ctx.strokeStyle="rgba(59,130,246,.75)";
        ctx.lineWidth=3;
        ctx.stroke();
      }
      if (isBoost){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), r+4, 0, Math.PI*2);
        ctx.strokeStyle="rgba(34,197,94,.65)";
        ctx.lineWidth=3;
        ctx.stroke();
      }

      // barricade mark
      if (hasBarr){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), r*0.70, 0, Math.PI*2);
        ctx.strokeStyle="rgba(239,68,68,.85)";
        ctx.lineWidth=3;
        ctx.stroke();
      }

      // labels (id numbers / E / B+3)
      const label = getNodeLabel(n);
      if (label){
        ctx.font = `${Math.max(10, Math.min(13, r))}px ui-monospace, monospace`;
        ctx.textAlign="center";
        ctx.textBaseline="middle";
        ctx.fillStyle="rgba(226,232,240,.85)";
        ctx.fillText(label, X(n.x), Y(n.y));
      }
    }

    // pieces
    for (const pc of S.pieces){
      const n = S.nodeById.get(pc.nodeId);
      if (!n) continue;
      const sel = (S.selectedPiece===pc.id);
      ctx.beginPath();
      ctx.arc(X(n.x),Y(n.y), 8, 0, Math.PI*2);
      ctx.fillStyle = colorTo(pc.color, .90);
      ctx.fill();
      if (sel){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), 14, 0, Math.PI*2);
        ctx.strokeStyle="rgba(255,255,255,.85)";
        ctx.lineWidth=2;
        ctx.stroke();
      }
    }
  }

  function getNodeLabel(n){
    const f = n.flags || {};
    // priority: explicit label
    if (typeof f.label === "string" && f.label.trim()) return f.label.trim();
    // event/boost shortcuts
    const st = String(f.specialType || "");
    if (st === "event") return "E";
    if (st === "boost"){
      const s = f.boostSteps ?? 3;
      return `B+${s}`;
    }
    // prefer numeric part of id
    const m = String(n.id).match(/(\d+)/g);
    if (m && m.length){
      const last = m[m.length-1];
      // keep short
      if (last.length <= 3) return last;
    }
    return "";
  }

  function colorTo(c,a){
    const map={ red:[239,68,68], blue:[59,130,246], green:[34,197,94], yellow:[245,158,11], black:[17,24,39], white:[226,232,240] };
    const rgb = map[c] || [148,163,184];
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  // ---------- Click handling ----------

  // ---------- Buttons ----------
  ui.playersSel.onchange = ()=>{
    S.playerCount = parseInt(ui.playersSel.value,10);
    ui.pCount.textContent = String(S.playerCount);
    hardReset();
  };

  ui.resetBtn.onclick = ()=>hardReset();
  ui.nextTurnBtn.onclick = ()=>{ log("⏭️ Nächster Zug (manuell)."); endTurn("manuell"); };

  ui.rollBtn.onclick = ()=>rollDice();
  ui.endTurnBtn.onclick = ()=>endTurn("manuell beendet");

  ui.giveJ1.onclick = ()=>giveJ("j1");
  ui.giveJ2.onclick = ()=>giveJ("j2");
  ui.giveJ3.onclick = ()=>giveJ("j3");
  ui.giveJ4.onclick = ()=>giveJ("j4");
  ui.giveJ5.onclick = ()=>giveJ("j5");

  ui.useJ1.onclick = ()=>useJ1();
  ui.useJ2.onclick = ()=>useJ2();
  ui.useJ3.onclick = ()=>useJ3();
  ui.useJ4.onclick = ()=>useJ4();
  ui.useJ5.onclick = ()=>useJ5();

  // ---------- Init ----------
  function hardReset(){
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
    CAM.autoFit = true;
    resize();
    draw();
    log("✅ Lichtarena Offline v2 bereit (Würfel + Schrittbewegung + Joker 3/4).");
  }

  (async function init(){
    await loadBoard();
    CAM.autoFit = true;
    resize();
    S.playerCount = parseInt(ui.playersSel.value,10);
    resetPlayers();
    resetPieces();
    spawnLight("Spielstart");
    startTurn();
    syncUI();
    draw();
    log("✅ Lichtarena Offline v2 bereit.");
  })();
})();
