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
    socket.on('disconnect', function() {
        var disconnectedUserID;
        for (var a=0; a < userOnline.length; a++) {
            if (userOnline[a][0] === socket.id) {
                disconnectedUserID = a;
                userOnline.splice(disconnectedUserID, 1);
            }
        }
        io.sockets.emit('updateUsersOnlineList', userOnline);
    })
    //lắng nghe khi có người login
    socket.on('login', data=> {
        userlogin = [socket.id,data[0],data[1]];
        if(userlogin[1] !== '' && userlogin[2] !== '' )
        {
            if(userOnline.length==0){
                userOnline.push(userlogin);
                // console.log(userOnline);
                io.sockets.emit('updateUsersOnlineList', userOnline);// gửi danh sách user dang online
            }
            else{
                //kiểm tra trùng user
                var flag=0;
                for (var a=0; a < userOnline.length; a++) {
                    if (userOnline[a][1] == userlogin[1]) {
                        flag =1;
                    }
                }
                if(flag===0)
                { 
                    userOnline.push(userlogin);
                    // console.log(userOnline);
                    io.sockets.emit('updateUsersOnlineList', userOnline);// gửi danh sách user dang online
                }
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);// gửi danh sách room dang tồn tại
    });

    socket.on('createRoom', dataRoom => {
        console.log('create new room');
        newRoomID = playRooms.length +1;
        // new room :
        // #0 id; 
        // #1 tên người tạo;
        // #2 trạng thái: 0 = chờ , 1 = đang chơi;
        // #3 id player 1; 
        // #4 name player 1; 
        // #5 id player 2;
        // #6 name player 2
        newRoom = [newRoomID, dataRoom,0,null,null,null,null];
        playRooms.push(newRoom);
        io.sockets.emit('updateRoomsList', playRooms);
        console.log(playRooms);
    });

    socket.on('joinRoom', data => { //data là room id
        console.log('new user join room ', data);
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a][0] == data) {
                socket.join(data); //join room theo room id
                io.sockets.to(data).emit('roomJoined',playRooms[a]);//gui thong tin room vừa join                
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);
        console.log(playRooms);
    });

    socket.on('updateRoom', data => { //data là room id
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a][0] == data[0]) {
                playRooms[a][3] = data[1];
                playRooms[a][4] = data[2];
                playRooms[a][5] = data[3];
                playRooms[a][6] = data[4];
                console.log("update:" + playRooms[a]);
                io.sockets.emit('roomUpdated',playRooms[a]);//gui thong tin room vừa join
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);
        console.log(playRooms);
    });

    socket.on('leaveRoom', data => { //data là id player
        for (var a=0; a < playRooms.length; a++) {
            if (playRooms[a][3] === data) {
                playRooms[a][3] = null;
                playRooms[a][4] = null;
                console.log("update:" + playRooms[a]);
                io.sockets.emit('roomUpdated',playRooms[a]);//gui thong tin room vừa join
            }
            if (playRooms[a][5] === data) {
                playRooms[a][5] = null;
                playRooms[a][6] = null;
                console.log("update:" + playRooms[a]);
                io.sockets.emit('roomUpdated',playRooms[a]);//gui thong tin room vừa join
            }
        }
        io.sockets.emit('updateRoomsList', playRooms);
        console.log(playRooms);
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

