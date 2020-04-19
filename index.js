var express = require('express');
var app = express();
app.use(express.json());
var path = require("path");
var http = require('http').createServer(app);

var dotenv = require('dotenv');
dotenv.config();

var baseUrl = "http://localhost:3000"
// var baseUrl = 'http://komodoandchill.herokuapp.com';

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

app.use(express.static(path.join(__dirname, "views")));

var utils = require('./utils.js');
var GameState = require('./game-state.js').GameState;

var oll = require('./oll.js');

var users = new oll.OrderedLinkedList((obj1, obj2) => {return obj1.sessionID === obj2.sessionID;}, (sessionID, user) => {return sessionID === user.sessionID;}, (obj1, obj2) => {return obj1.sessionID > obj2.sessionID;}, (sessionID, user) => {return sessionID > user.sessionID;});
var rooms = new oll.OrderedLinkedList((obj1, obj2) => {return obj1.id === obj2.id;}, (id, room) => {return id === room.id;}, (obj1, obj2) => {return obj1.id > obj2.id;}, (id, room) => {return id > room.id;});
var roomIdCounter = 0;

var getMap = require('./map.js').getMap;

var io = require('socket.io')(http);
io.use(function(socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
});

var gameBrowserServer = io.of('/game-browser');
gameBrowserServer.on('connection', function(socket) {
    let sessionID = socket.request.sessionID;
    let user = users.search(sessionID);
    if(!user) {
        console.log("User wasn't registered. Disconnecting.");
        socket.disconnect(true);
        return;
    }

    gameBrowserServer.emit('user-joined', `${user.obj.username} joined the lobby.`);
});


// the /lobby namespace handles individual game lobbies
// each room inside the namespace represents a single lobby
// the namespace room is tied to the corresponding room object
// and every user socket is subscribed to it
var lobbyServer = io.of('/lobby');
lobbyServer.on('connection', function(socket) {
    let sessionID = socket.request.sessionID;
    let user = users.search(sessionID);
    if(!user) {
        console.log("User wasn't registered. Disconnecting.");
        socket.disconnect(true);
        return;
    }

    let roomID = user.obj.roomID;
    console.log(roomID);
    let room = rooms.search(roomID);

    // ? do we need to keep the first check
    if(roomID === null || !room) {
        console.log("User didn't belong to a game room. Disconnecting.");
        socket.disconnect(true);
        return;
    }
    
    // ? can a user get added multiple times
    if(room.obj.users.indexOf(sessionID) === -1) {
        room.obj.users.push(sessionID);
    }

    lobbyServer.in(`game-${roomID}`).emit('player joined', user.obj.username);
    socket.join(`game-${roomID}`);

    let playerList = [];
    for(let i = 0; i < room.obj.users.length; i++) {
        playerList.push(users.search(room.obj.users[i]).obj.username);
    }

    socket.emit('player list', playerList);

    // subscribe to the game room
    socket.join(`game-${roomID}`);

    socket.on('disconnect', function() {
        // if a user disconnects, remove them from the game room

        console.log(`${sessionID} disconnected from ${roomID}`);
        let room = rooms.search(user.obj.roomID);
        if(room) {
            // sanity check

            if(room.obj.inProgress) {
                console.log('room was in progress, not changing anything');
                return;
            }
            
            if(user.obj.sessionID === room.obj.host) {
                // the host left, destroy the room

                console.log(`host left room ${roomID}`);
                lobbyServer.in(`game-${roomID}`).emit('host left', null);

                // kick all users from the room and delete it
                for(let i = 0; i < room.obj.users.length; i++) {
                    let userToKick = users.search(room.obj.users[i]);
                    if(userToKick) {
                        userToKick.obj.roomID = null;
                    }
                }

                rooms.delete(roomID);
                room = null;
                roomID = null;

            } else {
                for(let i = 0; i < room.obj.users.length; i++) {
                    if(room.obj.users[i] === user.sessionID) {
                        room.obj.users.splice(i, 1);
                        break;
                    }
                }

                lobbyServer.in(`game-${roomID}`).emit('player left', user.obj.username);
            }

        }

        user.obj.roomID = null;
    });

    socket.on('start request', function(data) {
        if(sessionID === room.obj.host) {
            // only the host can make a start request

            room.obj.inProgress = true;
            lobbyServer.in(`game-${roomID}`).emit('start game', null);

            console.log('getting map');
            let playerList = [];
            for(let i = 0; i < room.obj.users.length; i++) {
                playerList.push({player: users.search(room.obj.users[i]).obj.username, alive: true});
            }
            
            // ! loads the predefined france map
            room.obj.gameState = new GameState(getMap(), playerList);
            room.obj.gameState.calculateReinforcements();
        }
    });

    socket.on('chat message', function(msg) {
        console.log(`got message: ${msg}`);
        lobbyServer.in(`game-${roomID}`).emit('chat message', `${user.obj.username}: ${msg}`);
    });
});

