const Sequelize = require('sequelize');
const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

const MemoScore = sequelize.import(path.join(__dirname, '../model/memoScore'));
const MemoTrial = sequelize.import(path.join(__dirname, '../model/memoTrial'));

async function getProcess (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(getBadRequestError(errors.array()[0].msg));
    }

    const decodedUserName = req.decoded.userName;
    const userName = req.query.userName;

    if (userName !== decodedUserName) {
        const msg = `invalid user name: ${userName} != ${decodedUserName}`;
        return res.status(400).json(getBadRequestError(msg));
    }

    const t = await sequelize.transaction().catch(next);

    try {
        const scores = await MemoScore.findAll({
            include: [
                {
                    model: MemoTrial,
                    where: {
                        trialId: Sequelize.col('memo_trial.trial_id'),
                        userName,
                    },
                },
            ],
            order: [
                [ 'trialId', 'ASC', ],
            ],
            transaction: t,
        });

        const ans = {
            success: {
                code: 200,
                result: {
                    scores,
                },
            },
        };

        await t.commit();
        res.json(ans);
        res.status(200);
        return;
    } catch (err) {
        await t.rollback();
        next(err);
    }
};

async function postProcess (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(getBadRequestError(errors.array()[0].msg));
    }

    try {
        const trialId = parseInt(req.body.trialId);
        const totalMemoSec = parseFloat(req.body.totalMemoSec);

        // 空文字の場合があるので注意!
        const successDeckNum = req.body.successDeckNum === '' ? null : parseInt(req.body.successDeckNum);
        const triedDeckNum = parseInt(req.body.triedDeckNum);
        const allDeckNum = parseInt(req.body.allDeckNum);

        // 空文字の場合があるので注意!
        const successElementNum = req.body.successElementNum === '' ? null : parseInt(req.body.successElementNum);
        const triedElementNum = parseInt(req.body.triedElementNum);
        const allElementNum = parseInt(req.body.allElementNum);

        // ここから、正解率を計算
        const triedDeckAcc = successElementNum === null ? null : 1.0 * successDeckNum / triedDeckNum;
        const allDeckAcc = successElementNum === null ? null : 1.0 * successDeckNum / allDeckNum;

        const triedElementAcc = successElementNum === null ? null : 1.0 * successElementNum / triedElementNum;
        const allElementAcc = successElementNum === null ? null : 1.0 * successElementNum / allElementNum;

        const score = await MemoScore.create(
            {
                trialId,
                totalMemoSec,

                successDeckNum,
                triedDeckNum,
                triedDeckAcc,
                allDeckNum,
                allDeckAcc,

                successElementNum,
                triedElementNum,
                triedElementAcc,
                allElementNum,
                allElementAcc,
            });

        const ans = {
            success: {
                code: 200,
                result: {
                    score,
                },
            },
        };

        res.json(ans);
        res.status(200);
    } catch (err) {
        next(err);
    }
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
