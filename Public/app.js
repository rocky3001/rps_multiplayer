console.log("JS Loaded Successfully");

const socket = io();

let playerNumber = 0;
let canPlay = false;
let roomCode = "";

let player1Score = 0;
let player2Score = 0;

/* ELEMENTS */
const msg = document.querySelector("#msg");
const playerInfo = document.querySelector("#player-info");

const p1Score = document.querySelector("#player1-score");
const p2Score = document.querySelector("#player2-score");

const choices = document.querySelectorAll(".choice");

const createBtn = document.querySelector("#create-room");
const joinBtn = document.querySelector("#join-room");
const input = document.querySelector("#room-input");

/* CREATE ROOM */
createBtn.onclick = () => {
    socket.emit("create-room");
};

/* JOIN ROOM */
joinBtn.onclick = () => {
    roomCode = input.value.trim();
    if(roomCode === "") return;

    socket.emit("join-room", roomCode);
};

/* ROOM CREATED */
socket.on("room-created", (code) => {
    console.log("Room created:", code);

    roomCode = code;
    msg.innerText = "Room Code: " + code + " (Share with friend)";
});

/* PLAYER ASSIGN */
socket.on("player-number", (num) => {
    playerNumber = num;

    playerInfo.innerText = "You are Player " + num;

    if(num === 1){
        msg.innerText = "Room: " + roomCode + " | Waiting for Player 2...";
    } else {
        msg.innerText = "Game Start! Choose your move";
        canPlay = true;
    }
});

/* START GAME */
socket.on("start", () => {
    canPlay = true;
    msg.innerText = "Game Started! Choose your move";
});

/* ROOM FULL */
socket.on("room-full", () => {
    msg.innerText = "Room is Full!";
});

/* MESSAGE */
socket.on("msg", (text) => {
    msg.innerText = text;
    canPlay = false;
});

/* CLICK EVENT */
choices.forEach(choice => {
    choice.addEventListener("click", () => {
        if(!canPlay) return;

        const userChoice = choice.getAttribute("id");

        // highlight selected
        choices.forEach(c => c.classList.remove("selected"));
        choice.classList.add("selected");

        socket.emit("choice", {
            roomCode,
            choice: userChoice
        });

        msg.innerText = "Waiting for opponent...";
        canPlay = false;
    });
});

/* RESULT */
socket.on("result", (data) => {
    let text = "";

    if(data.result === "draw"){
        text = "Draw!";
        msg.className = "draw";
    } 
    else if(
        (data.result === "p1" && playerNumber === 1) ||
        (data.result === "p2" && playerNumber === 2)
    ){
        text = "You Win!";
        msg.className = "win";

        if(playerNumber === 1){
            player1Score++;
            p1Score.innerText = player1Score;
        } else {
            player2Score++;
            p2Score.innerText = player2Score;
        }
    } 
    else {
        text = "You Lose!";
        msg.className = "lose";

        if(playerNumber === 1){
            player2Score++;
            p2Score.innerText = player2Score;
        } else {
            player1Score++;
            p1Score.innerText = player1Score;
        }
    }

    msg.innerText = text + ` (P1: ${data.p1} | P2: ${data.p2})`;

    setTimeout(() => {
        msg.className = "";
        msg.innerText = "Next Round - Choose!";
        canPlay = true;

        // remove selection highlight
        choices.forEach(c => c.classList.remove("selected"));
    }, 2000);
});