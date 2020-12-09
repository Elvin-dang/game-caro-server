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
const io = require('socket.io')(server,{
    cors:{
        origin:process.env.REACT_APP_client_domain,
        method: ["GET","POST"],
        allowHeaders: ["*"],
        credentials: true
}
});

let userOnline = []; //danh sách user dang online

io.on('connection', function(socket) {
    //lắng nghe khi người dùng thoát
    socket.on('disconnect', function() {
        console.log(socket.id + ': disconnected')
        var disconnectedUserID;
        for (var a=0; a < userOnline.length; a++) {
            if (userOnline[a][0] === socket.id) {
                disconnectedUserID = a;
                userOnline.splice(disconnectedUserID, 1);
            }
        }
        
        io.sockets.emit('updateUesrList', userOnline);
    })
    //lắng nghe khi có người login
    socket.on('login', data=> {
        userlogin = [socket.id,data[0],data[1]];
        if(userlogin[1] !== '' && userlogin[2] !== '' )
        {
            if(userOnline.length==0){
                userOnline.push(userlogin);
                // console.log(userOnline);
                io.sockets.emit('updateUesrList', userOnline);// gửi danh sách user dang online
            }
            else{
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
                    io.sockets.emit('updateUesrList', userOnline);// gửi danh sách user dang online
                }
            }

        }
    })
    console.log(userOnline);
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

