
const SERVER_URL = "wss://mittelalter-server.onrender.com";

let socket = null;
let roomCode = null;
let playerName = null;

function connectServer(){
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        console.log("Verbunden mit Mittelalter Server");
    };

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log("Server:", msg);
    };

    socket.onclose = () => {
        console.log("Server Verbindung geschlossen");
    };
}

function createRoom(){
    playerName = document.getElementById("nameInput").value || "Spieler";
    roomCode = Math.floor(1000 + Math.random()*9000).toString();

    sessionStorage.setItem("playerName", playerName);
    sessionStorage.setItem("roomCode", roomCode);
    sessionStorage.setItem("isHost", "true");

    if(socket && socket.readyState === 1){
        socket.send(JSON.stringify({
            type:"create_room",
            room:roomCode,
            name:playerName
        }));
    }

    document.getElementById("roomInfo").innerText = "Raum erstellt: " + roomCode;
}

function joinRoom(){
    playerName = document.getElementById("nameInput").value || "Spieler";
    roomCode = document.getElementById("roomInput").value;

    if(!roomCode){
        alert("Bitte Raumcode eingeben");
        return;
    }

    sessionStorage.setItem("playerName", playerName);
    sessionStorage.setItem("roomCode", roomCode);
    sessionStorage.setItem("isHost", "false");

    if(socket && socket.readyState === 1){
        socket.send(JSON.stringify({
            type:"join_room",
            room:roomCode,
            name:playerName
        }));
    }

    document.getElementById("roomInfo").innerText = "Verbunden mit Raum: " + roomCode;
}

function startGame(){
    if(socket && socket.readyState === 1){
        socket.send(JSON.stringify({
            type:"start_game",
            room:roomCode
        }));
    }

    window.location.href = "Mittelalter.index.html";
}

window.addEventListener("load", connectServer);
