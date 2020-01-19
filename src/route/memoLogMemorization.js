const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

// const MemoTrial = sequelize.import(path.join(__dirname, '../../src/model/memoTrial'));
// const MemoTrialDeck = sequelize.import(path.join(__dirname, '../../src/model/memoTrialDeck'));
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

    const trialDeckId = parseInt(req.body.trialDeckId);
    const userName = req.body.userName;
    const ind = parseInt(req.body.ind);
    const deckInd = parseInt(req.body.deckInd);
    const pairInd = parseInt(req.body.pairInd);
    const posInd = parseInt(req.body.posInd);
    const deckElementId = parseInt(req.body.deckElementId);
    const memoSec = parseFloat(req.body.memoSec);

    const t = await sequelize.transaction().catch(next);

    try {
        const deckElements = await MemoDeckElement.findAll(
            {
                attributes: [
                    [ 'element_id', 'elementId', ],
                ],
                where: {
                    deckElementId,
                },
                transaction: t,
            }
        );

        const elementId = deckElements[0].elementId;

        const instance = {
            trialDeckId,
            userName,
            ind,
            deckInd,
            pairInd,
            posInd,
            deckElementId,
            elementId,
            memoSec,
        };

        console.dir(JSON.stringify(instance));
        const result = await MemoLogMemorization.create(instance, { transaction: t, });

        const ans = {
            success: {
                code: 200,
                result,
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
