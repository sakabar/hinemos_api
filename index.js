require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('fluent-logger');
const path = require('path');
const Sequelize = require('sequelize');

// Fluentd
logger.configure(process.env.FLUENTD_TAG, {
    host: '127.0.0.1',
    port: process.env.FLUENTD_PORT,
});

logger.emit('api.sys', {
    msg: 'start',
});

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
const LetterPair = sequelize.import(path.join(__dirname, '/src/model/letterPair'));

// sequelize.sync({force: true}).then(() => {
sequelize.sync().then(() => {
    const app = express();
    app.use(bodyParser.urlencoded({
        extended: true,
    }));

    app.use(bodyParser.json());

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    app.post(process.env.EXPRESS_ROOT + '/users', (req, res, next) => {
        const userName = req.body.userName;
        const password = req.body.password;

        User.create({
            userName,
            password,
        }).then((user) => {
            const ans = {
                success: {
                    code: 200,
                    result: {
                        userName,
                    },
                },
            };
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/users',
                params: {
                    userName,
                    password: '********',
                },
                status: 'success',
                code: 200,
                msg: '',
            });

            res.json(ans);
            res.status(200);
        }, () => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/users',
                params: {
                    userName,
                    password: '********',
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send({
                error: {
                    code: 400,
                },
            });
        });
    });

    app.post(process.env.EXPRESS_ROOT + '/auth', (req, res, next) => {
        const userName = req.body.userName;
        const password = req.body.password;

        User.findOne({
            where: {
                userName,
                password,
            },
        }).then((user) => {
            if (!user) {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/auth',
                    params: {
                        userName,
                        password: '********',
                    },
                    status: 'error',
                    code: 400,
                    msg: 'No such user',
                });
                res.status(400).send({
                    error: {
                        code: 400,
                    },
                });
                return;
            }

            const token = jwt.sign({ userName, }, process.env.JWT_SECRET, {
                expiresIn: '24h',
            });

            const ans = {
                success: {
                    code: 200,
                    result: {
                        userName,
                    },
                    token,
                },
            };
            res.json(ans);
            res.status(200);
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/auth',
                params: {
                    userName,
                    password: '********',
                },
                status: 'success',
                code: 200,
                msg: '',
            });
        }, () => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/auth',
                params: {
                    userName,
                    password: '********',
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send({
                error: {
                    code: 400,
                },
            });
        });
    });

    // /letterPair/:userName?word=試験
    // /letterPair/:userName?letters=しけ
    app.get(process.env.EXPRESS_ROOT + '/letterPair/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const word = req.query.word;
        const letters = req.query.letters;

        let query;
        if (word) {
            query = {
                where: {
                    userName,
                    word,
                },
            };
        } else if (letters) {
            query = {
                where: {
                    userName,
                    letters,
                },
            };
        } else {
            query = { where: { userName, }, };
        }

        LetterPair.findAll(query).then((result) => {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    word,
                    letters,
                },
                status: 'success',
                code: 200,
                msg: '',
            });

            res.json(
                {
                    success: {
                        code: 200,
                        result,
                    },
                });
            res.status(200);
        }, () => {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    word,
                    letters,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
        });
    });

    const badRequestError = {
        error: {
            message: 'Bad Request',
            code: 400,
        },
    };

    // Authentification Filter
    app.use((req, res, next) => {
        // get token from body:token or query:token of Http Header:x-access-token
        const token = req.body.token || req.query.token || req.headers['x-access-token'];

        // validate token
        if (!token) {
            logger.emit('api.request', {
                requestType: 'USE',
                endpoint: '/hinemos/auth-filter',
                params: {
                    body: req.body,
                    query: req.query,
                },
                status: 'error',
                code: 403,
                msg: 'No token',
            });
            return res.status(403).send({
                error: {
                    code: 403,
                },
            });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                logger.emit('api.request', {
                    endpoint: 'USE /hinemos/auth-filter',
                    params: {
                        body: req.body,
                        query: req.query,
                    },
                    status: 'error',
                    code: 403,
                    msg: 'Error in verivifation',
                });
                res.status(403).send({
                    error: {
                        code: 403,
                    },
                });
                return;
            }

            // if token valid -> save token to request for use in other routes
            req.decoded = decoded;
            logger.emit('api.request', {
                requestType: 'USE',
                endpoint: '/hinemos/auth-filter',
                params: {
                    body: req.body,
                    query: req.query,
                },
                status: 'success',
                code: 200,
                msg: '',
            });
            next();
        });
    });

    app.use(process.env.EXPRESS_ROOT + '/checkAuth', (req, res, next) => {
        logger.emit('api.request', {
            requestType: 'USE',
            endpoint: '/hinemos/checkAuth',
            params: {},
            status: 'success',
            code: 200,
            msg: '',
        });

        const ans = {
            success: {
                code: 200,
                result: req.decoded,
            },
        };
        res.json(ans);
        res.status(200);
    });

    app.post(process.env.EXPRESS_ROOT + '/letterPair/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const word = req.body.word;
        const letters = req.body.letters;

        if ((req.decoded.userName !== userName) || !word || !letters) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    word,
                    letters,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        LetterPair.create({
            userName,
            word,
            letters,
        }).then((letterPair) => {
            const ans = {
                success: {
                    code: 200,
                    result: letterPair,
                },
            };
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    word,
                    letters,
                },
                status: 'success',
                code: 200,
                msg: '',
            });
            res.json(ans);
            res.status(200);
        }, () => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    word,
                    letters,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
        });
    });

    // 本当はDELETEメソッドを使いたいが、request-promiseでなぜかDELETEメソッドが使えなかったので
    // POSTで代用
    // FIXME
    app.post(process.env.EXPRESS_ROOT + '/deleteLetterPair/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const letters = req.body.letters;
        const word = req.body.word;

        if ((req.decoded.userName !== userName) || (!letters && !word) || (letters && word)) {
            let msg = '';
            if (req.decoded.userName !== userName) {
                msg += 'decoded userName conflicts! ';
            }
            if (!letters && !word) {
                msg += 'both letters and word are empty. ';
            }
            if (letters && word) {
                msg += 'both letters and word are not empty. ';
            }

            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/deleteLetterPair/' + userName,
                params: {
                    letters,
                    word,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg,
            });
            res.status(400).send(badRequestError);
            return;
        }

        if (letters) {
            const query = { where: { userName, letters, }, };
            LetterPair.destroy(query);
        } else if (word) {
            const query = { where: { userName, word, }, };
            LetterPair.destroy(query);
        }

        const ans = {
            success: {
                code: 200,
                result: {
                    userName,
                    letters,
                    word,
                },
                msg: 'Deleted.',
            },
        };

        logger.emit('api.request', {
            requestType: 'POST',
            endpoint: '/hinemos/deleteLetterPair/' + userName,
            params: {
                letters,
                word,
                decoded: req.decoded,
            },
            status: 'success',
            code: 200,
            msg: '',
        });
        res.json(ans);
        res.status(200);
    });

    app.listen(process.env.EXPRESS_PORT);
});
