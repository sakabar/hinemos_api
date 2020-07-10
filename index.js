require('dotenv').config();
const bodyParser = require('body-parser');
const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const logger = require('fluent-logger');
const math = require('mathjs');
const moment = require('moment');
const path = require('path');
const Sequelize = require('sequelize');
const route = require('./src/route');
const validation = require('./src/validation');
const { badRequestError, } = require('./src/lib/utils');
const { sequelize, } = require('./src/model');

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
        const isRecalled = quizLog.isRecalled;
        const sec = quizLog.sec;

        const obj = {
            userName: quizLog.userName,
            letters,
            isRecalled,
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

        const solved = math.sum(arr.map(x => x.isRecalled));
        const tried = arr.length;

        // avgSecは、解けた問題についてのみ計算
        const secSolved = arr.filter(x => x.isRecalled === 1).map(x => x.sec);
        const avgSec = secSolved.length === 0 ? 0.0 : math.mean(secSolved);

        // スネークケースに戻す
        const obj = {
            'user_name': userName,
            letters,
            solved,
            tried,
            'avg_sec': avgSec,
        };
        ans.push(obj);
    }

    // 正答数の昇順、トライ数の降順、その中でavg_secの降順でソートして返す
    return ans.sort((a, b) => (a.solved - b.solved) || -(a.tried - b.tried) || -(a['avg_sec'] - b['avg_sec']));
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
        const isRecalled = quizLog.isRecalled;
        const sec = quizLog.sec;

        const obj = {
            userName: quizLog.userName,
            buffer: quizLog.buffer,
            sticker1: quizLog.sticker1,
            sticker2: quizLog.sticker2,
            stickers,
            isRecalled,
            sec,
            createdAt: quizLog.createdAt,
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
// カラムは 'user_name', 'letters', avg('sec'), is_recalled, newness の4つ
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

        const solved = math.sum(arr.map(x => x.isRecalled));
        const tried = arr.length;

        // avgSecは、解けた問題についてのみ計算
        const secSolved = arr.filter(x => x.isRecalled === 1).map(x => x.sec);
        const avgSec = secSolved.length === 0 ? 0.0 : math.mean(secSolved);

        // 今の時刻が入っているから純粋ではない
        // 鮮度は0以下の整数、単位は「日」
        const newness = -Math.min(...arr.map(x => moment().diff(moment(x.createdAt), 'days')));

        // スネークケースに戻す
        const obj = {
            'user_name': userName,
            buffer,
            sticker1,
            sticker2,
            stickers,
            solved,
            tried,
            'avg_sec': avgSec,
            newness,
        };
        ans.push(obj);
    }

    // 正答数の昇順、トライ数の降順、その中でavg_secの降順でソートして返す
    return ans.sort((a, b) => (a.solved - b.solved) || -(a.tried - b.tried) || -(a['avg_sec'] - b['avg_sec']));
};

