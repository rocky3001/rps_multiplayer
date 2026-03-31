const socket = io();

let playerNumber = 0;
let roomCode = "";
let name = "";

let p1Score = 0;
let p2Score = 0;

let bestOf = 0;
let firstTo = 0;

let p1Info = { emoji: "🐱", color: "#39ff14" };
let p2Info = { emoji: "🐶", color: "#1e90ff" };

let selectedEmoji = document.getElementById("emoji-select")?.value || "🐱";
let selectedColor = document.getElementById("color-select")?.value || "#39ff14";

const msg = document.getElementById("msg");
const playerInfo = document.getElementById("player-info");
const p1Name = document.getElementById("p1-name");
const p2Name = document.getElementById("p2-name");
const chatBox = document.getElementById("chat-box");
const movesDiv = document.getElementById("moves");

document.getElementById("emoji-select").onchange = (e) => selectedEmoji = e.target.value;
document.getElementById("color-select").onchange = (e) => selectedColor = e.target.value;

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
    const bestOfValue = document.getElementById("best-of").value;
    const firstToValue = document.getElementById("first-to").value;

    if(!name) return showToast("Enter your name!", "error");
    if(!selectedEmoji || !selectedColor) return showToast("Select emoji & color!", "error");
    if(!bestOfValue && !firstToValue) return showToast("Select either Best-of or First-to!", "error");

    if(firstToValue) {
        firstTo = parseInt(firstToValue);
    } else if(bestOfValue) {
        bestOf = parseInt(bestOfValue);
        firstTo = Math.ceil(bestOf / 2); 
    }

    socket.emit("create-room", { 
        name, 
        emoji: selectedEmoji, 
        color: selectedColor, 
        bestOf, 
        firstTo 
    });
    document.getElementById("best-of").disabled = true;
    document.getElementById("first-to").disabled = true;
    showToast("Room created!", "success");
};

document.getElementById("join-room").onclick = () => {
    roomCode = document.getElementById("room-input").value.trim();
    name = document.getElementById("name-input").value.trim();
    if(!name) return showToast("Enter your name!", "error");
    if(!roomCode) return showToast("Enter room code!", "error");
    if(!selectedEmoji || !selectedColor) return showToast("Select emoji & color!", "error");

    socket.emit("join-room", { roomCode, name, emoji: selectedEmoji, color: selectedColor });
    document.getElementById("best-of").disabled = true;
    document.getElementById("first-to").disabled = true;
    showToast("Joined room " + roomCode, "success");
    showMsg("Joined room " + roomCode, "info");

    movesDiv.innerText = "Waiting for other player...";
};

document.getElementById("copy-btn").onclick = () => {
    if(!roomCode) return showToast("No room code to copy", "error");
    navigator.clipboard.writeText(roomCode);
    showToast("Room code copied!", "success");
};

document.getElementById("send-btn").onclick = () => {
    const msgText = document.getElementById("chat-input").value.trim();
    if(!msgText) return showToast("Enter a message to send", "info");

    socket.emit("chat", {
        roomCode,
        name,
        msg: msgText,
        emoji: selectedEmoji,
        color: selectedColor
    });

    document.getElementById("chat-input").value = "";
};

document.getElementById("new-match-btn").onclick = () => {
    if(!roomCode) return showToast("No room to start a new match!", "error");
    socket.emit("new-match", { roomCode });
};

document.querySelectorAll(".choice").forEach(choice => {
    choice.onclick = () => {
        if(!roomCode) return showToast("Join or create a room first", "error");
        socket.emit("choice", { roomCode, choice: choice.id });
        movesDiv.innerText = "Waiting for opponent's move...";
    };
});

socket.on("chat", data => {
    const p = document.createElement("p");
    const color = data.color || "#fff";
    const emoji = data.emoji || "";
    p.innerHTML = `<b style="color:${color}">${emoji} ${data.name}:</b> ${data.msg}`;
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
    p1Info = data.p1 && typeof data.p1 === "object" ? { ...data.p1 } : { emoji: "🐱", color: "#39ff14", name: data.p1 || "Player 1" };
    p2Info = data.p2 && typeof data.p2 === "object" ? { ...data.p2 } : { emoji: "🐶", color: "#1e90ff", name: data.p2 || "Player 2" };

    p1Name.innerText = `${p1Info.emoji} ${p1Info.name}`;
    p1Name.style.color = p1Info.color;
    document.getElementById("player1-score").style.color = p1Info.color;

    p2Name.innerText = `${p2Info.emoji} ${p2Info.name}`;
    p2Name.style.color = p2Info.color;
    document.getElementById("player2-score").style.color = p2Info.color;

    movesDiv.innerText = "Room full! Choose your move...";

    if(data.bestOf) document.getElementById("best-of").value = data.bestOf;
    if(data.firstTo) document.getElementById("first-to").value = data.firstTo;
});

socket.on("match-started", () => showMsg("Match Started!", "info"));

socket.on("new-match-started", () => {
    p1Score = 0;
    p2Score = 0;
    document.getElementById("player1-score").innerText = p1Score;
    document.getElementById("player2-score").innerText = p2Score;
    movesDiv.innerText = "New Match! Choose your move...";
    showMsg("New Match Started!", "info");
});

socket.on("result", data => {
    const p1Class = data.result === "p1" ? "player1 winner" : "player1";
    const p2Class = data.result === "p2" ? "player2 winner" : "player2";

    movesDiv.innerHTML = `
    <span class="${p1Class}" style="color:${p1Info.color}">${p1Info.emoji} ${p1Info.name}</span>
    <span class="move" style="color:${p1Info.color}">${getEmoji(data.p1Choice)} ${data.p1Choice}</span>
    <span style="opacity:0.4;">VS</span>
    <span class="${p2Class}" style="color:${p2Info.color}">${p2Info.emoji} ${p2Info.name}</span>
    <span class="move" style="color:${p2Info.color}">${getEmoji(data.p2Choice)} ${data.p2Choice}</span>`;

    if(data.result === "p1") p1Score++;
    else if(data.result === "p2") p2Score++;

    document.getElementById("player1-score").innerText = p1Score;
    document.getElementById("player2-score").innerText = p2Score;

    setTimeout(() => movesDiv.querySelectorAll(".winner").forEach(el => el.classList.remove("winner")), 1500);

    if(data.result === "draw"){
        showMsg("Draw!", "draw");
        showToast("Draw!", "draw");
    } else {
        const winnerInfo = data.result === "p1" ? p1Info : p2Info;
        const isCurrentPlayer = playerNumber === (data.result === "p1" ? 1 : 2);
        showMsg(`${winnerInfo.emoji} ${winnerInfo.name} wins!`, isCurrentPlayer ? "success" : "error");
        showToast(isCurrentPlayer ? "You won!" : "Opponent won!", isCurrentPlayer ? "success" : "error");
    }
});

socket.on("match-over", ({ winner }) => {
    showMsg(`🏆 ${winner.emoji} ${winner.name} wins the match!`, "success");
    showToast(`Match Over! ${winner.name} wins!`, "success");
    
    p1Score = 0;
    p2Score = 0;
    document.getElementById("player1-score").innerText = p1Score;
    document.getElementById("player2-score").innerText = p2Score;
    movesDiv.innerText = "Match ended! Start a new one...";
});