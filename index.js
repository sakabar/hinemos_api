require('dotenv').config();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const logger = require('fluent-logger');
const math = require('mathjs');
const path = require('path');
const utils = require('./src/lib/utils');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

// Fluentd
logger.configure(process.env.FLUENTD_TAG, {
    host: '127.0.0.1',
    port: process.env.FLUENTD_PORT,
});

logger.emit('api.sys', {
    msg: 'start',
});

// letters単位でそれぞれ直近の3つまで取ってくる
// 新しい順にソート済という想定
// FIXME テスト書く
const getRecentLetterPairQuizLogs = (quizLogs) => {
    const avgNum = 3; // mo3
    const ans = {};

    // 新しい順に avgNum 個まで取ってくる
    for (let i = 0; i < quizLogs.length; i++) {
        const quizLog = quizLogs[i];
        const letters = quizLog.letters;

        // 間違えた問題は60秒として扱う
        const sec = quizLog.isRecalled === 1 ? quizLog.sec : 60.0;

        const obj = {
            userName: quizLog.userName,
            letters,
            sec,
        };

        if (!ans[letters]) {
            ans[letters] = [ obj, ];
        } else if (ans[letters].length < avgNum) {
            ans[letters].push(obj);
        }
    }

    // 平均を計算するのは、スキーマによって変わるので別のメソッドで行う
    return ans;
};

// カラムは 'user_name', 'letters', avg('sec'), 'is_recalled' の4つ
// 1つのuserNameしか入っていないと仮定
// キーはユニークであると仮定
const calcRecentMo3OfLetterPairQuizLog = (quizLogs) => {
    const recent = getRecentLetterPairQuizLogs(quizLogs);
    const ans = [];

    for (let letters of Object.keys(recent)) {
        const arr = recent[letters];
        const userName = arr[0].userName;

        const avgSec = math.mean(arr.map(x => x.sec));

        // スネークケースに戻す
        const obj = {
            'user_name': userName,
            letters,
            'avg_sec': avgSec,
        };
        ans.push(obj);
    }

    // avg_secの昇順でソートして返す
    return ans.sort((a, b) => -(a['avg_sec'] - b['avg_sec']));
};

// FIXME 同じようなメソッドが2つ…
// stickers単位でそれぞれ直近の3つまで取ってくる
// 新しい順にソート済という想定
// FIXME テスト書く
const getRecentThreeStyleQuizLogs = (quizLogs) => {
    const avgNum = 3; // mo3
    const ans = {};

    // 新しい順に avgNum 個まで取ってくる
    for (let i = 0; i < quizLogs.length; i++) {
        const quizLog = quizLogs[i];
        const stickers = quizLog.stickers;

        // 間違えていたら解答時間は20秒として扱う
        const sec = quizLog.isRecalled === 1 ? quizLog.sec : 20.0;

        const obj = {
            userName: quizLog.userName,
            buffer: quizLog.buffer,
            sticker1: quizLog.sticker1,
            sticker2: quizLog.sticker2,
            stickers,
            sec,
        };

        if (!ans[stickers]) {
            ans[stickers] = [ obj, ];
        } else if (ans[stickers].length < avgNum) {
            ans[stickers].push(obj);
        }
    }

    // 平均を計算するのは、スキーマによって変わるので別のメソッドで行う
    return ans;
};

