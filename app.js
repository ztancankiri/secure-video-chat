const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

io.on('connection', socket => {
    socket.on('data', data => {
        socket.broadcast.emit('data', data);
    });
});

server.listen(8888);