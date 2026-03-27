const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

app.use(express.static("public"));

let rooms = {};

io.on("connection", socket => {

    socket.on("create-room", (name) => {
        let code = Math.random().toString(36).substring(2,7);

        rooms[code] = {
            players: [{id: socket.id, name}],
            choices: {}
        };

        socket.join(code);
        socket.emit("room-created", code);
        socket.emit("player-number", 1);
    });

    socket.on("join-room", ({roomCode, name}) => {
        let room = rooms[roomCode];
        if(room && room.players.length < 2){
            room.players.push({id: socket.id, name});
            socket.join(roomCode);

            socket.emit("player-number", 2);

            io.to(roomCode).emit("names", {
                p1: room.players[0].name,
                p2: room.players[1].name
            });
        }
    });

    socket.on("chat", data => {
        io.to(data.roomCode).emit("chat", data);
    });

    socket.on("choice", ({roomCode, choice}) => {
        let room = rooms[roomCode];
        if(!room) return;

        room.choices[socket.id] = choice;

        if(Object.keys(room.choices).length === 2){
            let p1 = room.players[0].id;
            let p2 = room.players[1].id;

            let result = getResult(room.choices[p1], room.choices[p2]);

            io.to(roomCode).emit("result", {result});

            room.choices = {};
        }
    });

});

function getResult(a,b){
    if(a===b) return "draw";
    if(
        (a==="rock"&&b==="scissors")||
        (a==="paper"&&b==="rock")||
        (a==="scissors"&&b==="paper")
    ) return "p1";
    return "p2";
}

const PORT = process.env.PORT || 3000;
http.listen(PORT);