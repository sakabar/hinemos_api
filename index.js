require('dotenv').config();
const path = require('path');
const Sequelize = require('sequelize');
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',

        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },

        // http://docs.sequelizejs.com/manual/tutorial/querying.html#operators
        operatorsAliases: false,
    }
);

const User = sequelize.import(path.join(__dirname, 'src/model/user'));

// sequelize.sync({force: true}).then(() => {
sequelize.sync().then(() => {
    const app = express();
    app.use(bodyParser.urlencoded({
        extended: true,
    }));

    app.use(bodyParser.json());

    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    app.post('/hinemos/users', (req, res, next) => {
        const userName = req.body.userName;
        const password = req.body.password;

        User.create({
            userName,
            password,
        }).then((user) => {
            const ans = {
                success: {
                    code: 200,
                },
            };
            res.json(ans);
            res.status(200);
        }, () => {
            res.status(400).send({
                error: {
                    code: 400,
                },
            });
        });
    });

    app.post('/hinemos/auth', (req, res, next) => {
        const userName = req.body.userName;
        const password = req.body.password;

        User.findOne({
            where: {
                userName,
                password,
            },
        }).then((user) => {
            if (!user) {
                res.status(400).send({
                    error: {
                        code: 400,
                        // message: 'noop!',
                    },
                });
                return;
            }

            const token = jwt.sign({ userName, }, process.env.JWT_SECRET, {
                expiresIn: '5m',
            });

            const ans = {
                success: {
                    code: 200,
                    token,
                },
            };
            res.json(ans);
            res.status(200);
        }, () => {
            res.status(400).send({
                error: {
                    code: 400,
                },
            });
        });
    });

    // Authentification Filter
    app.use((req, res, next) => {
        // get token from body:token or query:token of Http Header:x-access-token
        const token = req.body.token || req.query.token || req.headers['x-access-token'];

        // validate token
        if (!token) {
            return res.status(403).send({
                error: {
                    code: 403,
                },
            });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                res.status(403).send({
                    error: {
                        code: 403,
                        // message: 'noop!',
                    },
                });
                return;
            }

            // if token valid -> save token to request for use in other routes
            req.decoded = decoded;
            next();
        });
    });

    app.use('/hinemos/secret', (req, res, next) => {
        User.findOne({
            where: {
                userName: 'admin',
            },
        }).then((user) => {
            if (!user) {
                res.status(400).send({
                    error: {
                        code: 400,
                        // message: 'noop!',
                    },
                });
                return;
            }

            const ans = {
                success: {
                    code: 200,
                    result: {
                        user,
                    },
                },
            };
            res.json(ans);
            res.status(200);
        });
    });

    app.listen(8000);
});
