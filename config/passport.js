const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const GooglePlusStrategy = require('passport-google-plus');
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/user');

passport.use('jwt', new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromHeader('authorization'),
    secretOrKey: process.env.TOKEN_SECRET
}, async (payload, done) => {
    try {
        const user = await User.findById(payload.id);
        if(!user) return done(null, false);
        done(null, user);
    } catch(err) {
        done(err, false);
    }
}));

passport.use('local', new LocalStrategy({
    usernameField: 'email'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if(!user) return done(null, false);

        const checkPassword = await user.isValidPassword(password);
        if(!checkPassword) return done(null, false);

        done(null, user);
    } catch(err) {
        return done(err, false);
    }
}));