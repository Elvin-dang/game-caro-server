const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const socket = require('socket.io');
const http = require('http');
const cors = require('cors');
require('dotenv/config');
var _findIndex = require('lodash/findIndex')
const socketIo = require('socket.io');
const { forInRight } = require('lodash');
const { moveCursor } = require('readline');
const Game = require('./models/game');
const User = require('./models/user');
const { CalculateElo, geRank, calculateElo, getRank } = require('./utils/game');

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Socket IO
const server = http.createServer(app);

// cors cho host
const io = require('socket.io')(server,{
    cors:{
        origin: [process.env.CLIENT_DOMAIN, process.env.CLIENT_TEST_DOMAIN],
        method: ["GET","POST"],
        allowHeaders: ["*"],
        credentials: true
    }
});

let userOnline = []; //danh sách user dang online: userOnline[x][y] => x là thứ tự người onl, y = 0 là socket id, y = 1 là id user, y = 2 là tên user
let playRooms = []; //danh sách bàn 


io.on('connection', function(socket) {
    //lắng nghe khi người dùng thoát
    // console.log('new user', socket.id);
    socket.on('disconnect', function() {
        let disconnectedUserID;
        for (let a=0; a < userOnline.length; a++) {
            if (userOnline[a].socketId === socket.id) {
                disconnectedUserID = a;
                userOnline.splice(disconnectedUserID, 1);
            }
        }
        console.log('user disconnect', socket.id);
        io.sockets.emit('updateUsersOnlineList', userOnline);
    })
    //lắng nghe khi có người login
    socket.on('login', userData => {
        const userLogin = {
            socketId: socket.id,
            userId: userData.id,
            userName: userData.name,
        };

        if(userLogin.userId !== '' && userLogin.userName !== '' )
        {
            if(userOnline.length === 0) {
                userOnline.push(userLogin);
                io.sockets.emit('updateUsersOnlineList', userOnline);
                io.sockets.emit('updateRoomsList', playRooms);
            } else {
                let checkExist = false;
                for(let i=0;i<userOnline.length;i++) {
                    if(userOnline[i].userId === userLogin.userId) {
                        checkExist = true;
                        break;
                    }
                }

                if(!checkExist) {
                    userOnline.push(userLogin);
                    io.sockets.emit('updateUsersOnlineList', userOnline);
                    io.sockets.emit('updateRoomsList', playRooms);
                }
            }
        }
    });

    socket.on('createRoom', data => { //data: hostName,newRoomType,newRoomPassword
        console.log('create new room');
        const newRoom = {
            roomId: playRooms.length + 1,
            hostName: data.hostName,
            status: 0,
            nextTurn: 1,
            player1: {
                id: null,
                name: null
            },
            player2: {
                id: null,
                name: null
            },
            type:data.newRoomType,
            password: data.newRoomPassword,
            subPlayers: [],
            curGame: {
                date: null,
                player1: {
                    id: null,
                    name: null
                },
                player2: {
                    id: null,
                    name: null
                },
                winner: 0,
                move: [],
                chat: []
            },
            chat: []
        }
        playRooms.push(newRoom);
        io.sockets.emit('updateRoomsList', playRooms);
    });

    socket.on('joinRoom', roomId => {
        console.log(`${socket.id} join room`, roomId);
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == roomId) {
                socket.join(roomId); //join room theo room id
                io.sockets.to(roomId).emit('roomJoined', playRooms[a]);//gui thong tin room vừa join                
                break;
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);
    });

    socket.on('updateRoom', room => {
        console.log('update room', room);
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == room.roomId) {
                playRooms.splice(a, 1);
                playRooms.splice(a, 0, room);
                io.sockets.to(room.roomId).emit('roomUpdated', room);//gui thong tin room vừa join
                break;
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);
    });

    socket.on('leaveRoom', userId => { //data là id player
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].player1.id === userId) {
                playRooms[a].player1.id = null;
                playRooms[a].player1.name = null;
                io.sockets.to(playRooms[a].roomId).emit('roomUpdated', playRooms[a]);//gui thong tin room vừa join
            }
            if (playRooms[a].player2.id === userId) {
                playRooms[a].player2.id = null;
                playRooms[a].player2.name = null;
                io.sockets.to(playRooms[a].roomId).emit('roomUpdated', playRooms[a]);
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);
    });

    socket.on('nextMove', move => {
        console.log("From next move", move.i, move.j);
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == move.room.roomId) {
                let nextTurn = 1;
                if(move.room.nextTurn === 1) nextTurn = 2;

                playRooms.splice(a, 1);
                playRooms.splice(a, 0, {
                    ...move.room,
                    nextTurn: nextTurn,
                    curGame: {
                        ...move.room.curGame,
                        move: move.room.curGame.move.concat([{
                            playerId: nextTurn === 1 ? move.room.player2.id : move.room.player1.id,
                            date: Date.now(),
                            position: {
                                x: move.i,
                                y: move.j
                            }
                        }])
                    }
                });
                io.sockets.to(move.room.roomId).emit('roomUpdated', playRooms[a]);
                break;
            }
        }
        io.sockets.to(move.room.roomId).emit('updateGameConfig', move.gameConfig);
        socket.broadcast.to(move.room.roomId).emit('opponentMove', {
            i: move.i,
            j: move.j,
        });
        io.sockets.emit('updateRoomsList', playRooms);
    });

    socket.on('startGame', room => {
        console.log("From game start", room);
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == room.roomId) {
                playRooms.splice(a, 1);
                playRooms.splice(a, 0, room);
                io.sockets.to(room.roomId).emit('roomUpdated', room);
                break;
            }
        }

        let tmpArr = Array(20);
        for (let i = 0; i < 20; i++) {
            tmpArr[i] = Array(20).fill(null);
        }
        io.sockets.to(room.roomId).emit('updateGameConfig', {
            width: 20,
            height: 20,
            history: [{
                squares: tmpArr,
                location: null
            }],
            stepNumber: 0,
            xIsNext: true,
            isDescending: true
        });
        io.sockets.emit('updateRoomsList', playRooms);
    });

    socket.on('gameResult', async (result) => {
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == result.room.roomId) {
                console.log("From game result", playRooms[a].status);
                if(playRooms[a].status === 0) return;
                playRooms.splice(a, 1);
                playRooms.splice(a, 0, result.room);
                io.sockets.to(result.room.roomId).emit('roomUpdated', result.room);
                break;
            }
        }

        const game = new Game({
            player1: {
                id: result.room.player1.id,
                name: result.room.player1.name
            },
            player2: {
                id: result.room.player2.id,
                name: result.room.player2.name
            },
            winner: result.winner,
            move: result.room.curGame.move,
            chat: result.room.curGame.chat
        });
        await game.save();

        const player1 = await User.findById(result.room.player1.id);
        const player2 = await User.findById(result.room.player2.id);
        let resultElo;

        if(result.winner === 1) 
        {
            resultElo = calculateElo(player1.elo, player2.elo, result.resultType);
            await User.findByIdAndUpdate(result.room.player1.id, {
                rank: getRank(resultElo.winnerElo),
                elo: resultElo.winnerElo,
                game: {
                    win: player1.game.win + 1,
                    lose: player1.game.lose,
                    draw: player1.game.draw,
                    total: player1.game.total + 1
                },
                history: player1.history.concat([game])
            });
            await User.findByIdAndUpdate(result.room.player2.id, {
                rank: getRank(resultElo.loserElo),
                elo: resultElo.loserElo,
                game: {
                    win: player2.game.win,
                    lose: player2.game.lose + 1,
                    draw: player2.game.draw,
                    total: player2.game.total + 1
                },
                history: player1.history.concat([game])
            });
            io.sockets.to(result.room.roomId).emit('gameResult', {
                winner: {
                    id: player1._id,
                    first_elo: player1.elo,
                    final_elo: resultElo.winnerElo
                },
                loser: {
                    id: player2._id,
                    first_elo: player2.elo,
                    final_elo: resultElo.loserElo
                },
                resultType: result.resultType
            });
        }
        else 
        {
            resultElo = calculateElo(player2.elo, player1.elo, result.resultType);
            await User.findByIdAndUpdate(result.room.player1.id, {
                rank: getRank(resultElo.loserElo),
                elo: resultElo.loserElo,
                game: {
                    win: player1.game.win,
                    lose: player1.game.lose + 1,
                    draw: player1.game.draw,
                    total: player1.game.total + 1
                },
                history: player1.history.concat([game])
            });
            await User.findByIdAndUpdate(result.room.player2.id, {
                rank: getRank(resultElo.winnerElo),
                elo: resultElo.winnerElo,
                game: {
                    win: player2.game.win + 1,
                    lose: player2.game.lose,
                    draw: player2.game.draw,
                    total: player2.game.total + 1
                },
                history: player1.history.concat([game])
            });
            io.sockets.to(result.room.roomId).emit('gameResult', {
                winner: {
                    id: player2._id,
                    first_elo: player2.elo,
                    final_elo: resultElo.winnerElo
                },
                loser: {
                    id: player1._id,
                    first_elo: player1.elo,
                    final_elo: resultElo.loserElo
                },
                resultType: result.resultType
            });
        }
    });

    //lắng nghe khi có người gửi tin nhắn tất cả mọi ng
    socket.on('newMessage', data => {
        //gửi lại tin nhắn cho tất cả các user dang online
        io.sockets.emit('newMessage', {
            name: data.name,
            message: data.message
        });
    });

    //lắng nghe khi có người gửi tin nhắn trong 1 room
    socket.on('chat-room', data => {
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == data.room.roomId) {
                playRooms.splice(a, 1);
                playRooms.splice(a, 0, {
                    ...data.room,
                    curGame: {
                        ...data.room.curGame,
                        chat: data.room.curGame.chat.concat([{
                            userId: data.user._id,
                            name: data.user.name,
                            avatar: data.user.avatar,
                            date: Date.now(),
                            message: data.message
                        }])
                    },
                    chat: data.room.chat.concat([{
                        userId: data.user._id,
                        name: data.user.name,
                        avatar: data.user.avatar,
                        date: Date.now(),
                        message: data.message
                    }])
                });
                io.sockets.to(data.room.roomId).emit('roomUpdated', playRooms[a]);//gui thong tin room vừa join
                console.log("From chat-room", playRooms[a]);
                break;
            }
        }
        //gửi lại tin nhắn cho tất cả các user trong room
        io.sockets.in(data.room.roomId).emit("server-chat-room", {
            name: data.user.name,
            message: data.message
        });
    });


});

// Connect mongoDB
mongoose.connect(process.env.DB_CONNECTION, 
    { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false},
    () => console.log('DB connected'));

// Routes   
app.use('/api/user', require('./routes/user'));
app.use('/api/oauth', require('./routes/oauth'));
app.use('/api/game', require('./routes/game'));

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server run on port ${port}`));

