var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var session = require('express-session');
var MemoryStore = session.MemoryStore;
var sessionStore = new MemoryStore();

var users = {};

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
    res.sendFile(__dirname + '/index.html');
});

app.post('/login', function(req, res) {
    if(!req.body.username) {
        // TODO error
        res.sendStatus(401);
    }

    let isNew = false;

    if(!users[req.sessionID]) {
        users[req.sessionID] = {};
        users[req.sessionID].username = req.body.username;
        isNew = true;
    }

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

//     // lets try this
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