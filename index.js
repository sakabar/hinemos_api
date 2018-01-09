require('dotenv').config();
const bodyParser = require('body-parser');
const crypto = require('crypto');
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
        timezone: '+09:00',
    }
);

const User = sequelize.import(path.join(__dirname, 'src/model/user'));
const LetterPair = sequelize.import(path.join(__dirname, '/src/model/letterPair'));
const LetterPairQuizLog = sequelize.import(path.join(__dirname, '/src/model/letterPairQuizLog'));

const getHashedPassword = (userName, password) => {
    const sha512 = crypto.createHash('sha512');
    sha512.update(userName + password, 'ascii');

    return sha512.digest('hex');
};

// sequelize.sync({force: true}).then(() => {
sequelize.sync().then(() => {
    const app = express();

    app.use(bodyParser.urlencoded({
        limit: '1mb', // データ量の上限
        parameterLimit: 100000, // パラメータ数の上限
        extended: true,
    }));

    app.use(bodyParser.json());

    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    const badRequestError = {
        error: {
            message: 'Bad Request',
            code: 400,
        },
    };

    app.post(process.env.EXPRESS_ROOT + '/users', (req, res, next) => {
        const userName = req.body.userName;
        const inputPassword = req.body.password;
        const password = getHashedPassword(userName, inputPassword);

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
        const inputPassword = req.body.password;
        const password = getHashedPassword(userName, inputPassword);

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
    // 他の人のレターペアを確認できるように、userNameはURLの引数から外した
    app.get(process.env.EXPRESS_ROOT + '/letterPair', (req, res, next) => {
        const userName = req.query.userName;
        const word = req.query.word;
        const letters = req.query.letters;

        if (!userName && !word && !letters) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/letterPair',
                params: {
                    userName,
                    word,
                    letters,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
            return;
        }

        let query = {
            where: {},
        };
        if (word) {
            query.where.word = word;
        }
        if (letters) {
            query.where.letters = letters;
        }
        if (userName) {
            query.where.userName = userName;
        }

        LetterPair.findAll(query).then((result) => {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/letterPair',
                params: {
                    userName,
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
                endpoint: '/hinemos/letterPair',
                params: {
                    userName,
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

    // 今のところの構想
    // /letterPair を使う代わりに、letterPairQuizLogの情報を使って引っ張ってくる
    // 遅いものをやるとか、正解率が低いものをやるとか
    // orderByできる
    // asc、desc
    // まずは正解数が少ない順に取るか
    // select user_name, letters, sum(is_recalled) as ok, count(*) as cnt, avg(sec) as avg_sec from letter_pair_quiz_log group by user_name, letters order by ok ASC;
    // select * from letter_pair_quiz_log order by
    app.get(process.env.EXPRESS_ROOT + '/letterPairQuizLog/:userName', (req, res, next) => {
        const userName = req.params.userName;
        if (!userName) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/letterPairQuizLog/' + userName,
                params: {
                    body: req.body,
                    query: req.query,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            return res.status(400).send({
                error: {
                    code: 400,
                },
            });
        }

        LetterPairQuizLog
            .findAll({
                attributes: [
                    'user_name',
                    'letters',
                    [
                        sequelize.fn('SUM', sequelize.col('is_recalled')),
                        'ok_cnt',
                    ],
                    [
                        sequelize.fn('COUNT', sequelize.col('*')),
                        'cnt',
                    ],
                    [
                        sequelize.fn('AVG', sequelize.col('sec')),
                        'avg_sec',
                    ],
                ],
                where: {
                    userName,
                },
                group: [
                    'user_name',
                    'letters',
                ],
                order: [
                    [
                        sequelize.fn('SUM', sequelize.col('is_recalled')),
                        'ASC',
                    ],
                ],
            })
            .then((result) => {
                const ans = {
                    success: {
                        code: 200,
                        result,
                    },
                };
                res.json(ans);
                res.status(200);
            })
            .catch((err) => {
                console.dir(err);

                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/letterPairQuizLog/' + userName,
                    params: {
                        body: req.body,
                        query: req.query,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });
                return res.status(400).send({
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
        const inputWord = req.body.word;
        const letters = req.body.letters;

        if ((req.decoded.userName !== userName) || !inputWord || !letters) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    word: inputWord,
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

        const words = inputWord.replace(/\s/g, '').split(/[,，、/／]/).filter(x => x.length > 0);
        let promises = [];
        for (let i = 0; i < words.length; i++) {
            const word = words[i];

            promises.push(
                LetterPair
                    .create({
                        userName,
                        word,
                        letters,
                    })
                    .then((ans) => {
                        return ans;
                    }, () => {
                        return [];
                    })
            );
        }

        Promise.all(promises)
            .then((results) => {
                const ans = {
                    success: {
                        code: 200,
                        result: results,
                    },
                };

                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/letterPair/' + userName,
                    params: {
                        word: inputWord,
                        letters,
                    },
                    status: 'success',
                    code: 200,
                    msg: '',
                });
                res.json(ans);
                res.status(200);
            }, (err) => {
                const ans = {
                    error: {
                        code: 400,
                        msg: err,
                    },
                };

                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/letterPair/' + userName,
                    params: {
                        word: inputWord,
                        letters,
                    },
                    status: 'error',
                    code: 400,
                    msg: err,
                });
                res.json(ans);
                res.status(400);
            });
    });

    // 本当はDELETEメソッドを使いたいが、request-promiseでなぜかDELETEメソッドが使えなかったので
    // POSTで代用
    // FIXME
    app.post(process.env.EXPRESS_ROOT + '/deleteLetterPair', (req, res, next) => {
        const userName = req.decoded.userName;
        const letters = req.body.letters;
        const word = req.body.word;

        if (!userName) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/deleteLetterPair',
                params: {
                    userName,
                    letters,
                    word,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
            return;
        }

        let query = {
            where: {
                userName,
            },
        };
        if (letters) {
            query.where.letters = letters;
        }
        if (word) {
            query.where.word = word;
        }

        LetterPair
            .destroy(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/deleteLetterPair',
                    params: {
                        userName,
                        letters,
                        word,
                        decoded: req.decoded,
                    },
                    status: 'success',
                    code: 200,
                    msg: '',
                });

                const ans = {
                    success: {
                        code: 200,
                        result,
                    },
                };
                res.json(ans);
                res.status(200);
            })
            .catch((err) => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/deleteLetterPair',
                    params: {
                        userName,
                        letters,
                        word,
                        decoded: req.decoded,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });
                res.status(400).send(badRequestError);
            });
    });

    app.post(process.env.EXPRESS_ROOT + '/letterPairTable', (req, res, next) => {
        const userName = req.decoded.userName;
        const letterPairTable = req.body.letterPairTable;

        if (!userName || !letterPairTable) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPairTable',
                params: {
                    userName,
                    // letterPairTable,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
            return;
        }

        sequelize
            .transaction((t) => {
                // まず今のletterPairを消す
                return LetterPair
                    .destroy({
                        where: {
                            userName,
                        },
                        transaction: t,
                    })
                    .then((result) => {
                        // 次に、UIの表から入力されたの情報で更新
                        let promises = [];
                        for (let i = 0; i < letterPairTable.length; i++) {
                            const words = letterPairTable[i].words;
                            for (let k = 0; k < words.length; k++) {
                                const letters = letterPairTable[i].letters;
                                const word = letterPairTable[i].words[k];

                                const instance = {
                                    userName,
                                    word,
                                    letters,
                                };

                                promises.push(
                                    LetterPair
                                        .create(instance, {
                                            transaction: t,
                                        }));
                            }
                        }

                        return Promise.all(promises)
                            .then((result) => {
                                return 200;
                            })
                            .catch((err) => {
                                throw new Error('error');
                            });
                    })
                    .catch((err) => {
                        throw new Error('error');
                    });
            })
            .then((result) => {
                if (result === 200) {
                    logger.emit('api.request', {
                        requestType: 'POST',
                        endpoint: '/hinemos/letterPairTable',
                        params: {
                            userName,
                            // letterPairTable,
                            decoded: req.decoded,
                        },
                        status: 'success',
                        code: 200,
                        msg: '',
                    });

                    const ans = {
                        success: {
                            code: 200,
                            result,
                        },
                    };
                    res.json(ans);
                    res.status(200);
                } else {
                    throw new Error('error');
                }
            })
            .catch((err) => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/letterPairTable',
                    params: {
                        userName,
                        // letterPairTable,
                        decoded: req.decoded,
                    },
                    status: 'error',
                    code: 400,
                    msg: err,
                });

                res.status(400).send(badRequestError);
            });
    });

    app.post(process.env.EXPRESS_ROOT + '/letterPairQuizLog', (req, res, next) => {
        const userName = req.decoded.userName;
        const letters = req.body.letters;
        const isRecalled = req.body.isRecalled;
        const sec = req.body.sec;

        const badRequestError = {
            error: {
                message: 'Bad Request',
                code: 400,
            },
        };

        if (!userName || !letters || !isRecalled) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPairQuizLog',
                params: {
                    userName,
                    letters,
                    isRecalled,
                    sec,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
            return;
        }

        LetterPairQuizLog.create({
            userName,
            letters,
            isRecalled,
            sec,
        }).then((letterPairQuizLogResult) => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPairQuizLog',
                params: {
                    userName,
                    letters,
                    isRecalled,
                    sec,
                    decoded: req.decoded,
                },
                status: 'success',
                code: 200,
                msg: '',
            });

            const ans = {
                success: {
                    code: 200,
                    result: letterPairQuizLogResult,
                },
            };

            res.json(ans);
            res.status(200);
        });
    });

    app.listen(process.env.EXPRESS_PORT);
});
