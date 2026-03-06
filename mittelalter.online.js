const SERVER_URL = "wss://mittelalter-server.onrender.com";

let socket = null;
let roomCode = null;
let playerName = null;
let isHost = false;

function qs(id){
    return document.getElementById(id);
}

function setRoomInfo(text){
    const el = qs("roomInfo");
    if(el) el.innerText = text;
}

function renderPlayers(players){
    const list = qs("playerList");
    if(!list) return;

    list.innerHTML = "";
    (players || []).forEach(p=>{
        const div = document.createElement("div");
        div.className = "player";
        div.innerText = typeof p === "string" ? p : (p.name || "Spieler");
        list.appendChild(div);
    });
}


function persistLobbySession(modeOverride){
    const packed = {
        playerName: playerName || '',
        roomCode: roomCode || '',
        isHost: !!isHost,
        lastMode: modeOverride || 'online'
    };
    sessionStorage.setItem('mittelalterLobby', JSON.stringify(packed));
    sessionStorage.setItem('mittelalterLastMode', packed.lastMode);
    sessionStorage.setItem('playerName', packed.playerName);
    sessionStorage.setItem('roomCode', packed.roomCode);
    sessionStorage.setItem('isHost', packed.isHost ? 'true' : 'false');
}

function sendToServer(payload){
    if(socket && socket.readyState === WebSocket.OPEN){
        socket.send(JSON.stringify(payload));
    }
}

function connectServer(){
    socket = new WebSocket(SERVER_URL);

    socket.onopen = () => {
        console.log("Verbunden mit Mittelalter Server");
    };

    socket.onmessage = (event) => {
        let msg;
        try{
            msg = JSON.parse(event.data);
        }catch(err){
            console.log("Ungültige Server-Nachricht");
            return;
        }

        console.log("Server:", msg);

        if(msg.type === "hello"){
            return;
        }

        if(msg.type === "room_created"){
            roomCode = msg.room?.roomCode || roomCode;
            isHost = true;

            persistLobbySession("online");

            const roomInput = qs("roomInput");
            if(roomInput) roomInput.value = roomCode || "";

            setRoomInfo("Raum erstellt: " + roomCode);
            renderPlayers(msg.room?.players || []);
            return;
        }

        if(msg.type === "room_joined"){
            roomCode = msg.room?.roomCode || roomCode;
            isHost = false;

            persistLobbySession("online");

            setRoomInfo("Verbunden mit Raum: " + roomCode);
            renderPlayers(msg.room?.players || []);
            return;
        }

        if(msg.type === "room_state"){
            renderPlayers(msg.room?.players || []);
            if(msg.room?.roomCode){
                setRoomInfo("Raum: " + msg.room.roomCode + (msg.info ? " • " + msg.info : ""));
            }
            return;
        }

        if(msg.type === "game_started"){
            if(msg.room?.roomCode){
                roomCode = msg.room.roomCode;
            }
            persistLobbySession("online");
            window.location.href = "Mittelalter.index.html";
            return;
        }

        if(msg.type === "error_message"){
            alert(msg.message || "Serverfehler");
        }
    };

    socket.onclose = () => {
        console.log("Server Verbindung geschlossen");
    };
}

function createRoom(){
    playerName = (qs("nameInput")?.value || "Spieler").trim() || "Spieler";
    roomCode = null;
    isHost = true;

    roomCode = "";
    persistLobbySession("online");

    setRoomInfo("Erstelle Raum...");
    renderPlayers([playerName]);

    sendToServer({
        type:"create_room",
        name:playerName
    });
}

function joinRoom(){
    playerName = (qs("nameInput")?.value || "Spieler").trim() || "Spieler";
    roomCode = (qs("roomInput")?.value || "").trim().toUpperCase();

    if(!roomCode){
        alert("Bitte Raumcode eingeben");
        return;
    }

    isHost = false;
    persistLobbySession("online");

    setRoomInfo("Verbinde mit Raum: " + roomCode + " ...");

    sendToServer({
        type:"join_room",
        roomCode:roomCode,
        name:playerName
    });
}

function startGame(){
    if(!roomCode){
        alert("Kein Raum aktiv");
        return;
    }

    sendToServer({
        type:"start_game"
    });
}

window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.startGame = startGame;

window.addEventListener("beforeunload", ()=>{
    try{
        sendToServer({ type:"leave_room" });
    }catch(err){}
});

window.addEventListener("load", connectServer);
