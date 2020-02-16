var express = require('express');
var app = express();
var http = require('http').createServer(app);

var session = require('express-session');
var MemoryStore = session.MemoryStore;
var sessionStore = new MemoryStore();
var sessionMiddleware = session({
    store: sessionStore,
    secret: 'secret',
    key: 'express.sid',
    saveUninitialized: true,
    resave: false
});

var io = require('socket.io')(http);
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

var gameBrowserServer = io.of('/game-browser');
gameBrowserServer.on('connection', function(socket) {
    let sessionID = socket.request.sessionID;
    let user = users.search(sessionID);
    if(!user) {
        console.log("User wasn't registered.")
        socket.disconnect(true);
        return;
    }
    
    gameBrowserServer.emit('user-joined', `${user.obj.username} joined the lobby.`);
});

// the /game namespace handles individual games
// each room inside the namespace represents a single game
// the namespace room is tied to the corresponding room object 
// and every user socket is subscribed to it
var gameServer = io.of('/game');
gameServer.on('connection', function(socket) {
    let sessionID = socket.request.sessionID;
    let user = users.search(sessionID);
    if(!user) {
        console.log("User wasn't registered.")
        socket.disconnect(true);
        return;
    }
    if(!user.obj.roomID) {
        console.log("User didn't belong to a game room.");
        socket.disconnect(true);
        return;
    }

    // subscribe to the game room
    socket.join(`game-${user.obj.roomID}`);

    socket.on('disconnect', function() {
        // if a user disconnects, remove them from the game room
        user.obj.roomID = null;
    });
});

// ? should this be socket.on
gameServer.on('message-send', function(msg) {
    // TODO emit the message out to all other users in the room
    // ? can this be used to DOS the server
});

var oll = require('./oll.js');

var users = new oll.OrderedLinkedList((sessionID, user) => {return sessionID === user.sessionID;}, (sessionID, user) => {return sessionID > user.sessionID;});
var rooms = new oll.OrderedLinkedList((id, room) => {return id === room.id;}, (id, room) => {return id > room.id;});
var roomIdCounter = 0;

io.on('connection', function(socket) {
    console.log(socket.request.sessionID);
    console.log('Someone connected.');
});

app.set('view engine', 'ejs');

app.use(sessionMiddleware);
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
    let user = users.search(req.sessionID);
    if(!user) {
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
    
    // ? can this create a race condition?
    let id = roomIdCounter;
    roomIdCounter++;

    rooms.insert({
        id: id,
        name: req.body.create_room_name,
        users: [user]
    });
    user.obj.roomID = id;

    res.redirect(`room/${id}`);
});

app.get('/room/:id', function(req, res) {
    if(!users.search(req.sessionID)) {
        res.redirect('/');
        return;
    }

    let user = users.search(req.sessionID);
    console.log(`room acccessed by: ${user.obj.sessionID}`);

    let id = Number(req.params.id);
    let room = null;

    if(id == NaN || id < 0 || !(room = rooms.search(id))) {
        // parsing failed, or room doesn't exist

        return res.sendStatus(404);
    }

    res.render('room', {room: room.obj});
});

app.post('/login', function(req, res) {
    if(!req.body.username) {
        return res.sendStatus(401);
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
});

http.listen(3000, function() {
    console.log('listening on port 3000');
});