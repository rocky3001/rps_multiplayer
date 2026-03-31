const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static("public"));

let rooms = {};

io.on("connection", socket => {

    socket.on("create-room", ({ name, emoji, color, bestOf, firstTo }) => {
        let code = Math.random().toString(36).substring(2,7);

        rooms[code] = {
            players: [{ id: socket.id, name, emoji, color, score: 0 }],
            choices: {},
            bestOf: bestOf || null,
            firstTo: firstTo || null
        };

        socket.join(code);
        socket.emit("room-created", code);
        socket.emit("player-number", 1);
    });

    socket.on("join-room", ({ roomCode, name, emoji, color }) => {
        let room = rooms[roomCode];
        if(!room || room.players.length >= 2) return;

        room.players.push({ id: socket.id, name, emoji, color, score: 0 });
        socket.join(roomCode);
        socket.emit("player-number", 2);

        io.to(roomCode).emit("names", {
            p1: room.players[0],
            p2: room.players[1],
            bestOf: room.bestOf,
            firstTo: room.firstTo
        });

        io.to(roomCode).emit("match-settings", { firstTo: room.firstTo });
    });

    socket.on("chat", data => {
        io.to(data.roomCode).emit("chat", data);
    });

    socket.on("new-match", ({ roomCode }) => {
        let room = rooms[roomCode];
        if(!room) return;

        // Reset player scores
        room.players.forEach(p => p.score = 0);
        room.choices = {};

        io.to(roomCode).emit("new-match-started");
    });

    socket.on("choice", ({ roomCode, choice }) => {
        let room = rooms[roomCode];
        if (!room) return;

        room.choices[socket.id] = choice;

        if (Object.keys(room.choices).length === 2) {
            let [p1, p2] = room.players;
            let p1Choice = room.choices[p1.id];
            let p2Choice = room.choices[p2.id];

            if(!p1Choice || !p2Choice) return;

            let result = getResult(p1Choice, p2Choice);

            if(result === "p1") p1.score++;
            else if(result === "p2") p2.score++;

            io.to(roomCode).emit("result", {
                result,
                p1Choice,
                p2Choice,
                p1Score: p1.score,
                p2Score: p2.score
            });

            let winner = null;
            if(p1.score >= room.firstTo) winner = p1;
            else if(p2.score >= room.firstTo) winner = p2;

            if(winner) {
                io.to(roomCode).emit("match-over", { winner });
                p1.score = 0;
                p2.score = 0;
            }

            room.choices = {};
        }
    });

});

function getResult(a, b) {
    if(a === b) return "draw";
    if((a === "rock" && b === "scissors") ||
       (a === "paper" && b === "rock") ||
       (a === "scissors" && b === "paper")) return "p1";
    return "p2";
}

const PORT = process.env.PORT || 3000;
http.listen(PORT);