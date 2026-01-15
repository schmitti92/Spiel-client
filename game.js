/* Barikade – Client (Canvas) – Online (WS) */
/* PATCH:
   1) FIX: applyRemoteState war teilweise doppelt/kaputt (Syntax/Braces) -> repariert
   2) FIX: Render Free Cold-Start: erst /health wecken + WS reconnect retry
   3) Keine bestehenden Features entfernt (nur stabiler gemacht)
*/

let isAnimatingMove = false; // verhindert Klick-Crash nach Refactor

(() => {
  const $ = (id) => document.getElementById(id);

  // ===== UI Elements =====
  const canvas = $("board");
  const ctx = canvas.getContext("2d");

  const rollBtn  = $("rollBtn");
  const startBtn = $("startBtn");
  const endBtn   = $("endBtn");
  const skipBtn  = $("skipBtn");
  const resetBtn = $("resetBtn");
  const resumeBtn= $("resumeBtn");

  const serverLabel = $("serverLabel");
  const roomInput = $("roomCode");
  const hostBtn   = $("hostBtn");
  const joinBtn   = $("joinBtn");
  const leaveBtn  = $("leaveBtn");
  const statusEl  = $("statusText");
  const youAreEl  = $("youAreText");
  const activeEl  = $("activePlayersText");
  const connEl    = $("connText");
  const waitEl    = $("waitText");

  const boardCountEl = $("boardCount");
  const barricadeCountEl = $("barricadeCount");

  const debugBtn = $("debugBtn");
  const debugPanel = $("debugPanel");
  const debugLogEl = $("debugLog");
  const debugForceColorBtns = {
    red: $("forceRed"),
    blue: $("forceBlue"),
    green: $("forceGreen"),
    yellow: $("forceYellow")
  };

  const saveBtn = $("saveBtn");
  const loadBtn = $("loadBtn");
  const restoreBtn = $("restoreBtn");
  const loadFile = $("loadFile");
  const autoSaveInfo = $("autoSaveInfo");

  function debugLog(...args){
    try{ console.log(...args); }catch(_e){}
    if(debugLogEl){
      try{
        debugLogEl.textContent += args.map(a=>typeof a==='string'?a:JSON.stringify(a)).join(' ') + "\n";
        debugLogEl.scrollTop = debugLogEl.scrollHeight;
      }catch(_e){}
    }
  }

  // ===== Constants =====
  const SERVER_URL = "wss://spiel-server.onrender.com";
  const WAKE_URL   = "https://spiel-server.onrender.com/health";

  if(serverLabel) serverLabel.textContent = SERVER_URL;

  const COLORS = ["red","blue","green","yellow"];
  const COLOR_LABEL = { red:"Rot", blue:"Blau", green:"Grün", yellow:"Gelb" };

  // ===== State =====
  let ws = null;
  let netMode = "offline"; // offline | host | client
  let netCanStart = false;
  let roomCode = "";
  let clientId = null;

  // stable identity for reconnect
  const SESSION_KEY = "barikade_sessionToken_v1";
  let sessionToken = localStorage.getItem(SESSION_KEY);
  if(!sessionToken){
    sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, sessionToken);
  }

  // game snapshot from server
  let remoteState = null;
  let players = [];
  let myColor = null;
  let isHost = false;

  // selection
  let selectedPieceId = null;
  let legalTargets = new Set();
  let lastRollValue = null;

  // view
  let view = { x:0, y:0, scale:1 };
  let dragging = false;
  let dragStart = null;

  // board model (loaded from board.json)
  let BOARD = null;
  let NODES = new Map();
  let EDGES = [];
  let ADJ = new Map();
  let STARTS = {};
  let GOAL = null;

  // ===== Load board.json =====
  async function loadBoard(){
    const res = await fetch("board.json", { cache:"no-store" });
    BOARD = await res.json();
    NODES = new Map((BOARD.nodes||[]).map(n => [n.id, n]));
    EDGES = BOARD.edges || [];
    ADJ = new Map();
    for(const [a,b] of EDGES){
      if(!ADJ.has(a)) ADJ.set(a, new Set());
      if(!ADJ.has(b)) ADJ.set(b, new Set());
      ADJ.get(a).add(b);
      ADJ.get(b).add(a);
    }
    STARTS = BOARD.meta?.starts || {};
    GOAL = BOARD.meta?.goal || null;

    if(boardCountEl) boardCountEl.textContent = String((BOARD.nodes||[]).filter(n=>n.kind==="board").length);
  }

  // ===== Render helpers =====
  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * devicePixelRatio);
    canvas.height = Math.floor(rect.height * devicePixelRatio);
  }

  function worldToScreen(x,y){
    return {
      x: (x + view.x) * view.scale,
      y: (y + view.y) * view.scale
    };
  }

  function screenToWorld(x,y){
    return {
      x: x / view.scale - view.x,
      y: y / view.scale - view.y
    };
  }

  function draw(){
    if(!BOARD) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width, canvas.height);

    // background
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // grid faint
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#fff";
    const step = 80*devicePixelRatio;
    for(let x=0;x<canvas.width;x+=step){
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
    }
    for(let y=0;y<canvas.height;y+=step){
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }
    ctx.restore();

    // edges
    ctx.save();
    ctx.lineWidth = 6*devicePixelRatio;
    ctx.strokeStyle = "rgba(160,190,255,0.25)";
    for(const [a,b] of EDGES){
      const na = NODES.get(a), nb = NODES.get(b);
      if(!na||!nb) continue;
      const A = worldToScreen(na.x, na.y);
      const B = worldToScreen(nb.x, nb.y);
      ctx.beginPath();
      ctx.moveTo(A.x*devicePixelRatio, A.y*devicePixelRatio);
      ctx.lineTo(B.x*devicePixelRatio, B.y*devicePixelRatio);
      ctx.stroke();
    }
    ctx.restore();

    // nodes
    for(const n of BOARD.nodes||[]){
      if(n.kind!=="board") continue;
      const p = worldToScreen(n.x, n.y);
      const r = 16; // world radius
      const R = r*view.scale*devicePixelRatio;

      // base circle
      ctx.beginPath();
      ctx.fillStyle = "rgba(160,200,255,0.85)";
      ctx.arc(p.x*devicePixelRatio, p.y*devicePixelRatio, R, 0, Math.PI*2);
      ctx.fill();

      // outline for special
      if(n.flags?.goal){
        ctx.lineWidth = 4*devicePixelRatio;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.stroke();
      }

      // legal targets highlight
      if(legalTargets.has(n.id)){
        ctx.lineWidth = 5*devicePixelRatio;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.stroke();
      }
    }

    // barricades
    if(remoteState?.barricades){
      for(const id of remoteState.barricades){
        const n = NODES.get(id);
        if(!n) continue;
        const p = worldToScreen(n.x,n.y);
        const R = 18*view.scale*devicePixelRatio;
        ctx.beginPath();
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.arc(p.x*devicePixelRatio, p.y*devicePixelRatio, R, 0, Math.PI*2);
        ctx.fill();

        ctx.lineWidth = 5*devicePixelRatio;
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.stroke();
      }
    }

    // pieces
    if(remoteState?.pieces){
      for(const pc of remoteState.pieces){
        const color = pc.color;
        let x=null,y=null;
        if(pc.posKind==="board" && pc.nodeId){
          const n = NODES.get(pc.nodeId);
          if(!n) continue;
          x=n.x; y=n.y;
        }else{
          // draw houses off-board at bottom, simple layout by color+label
          // (keine Funktionsänderung, nur Darstellung)
          const baseX = 120 + COLORS.indexOf(color)*220;
          const baseY = 820;
          x = baseX + (pc.label-1)*38;
          y = baseY;
        }
        const p = worldToScreen(x,y);
        const R = 18*view.scale*devicePixelRatio;

        // token
        ctx.beginPath();
        ctx.fillStyle = color==="red" ? "#ff4d6d" : color==="blue" ? "#4d7dff" : color==="green" ? "#3bdc97" : "#ffd24d";
        ctx.arc(p.x*devicePixelRatio, p.y*devicePixelRatio, R, 0, Math.PI*2);
        ctx.fill();

        // ring
        ctx.lineWidth = (pc.id===selectedPieceId ? 6 : 4)*devicePixelRatio;
        ctx.strokeStyle = pc.id===selectedPieceId ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.4)";
        ctx.stroke();

        // label
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.font = `${Math.floor(18*view.scale*devicePixelRatio)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(pc.label), p.x*devicePixelRatio, p.y*devicePixelRatio);
      }
    }

    // top status bubble
    if(remoteState?.turnColor){
      // (UI already shows it, keep canvas clean)
    }
  }

  // ===== Net UI =====
  function setNetStatus(connected){
    if(connEl) connEl.textContent = connected ? "Online" : "Offline";
    // host/join buttons only make sense when offline? we keep enabled; server handles
  }

  function updateHeader(){
    // current turn dot + label
    const turn = remoteState?.turnColor;
    if(statusEl){
      if(turn){
        statusEl.textContent = `${COLOR_LABEL[turn] || turn} ist dran`;
      }else{
        statusEl.textContent = "—";
      }
    }
    if(youAreEl){
      youAreEl.textContent = myColor ? (COLOR_LABEL[myColor] || myColor) : "—";
    }
    if(activeEl){
      const active = remoteState?.activeColors || [];
      activeEl.textContent = active.length ? active.map(c=>COLOR_LABEL[c]||c).join(", ") : "—";
    }
    if(barricadeCountEl){
      barricadeCountEl.textContent = remoteState?.barricades ? String(remoteState.barricades.length) : "—";
    }

    // roll button enabled only if it's your turn and need_roll
    const canRoll = !!(remoteState && myColor && remoteState.turnColor===myColor && !remoteState.paused && remoteState.phase==="need_roll");
    if(rollBtn) rollBtn.disabled = !canRoll;

    // end/skip similar
    const canEnd = !!(remoteState && myColor && remoteState.turnColor===myColor && !remoteState.paused && remoteState.phase!=="place_barricade");
    if(endBtn) endBtn.disabled = !canEnd;
    if(skipBtn) skipBtn.disabled = !canEnd;

    // start button: host only; enabled if canStart
    if(startBtn){
      startBtn.disabled = !(isHost && netCanStart);
    }
    // resume: host only
    if(resumeBtn){
      resumeBtn.disabled = !(isHost && remoteState && remoteState.paused);
    }
  }

  function applyRemoteState(state){
    remoteState = state;
    // reset selection if now illegal
    if(selectedPieceId && remoteState?.pieces){
      const pc = remoteState.pieces.find(p=>p.id===selectedPieceId);
      if(!pc || pc.color !== myColor) selectedPieceId = null;
    }
    // legal targets reset
    legalTargets = new Set();
    updateHeader();
    draw();
  }

  function applyRoomUpdate(payload){
    players = payload.players || [];
    netCanStart = !!payload.canStart;

    // detect own player
    const me = players.find(p => p.id === clientId);
    if(me){
      myColor = me.color || null;
      isHost = !!me.isHost;
    }else{
      myColor = null;
      isHost = false;
    }

    updateHeader();
  }

  // ===== Render Wake-up (Render Free cold start) =====
  async function wakeServer(){
    try{
      const ctrl = new AbortController();
      const t = setTimeout(()=>ctrl.abort(), 5000);
      await fetch(WAKE_URL, { cache:"no-store", signal: ctrl.signal });
      clearTimeout(t);
      debugLog("[wake] ok");
      return true;
    }catch(e){
      debugLog("[wake] fail", e?.message || e);
      return false;
    }
  }

  // ===== WebSocket =====
  let connectTimer = null;
  let reconnectBackoff = 800;

  function clearConnectTimer(){
    if(connectTimer){ clearTimeout(connectTimer); connectTimer=null; }
  }

  async function connectWS(){
    clearConnectTimer();

    // If already open, do nothing
    if(ws && (ws.readyState===WebSocket.OPEN || ws.readyState===WebSocket.CONNECTING)) return;

    // Wake server first to avoid Render sleep/handshake failure
    await wakeServer();
    await new Promise(r=>setTimeout(r, 900));

    debugLog("[ws] connecting...", SERVER_URL);
    try{
      ws = new WebSocket(SERVER_URL);
    }catch(e){
      debugLog("[ws] ctor fail", e?.message || e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectBackoff = 800;
      setNetStatus(true);
      debugLog("[ws] open");
      // auto-rejoin if roomCode exists
      if(roomCode){
        sendWS({
          type:"join",
          room: roomCode,
          name: "Spieler",
          asHost: (netMode==="host"),
          sessionToken
        });
      }
    };

    ws.onmessage = (ev) => {
      let msg=null;
      try{ msg = JSON.parse(ev.data); }catch(_e){ return; }

      if(msg.type==="hello"){
        clientId = msg.clientId;
        debugLog("[ws] hello", clientId);
        return;
      }
      if(msg.type==="room_update"){
        applyRoomUpdate(msg);
        return;
      }
      if(msg.type==="snapshot" || msg.type==="started"){
        if(msg.state) applyRemoteState(msg.state);
        return;
      }
      if(msg.type==="roll"){
        lastRollValue = msg.value;
        if(msg.state) applyRemoteState(msg.state);
        return;
      }
      if(msg.type==="move"){
        if(msg.state) applyRemoteState(msg.state);
        return;
      }
      if(msg.type==="reset_done"){
        applyRemoteState(null);
        return;
      }
      if(msg.type==="error"){
        debugLog("[server-error]", msg.code, msg.message);
        return;
      }
    };

    ws.onerror = () => {
      debugLog("[ws] error");
    };

    ws.onclose = () => {
      setNetStatus(false);
      debugLog("[ws] close -> reconnect");
      scheduleReconnect();
    };
  }

  function scheduleReconnect(){
    clearConnectTimer();
    reconnectBackoff = Math.min(6000, Math.floor(reconnectBackoff*1.35));
    connectTimer = setTimeout(()=>connectWS(), reconnectBackoff);
  }

  function sendWS(obj){
    try{
      if(!ws || ws.readyState!==WebSocket.OPEN){
        debugLog("[ws] send blocked (not open)", obj?.type);
        return;
      }
      ws.send(JSON.stringify(obj));
    }catch(e){
      debugLog("[ws] send fail", e?.message || e);
    }
  }

  // ===== Actions =====
  function join(asHost){
    roomCode = String(roomInput?.value || "").trim().toUpperCase();
    if(!roomCode){ alert("Raumcode fehlt"); return; }
    netMode = asHost ? "host" : "client";
    connectWS().then(()=>{
      // After open, join will auto-send in onopen; but if already open:
      if(ws && ws.readyState===WebSocket.OPEN){
        sendWS({ type:"join", room: roomCode, name:"Spieler", asHost, sessionToken });
      }
    });
  }

  function leave(){
    try{
      if(ws && ws.readyState===WebSocket.OPEN){
        sendWS({ type:"leave" });
      }
    }catch(_e){}
    roomCode = "";
    netMode = "offline";
    myColor = null;
    isHost = false;
    netCanStart = false;
    applyRemoteState(null);
  }

  // ===== Click handling =====
  function findClosestBoardNode(worldX, worldY){
    let best=null, bestD=Infinity;
    for(const n of BOARD.nodes||[]){
      if(n.kind!=="board") continue;
      const dx = n.x - worldX;
      const dy = n.y - worldY;
      const d = dx*dx + dy*dy;
      if(d<bestD){ bestD=d; best=n; }
    }
    return best;
  }

  function onCanvasClick(ev){
    if(!remoteState || remoteState.paused) return;
    const rect = canvas.getBoundingClientRect();
    const sx = (ev.clientX - rect.left) * devicePixelRatio;
    const sy = (ev.clientY - rect.top) * devicePixelRatio;
    const w = screenToWorld(sx/devicePixelRatio, sy/devicePixelRatio);

    // placing barricade mode
    if(remoteState.phase==="place_barricade"){
      if(!myColor || remoteState.turnColor!==myColor) return;
      const node = findClosestBoardNode(w.x, w.y);
      if(node){
        sendWS({ type:"place_barricade", nodeId: node.id });
      }
      return;
    }

    // select piece if it's your turn and need_move
    if(remoteState.phase==="need_move"){
      if(!myColor || remoteState.turnColor!==myColor) return;

      // if clicked on a legal target -> move
      const node = findClosestBoardNode(w.x, w.y);
      if(node && legalTargets.has(node.id) && selectedPieceId){
        if(isAnimatingMove) return;
        isAnimatingMove = true;
        sendWS({ type:"move_request", pieceId: selectedPieceId, targetId: node.id });
        setTimeout(()=>{ isAnimatingMove=false; }, 350);
        return;
      }

      // else select nearest own piece (on board)
      let best=null, bestD=Infinity;
      for(const pc of remoteState.pieces||[]){
        if(pc.color!==myColor) continue;
        let x=null,y=null;
        if(pc.posKind==="board" && pc.nodeId){
          const n = NODES.get(pc.nodeId); if(!n) continue;
          x=n.x; y=n.y;
        }else{
          continue;
        }
        const dx=x-w.x, dy=y-w.y;
        const d=dx*dx+dy*dy;
        if(d<bestD){ bestD=d; best=pc; }
      }
      if(best){
        selectedPieceId = best.id;
        // request legal targets
        sendWS({ type:"legal_request", pieceId: selectedPieceId });
        // server responds with {type:"legal", targets:[...]}
        // we handle it below by patching message handler:
      }
    }
  }

  // Patch: handle "legal" message inside onmessage (kept minimal, without breaking)
  function handleLegal(msg){
    if(msg.type!=="legal") return false;
    if(msg.pieceId!==selectedPieceId) return true;
    legalTargets = new Set(msg.targets||[]);
    draw();
    return true;
  }

  // Attach additional handler by wrapping ws.onmessage after connect:
  const _origConnectWS = connectWS;
  connectWS = async function(){
    await _origConnectWS();
    // If ws exists, ensure legal handler is included:
    if(ws){
      const prev = ws.onmessage;
      ws.onmessage = (ev)=>{
        let msg=null;
        try{ msg = JSON.parse(ev.data); }catch(_e){ return; }
        if(handleLegal(msg)) return;
        // re-run previous handler logic by simulating event
        // We can't call prev(ev) safely because we replaced it in _origConnectWS; so this is no-op.
        // (NOTE: main handler already handles all known types; legal handled here)
        // We'll just fall back to the main switch by re-dispatching:
        if(msg.type==="hello"){ clientId = msg.clientId; debugLog("[ws] hello", clientId); return; }
        if(msg.type==="room_update"){ applyRoomUpdate(msg); return; }
        if(msg.type==="snapshot" || msg.type==="started"){ if(msg.state) applyRemoteState(msg.state); return; }
        if(msg.type==="roll"){ lastRollValue = msg.value; if(msg.state) applyRemoteState(msg.state); return; }
        if(msg.type==="move"){ if(msg.state) applyRemoteState(msg.state); return; }
        if(msg.type==="reset_done"){ applyRemoteState(null); return; }
        if(msg.type==="error"){ debugLog("[server-error]", msg.code, msg.message); return; }
      };
    }
  };

  // ===== Button bindings =====
  if(hostBtn) hostBtn.onclick = () => join(true);
  if(joinBtn) joinBtn.onclick = () => join(false);
  if(leaveBtn) leaveBtn.onclick = () => leave();

  if(startBtn) startBtn.onclick = () => sendWS({ type:"start" });
  if(resumeBtn) resumeBtn.onclick = () => sendWS({ type:"resume" });
  if(rollBtn) rollBtn.onclick = () => sendWS({ type:"roll_request" });
  if(endBtn) endBtn.onclick = () => sendWS({ type:"end_turn" });
  if(skipBtn) skipBtn.onclick = () => sendWS({ type:"skip_turn" });
  if(resetBtn) resetBtn.onclick = () => sendWS({ type:"reset" });

  if(debugBtn) debugBtn.onclick = () => {
    if(!debugPanel) return;
    debugPanel.style.display = (debugPanel.style.display==="none" || !debugPanel.style.display) ? "block" : "none";
  };

  for(const c of COLORS){
    const b = debugForceColorBtns[c];
    if(b){
      b.onclick = () => sendWS({ type:"claim_color", color:c, playerId: clientId });
    }
  }

  // ===== Canvas events =====
  canvas.addEventListener("click", onCanvasClick);

  // zoom/pan (basic)
  canvas.addEventListener("pointerdown", (ev)=>{
    dragging = true;
    dragStart = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev)=>{
    if(!dragging || !dragStart) return;
    const dx = (ev.clientX - dragStart.x)/view.scale;
    const dy = (ev.clientY - dragStart.y)/view.scale;
    view.x = dragStart.vx + dx;
    view.y = dragStart.vy + dy;
    draw();
  });
  canvas.addEventListener("pointerup", (ev)=>{
    dragging = false;
    dragStart = null;
    try{ canvas.releasePointerCapture(ev.pointerId); }catch(_e){}
  });
  canvas.addEventListener("wheel", (ev)=>{
    ev.preventDefault();
    const delta = Math.sign(ev.deltaY);
    const factor = delta>0 ? 0.9 : 1.1;
    view.scale = Math.max(0.35, Math.min(2.4, view.scale*factor));
    draw();
  }, { passive:false });

  // ===== Init =====
  async function init(){
    await loadBoard();
    resizeCanvas();
    window.addEventListener("resize", ()=>{ resizeCanvas(); draw(); });

    // auto connect (stays offline until host/join, but ensures server wake+ws ready)
    // We keep it light: just prepare socket; join happens on buttons.
    connectWS().catch(()=>{ /* ignore */ });

    draw();
    updateHeader();
  }

  init().catch(e => {
    console.error(e);
    alert("JavaScript-Fehler beim Start. Bitte Screenshot senden.\n" + (e?.message||e));
  });
})();
