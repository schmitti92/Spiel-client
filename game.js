// ===============================
// game.js FINAL FIX
// Board + Server + Action-Joker UI
// ===============================

let state = null;
let socket = null;
let myClientId = null;

// Canvas
const boardCanvas = document.getElementById("boardCanvas");
const ctx = boardCanvas.getContext("2d");

// Joker Panel
let jokerPanel = null;

// Connect WebSocket
function connectWS() {
  socket = new WebSocket("wss://serverfinal-9t39.onrender.com");

  socket.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    handleMessage(msg);
  };
}

function handleMessage(msg) {
  if (msg.type === "hello") {
    myClientId = msg.clientId;
    return;
  }

  if (msg.type === "state" || msg.type === "snapshot" || msg.type === "started") {
    state = msg.state || msg;
    renderAll();
  }
}

function renderAll() {
  if (!state) return;
  renderBoard();
  updateActionUI();
}

function renderBoard() {
  ctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
}

// FIX: function existed now
function updateActionUI() {
  if (!jokerPanel) {
    jokerPanel = document.getElementById("jokerPanel");
  }
  if (!jokerPanel) return;

  jokerPanel.style.display = state.mode === "action" ? "block" : "none";
}

function useJoker(joker) {
  if (!socket) return;
  socket.send(JSON.stringify({ type: "use_joker", joker }));
}

function init() {
  boardCanvas.width = boardCanvas.clientWidth;
  boardCanvas.height = boardCanvas.clientHeight;
  connectWS();
}

window.addEventListener("load", init);
