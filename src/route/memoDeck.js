const { sequelize, } = require('../model');
const _ = require('lodash');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

const MemoDeck = sequelize.import(path.join(__dirname, '../model/memoDeck'));
const MemoDeckElement = sequelize.import(path.join(__dirname, '../model/memoDeckElement'));

// process.on('unhandledRejection', console.dir);

const getProcess = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json(getBadRequestError(errors.array()[0].msg));
    }

    const ans = {
        success: {
            code: 200,
            result: {
                deckIds: [ 100, 101, ],
                elementsList: {
                    100: [ 10, 11, 12, 13, ],
                    101: [ 101, 102, ],
                },
            },
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

    const t = await sequelize.transaction().catch(next);

    try {
        const elementIdsList = req.body.elementIdsList.map(elementIds => {
            return elementIds.map(elementId => {
                return parseInt(elementId);
            });
        });
        const memoDecks = await Promise.all(elementIdsList.map(elementIds => MemoDeck.create({}, { transaction: t, })));
        const deckIds = memoDecks.map(memoDeck => memoDeck.deckId);

        // deckIdの小さい順にしておく
        deckIds.sort();

        const deckElementBulk = [];
        elementIdsList.map((elementIds, deckInd) => {
            const deckId = deckIds[deckInd];
            return elementIds.map((elementId, ind) => {
                const instance = {
                    deckId,
                    ind,
                    elementId,
                };
                deckElementBulk.push(instance);
            });
        });

        await MemoDeckElement.bulkCreate(deckElementBulk, { transaction: t, });

        // incremental IDはbulkCreateでは返って来ないので、DeckIdごとにfindAllする
        const deckElementIdsDict = {};
        const deckElementsList = await Promise.all(deckIds.map(deckId => {
            return MemoDeckElement.findAll(
                {
                    attributes: [
                        [ 'deck_element_id', 'deckElementId', ],
                    ],
                    where: {
                        deckId,
                    },
                    order: [
                        [ 'ind', 'ASC', ],
                    ],
                    transaction: t,
                });
        }));

        _.zip(deckIds, deckElementsList).map(pair => {
            const deckId = pair[0];
            const deckElements = pair[1];
            deckElementIdsDict[deckId] = deckElements.map(de => de.deckElementId);
        });

        const ans = {
            success: {
                code: 200,
                result: {
                    deckIds,
                    deckElementIdsDict,
                },
            },
        };

        await t.commit();
        res.json(ans);
        res.status(200);
        return;
    } catch (err) {
        t.rollback();
        next(err);
    }
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
