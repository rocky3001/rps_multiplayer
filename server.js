const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", () => {
        let roomCode = Math.random().toString(36).substring(2, 7);

        rooms[roomCode] = {
            players: [socket.id],
            choices: {}
        };

        socket.join(roomCode);
        socket.emit("room-created", roomCode);
    });

    socket.on("join-room", (roomCode) => {
        if(rooms[roomCode] && rooms[roomCode].players.length < 2){
            rooms[roomCode].players.push(socket.id);
            socket.join(roomCode);

            socket.emit("player-number", 2);
            io.to(roomCode).emit("start");
        } else {
            socket.emit("room-full");
        }
    });

    socket.on("get-player1", (roomCode) => {
        if(rooms[roomCode]){
            socket.emit("player-number", 1);
        }
    });

    socket.on("choice", ({roomCode, choice}) => {
        let room = rooms[roomCode];
        if(!room) return;

        room.choices[socket.id] = choice;

        if(Object.keys(room.choices).length === 2){
            let [p1, p2] = room.players;

            let result = getResult(room.choices[p1], room.choices[p2]);

            io.to(roomCode).emit("result", {
                p1: room.choices[p1],
                p2: room.choices[p2],
                result
            });

            room.choices = {};
        }
    });

    socket.on("disconnect", () => {
        for(let code in rooms){
            let room = rooms[code];
            room.players = room.players.filter(id => id !== socket.id);

            if(room.players.length === 0){
                delete rooms[code];
            } else {
                io.to(code).emit("msg", "Opponent left!");
            }
        }
    });
});

function getResult(c1, c2){
    if(c1 === c2) return "draw";

    if(
        (c1 === "rock" && c2 === "scissors") ||
        (c1 === "paper" && c2 === "rock") ||
        (c1 === "scissors" && c2 === "paper")
    ){
        return "p1";
    }
    return "p2";
}

http.listen(3000, () => console.log("Server running on port 3000"));