var gameServer = io.of('/game');
gameServer.on('connection', function(socket) {
    let sessionID = socket.request.sessionID;
    let user = users.search(sessionID);
    console.log('socket connected to game room');
    if(!user) {
        console.log("User wasn't registered. Disconnecting.");
        socket.disconnect(true);
        return;
    }
    console.log(`user: ${user.obj}`);

    let roomID = user.obj.roomID;
    console.log(roomID);

    let room = rooms.search(roomID);

    // ? do we need the first check
    if(roomID === null || !room) {
        console.log("User didn't belong to a game room. Disconnecting.");
        socket.disconnect(true);
        return;
    }

    // subscribe to the game room
    socket.join(`game-${roomID}`);
    let gameRoom = gameServer.in(`game-${roomID}`);
    
    // ? should we change all of these to socket.emit
    // send the map to all players
    socket.emit('player name', user.obj.username);
    socket.emit('player list', {playerList: room.obj.gameState.playerList});
    socket.emit('map', room.obj.gameState.map);
    socket.emit('reinforcements remaining', room.obj.gameState.reinforcementsRemaining);

    // TODO what to do if someone leaves?
    // TODO what if everyone leaves

    socket.on('attack', function(data) {
        // move troops from one territory to the other

        console.log('got attack event');

        if(room.obj.gameState.currentPlayer !== user.obj.username || room.obj.gameState.phase !== 'attack') {
            console.log('wrong phase');
            socket.disconnect(true);
            return;
        }

        if(!data.from || !data.to || !data.num === null) {
            console.log('missing data');
            socket.disconnect(true);
            return;
        }

        // ? what if two regions have the same name
        // disconnect if the regions are the same
        if(data.from === data.to) {
            console.log('regions same');
            socket.disconnect(true);
            return;
        }
        let indexFrom = null, indexTo = null;

        for(let i = 0; i < room.obj.gameState.map.nodes.length; i++) {
            if(room.obj.gameState.map.nodes[i].obj.name === data.from && room.obj.gameState.map.nodes[i].obj.owner === user.obj.username) {
                indexFrom = i;
            }
            if(room.obj.gameState.map.nodes[i].obj.name === data.to && room.obj.gameState.map.nodes[i].obj.owner !== user.obj.username) {
                indexTo = i;
            }
        }

        // disconnect if region did not exist
        if(indexFrom === null || indexTo === null) {
            console.log('region does not exist');
            socket.disconnect(true);
            return;
        }

        if(!Number.isInteger(data.num) || data.num < 1 || data.num > 3 || room.obj.gameState.map.nodes[indexFrom].obj.troops <= data.num) {
            console.log('bad troop count');
            socket.disconnect(true);
            return;
        }

        let attackingTroops = data.num;
        let defendingTroops = Math.min(2, room.obj.gameState.map.nodes[indexTo].obj.troops)
        // defender defends with at most 2 troops

        let attackingRolls = [], defendingRolls = [];
        
        // roll die
        for(let j = 0; j < attackingTroops; j++) {
            attackingRolls.push(utils.dieRoll());
        }
        for(let k = 0; k < defendingTroops; k++) {
            defendingRolls.push(utils.dieRoll());
        }

        attackingRolls.sort((a, b) => {return b-a;});
        defendingRolls.sort((a, b) => {return b-a;});

        // find how many troops died for each player
        let attackingDeaths = 0, defendingDeaths = 0;
        for(let l = 0; l < Math.min(attackingTroops, defendingTroops); l++) {
            if(attackingRolls[l] > defendingRolls[l]) {
                defendingDeaths++;
            } else {
                attackingDeaths++;
            }
        }

        console.log(`attacking region lost ${attackingDeaths}`);
        console.log(`defending region lost ${defendingDeaths}`);
        
        let conquered = false;
        let defeated = false;

        if(defendingDeaths === room.obj.gameState.map.nodes[indexTo].obj.troops) {
            // all defending troops died
            // the region was conquered

            conquered = true;

            // remove all surviving attacking troops from the attacking region and
            // move them to the conquered region
            defendingDeaths = defendingDeaths - (attackingTroops - attackingDeaths);
            attackingDeaths = attackingTroops;

            let defendingPlayer = room.obj.gameState.map.nodes[indexTo].obj.owner;
            room.obj.gameState.map.nodes[indexTo].obj.owner = user.obj.username;

            defeated = room.obj.gameState.isDefeated(defendingPlayer);

            room.obj.gameState.killTroops(indexTo, defendingDeaths);
            room.obj.gameState.killTroops(indexFrom, attackingDeaths);

            if(room.obj.gameState.map.nodes[indexFrom].obj.troops > 1) {
                room.obj.gameState.attackMoveRegionIndexFrom = indexFrom;
                room.obj.gameState.attackMoveRegionIndexTo = indexTo;
                room.obj.gameState.phase = "attack move";
            }
        } else {
            room.obj.gameState.killTroops(indexTo, defendingDeaths);
            room.obj.gameState.killTroops(indexFrom, attackingDeaths);
        }


        gameRoom.emit('attack', {
            from: data.from,
            to: data.to,
            num: data.num,
            attackingDeaths: attackingDeaths,
            defendingDeaths: defendingDeaths,
            conquered: conquered,
            defeated: defeated
        });
    });

    socket.on('attack move', function(data) {
        console.log('got attack move event');

        if(room.obj.gameState.currentPlayer !== user.obj.username || room.obj.gameState.phase !== 'attack move') {
            console.log('wrong phase');
            socket.disconnect(true);
            return;
        }
        
        if(data.num === null) {
            console.log('missing data');
            socket.disconnect(true);
            return;
        }

        if(!Number.isInteger(data.num) || data.num < 0 || data.num < 0 || data.num > room.obj.gameState.map.nodes[room.obj.gameState.attackMoveRegionIndexFrom].troops - 1) {
            console.log('illegal number');
            socket.disconnect(true);
            return;
        }

        room.obj.gameState.moveTroops(room.obj.gameState.attackMoveRegionIndexFrom, room.obj.gameState.attackMoveRegionIndexTo, data.num);
        room.obj.gameState.phase = 'attack';

        gameRoom.emit('attack move', data);
    });

    socket.on('reinforce', function(data) {

        console.log('got reinforcement event');

        if(room.obj.gameState.phase !== 'reinforcement') {
            console.log('wrong phase');
            socket.disconnect(true);
            return;
        }

        if(!data.region || data.num === null) {
            console.log('missing data');
            socket.disconnect(true);
            return;
        }

        console.log(room.obj.gameState.currentPlayer);
        console.log(user.obj.username);
        console.log(room.obj.gameState.phase);

        if(room.obj.gameState.currentPlayer !== user.obj.username || room.obj.gameState.phase !== 'reinforcement') {
            console.log('not reinforcement phase');
            socket.disconnect(true);
            return;
        }
        
        if(!Number.isInteger(data.num) || data.num <= 0 || data.num > room.obj.gameState.reinforcementsRemaining) {
            console.log('illegal number');
            socket.disconnect(true);
            return;
        }
        
        let found = false;
        for(let i = 0; i < room.obj.gameState.map.nodes.length; i++) {
            if(room.obj.gameState.map.nodes[i].obj.name === data.region) {
                room.obj.gameState.map.nodes[i].obj.troops += data.num;
                room.obj.gameState.reinforcementsRemaining -= data.num;
                found = true;
                break;
            }
        }
        
        if(!found) {
            console.log('region not found');
            socket.disconnect(true);
            return;
        }
        
        // gameRoom.emit('reinforce', {
        //     region: data.region,
        //     num: data.num
        // });
        gameRoom.emit('reinforce', data);
    });
    
    socket.on('move', function(data) {
        console.log('got move event');
        
        if(room.obj.gameState.currentPlayer !== user.obj.username || room.obj.gameState.phase !== 'move') {
            console.log('wrong phase');
            socket.disconnect(true);
            return;
        }
        
        if(!data.from || !data.to || !data.num) {
            console.log('missing data');
            socket.disconnect(true);
            return;
        }

        if(data.from === data.to) {
            console.log('regions same');
            socket.disconnect(true);
            return;
        }
        let indexFrom = null, indexTo = null;

        for(let i = 0; i < room.obj.gameState.map.nodes.length; i++) {
            if(room.obj.gameState.map.nodes[i].obj.name === data.from && room.obj.gameState.map.nodes[i].obj.owner === user.obj.username) {
                indexFrom = i;
            }
            if(room.obj.gameState.map.nodes[i].obj.name === data.to && room.obj.gameState.map.nodes[i].obj.owner === user.obj.username) {
                indexTo = i;
            }
        }

        if(!room.obj.gameState.routeExists(indexFrom, indexTo)) {
            console.log('path does not exist');
            socket.disconnect(true);
            return;
        }

        // disconnect if region did not exist
        if(indexFrom === null || indexTo === null) {
            console.log('region does not exist');
            socket.disconnect(true);
            return;
        }
        
        if(!Number.isInteger(data.num) || data.num <= 0 || data.num >= room.obj.gameState.map.nodes[indexFrom].obj.troops) {
            console.log('illegal number');
            socket.disconnect(true);
            return;
        }
        
        room.obj.gameState.moveTroops(indexFrom, indexTo, data.num);
        
        gameRoom.emit('move', data);
    });
    
    socket.on('end phase', function(data) {
        console.log('got end phase event');
        
        if(room.obj.gameState.currentPlayer !== user.obj.username) {
            console.log('wrong player');
            socket.disconnect(true);
            return;
        }

        if(room.obj.gameState.phase === 'reinforcement') {
            if(room.obj.gameState.reinforcementsRemaining > 0) {
                console.log('not all reinforcements used');
                socket.disconnect(true);
                return;
            }
            room.obj.gameState.phase = 'attack';
            gameRoom.emit('end phase', null);
        } else if(room.obj.gameState.phase === 'attack') {
            room.obj.gameState.phase = 'move';
            gameRoom.emit('end phase', null);
        } else if(room.obj.gameState.phase === 'attack move') {
            console.log('tried to end phase during attack move');
            socket.disconnect(true);
            return;
        } else {
            // TODO send the number of reinforcements
            room.obj.gameState.phase = 'reinforcement';
            room.obj.gameState.switchToNextPlayer();
            room.obj.gameState.calculateReinforcements();

            // emit how many reinforcements the next player has to place
            gameRoom.emit('end phase', null);
            gameRoom.emit('reinforcements remaining', room.obj.gameState.reinforcementsRemaining);
        }
    });
});

