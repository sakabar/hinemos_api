const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

const MemoTrial = sequelize.import(path.join(__dirname, '../../src/model/memoTrial'));
const MemoTrialDeck = sequelize.import(path.join(__dirname, '../../src/model/memoTrialDeck'));

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

    const userName = req.body.userName;
    const mode = req.body.mode;
    const deckIds = req.body.deckIds.map(deckId => {
        return parseInt(deckId);
    });

    const decodedUserName = req.decoded.userName;
    if (userName !== decodedUserName) {
        const msg = `invalid user name: ${userName} != ${decodedUserName}`;
        return res.status(400).json(getBadRequestError(msg));
    }

    const t = await sequelize.transaction().catch(next);

    try {
        const trial = await MemoTrial.create(
            {
                userName,
                mode,
            }, { transaction: t, });

        const trialId = trial.trialId;

        const trialDeckBulk = [];
        deckIds.map((deckId, deckInd) => {
            const instance = {
                trialId,
                ind: deckInd,
                deckId,
            };
            trialDeckBulk.push(instance);
        });

        await MemoTrialDeck.bulkCreate(trialDeckBulk, { transaction: t, });

        // incremental IDはbulkCreateでは返って来ないのでfindAllする
        const trialDecks = await MemoTrialDeck.findAll({
            attributes: [
                [ 'trial_deck_id', 'trialDeckId', ],
            ],
            where: {
                trialId,
            },
            order: [
                [ 'ind', 'DESC', ],
            ],
            transaction: t,
        });

        const trialDeckIds = trialDecks.map(trialDeck => trialDeck.trialDeckId);

        const ans = {
            success: {
                code: 200,
                result: {
                    trialId,
                    trialDeckIds,
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
