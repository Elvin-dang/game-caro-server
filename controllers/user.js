const JWT = require('jsonwebtoken');
const User = require('../models/user');

signToken = user => {
    return JWT.sign({
        id: user._id,
        iat: new Date().getTime()
    }, process.env.TOKEN_SECRET);
}

module.exports = {
    signUp: async (req, res) => {
        try {
            const { name, email, password } = req.body;
            const existUser = await User.findOne({ email });
            if(existUser) return res.status(403).json({
                error: 'Email has already existed'
            });

            const newUser = new User({
                name: name,
                email: email,
                password: password,
                accessType: 'email'
            });
            await newUser.save();

            const token = signToken(newUser);
            res.status(200).json({ token });
        } catch(err) {
            res.status(400).json({ err });
        }
    },
    signIn: async (req, res) => {
        const token = signToken(req.user);
        res.status(200).json({ token });
    },
    getUser: async (req, res) => {
        res.status(200).json(req.user);
    },
    profile: async (req, res) => {
        const user = req.body;
        try{
            const existUser = await User.findOneAndUpdate(
               { "email" : req.body.email }, req.body);
            res.status(200).json({ msg:"Update successfully!" });
        }
        catch(e){
            res.status(400).json({ msg:"Failed in update user: " + e });
        }
    }
}