io.on('connection', function(socket) {
    console.log(socket.request.sessionID);
    console.log('Someone connected.');
});

app.set('view engine', 'ejs');
app.use(sessionMiddleware);
app.use(express.urlencoded({extended: true}));

app.get('/', function(req, res) {
    if(users.search(req.sessionID)) {
        res.redirect('/rooms');
    }
    res.render('index', {error_user: req.session.error_user});
});

app.get('/privacy', function(req, res) {
    res.render('privacy', {});
})

app.get('/about', function(req, res) {
    res.render('about', {});
})

app.get('/rooms', function(req, res) {
    if(!users.search(req.sessionID)) {
        console.log(`/rooms: User not found. SessionID: ${req.sessionID} Redirecting back to homepage.`)
        return res.redirect('/');
    }

    res.render('rooms', {rooms: rooms, baseUrl: baseUrl, error_room: req.session.error_room});
});

app.post('/', function(req, res) {
    console.log('requested');
    if(req.body == 'test') {
        res.send('true');
        return true;
    } else {
        res.send('false');
        return false;
    }
})

app.post('/createroom', function(req, res) {
    let user = users.search(req.sessionID);
    if(!user) {
        res.sendStatus(401);
        return;
    }
    if(!(/^[a-zA-Z0-9]+$/.test(req.body.create_room_name)) || req.body.create_room_name.length<2 || req.body.create_room_name.length>15){
        req.session.error_room = 'Invalid room name';
        res.redirect('rooms');
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
        host: user.obj.sessionID,
        users: [],
        inProgress: false,
        maxUsers: 6
    });
    user.obj.roomID = id;

    res.redirect(`room/${id}`);
});

