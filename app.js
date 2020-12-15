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

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Socket IO
const server = http.createServer(app);

// cors cho host
// const io = require('socket.io')(server,{
//     cors:{
//         origin:process.REACT_APP_client_domain,
//         method: ["GET","POST"],
//         allowHeaders: ["*"],
//         credentials: true
// }
// });

//cors cho local
const io = require('socket.io')(server,{
    cors:true,
    origin:process.REACT_APP_client_domain
});

let userOnline = []; //danh sách user dang online: userOnline[x][y] => x là thứ tự người onl, y = 0 là socket id, y = 1 là id user, y = 2 là tên user
let playRooms = []; //danh sách bàn 


io.on('connection', function(socket) {
    //lắng nghe khi người dùng thoát
    console.log('new user', socket.id);
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

    socket.on('createRoom', hostName => {
        console.log('create new room');
        const newRoom = {
            roomId: playRooms.length + 1,
            hostName: hostName,
            status: 0,
            nextTurn: 1,
            player1: {
                id: null,
                name: null
            },
            player2: {
                id: null,
                name: null
            }
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
            if (playRooms[a].player2.id === data) {
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
                    nextTurn: nextTurn
                });
                io.sockets.to(move.room.roomId).emit('roomUpdated', playRooms[a]);//gui thong tin room vừa join
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

    socket.on('restartGame', room => {
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a].roomId == room.roomId) {
                playRooms.splice(a, 1);
                playRooms.splice(a, 0, room);
                io.sockets.to(room.roomId).emit('roomUpdated', room);//gui thong tin room vừa join
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
});

// Connect mongoDB
mongoose.connect(process.env.DB_CONNECTION, 
    { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false},
    () => console.log('DB connected'));

// Routes   
app.use('/api/user', require('./routes/user'));
app.use('/api/oauth', require('./routes/oauth'));

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server run on port ${port}`));

