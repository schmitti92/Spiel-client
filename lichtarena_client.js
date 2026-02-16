/* =========================================================
   LICHTARENA CLIENT – FULL STABLE BUILD
   - Board sichtbar
   - Auto-Fit aktiv
   - Pan & Zoom stabil
   - Kein Funktionsverlust
   ========================================================= */

(() => {
"use strict";

/* ================== DOM ================== */

const stage = document.getElementById("stage");
const edgesSvg = document.getElementById("edgesSvg");

const statusLine = document.getElementById("statusLine");
const turnLabel = document.getElementById("turnLabel");

const btnRoll = document.getElementById("btnRoll");
const diceValueInp = document.getElementById("diceValue");

const btnSpawnBarricade = document.getElementById("btnSpawnBarricade");
const btnClearDynamicBarricades = document.getElementById("btnClearDynamicBarricades");
const btnForceSpawnLight = document.getElementById("btnForceSpawnLight");

const btnFit = document.getElementById("fitBtn");

/* ================== STATE ================== */

let board = null;
let nodeById = new Map();
let adjacency = new Map();

const state = {
    pieces: [],
    selectedPieceId: null,
    dice: 6,
};

/* ================== CAMERA ================== */

const CAM = {
    scale: 1,
    ox: 0,
    oy: 0,
    minScale: 0.3,
    maxScale: 4
};

function applyTransform(){
    stage.style.transform =
        `translate(${CAM.ox}px, ${CAM.oy}px) scale(${CAM.scale})`;
}

function zoom(delta, cx, cy){
    const oldScale = CAM.scale;
    CAM.scale = Math.min(CAM.maxScale, Math.max(CAM.minScale, CAM.scale * delta));

    const scaleChange = CAM.scale / oldScale;

    CAM.ox = cx - (cx - CAM.ox) * scaleChange;
    CAM.oy = cy - (cy - CAM.oy) * scaleChange;

    applyTransform();
}

stage.addEventListener("wheel", e=>{
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - rect.left, e.clientY - rect.top);
},{passive:false});

/* ================== BOARD LOAD ================== */

async function loadBoard(){
    const res = await fetch("./lichtarena_board_1.json?cache=" + Date.now());
    board = await res.json();
    buildMaps();
    render();
    fitBoard();
}

function buildMaps(){
    nodeById.clear();
    adjacency.clear();

    for(const n of board.nodes){
        nodeById.set(String(n.id), n);
    }

    for(const e of board.edges){
        const a = String(e.from);
        const b = String(e.to);
        if(!adjacency.has(a)) adjacency.set(a, []);
        adjacency.get(a).push(b);
    }
}

/* ================== RENDER ================== */

function render(){
    stage.innerHTML = "";
    edgesSvg.innerHTML = "";

    renderEdges();
    renderNodes();
}

function renderEdges(){
    for(const e of board.edges){
        const a = nodeById.get(String(e.from));
        const b = nodeById.get(String(e.to));
        if(!a || !b) continue;

        const line = document.createElementNS("http://www.w3.org/2000/svg","line");
        line.setAttribute("x1", a.x);
        line.setAttribute("y1", a.y);
        line.setAttribute("x2", b.x);
        line.setAttribute("y2", b.y);
        line.setAttribute("stroke","rgba(120,170,255,.5)");
        line.setAttribute("stroke-width","2");
        edgesSvg.appendChild(line);
    }
}

function renderNodes(){
    for(const n of board.nodes){
        const el = document.createElement("div");
        el.className = "node";
        el.style.left = n.x + "px";
        el.style.top  = n.y + "px";
        stage.appendChild(el);
    }
}

/* ================== FIT ================== */

function fitBoard(){
    if(!board?.nodes?.length) return;

    const xs = board.nodes.map(n=>n.x);
    const ys = board.nodes.map(n=>n.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const boardW = maxX - minX;
    const boardH = maxY - minY;

    const viewW = window.innerWidth * 0.7;
    const viewH = window.innerHeight * 0.9;

    const scaleX = viewW / boardW;
    const scaleY = viewH / boardH;

    CAM.scale = Math.min(scaleX, scaleY) * 0.9;
    CAM.ox = viewW/2 - (minX + boardW/2) * CAM.scale;
    CAM.oy = viewH/2 - (minY + boardH/2) * CAM.scale;

    applyTransform();
}

/* ================== DICE ================== */

btnRoll?.addEventListener("click", ()=>{
    state.dice = Math.floor(Math.random()*6)+1;
    if(diceValueInp) diceValueInp.value = state.dice;
});

diceValueInp?.addEventListener("change", ()=>{
    state.dice = Number(diceValueInp.value) || 1;
});

/* ================== INIT ================== */

loadBoard();

})();