app.get('/room/:id', function(req, res) {
    let user = users.search(req.sessionID);

    if(!user){
      return res.redirect('/');
    }

    console.log(`room acccessed by: ${user.obj.sessionID}`);

    let id = Number(req.params.id);
    let room = null;

    if(id == NaN || id < 0 || !(room = rooms.search(id))) {
        // parsing failed, or room doesn't exist
        return res.sendStatus(404);
    }

    // add the user to list if they aren't already in lobby
    // make sure the number of users is limited
    // if not, redirect back to room-browser
    if(room.obj.users.indexOf(user.obj.sessionID) === -1) {
        if(room.obj.users.length >= room.obj.maxUsers) {
            return res.redirect('/rooms?err=full');
        } else {
            user.obj.roomID = id;
            room.obj.users.push(user.obj.sessionID);
            console.log('setting room id');
            console.log(`id: ${id}`);
            console.log(`user: ${user.obj}`);
            console.log(`user roomID: ${user.obj.roomID}`);
            console.log(`room user list: ${room.obj.users}`);
        }
    }

    res.render('room', {currentUser: user.obj, baseUrl: baseUrl, room: room.obj, users: users});
});

app.get('/room/:id/game', function(req, res) {
    let user = users.search(req.sessionID);

    let id = Number(req.params.id);

    if(!user) {
        if(process.env.NODE_ENV !== 'development') {
            return res.redirect('/');
        }
        users.insert({
            sessionID: req.sessionID,
            username: 'dev',
            roomID: id
        });
        user = users.search(req.sessionID);
    }

    let room = null;

    if(id == NaN || id < 0 || !(room = rooms.search(id))) {

        console.log(process.env.NODE_ENV);
        if(process.env.NODE_ENV !== 'development') {
            return res.sendStatus(404);
        }

        rooms.insert({
            id: id,
            name: 'dev game',
            host: user.obj.sessionID,
            users: [user.obj.sessionID],
            inProgress: true,
            maxUsers: 6
        });

        room = rooms.search(id);
    }

    if(!room.obj.inProgress) {
        // game hasn't begun yet, redirect to lobby
        return res.redirect(`/room/${id}`);
    }

    res.render('game', {room: room.obj, baseUrl: baseUrl});
});

app.get('/testmap', function(req, res) {
    res.render('test-map', {});
});

app.post('/login', function(req, res) {

    console.log(req.body);
    if(!req.body.username) {
        return res.sendStatus(401);
    }

    if(!(/^[a-zA-Z0-9]+$/.test(req.body.username)) || req.body.username.length < 2 || req.body.username.length > 15) {
        console.log('bad username');
        res.redirect('/');
        return;
    }
    
    if(!users.search(req.sessionID)) {
        console.log(`/login: Created new user. SessionID: ${req.sessionID}.`);
        users.insert({
            sessionID: req.sessionID,
            username: req.body.username
        });
    }

    console.log('logging in');
    res.redirect('/rooms');
});

http.listen(process.env.PORT || 3000, function() {
    console.log('listening on port 3000');
});
