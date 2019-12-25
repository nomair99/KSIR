var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var users = {};

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('a user connected');
    
    socket.on('chat message', function(msg) {
        if(users[socket.id]) {
            let username = users[socket.id];
            console.log('message: ' + msg);
            io.emit('chat message', `${username}: ${msg}`);
        }
    });
    
    socket.on('user connect', function(username) {
        if(username === '') {
            socket.emit('chat message', 'ERROR! Empty username.');
            return;
        }
        users[socket.id] = username;
        socket.emit('chat message', "Welcome to the chat room!")
    });

    socket.on('disconnect', function() {
        if(users[socket.id]) {
            delete users[socket.id];
        }
        console.log('user disconnected');
    });
});

http.listen(3000, function() {
    console.log('listening on port 3000');
});