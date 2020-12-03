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

// initiate project
app.get('/', (req, res) => res.status(200).send('Test'));

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server run on port ${port}`));