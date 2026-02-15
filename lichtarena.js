(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const canvas = $("c");
  const ctx = canvas.getContext("2d");

  // =========================
  // Google-Maps-Level Pan/Zoom
  // =========================
  // Mouse: Left-drag pan | Wheel zoom | Double click zoom
  // Touch: 1-finger pan | 2-finger pinch zoom
  // Smooth zoom + pan inertia. Tap/click still selects nodes.
  const CAM = {
    scale: 1,
    targetScale: 1,
    ox: 0,
    oy: 0,
    targetOx: 0,
    targetOy: 0,
    minScale: 0.12,
    maxScale: 8,
    autoFit: true,
    zoomAnchor: null, // {sx,sy,bx,by}
  };

  function screenToBoard(sx, sy){
    return { x: (sx - CAM.ox) / CAM.scale, y: (sy - CAM.oy) / CAM.scale };
  }
  function setAnchorFromScreen(sx, sy){
    const p = screenToBoard(sx, sy);
    CAM.zoomAnchor = { sx, sy, bx: p.x, by: p.y };
  }
  function applyAnchor(){
    if (!CAM.zoomAnchor) return;
    const a = CAM.zoomAnchor;
    CAM.ox = a.sx - a.bx * CAM.scale;
    CAM.oy = a.sy - a.by * CAM.scale;
  }

  const PZ = {
    pointers: new Map(),
    isPanning: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
    lastMoveTs: 0,
    pinchStartDist: 0,
    pinchStartScale: 1,
    pinchMidX: 0,
    pinchMidY: 0,
    inertial: false,
    raf: 0,
  };

  const DRAG_THRESHOLD = 6;
  const FRICTION = 0.92;
  const STOP_VEL = 0.08;

  function stopInertia(){
    PZ.inertial = false;
    PZ.velX = 0;
    PZ.velY = 0;
  }
  function startInertia(){
    if (Math.hypot(PZ.velX, PZ.velY) < 0.3) return;
    PZ.inertial = true;
    scheduleFrame();
  }
  function scheduleFrame(){
    if (PZ.raf) return;
    PZ.raf = requestAnimationFrame(tick);
  }
  function tick(){
    PZ.raf = 0;

    // smooth zoom
    const zDiff = CAM.targetScale - CAM.scale;
    if (Math.abs(zDiff) > 1e-4){
      CAM.scale += zDiff * 0.18;
      applyAnchor();
    } else {
      CAM.scale = CAM.targetScale;
    }

    // smooth pan targets
    const dx = CAM.targetOx - CAM.ox;
    const dy = CAM.targetOy - CAM.oy;
    if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2){
      CAM.ox += dx * 0.18;
      CAM.oy += dy * 0.18;
    } else {
      CAM.ox = CAM.targetOx;
      CAM.oy = CAM.targetOy;
    }

    // inertia
    if (PZ.inertial && !PZ.isPanning){
      CAM.ox += PZ.velX;
      CAM.oy += PZ.velY;
      CAM.targetOx = CAM.ox;
      CAM.targetOy = CAM.oy;
      PZ.velX *= FRICTION;
      PZ.velY *= FRICTION;
      if (Math.hypot(PZ.velX, PZ.velY) < STOP_VEL) stopInertia();
    }

    draw();
    syncUIZoomOnly();

    const stillZooming = Math.abs(CAM.targetScale - CAM.scale) > 1e-3;
    const stillPanning = Math.abs(CAM.targetOx - CAM.ox) > 0.3 || Math.abs(CAM.targetOy - CAM.oy) > 0.3;
    if (stillZooming || stillPanning || PZ.inertial) scheduleFrame();
  }

  function requestZoomAt(sx, sy, factor){
    CAM.autoFit = false;
    setAnchorFromScreen(sx, sy);
    CAM.targetScale = clamp(CAM.targetScale * factor, CAM.minScale, CAM.maxScale);
  }
  function requestZoomTo(sx, sy, scale){
    CAM.autoFit = false;
    setAnchorFromScreen(sx, sy);
    CAM.targetScale = clamp(scale, CAM.minScale, CAM.maxScale);
  }

  function fitCamera(viewW, viewH){
    if (!S.nodes || !S.nodes.length) return;
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
    const s = clamp(Math.min(sx,sy), CAM.minScale, CAM.maxScale);
    CAM.scale = CAM.targetScale = s;
    CAM.ox = CAM.targetOx = pad - minX*s;
    CAM.oy = CAM.targetOy = pad - minY*s;
    CAM.zoomAnchor = null;
  }

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
    fitBtn: $("btnFit"),
    zoomInBtn: $("btnZoomIn"),
    zoomOutBtn: $("btnZoomOut"),
    zoomLabel: $("zoomLabel"),
  };

  function log(msg){
    const d = document.createElement("div");
    d.textContent = msg;
    ui.log.appendChild(d);
    ui.log.scrollTop = ui.log.scrollHeight;
  }

  function syncUIZoomOnly(){
    if (!ui.zoomLabel) return;
    ui.zoomLabel.textContent = `${Math.round(CAM.scale*100)}%`;
  }

  // ---------- Core rules ----------
  const RULES = {
    barricadeMax: 15,
    respawnAfterTurnsPerPlayer: 5,
    spawnWeights: { center: 0.50, mid: 0.30, outer: 0.20 },
    forbidSpawnKinds: new Set(["house","start"]),
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
    players: [],
    turnIndex: 0,
    pieces: [],
    selectedPiece: null,
    phase: "need_roll",
    stepsLeft: 0,
    rollValue: null,
    j2Source: null,
  };

  const COLORS = ["red","blue","green","yellow","black","white"];

  // ---------- Load board.json ----------
  function normalizeBoard(raw){
    if (!raw) throw new Error("board missing");

    if (raw.meta && raw.meta.tool === "board-designer-pro" && Array.isArray(raw.nodes) && Array.isArray(raw.edges)){
      const nodes = raw.nodes.map(n => {
        const id = String(n.id);
        const kind = String(n.type || "normal").toLowerCase();
        const flags = {
          label: (typeof n.label === "string" ? n.label : String(n.id)),
          specialType: (n.specialType || ""),
          boostSteps: (n.boostSteps == null ? undefined : n.boostSteps),
          eventDeckId: (n.eventDeckId || ""),
          start: (n.type === "start"),
          startColor: (n.color || "")
        };
        return { id, x: n.x, y: n.y, kind, color: n.color || "", flags };
      });
      const edges = raw.edges.map(e => ({ a: String(e.a), b: String(e.b) }));
      const uiCfg = { gridSize: raw.grid?.size ?? 30 };
      return { ui: uiCfg, nodes, edges };
    }

    if (Array.isArray(raw.nodes) && Array.isArray(raw.edges)){
      const nodes = raw.nodes.map(n => ({
        id: String(n.id ?? n.nodeId ?? n.name),
        kind: String(n.kind ?? n.type ?? "normal").toLowerCase(),
        x: n.x ?? n.pos?.x ?? 0,
        y: n.y ?? n.pos?.y ?? 0,
        color: (n.color || n.flags?.houseColor || "").toLowerCase(),
        flags: n.flags || {},
      }));
      const edges = raw.edges.map(e => ({ a: String(e.a ?? e.from), b: String(e.b ?? e.to) }));
      const uiCfg = raw.ui ?? raw.grid ?? {};
      return { ui: uiCfg, nodes, edges };
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
    const raw = await res.json();
    const b = normalizeBoard(raw);
    S.board = b;
    S.nodes = b.nodes;
    S.edges = b.edges;

    S.nodeById = new Map(S.nodes.map(n => [String(n.id), n]));
    S.adj = new Map();
    for (const n of S.nodes) S.adj.set(String(n.id), []);
    for (const e of S.edges){
      const a = String(e.a), b2 = String(e.b);
      if (S.adj.has(a) && S.adj.has(b2)){
        S.adj.get(a).push(b2);
        S.adj.get(b2).push(a);
      }
    }
    computeZonesPrototype();
  }

  function computeZonesPrototype(){
    const pts = S.nodes.filter(n => String(n.kind).toLowerCase() !== "house");
    const cx = pts.reduce((a,n)=>a+n.x,0)/Math.max(1,pts.length);
    const cy = pts.reduce((a,n)=>a+n.y,0)/Math.max(1,pts.length);
    const dists = pts.map(n => ({id:String(n.id), d: Math.hypot(n.x-cx, n.y-cy)})).sort((a,b)=>a.d-b.d);
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

  function pickRandomNormalNodeId(existingPieces){
    const occupied = new Set((existingPieces || S.pieces || []).map(pc => String(pc.nodeId)));
    const arr = S.nodes
      .filter(n => String(n.kind).toLowerCase() === "normal")
      .filter(n => !occupied.has(String(n.id)))
      .map(n => String(n.id));
    if (!arr.length){
      const fallback = S.nodes
        .filter(n => !RULES.forbidSpawnKinds.has(String(n.kind).toLowerCase() === "start" ? "start" : String(n.kind).toLowerCase()))
        .map(n=>String(n.id));
      return fallback[Math.floor(Math.random()*fallback.length)];
    }
    return arr[Math.floor(Math.random()*arr.length)];
  }

  function resetPieces(){
    const pieces = [];
    const startsByColor = new Map();
    for (const n of S.nodes){
      if (String(n.kind).toLowerCase() === "start"){
        const c = String(n.color || n.flags?.houseColor || n.flags?.startColor || "").toLowerCase();
        if (!startsByColor.has(c)) startsByColor.set(c, []);
        startsByColor.get(c).push(String(n.id));
      }
    }
    for (const [c, arr] of startsByColor.entries()){
      arr.sort((a,b)=>Number(a)-Number(b));
      startsByColor.set(c, arr);
    }

    const PIECES_PER_PLAYER = 6;
    const START_PIECES = 5;

    for (const p of S.players){
      const starts = startsByColor.get(p.color) || [];
      for (let i=0;i<Math.min(START_PIECES, PIECES_PER_PLAYER);i++){
        pieces.push({
          id: `pc_${p.color}_${i+1}`,
          owner: p.id,
          color: p.color,
          nodeId: starts[i] ?? starts[0] ?? pickRandomNormalNodeId(pieces),
        });
      }
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

  function isStartNode(id){
    const n = S.nodeById.get(String(id));
    if (!n) return false;
    const k = String(n.kind).toLowerCase();
    return k === "start" || RULES.forbidSpawnKinds.has(k);
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
      const kind = String(n.kind).toLowerCase();
      if (RULES.forbidSpawnKinds.has(kind)) continue;
      if (RULES.spawnDifferentFromLast && prevId && String(n.id) === String(prevId)) continue;
      const z = S.zoneOf.get(String(n.id)) || "mid";
      candidates[z].push(String(n.id));
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
    S.phase = "need_roll";
    S.selectedPiece = null;
    S.stepsLeft = 0;
    S.rollValue = null;
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
    S.turnIndex = (S.turnIndex + 1) % S.players.length;
    const np = currentPlayer();
    np.turnsSinceLight += 1;
    const all = S.players.every(p => p.turnsSinceLight >= RULES.respawnAfterTurnsPerPlayer);
    if (all) spawnLight("5-Runden-Regel");
    log(`⏭️ Zugwechsel (${reason}) → ${np.color}`);
    startTurn();
  }

  function randInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

  function rollDice(){
    const pl = currentPlayer();
    if (S.phase !== "need_roll"){
      log("ℹ️ Du hast bereits gewürfelt oder bist mitten im Zug.");
      return;
    }
    const roll1 = randInt(1, RULES.diceSides);
    if (pl.pendingDouble){
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

  function canEnter(nodeId){
    const pl = currentPlayer();
    if (pl.j5Active) return true;
    return !S.barricades.has(String(nodeId));
  }

  function isEventNode(nodeId){
    const n = S.nodeById.get(String(nodeId));
    const f = n?.flags || {};
    const st = String(f.specialType || "");
    return !!(st === "event" || f.event === true || f.isEvent === true || f.eventDeckId);
  }

  function onReachNode(piece, nodeId){
    const pl = currentPlayer();
    if (String(S.light) === String(nodeId)){
      pl.score += 1;
      log(`🏁 Punkt! ${pl.color} hat jetzt ${pl.score} Punkte.`);
      spawnLight("Punkt erreicht");
      endTurn("Punkt");
      return true;
    }
    if (isEventNode(nodeId) && S.barricades.size < RULES.barricadeMax){
      S.phase = "place_barricade";
      log("🎴 Ereignisfeld: Du erhältst 1 Barikade – bitte jetzt platzieren (klick Feld).");
      syncUI();
      draw();
      return true;
    }
    return false;
  }

  function tryStepTo(targetNodeId){
    if (S.phase !== "moving") return;
    const pl = currentPlayer();
    const piece = S.pieces.find(pc => pc.id === S.selectedPiece);
    if (!piece) return;
    if (S.stepsLeft <= 0) return;
    const from = String(piece.nodeId);
    const neighbors = S.adj.get(from) || [];
    if (!neighbors.includes(String(targetNodeId))) return;
    if (!canEnter(targetNodeId)){
      log("⛔ Barikade blockiert. (Nur mit Joker 5 überschreitbar)");
      return;
    }
    piece.nodeId = String(targetNodeId);
    S.stepsLeft -= 1;
    log(`➡️ ${pl.color} Schritt auf ${targetNodeId} (Rest: ${S.stepsLeft})`);
    const handled = onReachNode(piece, targetNodeId);
    if (handled) return;
    if (S.stepsLeft <= 0){
      endTurn("Zug fertig");
      return;
    }
    syncUI();
    draw();
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
    S.barricades.add(String(nodeId));
    log(`🧱 Barikade platziert auf ${nodeId} (${S.barricades.size}/${RULES.barricadeMax})`);
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

  function useJ3(){
    const pl = currentPlayer();
    if (pl.jokers.j3 <= 0){ log("🃏 Joker 3 fehlt."); return; }
    if (S.phase === "need_roll"){ log("⛔ Joker 3 erst nach einem Wurf nutzbar."); return; }
    pl.jokers.j3 -= 1;
    const roll = randInt(1, RULES.diceSides);
    S.rollValue = roll;
    S.stepsLeft = roll;
    S.selectedPiece = null;
    S.phase = "need_piece";
    log(`🃏 Neuwurf: ${roll} (Rest J3: ${pl.jokers.j3})`);
    syncUI(); draw();
  }

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
    const id = String(nodeId);
    if (S.phase === "j2_pick_source"){
      if (!S.barricades.has(id)){ log("⛔ Keine Barikade auf diesem Feld."); return; }
      S.j2Source = id;
      S.phase = "j2_pick_target";
      log("🃏 Quelle gewählt. Klick Ziel-Feld (nicht Startfeld) ODER klick Quelle nochmal = entfernen.");
      return;
    }
    if (S.phase === "j2_pick_target"){
      if (id === S.j2Source){
        S.barricades.delete(S.j2Source);
        pl.jokers.j2 -= 1;
        log(`🧱 Barikade entfernt (J2). Rest J2: ${pl.jokers.j2}`);
        S.phase = "need_roll";
        S.j2Source = null;
        startTurn();
        return;
      }
      if (isStartNode(id)){ log("⛔ Ziel ist Startfeld – nicht erlaubt."); return; }
      S.barricades.delete(S.j2Source);
      S.barricades.add(id);
      pl.jokers.j2 -= 1;
      log(`🧱 Barikade versetzt (J2) → ${id}. Rest J2: ${pl.jokers.j2}`);
      S.phase = "need_roll";
      S.j2Source = null;
      startTurn();
    }
  }

  function useJ1(){
    const pl = currentPlayer();
    if (pl.jokers.j1 <= 0){ log("🃏 Joker 1 fehlt."); return; }
    pl.jokers.j1 -= 1;
    log("🃏 Joker 1 genutzt (Prototype-Platzhalter).");
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
    ui.rollBtn.disabled = (S.phase !== "need_roll");
    ui.endTurnBtn.disabled = (S.phase === "place_barricade" || S.phase === "j2_pick_source" || S.phase === "j2_pick_target");
    syncUIZoomOnly();
  }

  // ---------- Draw ----------
  function resize(){
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio||1;
    canvas.width = Math.round(rect.width*dpr);
    canvas.height= Math.round(rect.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (CAM.autoFit) fitCamera(rect.width, rect.height);
    draw();
    syncUIZoomOnly();
  }
  window.addEventListener("resize", resize);

  function draw(){
    if (!S.board) return;
    const w = canvas.width/(window.devicePixelRatio||1);
    const h = canvas.height/(window.devicePixelRatio||1);
    ctx.clearRect(0,0,w,h);

    if (CAM.autoFit) fitCamera(w,h);

    const scale = CAM.scale;
    const ox = CAM.ox;
    const oy = CAM.oy;
    const X=(x)=>x*scale+ox;
    const Y=(y)=>y*scale+oy;

    // grid
    const grid = (S.board?.ui?.gridSize ?? 30);
    ctx.save();
    ctx.lineWidth = 1;
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
      const a=S.nodeById.get(String(e.a)), b=S.nodeById.get(String(e.b));
      if (!a||!b) continue;
      ctx.beginPath();
      ctx.moveTo(X(a.x),Y(a.y));
      ctx.lineTo(X(b.x),Y(b.y));
      ctx.stroke();
    }

    // nodes
    for (const n of S.nodes){
      const kind = String(n.kind).toLowerCase();
      const r = (kind==="house"||kind==="start") ? 18 : 14;
      const id = String(n.id);
      const isLight = (String(S.light)===id);
      const hasBarr = S.barricades.has(id);
      const specialType = String(n.flags?.specialType || "");
      const isEvent = !!(specialType==="event" || n.flags?.event===true || n.flags?.isEvent===true || n.flags?.eventDeckId);
      const isBoost = !!(specialType==="boost" || n.flags?.boostSteps);

      if (isLight){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), (r+14), 0, Math.PI*2);
        ctx.fillStyle = "rgba(34,197,94,.12)";
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(X(n.x),Y(n.y), r, 0, Math.PI*2);
      ctx.fillStyle = (kind==="house"||kind==="start") ? "rgba(59,130,246,.10)" : "rgba(15,23,42,.70)";
      ctx.fill();
      ctx.lineWidth = isLight ? 4 : 3;
      ctx.strokeStyle = isLight ? "rgba(34,197,94,.85)" : "rgba(148,163,184,.60)";
      ctx.stroke();

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
      if (hasBarr){
        ctx.beginPath();
        ctx.arc(X(n.x),Y(n.y), r*0.70, 0, Math.PI*2);
        ctx.strokeStyle="rgba(239,68,68,.85)";
        ctx.lineWidth=3;
        ctx.stroke();
      }

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
      const n = S.nodeById.get(String(pc.nodeId));
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

    drawMiniMap(w,h);
  }

  function getNodeLabel(n){
    const f = n.flags || {};
    if (typeof f.label === "string" && f.label.trim()) return f.label.trim();
    const st = String(f.specialType || "");
    if (st === "event") return "E";
    if (st === "boost"){
      const s = f.boostSteps ?? 3;
      return `B+${s}`;
    }
    const m = String(n.id).match(/(\d+)/g);
    if (m && m.length){
      const last = m[m.length-1];
      if (last.length <= 3) return last;
    }
    return "";
  }

  function colorTo(c,a){
    const map={ red:[239,68,68], blue:[59,130,246], green:[34,197,94], yellow:[245,158,11], black:[17,24,39], white:[226,232,240] };
    const rgb = map[c] || [148,163,184];
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  // mini-map overlay
  function drawMiniMap(w,h){
    if (!S.nodes?.length) return;
    const pad = 12;
    const mw = 170;
    const mh = 110;
    const x0 = w - mw - pad;
    const y0 = h - mh - pad;

    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const n of S.nodes){
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x); maxY=Math.max(maxY,n.y);
    }
    const bw=Math.max(1,maxX-minX);
    const bh=Math.max(1,maxY-minY);
    const s = Math.min((mw-16)/bw, (mh-16)/bh);
    const ox = x0 + 8 - minX*s;
    const oy = y0 + 8 - minY*s;
    const MX=(x)=>x*s+ox;
    const MY=(y)=>y*s+oy;

    ctx.save();
    ctx.fillStyle = "rgba(2,6,23,.45)";
    ctx.strokeStyle = "rgba(148,163,184,.25)";
    ctx.lineWidth = 1;
    roundRect(ctx, x0, y0, mw, mh, 10);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(148,163,184,.22)";
    for (const e of S.edges){
      const a=S.nodeById.get(String(e.a)), b=S.nodeById.get(String(e.b));
      if (!a||!b) continue;
      ctx.beginPath();
      ctx.moveTo(MX(a.x), MY(a.y));
      ctx.lineTo(MX(b.x), MY(b.y));
      ctx.stroke();
    }
    for (const n of S.nodes){
      ctx.beginPath();
      ctx.arc(MX(n.x), MY(n.y), 2.2, 0, Math.PI*2);
      ctx.fillStyle = (String(n.kind).toLowerCase()==="start") ? "rgba(59,130,246,.9)" : "rgba(226,232,240,.55)";
      ctx.fill();
    }

    const view = {
      left: (0 - CAM.ox) / CAM.scale,
      top: (0 - CAM.oy) / CAM.scale,
      right: (w - CAM.ox) / CAM.scale,
      bottom: (h - CAM.oy) / CAM.scale,
    };
    ctx.strokeStyle = "rgba(34,197,94,.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(MX(view.left), MY(view.top), (view.right-view.left)*s, (view.bottom-view.top)*s);

    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r){
    const rr = Math.min(r, w/2, h/2);
    c.beginPath();
    c.moveTo(x+rr, y);
    c.arcTo(x+w, y, x+w, y+h, rr);
    c.arcTo(x+w, y+h, x, y+h, rr);
    c.arcTo(x, y+h, x, y, rr);
    c.arcTo(x, y, x+w, y, rr);
    c.closePath();
  }

  // ---------- Click/tap handling (after pan threshold) ----------
  function nearestNodeAtScreen(sx, sy){
    const scale = CAM.scale;
    const ox = CAM.ox;
    const oy = CAM.oy;
    let best=null, bestD=1e9;
    for (const n of S.nodes){
      const x=n.x*scale+ox, y=n.y*scale+oy;
      const d=Math.hypot(x-sx,y-sy);
      if (d<bestD){ bestD=d; best=n; }
    }
    if (!best || bestD>24) return null;
    return best;
  }

  function handleTapOnBoard(sx, sy){
    const best = nearestNodeAtScreen(sx, sy);
    if (!best) return;
    const nodeId = String(best.id);

    if (S.phase === "place_barricade"){ placeBarricade(nodeId); return; }
    if (S.phase === "j2_pick_source" || S.phase === "j2_pick_target"){ handleJ2Click(nodeId); syncUI(); draw(); return; }

    const pl = currentPlayer();
    if (S.phase === "need_piece"){
      const pcsHere = S.pieces.filter(pc => String(pc.nodeId)===nodeId && pc.owner===pl.id);
      if (!pcsHere.length){ log("ℹ️ Wähle eine eigene Figur."); return; }
      S.selectedPiece = pcsHere[0].id;
      S.phase = "moving";
      log(`✅ Figur gewählt (${S.selectedPiece}). Jetzt Schritt für Schritt klicken. (Rest: ${S.stepsLeft})`);
      syncUI(); draw();
      return;
    }
    if (S.phase === "moving" && S.selectedPiece){
      tryStepTo(nodeId);
      syncUI(); draw();
    }
  }

  // ---------- Input listeners ----------
  canvas.style.touchAction = "none";
  canvas.addEventListener("contextmenu", (e)=>e.preventDefault());

  canvas.addEventListener("wheel", (e)=>{
    e.preventDefault();
    stopInertia();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    requestZoomAt(sx, sy, e.deltaY > 0 ? 0.9 : 1.1);
    scheduleFrame();
  }, {passive:false});

  canvas.addEventListener("dblclick", (e)=>{
    e.preventDefault();
    stopInertia();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    requestZoomAt(sx, sy, 1.6);
    scheduleFrame();
  });

  canvas.addEventListener("pointerdown", (e)=>{
    canvas.setPointerCapture(e.pointerId);
    stopInertia();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    PZ.pointers.set(e.pointerId, {x:sx,y:sy,type:e.pointerType});
    PZ.startX = PZ.lastX = sx;
    PZ.startY = PZ.lastY = sy;
    PZ.moved = false;
    PZ.isPanning = false;
    PZ.velX = 0;
    PZ.velY = 0;
    PZ.lastMoveTs = performance.now();
  });

  canvas.addEventListener("pointermove", (e)=>{
    if (!PZ.pointers.has(e.pointerId)) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    PZ.pointers.set(e.pointerId, {x:sx,y:sy,type:e.pointerType});

    const touches = [...PZ.pointers.values()].filter(p=>p.type==="touch");
    if (touches.length >= 2){
      const a = touches[0], b = touches[1];
      const midX = (a.x + b.x)/2;
      const midY = (a.y + b.y)/2;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.hypot(dx,dy) || 1;
      if (!PZ.isPanning || PZ.pinchStartDist === 0){
        PZ.isPanning = true;
        PZ.pinchStartDist = dist;
        PZ.pinchStartScale = CAM.targetScale;
        PZ.pinchMidX = midX;
        PZ.pinchMidY = midY;
        setAnchorFromScreen(midX, midY);
      }
      // pan
      const pdx = midX - PZ.pinchMidX;
      const pdy = midY - PZ.pinchMidY;
      CAM.ox += pdx; CAM.oy += pdy;
      CAM.targetOx = CAM.ox; CAM.targetOy = CAM.oy;
      PZ.pinchMidX = midX; PZ.pinchMidY = midY;
      // zoom
      const factor = dist / (PZ.pinchStartDist || 1);
      requestZoomTo(midX, midY, PZ.pinchStartScale * factor);
      scheduleFrame();
      return;
    }

    const moveDx = sx - PZ.startX;
    const moveDy = sy - PZ.startY;
    if (!PZ.isPanning && Math.hypot(moveDx, moveDy) >= DRAG_THRESHOLD){
      PZ.isPanning = true;
      PZ.moved = true;
    }
    if (!PZ.isPanning) return;
    CAM.autoFit = false;

    const dx2 = sx - PZ.lastX;
    const dy2 = sy - PZ.lastY;
    CAM.ox += dx2; CAM.oy += dy2;
    CAM.targetOx = CAM.ox; CAM.targetOy = CAM.oy;
    PZ.lastX = sx; PZ.lastY = sy;

    const now = performance.now();
    const dt = Math.max(8, now - PZ.lastMoveTs);
    const vx = dx2 * (16/dt);
    const vy = dy2 * (16/dt);
    PZ.velX = PZ.velX*0.55 + vx*0.45;
    PZ.velY = PZ.velY*0.55 + vy*0.45;
    PZ.lastMoveTs = now;

    draw();
    syncUIZoomOnly();
  });

  function stopPointer(e){
    PZ.pointers.delete(e.pointerId);
    const touches = [...PZ.pointers.values()].filter(p=>p.type==="touch");
    if (touches.length < 2) PZ.pinchStartDist = 0;

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (!PZ.isPanning && !PZ.moved){
      handleTapOnBoard(sx, sy);
    } else {
      startInertia();
    }

    if (PZ.pointers.size === 0){
      PZ.isPanning = false;
      PZ.moved = false;
    }
  }
  canvas.addEventListener("pointerup", stopPointer);
  canvas.addEventListener("pointercancel", stopPointer);

  // ---------- Buttons ----------
  ui.playersSel.onchange = ()=>{
    S.playerCount = parseInt(ui.playersSel.value,10);
    ui.pCount.textContent = String(S.playerCount);
    hardReset();
  };
  ui.resetBtn.onclick = ()=>hardReset();
  ui.nextTurnBtn.onclick = ()=>{ log("⏭️ Nächster Zug (manuell)." ); endTurn("manuell"); };
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

  if (ui.fitBtn){
    ui.fitBtn.onclick = ()=>{
      const rect = canvas.getBoundingClientRect();
      CAM.autoFit = true;
      fitCamera(rect.width, rect.height);
      resize();
      draw();
      syncUIZoomOnly();
    };
  }
  if (ui.zoomInBtn){
    ui.zoomInBtn.onclick = ()=>{
      const rect = canvas.getBoundingClientRect();
      requestZoomAt(rect.width/2, rect.height/2, 1.25);
      scheduleFrame();
    };
  }
  if (ui.zoomOutBtn){
    ui.zoomOutBtn.onclick = ()=>{
      const rect = canvas.getBoundingClientRect();
      requestZoomAt(rect.width/2, rect.height/2, 0.8);
      scheduleFrame();
    };
  }

  // ---------- Reset ----------
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
    log("✅ Lichtarena Offline bereit (Google-Maps Pan/Zoom)." );
  }

  // ---------- Init ----------
  (async function init(){
    await loadBoard();
    S.playerCount = parseInt(ui.playersSel.value,10);
    resetPlayers();
    resetPieces();
    spawnLight("Spielstart");
    startTurn();
    syncUI();
    CAM.autoFit = true;
    resize();
    draw();
    log("✅ Lichtarena Offline bereit." );
  })();

})();
