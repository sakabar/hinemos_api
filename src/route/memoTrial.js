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

    const trial = await MemoTrial.create(
        {
            userName,
            mode,
        }).catch(next);

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

    await MemoTrialDeck.bulkCreate(trialDeckBulk).catch(next);

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
    }).catch(next);

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

    res.json(ans);
    res.status(200);
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
