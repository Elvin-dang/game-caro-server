const JWT = require('jsonwebtoken');
const User = require('../models/user');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

signToken = user => {
    return JWT.sign({
        id: user._id,
        iat: new Date().getTime()
    }, process.env.TOKEN_SECRET);
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT);

module.exports = {
    google: async (req, res) => {
        try {
            const tokenId = req.body.tokenId;
            const response =  await client.verifyIdToken({
                idToken: tokenId, 
                audience: process.env.GOOGLE_CLIENT
            });
    
            const { email_verified, email, name } = response.payload;
    
            if(!email_verified) return res.status(401).json({
                message: "Email is not verified"
            });
    
            const user = await User.findOne({email: email, accessType: "google"});
            if(user) {
                const token = signToken(user);
                res.status(200).json({ token });
            } else {
                const newUser = new User({
                    name: name,
                    email: email,
                    password: email + process.env.PASSWORD_SECRET,
                    accessType: 'google'
                });
    
                await newUser.save();
                const token = signToken(newUser);
                res.status(200).json({ token });
            }
        } catch(err) {
            res.status(400).json(err);
        }
    },
    facebook: async (req, res) => {
        try {
            const { accessToken, userID } = req.body;
            const urlGraphFacebook = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;
            const response = await fetch(urlGraphFacebook, { method: 'GET' });
            const jsonResponse = await response.json();
    
            const { email, name } = jsonResponse;
            const user = await User.findOne({email: email, accessType: "facebook"});
            if(user) {
                const token = signToken(user);
                res.status(200).json({ token });
            } else {
                const newUser = new User({
                    name: name,
                    email: email,
                    password: email + process.env.PASSWORD_SECRET,
                    accessType: 'facebook'
                });
    
                await newUser.save();
                const token = signToken(newUser);
                res.status(200).json({ token });
            }
        } catch(err) {
            console.log(err);
            res.status(400).json(err);
        }
    }
}