const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        lowercase: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    avatar: {
        type: String,
        default: null
    },
    accessType: {
        type: String,
        required: true
    }
});

userSchema.pre('save', async function(next) {
    try {
        const sail = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(this.password, sail);
        this.password = passwordHash;
        next();
    } catch(err) {
        next(err);
    }
});

userSchema.methods.isValidPassword = async function(newPassword) {
    try {
        return await bcrypt.compare(newPassword, this.password);
    } catch(err) {
        throw new Error(err);
    }
}

module.exports = mongoose.model('users', userSchema);