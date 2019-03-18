var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
const PORT = process.env.PORT || 3000
let types = {
    createRoom: 'createRoom',
    joinRoom: 'joinRoom',
    pingToStartGame: 'pingToStartGame',
    movedPiece: 'movedPiece',
    oppositePlayerMovedPiece: 'oppositePlayerMovedPiece',
    oppositePlayerDisconnected: 'oppositePlayerDisconnected',
    gameOver: 'gameOver'
}
let games = {
    // 'modi': {
    //     players: ['hashdhsadh', 'hshdhsda'],
    // }
    // 'abc': {
    //     'players': [],
    //     spectators: []
    // }
}
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', socket => {
    let emptyJson = { players: [], spectators: [] }

    console.log('user connected')
    console.log(socket.id)
    socket.on('disconnect', function () {
        console.log('user disconnected');
        console.log(socket.id)
        for (let i in games) {
            let game = games[i]
            game.players.indexOf(socket.id) != -1 && game.players.splice(game.players.indexOf(socket.id), 1)
            game.spectators.indexOf(socket.id) != -1 && game.players.splice(game.players.indexOf(socket.id), 1)
            //if no one is playing, why to keep it? bolo haan.!
            if (game.players.length == 0)
                delete games[i]
            else{
                //tell other players that please leave sir
                socket.to(games[i].players[0]).emit(types.oppositePlayerDisconnected, { res: 1, data: 'Another player disconnected.' });
                delete games[i]
            }
                
        }
        console.log(games)
    });
    socket.on(types.createRoom, (req/*{ name: '' } */, callback) => {
        console.log(socket.id);
        //if same name already registered
        if (req.name && !games[req.name.toLowerCase()]) {
            games[req.name] = { ...emptyJson, players: [socket.id] }
            console.log(games)
            callback({ res: 1, data: 'Created room.' })
        } else {
            callback({ res: 0, data: 'Name empty or already registered.!' })
        }
    })

    socket.on(types.joinRoom, (req/*{ name: '' }*/, callback) => {
        //  game already created and has only one user and is not the same user as there already is inside
        let name = req.name.toLowerCase()
        if (games[name] && games[name].players.length == 1 && games[name].players[0] != socket.id ) {
            let isMyMove = Math.random > 0.5 /*binary*/
            socket.to(games[name].players[0]).emit(types.pingToStartGame, { res: 1, data: 'You may start game.', isMyMove });
            games[name].players.push(socket.id)
            callback({ res: 1, data: 'You may start game.', isMyMove: !isMyMove });
        } else if (games[name]) {
            callback({ res: 0, data: 'Game already started between someone else.!' })
        } else {
            callback({ res: 0, data: 'No user with same name.!' })
        }
    })

    socket.on(types.movedPiece, (req/*{ name: '' }*/, callback) => {
        console.log(req)
        let { oldI, oldJ, newI, newJ } = req
        let name = req.name.toLowerCase()
        if (games[name] /*identify object of their game*/) {
            let i = games[name].players.indexOf(socket.id)
            if (i != -1 /*find player from players array so we can emit to another player */) {
                /**
                 * There will be two players so its gonna be 1 or 0
                 * 'Number(!i)' => if 0 then 1, if 1 then 0
                 */
                socket.to(games[name].players[Number(!i)]).emit(types.oppositePlayerMovedPiece, { res: 1, oldI, oldJ, newI, newJ });
                callback({ res: 1, data: 'wait for his move.' });
            } else callback({ res: 0, data: 'Something went wrong.!', errorCode: 1 })
        } else {
            callback({ res: 0, data: 'Something went wrong.!', errorCode: 2 })
        }

    })
})

http.listen(PORT, function () {
    console.log('listening on *:' + PORT)
})
