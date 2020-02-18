var express = require('express');
var app = express();
var path = require("path");
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var session = require('express-session');
var MemoryStore = session.MemoryStore;
var sessionStore = new MemoryStore();

var users = {};
var rooms = [];
// TODO implement rooms as a search tree? Particularly when we start deleteing rooms

app.use(express.static(path.join(__dirname, "views")))

function roomIndex(name) {
    /* Return the index of the room with name 'name'. Return -1 if no such room exists. */

    for(let i = 0; i < rooms.length; i++) {
        if(rooms[i].name === name) {
            return i;
        }
    }

    return -1;
}

app.set('view engine', 'ejs');

app.use(session({
    store: sessionStore,
    secret: 'secret',
    key: 'express.sid',
    saveUninitialized: true,
    resave: false
}));
app.use(express.urlencoded({extended: true}));

app.get('/', function(req, res) {
    res.render('privacy', {});
});

app.get('/rooms', function(req, res) {
    if(!users[req.sessionID]) {
        res.sendStatus(401);
        return;
    }

    res.render('rooms', {rooms: rooms});
});

app.post('/createroom', function(req, res) {
    if(!users[req.sessionID]) {
        console.log("if 1");
        res.sendStatus(401);
        return;
    }
    if(!req.body.create_room_name || !(/^[a-zA-Z0-9]+$/.test(req.body.create_room_name))) {
        // TODO send correct error code for missing data in request
        console.log("if 2");
        res.sendStatus(403);
        return;
    }
    
    if(roomIndex(req.body.create_room_name) != -1) {
        // if a room already exists by that name
        
        // TODO show correct page
        console.log("if 3");
        res.sendStatus(403);
        return;
    }

    rooms.push({
        name: req.body.create_room_name,
        users: []
    });

    res.redirect(`room/${rooms.length-1}`);
});

app.get('/room/:id', function(req, res) {
    if(!users[req.sessionID]) {
        res.sendStatus(401);
        return;
    }

    let id = Number(req.params.id);

    // NOTE this assumes that rooms cannot be deleted
    if(id == NaN || id < 0 || id >= rooms.length) {
        // parsing failed, or room doesn't exist

        res.sendStatus(404);
    }
    
    res.render('room', {room: rooms[id]});
});

app.post('/login', function(req, res) {
    if(!req.body.username) {
        res.sendStatus(401);
    }

    let isNew = false;

    if(!users[req.sessionID]) {
        users[req.sessionID] = {};
        users[req.sessionID].username = req.body.username;
        isNew = true;
    }

    res.redirect('rooms');

    res.render('login', {
        sessionId: req.sessionID,
        username: users[req.sessionID].username,
        isNew: isNew
    });
});

// app.post('/room', function(req, res) {

//     // TODO check length
//     if(req.body.username) {
//         console.log(`got username ${req.body.username}`)
//         users[req.sessionID] = {};
//         users[req.sessionID].username = req.body.username;
//         res.sendFile(__dirname + '/chatroom.html');
//     } else {
//         res.end("Unauthorized user.");
//     }
// });

// io.on('connection', function(socket) {

//     console.log('%o', socket.request);
    
//     socket.on('chat message', function(msg) {
//         if(users[socket.id]) {
//             let username = users[socket.id];
//             console.log('message: ' + msg);
//             io.sockets.in('chatroom').emit('chat message', `${username}: ${msg}`);
//         }
//     });
    
//     socket.on('disconnect', function() {
//         if(users[socket.id]) {
//             delete users[socket.id];
//         }
//         console.log('user disconnected');
//     });
// });

http.listen(3000, function() {
    console.log('listening on port 3000');
});