// FIXME ロジックが重複?
// カラムは 'user_name', 'letters', avg('sec'), is_recalled の4つ
// 1つのuserNameしか入っていないと仮定
// キーはユニークであると仮定
const calcRecentMo3OfThreeStyleQuizLog = (quizLogs) => {
    const recent = getRecentThreeStyleQuizLogs(quizLogs);
    const ans = [];

    for (let stickers of Object.keys(recent)) {
        const arr = recent[stickers];
        const userName = arr[0].userName;
        const buffer = arr[0].buffer;
        const sticker1 = arr[0].sticker1;
        const sticker2 = arr[0].sticker2;

        const avgSec = math.mean(arr.map(x => x.sec));

        // スネークケースに戻す
        const obj = {
            'user_name': userName,
            buffer,
            sticker1,
            sticker2,
            stickers,
            'avg_sec': avgSec,
        };
        ans.push(obj);
    }

    // avg_secの昇順でソートして返す
    return ans.sort((a, b) => -(a['avg_sec'] - b['avg_sec']));
};

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
const NumberingCorner = sequelize.import(path.join(__dirname, '/src/model/numberingCorner'));
const NumberingEdgeMiddle = sequelize.import(path.join(__dirname, '/src/model/numberingEdgeMiddle'));
const ThreeStyleCorner = sequelize.import(path.join(__dirname, '/src/model/threeStyleCorner'));
const ThreeStyleEdgeMiddle = sequelize.import(path.join(__dirname, '/src/model/threeStyleEdgeMiddle'));
const ThreeStyleQuizLogCorner = sequelize.import(path.join(__dirname, '/src/model/threeStyleQuizLogCorner'));
const ThreeStyleQuizLogEdgeMiddle = sequelize.import(path.join(__dirname, '/src/model/threeStyleQuizLogEdgeMiddle'));
const ThreeStyleQuizListCorner = sequelize.import(path.join(__dirname, '/src/model/threeStyleQuizListCorner'));
const ThreeStyleQuizListEdgeMiddle = sequelize.import(path.join(__dirname, '/src/model/threeStyleQuizListEdgeMiddle'));

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

        const userNameValidation = userName.match(/^[A-Za-z0-9_]+$/);
        const passwordValidation = inputPassword.match(/^[A-Za-z0-9@#$%&_:;]+$/);

        if (!userNameValidation || !passwordValidation || inputPassword < 8) {
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
            return;
        }

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
                expiresIn: process.env.JWT_EXPIRE,
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

        // 何もパラメータが入力されていない場合は、全てのレターペアを返す
        const query = {
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

    // 直近28日(envファイルで指定)の中で、直近の mean of 3 を計算
    app.get(process.env.EXPRESS_ROOT + '/letterPairQuizLog/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const days = parseInt(req.query.days ? req.query.days : process.env.LETTER_PAIR_QUIZ_LOG_RECENT); // 「n日間に」解いた問題

        if (!userName) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/letterPairQuizLog/' + userName,
                params: {
                    userName,
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

        // is_recallledは今のところ使わない
        // mo3でis_recalledを計算しても、n/3で粗いのでやり方を考える必要がある
        LetterPairQuizLog
            .findAll({
                attributes: [
                    [ 'user_name', 'userName', ],
                    'letters',
                    [ 'is_recalled', 'isRecalled', ],
                    'sec',
                ],
                where: {
                    userName,
                    // 最近の記録のみ使用
                    createdAt: {
                        [Op.gt]: new Date(new Date() - days * (60 * 60 * 24 * 1000)), // ミリ秒に変換
                    },
                },
                order: [
                    [
                        'createdAt',
                        'DESC',
                    ],
                ],
            })
            .then((result) => {
                const ans = {
                    success: {
                        code: 200,
                        result: calcRecentMo3OfLetterPairQuizLog(result),
                    },
                };

                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/letterPairQuizLog/' + userName,
                    params: {
                        userName,
                        body: req.body,
                        query: req.query,
                    },
                    status: 'success',
                    code: 200,
                    msg: '',
                });

                res.json(ans);
                res.status(200);
            })
            .catch(() => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/letterPairQuizLog/' + userName,
                    params: {
                        userName,
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

    app.get(process.env.EXPRESS_ROOT + '/threeStyle/:part', (req, res, next) => {
        const userName = req.query.userName;
        const buffer = req.query.buffer;
        const sticker1 = req.query.sticker1;
        const sticker2 = req.query.sticker2;
        const part = req.params.part;
        // const setup = req.query.setup;
        // const move1 = req.query.move1;
        // const move2 = req.query.move2;

        if (!(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyle/',
                params: {
                    userName,
                    part,
                    buffer,
                    sticker1,
                    sticker2,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        const query = {
            where: {},
        };
        if (userName) {
            query.where.userName = userName;
        }
        if (buffer) {
            query.where.buffer = buffer;
        }
        if (sticker1) {
            query.where.sticker1 = sticker1;
        }
        if (sticker2) {
            query.where.sticker2 = sticker2;
        }

        let threeStyleModel;
        if (part === 'corner') {
            threeStyleModel = ThreeStyleCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleModel = ThreeStyleEdgeMiddle;
        }

        threeStyleModel
            .findAll(query)
            .then((result) => {
                const ans = {
                    success: {
                        code: 200,
                        result,
                    },
                };

                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyle/',
                    params: {
                        userName,
                        part,
                        buffer,
                        sticker1,
                        sticker2,
                    },
                    status: 'success',
                    code: 200,
                    msg: '',
                });

                res.json(ans);
                res.status(200);
            })
            .catch((err) => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyle/',
                    params: {
                        userName,
                        part,
                        buffer,
                        sticker1,
                        sticker2,
                    },
                    status: 'error',
                    code: 400,
                    msg: err,
                });

                res.status(400).send(badRequestError);
            });
    });

    // lettersから3-styleを引く
    app.get(process.env.EXPRESS_ROOT + '/threeStyleFromLetters/corner', (req, res, next) => {
        const userName = req.query.userName;
        const letters = req.query.letters;

        if (!userName || !letters) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyleFromLetters/corner',
                params: {
                    userName,
                    letters,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        const numberingQuery = {
            where: {
                userName,
                letter: [ '@', ...letters.split(''), ],
            },
        };

        return NumberingCorner
            .findAll(numberingQuery)
            .then((results) => {
                // buffer, sticker1, sticker2 で 3
                if (results.length !== 3) {
                    logger.emit('api.request', {
                        requestType: 'GET',
                        endpoint: '/hinemos/threeStyleFromLetters/corner',
                        params: {
                            userName,
                            letters,
                        },
                        status: 'error',
                        code: 400,
                        msg: '',
                    });

                    res.status(400).send(badRequestError);
                    return;
                }

                const buffer = results.filter(x => x.letter === '@')[0].sticker;
                const sticker1 = results.filter(x => x.letter === letters[0])[0].sticker;
                const sticker2 = results.filter(x => x.letter === letters[1])[0].sticker;

                const threeStyleQuery = {
                    where: {
                        userName,
                        buffer,
                        sticker1,
                        sticker2,
                    },
                };

                return ThreeStyleCorner
                    .findAll(threeStyleQuery)
                    .then((threeStyles) => {
                        logger.emit('api.request', {
                            requestType: 'GET',
                            endpoint: '/hinemos/threeStyleFromLetters/corner',
                            params: {
                                userName,
                                letters,
                            },
                            status: 'success',
                            code: 200,
                            msg: '',
                        });

                        const ans = {
                            success: {
                                code: 200,
                                result: threeStyles,
                            },
                        };
                        res.json(ans);
                        res.status(200);
                    })
                    .catch(() => {
                        logger.emit('api.request', {
                            requestType: 'GET',
                            endpoint: '/hinemos/threeStyleFromLetters/corner',
                            params: {
                                userName,
                                letters,
                            },
                            status: 'error',
                            code: 400,
                            msg: '',
                        });

                        res.status(400).send(badRequestError);
                    });
            })
            .catch(() => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyleFromLetters/corner',
                    params: {
                        userName,
                        letters,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });

                res.status(400).send(badRequestError);
            });
    });

    // あるユーザのナンバリングを取得
    // あるステッカーのナンバリングについて、全ユーザの分布を調べたりするためには、
    // 別のAPIが必要
    app.get(process.env.EXPRESS_ROOT + '/numbering/:part/:userName', (req, res, next) => {
        const part = req.params.part;
        const userName = req.params.userName;
        const letters = req.query.letters;

        if (!userName || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/numbering/',
                params: {
                    part,
                    userName,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        const query = {
            where: {
                userName,
            },
        };
        if (letters) {
            query.where.letter = letters.split(/(.)/).filter(x => x);
        }

        // cornerかedgeMiddle以外の場合、既にハジかれている
        let numberingModel;
        if (part === 'corner') {
            numberingModel = NumberingCorner;
        } else if (part === 'edgeMiddle') {
            numberingModel = NumberingEdgeMiddle;
        }

        return numberingModel
            .findAll(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/numbering/',
                    params: {
                        part,
                        userName,
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
            .catch(() => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/numbering/',
                    params: {
                        part,
                        userName,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });

                res.status(400).send(badRequestError);
            });
    });

    app.get(process.env.EXPRESS_ROOT + '/threeStyleQuizLog/:part/:userName', (req, res, next) => {
        const userName = req.params.userName;
        const part = req.params.part;

        if (!userName || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyleQuizLog/',
                params: {
                    userName,
                    part,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        const query = {
            attributes: [
                [ 'user_name', 'userName', ],
                'buffer',
                'sticker1',
                'sticker2',
                'stickers',
                [ 'is_recalled', 'isRecalled', ],
                'sec',
            ],
            where: {
                userName,
                // 最近の記録のみ使用
                createdAt: {
                    [Op.gt]: new Date(new Date() - process.env.THREE_STYLE_QUIZ_LOG_RECENT),
                },
            },
            order: [
                [
                    'createdAt',
                    'DESC',
                ],
            ],
        };

        let threeStyleQuizLogModel;
        if (part === 'corner') {
            threeStyleQuizLogModel = ThreeStyleQuizLogCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleQuizLogModel = ThreeStyleQuizLogEdgeMiddle;
        }

        return threeStyleQuizLogModel
            .findAll(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyleQuizLog/',
                    params: {
                        userName,
                        part,
                    },
                    status: 'success',
                    code: 200,
                    msg: '',
                });

                const ans = {
                    success: {
                        code: 200,
                        result: calcRecentMo3OfThreeStyleQuizLog(result),
                    },
                };
                res.json(ans);
                res.status(200);
            })
            .catch(() => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyleQuizLog/',
                    params: {
                        userName,
                        part,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });

                res.status(400).send(badRequestError);
            });
    });

    // 3-styleクイズの登録した問題リストを取ってくる
    app.get(`${process.env.EXPRESS_ROOT}/threeStyleQuizList/:part/:userName`, (req, res, next) => {
        const userName = req.params.userName;
        const part = req.params.part;

        if (!userName || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyleQuizList/',
                params: {
                    userName,
                    part,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        const query = {
            where: {
                userName,
            },
        };

        let threeStyleQuizListModel;
        if (part === 'corner') {
            threeStyleQuizListModel = ThreeStyleQuizListCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleQuizListModel = ThreeStyleQuizListEdgeMiddle;
        }

        return threeStyleQuizListModel
            .findAll(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyleQuizList/',
                    params: {
                        userName,
                        part,
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
            .catch(() => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/threeStyleQuizList/',
                    params: {
                        userName,
                        part,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });

                res.status(400).send(badRequestError);
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
                    userName: decoded.userName,
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
            params: {
                userName: req.decoded.userName,
            },
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
        const hiraganas = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(/(.{1})/).filter(x => x);

        const userName = req.params.userName;
        const inputWord = req.body.word;
        const letters = req.body.letters;

        const lettersOk = letters.split(/(.)/).filter(x => x).every(ch => hiraganas.includes(ch));
        if ((req.decoded.userName !== userName) || !inputWord || !letters || !lettersOk) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/letterPair/' + userName,
                params: {
                    userName,
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
        const promises = [];
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
                        userName,
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
                        userName,
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

        const query = {
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
            .catch(() => {
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
                        // 次に、UIの表から入力された情報で更新
                        const promises = [];
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
                                        })
                                        .then((result) => {
                                            return {
                                                code: 200,
                                                params: instance,
                                                msg: 'OK',
                                            };
                                        })
                                        .catch(() => {
                                            const msg = `『ひらがな「${String(instance.letters)}」に単語「${String(instance.word)}」を割り当てようとしたところ、エラーが発生しました。』`;
                                            throw new Error(msg);
                                        }));
                            }
                        }

                        return Promise.all(promises)
                            .then((result) => {
                                return 200;
                            })
                            .catch((err) => {
                                throw new Error(err);
                            });
                    })
                    .catch((err) => {
                        throw new Error(err);
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

                const badRequestErrorWithParams = {
                    error: {
                        code: 400,
                        message: 'Bad Request: ' + err,
                    },
                };

                res.status(400).send(badRequestErrorWithParams);
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

        if (!userName || !letters || !isRecalled || !sec) {
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

    app.post(process.env.EXPRESS_ROOT + '/threeStyle/:part', (req, res, next) => {
        const userName = req.decoded.userName;
        const part = req.params.part;

        const buffer = req.body.buffer.replace(/\s*$/, '').replace(/^\s*/, '');
        const sticker1 = req.body.sticker1.replace(/\s*$/, '').replace(/^\s*/, '');
        const sticker2 = req.body.sticker2.replace(/\s*$/, '').replace(/^\s*/, '');
        const setup = req.body.setup.replace(/\s*$/, '').replace(/^\s*/, '');
        const move1 = req.body.move1.replace(/\s*$/, '').replace(/^\s*/, '');
        const move2 = req.body.move2.replace(/\s*$/, '').replace(/^\s*/, '');

        const okCond1 = (move1 !== '' && move2 !== '');
        const okCond2 = (move1 === '' && move2 === '' && setup !== '');

        if (!userName || !buffer || !sticker1 || !sticker2 || !(okCond1 || okCond2) || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyle/',
                params: {
                    part,
                    buffer,
                    sticker1,
                    sticker2,
                    setup,
                    move1,
                    move2,
                    userName: req.decoded.userName,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        const numberOfMoves = utils.getNumberOfMoves(setup, move1, move2);
        const stickers = `${buffer} ${sticker1} ${sticker2}`;

        let threeStyleModel;
        if (part === 'corner') {
            threeStyleModel = ThreeStyleCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleModel = ThreeStyleEdgeMiddle;
        }

        threeStyleModel
            .create({
                userName,
                numberOfMoves,
                buffer,
                sticker1,
                sticker2,
                stickers,
                setup,
                move1,
                move2,
            })
            .then((result) => {
                const ans = {
                    success: {
                        code: 200,
                        result,
                    },
                };

                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/threeStyle/',
                    params: {
                        part,
                        buffer,
                        sticker1,
                        sticker2,
                        setup,
                        move1,
                        move2,
                        userName: req.decoded.userName,
                        decoded: req.decoded,
                    },
                    status: 'success',
                    code: 200,
                    msg: '',
                });
                res.json(ans);
                res.status(200);
            })
            .catch((err) => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/threeStyle/',
                    params: {
                        part,
                        buffer,
                        sticker1,
                        sticker2,
                        setup,
                        move1,
                        move2,
                        userName: req.decoded.userName,
                        decoded: req.decoded,
                    },
                    status: 'error',
                    code: 400,
                    msg: err,
                });

                res.status(400).send(badRequestError);
            });
    });

    // 部分更新することは考えていないので、そのユーザのデータを全置き換え
    app.post(process.env.EXPRESS_ROOT + '/numbering/:part/', (req, res, next) => {
        const part = req.params.part;
        const userName = req.decoded.userName;
        const numberings = Array.from(new Set(req.body.numberings)); // [{sticker, numbering,}]

        // ナンバリングで重複を排除した時に数が一致しないということは、重複が存在するということなのでNG
        const uniqedLn = Array.from(new Set(numberings.map(x => x.letter))).length;
        const assertCond = uniqedLn === numberings.length;

        if (!userName || !req.body.numberings || uniqedLn === 0 || !assertCond || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/numbering/',
                params: {
                    part,
                    userName,
                    numberings,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });

            res.status(400).send(badRequestError);
            return;
        }

        let numberingModel;
        if (part === 'corner') {
            numberingModel = NumberingCorner;
        } else if (part === 'edgeMiddle') {
            numberingModel = NumberingEdgeMiddle;
        }

        sequelize
            .transaction((t) => {
                // まず今のnumberingを消す
                return numberingModel
                    .destroy({
                        where: {
                            userName,
                        },
                        transaction: t,
                    })
                    .then((result) => {
                        // 次に、UIから入力された情報で更新
                        const promises = [];
                        for (let i = 0; i < numberings.length; i++) {
                            const sticker = numberings[i].sticker;
                            const letter = numberings[i].letter;
                            const instance = {
                                userName,
                                sticker,
                                letter,
                            };

                            promises.push(
                                numberingModel
                                    .create(instance, {
                                        transaction: t,
                                    })
                                    .then((result) => {
                                        return {
                                            code: 200,
                                            params: instance,
                                            msg: 'OK',
                                        };
                                    }));
                        }

                        return Promise.all(promises)
                            .then((ans) => {
                                logger.emit('api.request', {
                                    requestType: 'POST',
                                    endpoint: '/hinemos/numbering/',
                                    params: {
                                        part,
                                        userName,
                                        numberings,
                                        decoded: req.decoded,
                                    },
                                    status: 'success',
                                    code: 200,
                                    msg: '',
                                });

                                res.json(ans);
                                res.status(200);
                            })
                            .catch((err) => {
                                logger.emit('api.request', {
                                    requestType: 'POST',
                                    endpoint: '/hinemos/numbering/',
                                    params: {
                                        part,
                                        userName,
                                        numberings,
                                        decoded: req.decoded,
                                    },
                                    status: 'erorr',
                                    code: 400,
                                    msg: err,
                                });

                                res.status(400).send(badRequestError);
                            });
                    });
            });
    });

    app.post(process.env.EXPRESS_ROOT + '/threeStyleQuizLog/:part', (req, res, next) => {
        const userName = req.decoded.userName;
        const buffer = req.body.buffer;
        const sticker1 = req.body.sticker1;
        const sticker2 = req.body.sticker2;
        const usedHint = req.body.usedHint;
        const isRecalled = req.body.isRecalled;
        const sec = req.body.sec;
        const part = req.params.part;

        if (!userName || !buffer || !sticker1 || !sticker2 || !usedHint || !isRecalled || !sec || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleQuizLog/',
                params: {
                    userName,
                    part,
                    buffer,
                    sticker1,
                    sticker2,
                    usedHint,
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

        let threeStyleQuizLogModel;
        if (part === 'corner') {
            threeStyleQuizLogModel = ThreeStyleQuizLogCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleQuizLogModel = ThreeStyleQuizLogEdgeMiddle;
        }

        threeStyleQuizLogModel.create({
            userName,
            buffer,
            sticker1,
            sticker2,
            stickers: `${buffer} ${sticker1} ${sticker2}`,
            usedHint,
            isRecalled,
            sec,
        }).then((threeStyleQuizLogResult) => {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleQuizLog/',
                params: {
                    userName,
                    part,
                    buffer,
                    sticker1,
                    sticker2,
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
                    result: threeStyleQuizLogResult,
                },
            };

            res.json(ans);
            res.status(200);
        });
    });

    // 本当はDELETEメソッドを使いたいが、request-promiseでなぜかDELETEメソッドが使えなかったので
    // POSTで代用
    // FIXME
    app.post(process.env.EXPRESS_ROOT + '/deleteThreeStyle/corner', (req, res, next) => {
        const userName = req.decoded.userName;
        const id = req.body.id;

        if (!userName) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/deleteThreeStyle/corner',
                params: {
                    userName,
                    id,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
            return;
        }

        // リクエストしたユーザと、threeStyleを登録したユーザは一致している必要がある
        const query = {
            where: {
                userName,
                id,
            },
        };

        ThreeStyleCorner
            .destroy(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/deleteThreeStyle/corner',
                    params: {
                        userName,
                        id,
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
            .catch(() => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: '/hinemos/deleteThreeStyle/corner',
                    params: {
                        userName,
                        id,
                        decoded: req.decoded,
                    },
                    status: 'error',
                    code: 400,
                    msg: '',
                });
                res.status(400).send(badRequestError);
            });
    });

    app.post(`${process.env.EXPRESS_ROOT}/threeStyleQuizList/corner`, (req, res, next) => {
        const userName = req.decoded.userName;
        const threeStyleQuizList = req.body.threeStyleQuizList ? req.body.threeStyleQuizList : [];
        // 形式は [{userName, buffer, sticker1, sticker2, stickers}]
        // userNameはデコードしたuserNameで置き換える

        if (!userName || !threeStyleQuizList) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleQuizList/corner',
                params: {
                    userName,
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
                // まず今のlistを消す
                return ThreeStyleQuizListCorner
                    .destroy({
                        where: {
                            userName,
                        },
                        transaction: t,
                    })
                    .then((result) => {
                        // 次に、UIから入力された情報で更新
                        const promises = [];
                        for (let i = 0; i < threeStyleQuizList.length; i++) {
                            const ts = threeStyleQuizList[i];

                            if (!ts.buffer || !ts.sticker1 || !ts.sticker2 || !ts.stickers) {
                                throw new Error('Error: 空の値があります');
                            }

                            const instance = {
                                userName,
                                buffer: ts.buffer,
                                sticker1: ts.sticker1,
                                sticker2: ts.sticker2,
                                stickers: ts.stickers,
                            };

                            promises.push(
                                ThreeStyleQuizListCorner
                                    .create(instance, {
                                        transaction: t,
                                    })
                                    .then((result) => {
                                        return {
                                            code: 200,
                                            params: instance,
                                            msg: 'OK',
                                        };
                                    })
                                    .catch(() => {
                                        throw new Error('エラー');
                                    }));
                        }

                        return Promise.all(promises)
                            .then((result) => {
                                logger.emit('api.request', {
                                    requestType: 'POST',
                                    endpoint: '/hinemos/threeStyleQuizList/corner',
                                    params: {
                                        userName,
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
                            .catch(() => {
                                logger.emit('api.request', {
                                    requestType: 'POST',
                                    endpoint: '/hinemos/threeStyleQuizList/corner',
                                    params: {
                                        userName,
                                        decoded: req.decoded,
                                    },
                                    status: 'error',
                                    code: 400,
                                    msg: '',
                                });
                                res.status(400).send(badRequestError);
                            });
                    });
            });
    });

    app.post(process.env.EXPRESS_ROOT + '/threeStyleCornerTable', (req, res, next) => {
        const userName = req.decoded.userName;
        const threeStyleTable = req.body.threeStyleTable;

        if (!userName || !threeStyleTable) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleCornerTable',
                params: {
                    userName,
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
                // まず今のthreeStyleを消す
                return ThreeStyleCorner
                    .destroy({
                        where: {
                            userName,
                        },
                        transaction: t,
                    })
                    .then(() => {
                        // 次に、UIの表から入力された情報で更新
                        const promises = [];
                        for (let i = 0; i < threeStyleTable.length; i++) {
                            const ts = threeStyleTable[i];

                            // FIXME stickersを得る手順が複数の場所で重複している。関数化したほうがいいかも
                            const stickers = `${ts.buffer} ${ts.sticker1} ${ts.sticker2}`;
                            const instance = {
                                userName,
                                numberOfMoves: utils.getNumberOfMoves(ts.setup, ts.move1, ts.move2),
                                buffer: ts.buffer,
                                sticker1: ts.sticker1,
                                sticker2: ts.sticker2,
                                stickers,
                                setup: ts.setup,
                                move1: ts.move1,
                                move2: ts.move2,
                            };

                            promises.push(
                                ThreeStyleCorner
                                    .create(instance, {
                                        transaction: t,
                                    })
                                    .then((result) => {
                                        return {
                                            code: 200,
                                            params: instance,
                                            msg: 'OK',
                                        };
                                    })
                                    .catch((err) => {
                                        const msg = `『「${stickers}」に手順を登録しようとしたところ、エラーが発生しました。${err}』`;

                                        throw new Error(msg);
                                    }));
                        }

                        return Promise.all(promises)
                            .then((result) => {
                                return 200;
                            })
                            .catch((err) => {
                                throw new Error(err);
                            });
                    })
                    .catch((err) => {
                        throw new Error(err);
                    });
            })
            .then((result) => {
                if (result === 200) {
                    logger.emit('api.request', {
                        requestType: 'POST',
                        endpoint: '/hinemos/threeStyleCornerTable',
                        params: {
                            userName,
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
                    endpoint: '/hinemos/threeStyleCornerTable',
                    params: {
                        userName,
                        decoded: req.decoded,
                    },
                    status: 'error',
                    code: 400,
                    msg: err,
                });

                const badRequestErrorWithParams = {
                    error: {
                        code: 400,
                        message: 'Bad Request: ' + err,
                    },
                };

                res.status(400).send(badRequestErrorWithParams);
            });
    });

    app.listen(process.env.EXPRESS_PORT);
});
