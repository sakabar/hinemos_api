const Sequelize = require('sequelize');
const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

const MemoElement = sequelize.import(path.join(__dirname, '../../src/model/memoElement'));
const MemoDeckElement = sequelize.import(path.join(__dirname, '../../src/model/memoDeckElement'));
const MemoLogRecall = sequelize.import(path.join(__dirname, '../../src/model/memoLogRecall'));
const MemoTrialDeck = sequelize.import(path.join(__dirname, '../../src/model/memoTrialDeck'));

async function getProcess (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(getBadRequestError(errors.array()[0].msg));
    }

    const userName = req.body.userName;

    const decodedUserName = req.decoded.userName;

    if (userName !== decodedUserName) {
        const msg = `invalid user name: ${userName} != ${decodedUserName}`;
        return res.status(400).json(getBadRequestError(msg));
    }

    const t = await sequelize.transaction().catch(next);

    try {
        const logs = await MemoLogRecall.findAll({
            where: {
                userName,
            },
            include: [
                {
                    model: MemoTrialDeck,
                    where: {
                        trialDeckId: Sequelize.col('memo_trial_deck.trial_deck_id'),
                    },
                },
                {
                    model: MemoElement,
                    where: {
                        elementId: Sequelize.col('memo_element.element_id'),
                    },
                },
            ],
            order: [
                [ 'trialDeckId', 'ASC', ],
                [ 'ind', 'ASC', ],
            ],
            transaction: t,
        });

        const ans = {
            success: {
                code: 200,
                result: {
                    logs,
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

    const decodedUserName = req.decoded.userName;
    // 異なるユーザの情報をPOSTしようとしていないことを確認
    const invalidLogs = req.body.logs.filter(log => log.userName !== decodedUserName);
    if (invalidLogs.length > 0) {
        const msg = `invalid user name: ${invalidLogs[0].userName} != ${decodedUserName}`;
        return res.status(400).json(getBadRequestError(msg));
    }

    const t = await sequelize.transaction().catch(next);

    try {
        const logs = req.body.logs.map(log => {
            return {
                trialDeckId: parseInt(log.trialDeckId),
                userName: log.userName,
                ind: parseInt(log.ind),
                deckInd: parseInt(log.deckInd),
                pairInd: parseInt(log.pairInd),
                posInd: parseInt(log.posInd),
                deckElementId: parseInt(log.deckElementId),
                solutionElementId: log.solutionElementId ? parseInt(log.solutionElementId) : null,
                losingMemorySec: log.losingMemorySec ? parseFloat(log.losingMemorySec) : null,
            };
        });

        const deckElements = await MemoDeckElement.findAll(
            {
                attributes: [
                    [ 'deck_element_id', 'deckElementId', ],
                    [ 'element_id', 'elementId', ],
                ],
                where: {
                    deckElementId: logs.map(log => log.deckElementId),
                },
                transaction: t,
            }
        );

        const deckElementIdToElementId = {};
        deckElements.map(deckElement => {
            const deckElementId = deckElement.deckElementId;
            const elementId = deckElement.elementId;
            deckElementIdToElementId[deckElementId] = elementId;
        });

        const bulk = logs.map(log => {
            const elementId = deckElementIdToElementId[log.deckElementId];

            const instance = {
                ...log,
                elementId,
                isCorrect: elementId === log.solutionElementId ? 1 : 0,
            };
            return instance;
        });

        console.dir(JSON.stringify(bulk));
        await MemoLogRecall.bulkCreate(bulk, { transaction: t, });

        // Auto Incrementのパラメータは返さない
        // (postしたログだけ取ってくるクエリが思い浮かばない)
        const ans = {
            success: {
                code: 200,
                result: {
                    logs: bulk,
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

exports.getProcess = getProcess;
exports.postProcess = postProcess;
