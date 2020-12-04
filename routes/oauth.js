const express = require('express');
const router = express.Router();
const passport = require('passport');
const passportConf = require('../config/passport');

const { validateBody, schemas } = require('../validates/authValidation');
const UserController = require('../controllers/user');

router.post('/google', passport.authenticate('google', { session: false }));

module.exports = router;