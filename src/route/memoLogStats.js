const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { sequelize, } = require('../model');
const path = require('path');
const _ = require('lodash');
const { getBadRequestError, } = require('../lib/utils');
// const { validationResult, } = require('express-validator');

const MemoTrial = sequelize.import(path.join(__dirname, '../../src/model/memoTrial'));
const MemoTrialDeck = sequelize.import(path.join(__dirname, '../../src/model/memoTrialDeck'));
const MemoLogMemorization = sequelize.import(path.join(__dirname, '../../src/model/memoLogMemorization'));
const MemoLogRecall = sequelize.import(path.join(__dirname, '../../src/model/memoLogRecall'));

async function getProcess (req, res, next) {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     return res.status(400).json(getBadRequestError(errors.array()[0].msg));
    // }

    const userName = req.body.userName;
    const decodedUserName = req.decoded.userName;

    if (userName !== decodedUserName) {
        const msg = `invalid user name: ${userName} != ${decodedUserName}`;
        return res.status(400).json(getBadRequestError(msg));
    }

    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date('2000-01-01');
    const endDate = req.body.endDate ? new Date(req.body.endDate) : new Date('2037-12-31');

    const t = await sequelize.transaction().catch(next);

    try {
        const memorizationElementIdCount = await MemoLogMemorization.findAll({
            raw: true,
            attributes: [
                [ 'pos_ind', 'posInd', ],
                [ 'element_id', 'elementId', ],
                [ sequelize.fn('count', sequelize.col('*')), 'elementIdCount', ],
            ],
            where: {
                userName,
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate,
                },
            },
            group: [
                'pos_ind',
                'element_id',
            ],
            transaction: t,
        });

        const recallElementIdCount = await MemoLogRecall.findAll({
            raw: true,
            attributes: [
                [ 'pos_ind', 'posInd', ],
                [ 'element_id', 'elementId', ],
                [ sequelize.fn('count', sequelize.col('*')), 'elementIdCount', ],
            ],
            where: {
                userName,
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate,
                },
            },
            group: [
                'pos_ind',
                'element_id',
            ],
            transaction: t,
        });

        // elementId => recallCount
        const elementIdRecallCountDict = {};
        recallElementIdCount.map(rec => {
            if (!(rec.posInd in elementIdRecallCountDict)) {
                elementIdRecallCountDict[rec.posInd] = {};
            }

            elementIdRecallCountDict[rec.posInd][rec.elementId] = rec.elementIdCount;
        });

        // elementId => memorizationCount
        const elementIdMemorizationCountDict = {};
        memorizationElementIdCount.map(rec => {
            if (!(rec.posInd in elementIdMemorizationCountDict)) {
                elementIdMemorizationCountDict[rec.posInd] = {};
            }

            elementIdMemorizationCountDict[rec.posInd][rec.elementId] = rec.elementIdCount;
        });

        const memoLogRecall = await MemoLogRecall.findAll({
            raw: true,
            attributes: [
                [ 'pos_ind', 'posInd', ],
                [ 'element_id', 'elementId', ],
                [ 'solution_element_id', 'solutionElementId', ],
                [ sequelize.fn('count', sequelize.col('*')), 'cnt', ],
            ],
            where: {
                userName,
                createdAt: {
                    [Op.gte]: startDate,
                    [Op.lt]: endDate,
                },
            },
            group: [
                'pos_ind',
                'element_id',
                'solution_element_id',
            ],
            transaction: t,
        });

        const result = {};
        memoLogRecall.map(rec => {
            const posInd = rec.posInd;
            const elementId = rec.elementId;
            const solutionElementId = rec.solutionElementId;
            const cnt = rec.cnt;

            if (!(posInd in result)) {
                result[posInd] = {};
            }

            const memorizationSum = elementIdMemorizationCountDict[posInd][elementId] || 0;
            const recallSum = elementIdRecallCountDict[posInd][elementId] || 0;
            const transformationSum = Math.max(0, memorizationSum - recallSum);

            if (!(elementId in result[posInd])) {
                result[posInd][elementId] = {
                    event: null,
                    transformation: null,
                    memorization: null,
                    recallSum,
                    transformationSum,
                    recallData: [],
                };
            }

            result[posInd][elementId].recallData.push({
                solutionElementId,
                count: cnt,
                rate: recallSum === 0 ? 0.0 : 1.0 * cnt / recallSum,
            });
        });

        const memoLogsByDeck = await MemoLogMemorization.findAll(
            {
                raw: true,
                attributes: [
                    'userName',
                    'memo_trial_deck->memo_trial.event',
                    'memo_trial_deck->memo_trial.mode',
                    'memo_trial_deck.deck_id',
                    [ 'pos_ind', 'posInd', ],
                    [ 'element_id', 'elementId', ],
                    [ sequelize.fn('sum', sequelize.col('memo_sec')), 'memoSec', ],
                ],
                where: {
                    userName,
                    createdAt: {
                        [Op.gte]: startDate,
                        [Op.lt]: endDate,
                    },
                },
                include: [
                    {
                        model: MemoTrialDeck,
                        // includeの内側でカラムを用意する必要はないらしい
                        attributes: [
                            //  'deckId',
                        ],
                        include: [
                            {
                                model: MemoTrial,
                                // includeの内側でカラムを用意する必要はないらしい
                                attributes: [
                                    // 'event',
                                    // 'mode',
                                ],
                            },
                        ],
                    },
                ],
                group: [
                    'userName',
                    'event',
                    'mode',
                    'deck_id',
                    'pos_ind',
                    'element_id',
                ],
                transaction: t,
            });

        // deck_id以外のキーでgroup byする。avg(memoSec)
        const grouped = _.groupBy(memoLogsByDeck, (log) => {
            const key = {
                userName: log.userName,
                event: log.event,
                mode: log.mode,
                posInd: log.posInd,
                elementId: log.elementId,
            };
            return JSON.stringify(key);
        });

        const agged = Object.values(grouped).map(group => {
            const avgMemoSec = _.mean(group.map(log => log.memoSec));

            return {
                userName: group[0].userName,
                event: group[0].event,
                mode: group[0].mode,
                posInd: group[0].posInd,
                elementId: group[0].elementId,
                memoSec: avgMemoSec,
            };
        });

        agged.map(rec => {
            const posInd = rec.posInd;
            const elementId = rec.elementId;
            const event = rec.event;
            const mode = rec.mode;
            const memoSec = rec.memoSec;

            if (!(posInd in result)) {
                result[posInd] = {};
            }

            if (!(elementId in result[posInd])) {
                result[posInd][elementId] = {
                    event: null,
                    transformation: null,
                    memorization: null,
                    recallSum: 0,
                    transformationSum: 0,
                    recallData: [],
                };
            }

            result[posInd][elementId].event = event;
            result[posInd][elementId][mode] = memoSec;
            const memorizationSum = elementIdMemorizationCountDict[posInd][elementId] || 0;
            const recallSum = elementIdRecallCountDict[posInd][elementId] || 0;
            const transformationSum = Math.max(0, memorizationSum - recallSum);
            result[posInd][elementId].transformationSum = transformationSum;
        });

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
