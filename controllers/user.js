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

<<<<<<< Updated upstream
            const token = signToken(newUser);
            res.status(200).json({ token });
=======
            const token = signActivationToken(newUser);
            const data = {
                from: 'gamecaro@gmail.com',
                to: email,
                subject: 'Kích hoạt tài khoản',
                html: `
                    <h2>Xin chào ${name},</h2>
                    <p></p>
                    <h2>Nhấn vào link bên dưới xác nhận tài khoản của bạn:</h2>
                    <p>${process.env.CLIENT_DOMAIN}/account/activate/${token}</p>
                `
                // html: `
                //     <h2>Xin chào ${name},</h2>
                //     <p></p>
                //     <h2>Nhấn vào link bên dưới xác nhận tài khoản của bạn:</h2>
                //     <p>${process.env.CLIENT_TEST_DOMAIN}/account/activate/${token}</p>
                // `
            };

            mg.messages().send(data, function (error, body) {
                console.log(body);
            });

            res.status(200).json({ message: "Sign up successfully !! Check email for account activation" });
>>>>>>> Stashed changes
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
    }
}