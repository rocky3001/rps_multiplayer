const socket = io();

let playerNumber = 0;
let roomCode = "";
let name = "";

let p1Score = 0;
let p2Score = 0;

const msg = document.getElementById("msg");
const playerInfo = document.getElementById("player-info");
const p1Name = document.getElementById("p1-name");
const p2Name = document.getElementById("p2-name");
const chatBox = document.getElementById("chat-box");
const movesDiv = document.getElementById("moves");

function showMsg(text, type="") {
    msg.innerText = text;
    msg.className = "";
    if(type) msg.classList.add(type);
}

function showToast(text, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast-msg ${type}`;
    toast.innerText = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 1500);
}

function getEmoji(choice){
    if(choice === "rock") return "🪨";
    if(choice === "paper") return "📄";
    if(choice === "scissors") return "✂️";
}

document.getElementById("create-room").onclick = () => {
    name = document.getElementById("name-input").value.trim();
    if (!name) return showToast("Please enter your name!", "error");
    socket.emit("create-room", name);
    showToast("Room created!", "info");
};

document.getElementById("join-room").onclick = () => {
    roomCode = document.getElementById("room-input").value.trim();
    name = document.getElementById("name-input").value.trim();
    if (!name) return showToast("Please enter your name!", "error");
    if (!roomCode) return showToast("Enter room code!", "error");
    socket.emit("join-room", {roomCode, name});
    showToast("Joined room " + roomCode, "success");
    showMsg("Joined room " + roomCode, "info");

    movesDiv.innerText = "Waiting for other player...";
};

document.getElementById("copy-btn").onclick = () => {
    if (!roomCode) return showToast("No room code to copy", "error");
    navigator.clipboard.writeText(roomCode);
    showToast("Room code copied!", "success");
};

document.getElementById("send-btn").onclick = () => {
    const msgText = document.getElementById("chat-input").value.trim();
    if (!msgText) return showToast("Enter a message to send", "info");
    socket.emit("chat", {roomCode, name, msg: msgText});
    document.getElementById("chat-input").value = "";
};

socket.on("chat", data => {
    const p = document.createElement("p");
    p.innerHTML = `<b>${data.name}:</b> ${data.msg}`;
    chatBox.appendChild(p);
    chatBox.scrollTop = chatBox.scrollHeight;
});

socket.on("room-created", code => {
    roomCode = code;
    showMsg("Room Code: " + code, "info");
    movesDiv.innerText = "Room Created! Waiting for opponent...";
});

socket.on("player-number", num => {
    playerNumber = num;
    playerInfo.innerText = "You are Player " + num;
});

socket.on("names", data => {
    p1Name.innerText = data.p1 || "Player 1";
    p2Name.innerText = data.p2 || "Player 2";

    movesDiv.innerText = "Room full! Choose your move...";
});

socket.on("match-started", () => {
    showMsg("Match Started!", "info");
});

document.querySelectorAll(".choice").forEach(choice => {
    choice.onclick = () => {
        if (!roomCode) return showToast("Join or create a room first", "error");
        socket.emit("choice", {roomCode, choice: choice.id});
        movesDiv.innerText = "Waiting for opponent's move...";
    };
});

socket.on("result", data => {
    let winnerName = "";
    let isCurrentPlayer = false;
    const p1 = p1Name.innerText;
    const p2 = p2Name.innerText;
    let p1Class = "player1";
    let p2Class = "player2";

    // Highlight winner
    if(data.result === "p1") p1Class += " winner";
    else if(data.result === "p2") p2Class += " winner";

    movesDiv.innerHTML = `
    <span class="${p1Class}">${p1}</span>
    <span class="move">${getEmoji(data.p1Choice)} ${data.p1Choice}</span>

    <span style="opacity:0.4;">VS</span>

    <span class="${p2Class}">${p2}</span>
    <span class="move">${getEmoji(data.p2Choice)} ${data.p2Choice}</span>`;

    setTimeout(() => {
        movesDiv.querySelectorAll(".winner").forEach(el => el.classList.remove("winner"));
    }, 1500);


    if(data.result === "p1") {

        p1Score++;
        winnerName = p1Name.innerText || "Player 1";
        isCurrentPlayer = playerNumber === 1;
        showMsg(`${winnerName} wins!`, "success");
        showToast(isCurrentPlayer ? "You won!" : "Opponent won!", isCurrentPlayer ? "success" : "error");
    }
    else if(data.result === "p2") {
        p2Score++;
        winnerName = p2Name.innerText || "Player 2";
        isCurrentPlayer = playerNumber === 2;
        showMsg(`${winnerName} wins!`, "error");
        showToast(isCurrentPlayer ? "You won!" : "Opponent won!", isCurrentPlayer ? "success" : "error");
    }
    else if(data.result === "draw") {
        showMsg("Draw!", "draw");
        showToast("Draw!", "draw");
    }
    document.getElementById("player1-score").innerText = p1Score;
    document.getElementById("player2-score").innerText = p2Score;
});