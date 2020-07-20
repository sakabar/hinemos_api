const math = require('mathjs');
const moment = require('moment');
const path = require('path');
const { sequelize, } = require('../model');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const constant = require('../lib/constant');

const ThreeStyleQuizLogCorner = sequelize.import(path.join(__dirname, '../model/threeStyleQuizLogCorner'));
const ThreeStyleQuizLogEdgeMiddle = sequelize.import(path.join(__dirname, '../model/threeStyleQuizLogEdgeMiddle'));
const ThreeStyleQuizLogEdgeWing = sequelize.import(path.join(__dirname, '../model/threeStyleQuizLogEdgeWing'));
const ThreeStyleQuizLogCenterX = sequelize.import(path.join(__dirname, '../model/threeStyleQuizLogCenterX'));
const ThreeStyleQuizLogCenterT = sequelize.import(path.join(__dirname, '../model/threeStyleQuizLogCenterT'));

const getThreeStyleQuizModel = (part) => {
    if (part === 'corner') {
        return ThreeStyleQuizLogCorner;
    } else if (part === 'edgeMiddle') {
        return ThreeStyleQuizLogEdgeMiddle;
    } else if (part === 'edgeWing') {
        return ThreeStyleQuizLogEdgeWing;
    } if (part === 'centerX') {
        return ThreeStyleQuizLogCenterX;
    } if (part === 'centerT') {
        return ThreeStyleQuizLogCenterT;
    }
};

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

const getProcess = (req, res, next) => {
    const userName = req.params.userName;
    // 「n日間に」解いた問題
    const tmpDays = parseFloat(req.query.days);
    const days = isNaN(tmpDays) ? parseFloat(process.env.THREE_STYLE_QUIZ_LOG_RECENT) : tmpDays;
    const part = req.params.part;
    const buffer = req.query.buffer;

    if (!userName || !constant.partTypeNames.includes(part)) {
        res.status(400).send('');
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

    const threeStyleQuizLogModel = getThreeStyleQuizModel(part);

    return threeStyleQuizLogModel
        .findAll(query)
        .then((result) => {
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
            res.status(400).send('');
        });
};

const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const buffer = req.body.buffer;
    const sticker1 = req.body.sticker1;
    const sticker2 = req.body.sticker2;
    const usedHint = req.body.usedHint;
    const isRecalled = req.body.isRecalled;
    const sec = req.body.sec;
    const part = req.params.part;

    if (!userName || !buffer || !sticker1 || !sticker2 || !usedHint || !isRecalled || !sec || !constant.partTypeNames.includes(part)) {
        res.status(400).send('');
        return;
    }

    const threeStyleQuizLogModel = getThreeStyleQuizModel(part);

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
        const ans = {
            success: {
                code: 200,
                result: threeStyleQuizLogResult,
            },
        };

        res.json(ans);
        res.status(200);
    });
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
