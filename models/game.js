const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const gameSchema = mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    player1: {
        type: String,
        required: true
    },
    player2: {
        type: String,
        required: true
    },
    move: {
        type: Array,
        default: []
    },
    chat: {
        type: Array,
        default: []
    }
});

module.exports = mongoose.model('games', gameSchema);