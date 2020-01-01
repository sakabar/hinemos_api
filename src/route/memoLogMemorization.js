const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

const MemoDeckElement = sequelize.import(path.join(__dirname, '../../src/model/memoDeckElement'));
const MemoLogMemorization = sequelize.import(path.join(__dirname, '../../src/model/memoLogMemorization'));

const getProcess = (req, res, next) => {
    const result = {
        process: 'get',
    };
    const ans = {
        success: {
            code: 200,
            result,
        },
    };

    res.json(ans);
    res.status(200);
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
                memoSec: parseFloat(log.memoSec),
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
            const instance = {
                ...log,
                elementId: deckElementIdToElementId[log.deckElementId],
            };
            return instance;
        });

        // console.dir(JSON.stringify(bulk));
        await MemoLogMemorization.bulkCreate(bulk, { transaction: t, });

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
