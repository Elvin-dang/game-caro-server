const express = require('express');
const router = express.Router();
const passport = require('passport');
const passportConf = require('../config/passport');

const { validateBody, schemas } = require('../validations/authValidation');
const UserController = require('../controllers/user');

router.post('/signup', validateBody(schemas.signupSchema), UserController.signUp);
router.post('/signin', validateBody(schemas.signinSchema), passport.authenticate('local', { session: false }), UserController.signIn);
router.get('/', passport.authenticate('jwt', { session: false }), UserController.getUser);

router.patch('/profile', passport.authenticate('jwt', { session: false }), UserController.profile);

module.exports = router;