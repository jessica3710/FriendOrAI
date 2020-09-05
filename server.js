let express = require('express');
let app = express();
let serv = require("http").Server(app);
let port = process.env.PORT || 3000;

app.use(express.static('public'));

serv.listen(port);

let socket = require('socket.io');

let io = socket(serv);
let countConnections = 0;

io.sockets.on('connection', newConnection);

function newConnection(socket) {
    countConnections++;
    socket.emit('count', countConnections);
    socket.broadcast.emit('count', countConnections);

    socket.on('text', textMsg);

    function textMsg(dataK) {
        socket.broadcast.emit('text', dataK);
    }

    socket.on('mouse', mouseMsg);

    function mouseMsg(dataM) {
        socket.broadcast.emit('mouse', dataM);
    }
  
    //stage - not started = 0, drawing = 1, voting = 2, reveal = 3
    socket.on('stage', stageMsg);

    function stageMsg(dataM) {
        socket.broadcast.emit('stage', dataM);
    }
    //vote
    socket.on('vote', voteMsg);

    function voteMsg(dataM) {
        socket.broadcast.emit('vote', dataM);
    }

    socket.on('eraseAll', erase);

    function erase() {
        socket.broadcast.emit('text', "erase");
    }

    socket.on('disconnect', () => {
        countConnections--;
        socket.broadcast.emit('count', countConnections);
    });
}