const User = sequelize.import(path.join(__dirname, 'src/model/user'));
const FaceColor = sequelize.import(path.join(__dirname, '/src/model/faceColor'));
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
    const options = {
        key: fs.readFileSync(process.env.HTTPS_KEY_PATH),
        cert: fs.readFileSync(process.env.HTTPS_CERT_PATH),
    };
    const server = https.createServer(options, app);

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

    app.get(`${process.env.EXPRESS_ROOT}/memoElement`, validation.memoElement.getProcess, route.memoElement.getProcess);
    // これは用意しない
    // app.post(`${process.env.EXPRESS_ROOT}/memoElement`, validation.memoElement.postProcess, route.memoElement.postProcess);

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

        LetterPair.findAll(query).then((tmpResult) => {
            // ユーザ名をマスク
            const result = tmpResult.map(elm => {
                const plainElm = elm.get({ plain: true, });

                // sha256に変換し、最初の8桁のみ採用
                // 複数のユーザで同じ値になることはほぼ無いはず
                const masked = getHashedPassword(plainElm.userName, 'dummy').slice(0, 8);
                plainElm.userName = masked;
                return plainElm;
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
            res.status(400).send(badRequestError);
        });
    });

    app.get(process.env.EXPRESS_ROOT + '/letterPairCount', route.letterPairCount.getProcess);

    // 直近28日(envファイルで指定)の中で、直近の mean of 3 を計算
    app.get(process.env.EXPRESS_ROOT + '/letterPairQuizLog/:userName', (req, res, next) => {
        const userName = req.params.userName;
        // 「n日間に」解いた問題
        const tmpDays = parseFloat(req.query.days);
        const days = isNaN(tmpDays) ? parseFloat(process.env.LETTER_PAIR_QUIZ_LOG_RECENT) : tmpDays;

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

    app.get(`${process.env.EXPRESS_ROOT}/threeStyle/:part`, route.threeStyle.getProcess);

    // lettersから3-styleを引く
    app.get(process.env.EXPRESS_ROOT + '/threeStyleFromLetters/:part', (req, res, next) => {
        const userName = req.query.userName;
        const letters = req.query.letters;
        const part = req.params.part;

        if (!userName || !letters || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/threeStyleFromLetters/',
                params: {
                    userName,
                    part,
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

        let numberingModel;
        let threeStyleModel;
        if (part === 'corner') {
            numberingModel = NumberingCorner;
            threeStyleModel = ThreeStyleCorner;
        } else if (part === 'edgeMiddle') {
            numberingModel = NumberingEdgeMiddle;
            threeStyleModel = ThreeStyleEdgeMiddle;
        }

        return numberingModel
            .findAll(numberingQuery)
            .then((results) => {
                // buffer, sticker1, sticker2 で 3
                if (results.length !== 3) {
                    logger.emit('api.request', {
                        requestType: 'GET',
                        endpoint: '/hinemos/threeStyleFromLetters/',
                        params: {
                            userName,
                            part,
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

                return threeStyleModel
                    .findAll(threeStyleQuery)
                    .then((threeStyles) => {
                        logger.emit('api.request', {
                            requestType: 'GET',
                            endpoint: '/hinemos/threeStyleFromLetters/',
                            params: {
                                userName,
                                part,
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
                            endpoint: '/hinemos/threeStyleFromLetters/',
                            params: {
                                userName,
                                part,
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
                    endpoint: '/hinemos/threeStyleFromLetters/',
                    params: {
                        userName,
                        part,
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
        // 「n日間に」解いた問題
        const tmpDays = parseFloat(req.query.days);
        const days = isNaN(tmpDays) ? parseFloat(process.env.THREE_STYLE_QUIZ_LOG_RECENT) : tmpDays;
        const part = req.params.part;
        const buffer = req.query.buffer;

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

        const whereCond = {
            userName,
            // 最近の記録のみ使用
            createdAt: {
                [Op.gt]: new Date(new Date() - days * (60 * 60 * 24 * 1000)), // ミリ秒に変換
            },
        };

        // バッファが指定された場合は条件に含める
        if (typeof buffer !== 'undefined') {
            whereCond.buffer = buffer;
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
                [ 'createdAt', 'createdAt', ],
            ],
            where: whereCond,
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
        const buffer = req.query.buffer;

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

        let query = {
            where: {
                userName,
            },
        };
        if (typeof buffer !== 'undefined') {
            query.where.buffer = buffer;
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

    app.get(`${process.env.EXPRESS_ROOT}/faceColor/:userName`, (req, res, next) => {
        const userName = req.params.userName;

        if (!userName) {
            logger.emit('api.request', {
                requestType: 'GET',
                endpoint: '/hinemos/faceColor/',
                params: {
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

        return FaceColor
            .findAll(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'GET',
                    endpoint: '/hinemos/faceColor/',
                    params: {
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
                    endpoint: '/hinemos/faceColor/',
                    params: {
                        userName,
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
                endpoint: '/hinemos/authFilter',
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
                    endpoint: 'USE /hinemos/authFilter',
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
                endpoint: '/hinemos/authFilter',
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

    app.post(process.env.EXPRESS_ROOT + '/letterPair/:userName', route.letterPair.postProcess);

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

    app.post(process.env.EXPRESS_ROOT + '/letterPairTable', route.letterPairTable.postProcess);

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

    app.post(`${process.env.EXPRESS_ROOT}/threeStyle/:part`, route.threeStyle.postProcess);

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
    app.post(process.env.EXPRESS_ROOT + '/deleteThreeStyle/:part', (req, res, next) => {
        const userName = req.decoded.userName;
        const id = req.body.id;
        const part = req.params.part;

        if (!userName) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: `/hinemos/deleteThreeStyle/${part}`,
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

        let threeStyleModel;
        if (part === 'corner') {
            threeStyleModel = ThreeStyleCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleModel = ThreeStyleEdgeMiddle;
        }

        threeStyleModel
            .destroy(query)
            .then((result) => {
                logger.emit('api.request', {
                    requestType: 'POST',
                    endpoint: `/hinemos/deleteThreeStyle/${part}`,
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
                    endpoint: `/hinemos/deleteThreeStyle/${part}`,
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

    app.post(`${process.env.EXPRESS_ROOT}/threeStyleQuizList/:part/:buffer`, (req, res, next) => {
        const userName = req.decoded.userName;
        const part = req.params.part;
        const buffer = req.params.buffer;
        const threeStyleQuizList = req.body.threeStyleQuizList ? req.body.threeStyleQuizList : [];

        // 形式は [{userName, buffer, sticker1, sticker2, stickers}]
        // userNameはデコードしたuserNameで置き換える

        if (!userName || !threeStyleQuizList || !buffer || !(part === 'corner' || part === 'edgeMiddle')) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/threeStyleQuizList/',
                params: {
                    userName,
                    part,
                    decoded: req.decoded,
                },
                status: 'error',
                code: 400,
                msg: '',
            });
            res.status(400).send(badRequestError);
            return;
        }

        let threeStyleQuizListModel;
        if (part === 'corner') {
            threeStyleQuizListModel = ThreeStyleQuizListCorner;
        } else if (part === 'edgeMiddle') {
            threeStyleQuizListModel = ThreeStyleQuizListEdgeMiddle;
        }

        sequelize
            .transaction((t) => {
                // まず今のlistを消す
                return threeStyleQuizListModel
                    .destroy({
                        where: {
                            userName,
                            buffer,
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
                                threeStyleQuizListModel
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
                                    endpoint: '/hinemos/threeStyleQuizList/',
                                    params: {
                                        userName,
                                        part,
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
                                    endpoint: '/hinemos/threeStyleQuizList/',
                                    params: {
                                        userName,
                                        part,
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

    app.post(process.env.EXPRESS_ROOT + '/threeStyleTable/:part', route.threeStyleTable.postProcess);

    app.post(process.env.EXPRESS_ROOT + '/faceColor/', (req, res, next) => {
        const userName = req.decoded.userName;
        const faceColor = req.body.faceColor;

        if (!userName || !faceColor) {
            logger.emit('api.request', {
                requestType: 'POST',
                endpoint: '/hinemos/faceColor/',
                params: {
                    userName,
                    faceColor,
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
                // まず今のfaceColorを消す
                return FaceColor
                    .destroy({
                        where: {
                            userName,
                        },
                        transaction: t,
                    })
                    .then(() => {
                        // 次に、UIから入力された情報で更新
                        const promises = [];
                        const faces = Object.keys(faceColor);

                        for (let i = 0; i < faces.length; i++) {
                            const face = faces[i];
                            const color = faceColor[face];
                            const instance = {
                                userName,
                                face,
                                color,
                            };

                            promises.push(
                                FaceColor
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
                                        throw new Error(`面の色の登録中にエラーが発生しました: ${err}`);
                                    }));
                        }

                        return Promise.all(promises)
                            .then((result) => {
                                logger.emit('api.request', {
                                    requestType: 'POST',
                                    endpoint: '/hinemos/faceColor/',
                                    params: {
                                        userName,
                                        faceColor,
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
                                throw new Error(err);
                            });
                    })
                    .catch((err) => {
                        throw new Error(err);
                    });
            });
    });

    // app.get(`${process.env.EXPRESS_ROOT}/memoDeck`, validation.memoDeck.getProcess, route.memoDeck.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/memoDeck`, validation.memoDeck.postProcess, route.memoDeck.postProcess);

    // トークンをGETメソッドのqueryに乗せるとマズいなのでPOST
    app.post(`${process.env.EXPRESS_ROOT}/getMemoLog`, validation.memoLogMemorization.getProcess, route.memoLogMemorization.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/postMemoLog`, validation.memoLogMemorization.postProcess, route.memoLogMemorization.postProcess);

    // トークンをGETメソッドのqueryに乗せるとマズいなのでPOST
    app.post(`${process.env.EXPRESS_ROOT}/getRecallLog`, validation.memoLogRecall.getProcess, route.memoLogRecall.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/postRecallLog`, validation.memoLogRecall.postProcess, route.memoLogRecall.postProcess);

    // トークンをGETメソッドのqueryに乗せるとマズいなのでPOST
    app.post(`${process.env.EXPRESS_ROOT}/getMemoScore`, validation.memoScore.getProcess, route.memoScore.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/postMemoScore`, validation.memoScore.postProcess, route.memoScore.postProcess);

    // app.get(`${process.env.EXPRESS_ROOT}/memoTrial`, validation.memoTrial.getProcess, route.memoTrial.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/memoTrial`, validation.memoTrial.postProcess, route.memoTrial.postProcess);

    // トークンをGETメソッドのqueryに乗せるとマズいなのでPOST
    app.post(`${process.env.EXPRESS_ROOT}/getThreeStyleQuizProblemListName/:part`, route.threeStyleQuizProblemListName.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/postThreeStyleQuizProblemListName/:part`, route.threeStyleQuizProblemListName.postProcess);

    // トークンをGETメソッドのqueryに乗せるとマズいなのでPOST
    app.post(`${process.env.EXPRESS_ROOT}/getThreeStyleQuizProblemListDetail/:part`, route.threeStyleQuizProblemListDetail.getProcess);
    app.post(`${process.env.EXPRESS_ROOT}/postThreeStyleQuizProblemListDetail/:part`, route.threeStyleQuizProblemListDetail.postProcess);

    server.listen(process.env.EXPRESS_PORT);
});
