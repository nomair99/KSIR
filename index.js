var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var session = require('express-session');
var MemoryStore = session.MemoryStore;
var sessionStore = new MemoryStore();

var oll = require('./oll.js');

// TODO have to search users on sessionId. Create alternative search or alter existing?
var users = new oll.OrderedLinkedList((sessionID, user) => {return sessionID === user.sessionID;}, (sessionID, user) => {return sessionID > user.sessionID;});
var rooms = new oll.OrderedLinkedList((id, room) => {return id === room.id;}, (id, room) => {return id > room.id;});
var roomIdCounter = 0;

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
    res.render('index', {});
});

app.get('/rooms', function(req, res) {
    if(!users.search(req.sessionID)) {
        res.sendStatus(401);
        return;
    }

    res.render('rooms', {rooms: rooms});
});

app.post('/createroom', function(req, res) {
    if(!users.search(req.sessionID)) {
        res.sendStatus(401);
        return;
    }
    if(!req.body.create_room_name || !(/^[a-zA-Z0-9]+$/.test(req.body.create_room_name))) {
        // TODO send correct error code for missing data in request
        res.sendStatus(403);
        return;
    }
    
    if(rooms.search(req.body.create_room_name)) {
        // if a room already exists by that name
        
        // TODO show correct page
        res.sendStatus(403);
        return;
    }

    let id = roomIdCounter;
    roomIdCounter++;

    rooms.insert({
        id: id,
        name: req.body.create_room_name,
        users: []
    });

    res.redirect(`room/${id}`);
});

app.get('/room/:id', function(req, res) {
    if(!users.search(req.sessionID)) {
        res.sendStatus(401);
        return;
    }

    let id = Number(req.params.id);

    // * this assumes that rooms cannot be deleted
    if(id == NaN || id < 0 || !rooms.search(id)) {
        // parsing failed, or room doesn't exist

        res.sendStatus(404);
    }
    
    res.render('room', {room: rooms.search(id).obj});
});

app.post('/login', function(req, res) {
    if(!req.body.username) {
        res.sendStatus(401);
    }

    let isNew = false;

    if(!users.search(req.sessionID)) {
        users.insert({
            sessionID: req.sessionID,
            username: req.body.username
        })
        isNew = true;
    }

    res.redirect('rooms');

    res.render('login', {
        sessionId: req.sessionID,
        username: users.search(req.sessionID).obj.username,
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