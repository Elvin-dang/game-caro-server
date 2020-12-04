const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const socket = require('socket.io');
const http = require('http');
const cors = require('cors');
require('dotenv/config');

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());
app.use(cors());

// Connect mongoDB
mongoose.connect(process.env.DB_CONNECTION, 
    { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false},
    () => console.log('DB connected'));

// Routes
app.use('/api/user', require('./routes/user'));
app.use('/api/oauth', require('./routes/oauth'));

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server run on port ${port}`));