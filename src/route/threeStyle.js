// const Sequelize = require('sequelize');
const { sequelize, } = require('../model');
const path = require('path');
const utils = require('../lib/utils');
const constant = require('../lib/constant');
const { Algorithm333, Algorithm444, } = require('cuberyl');

const ThreeStyleCorner = sequelize.import(path.join(__dirname, '../model/threeStyleCorner'));
const ThreeStyleEdgeMiddle = sequelize.import(path.join(__dirname, '../model/threeStyleEdgeMiddle'));
const ThreeStyleEdgeWing = sequelize.import(path.join(__dirname, '../model/threeStyleEdgeWing'));
const ThreeStyleCenterX = sequelize.import(path.join(__dirname, '../model/threeStyleCenterX'));
const ThreeStyleCenterT = sequelize.import(path.join(__dirname, '../model/threeStyleCenterT'));

const getThreeStyleModel = (part) => {
    let threeStyleModel;
    if (part === constant.partType.corner.name) {
        threeStyleModel = ThreeStyleCorner;
    } else if (part === constant.partType.edgeMiddle.name) {
        threeStyleModel = ThreeStyleEdgeMiddle;
    } else if (part === constant.partType.edgeWing.name) {
        threeStyleModel = ThreeStyleEdgeWing;
    } else if (part === constant.partType.centerX.name) {
        threeStyleModel = ThreeStyleCenterX;
    } else if (part === constant.partType.centerT.name) {
        threeStyleModel = ThreeStyleCenterT;
    }

    return threeStyleModel;
};

const makeThreeStyleAlg = (order, setup, move1, move2) => {
    if (setup !== '' && move1 === '' && move2 === '') {
        const replacedSetup = setup.replace(/'2/g, '2');
        if (order === 3) {
            return new Algorithm333(replacedSetup);
        } else if (order === 4) {
            return new Algorithm444(replacedSetup);
        } else {
            throw new Error(`Unexpected order : ${order}`);
        }
    } else {
        const replacedSetup = setup.replace(/'2/g, '2');
        const replacedMove1 = move1.replace(/'2/g, '2');
        const replacedMove2 = move2.replace(/'2/g, '2');

        if (order === 3) {
            return Algorithm333.makeThreeStyle(replacedSetup, replacedMove1, replacedMove2);
        } else if (order === 4) {
            return Algorithm444.makeThreeStyle(replacedSetup, replacedMove1, replacedMove2);
        } else {
            throw new Error(`Unexpected order : ${order}`);
        }
    }
};

const getProcess = (req, res, next) => {
    const userName = req.query.userName;
    const buffer = req.query.buffer;
    const sticker1 = req.query.sticker1;
    const sticker2 = req.query.sticker2;
    const part = req.params.part;
    // const setup = req.query.setup;
    // const move1 = req.query.move1;
    // const move2 = req.query.move2;

    if (!constant.partTypeNames.includes(part)) {
        res.status(400).send(`Unexpcted part : ${part}`);
        return;
    }

    const query = {
        where: {},
    };
    if (userName) {
        query.where.userName = userName;
    }
    if (buffer) {
        query.where.buffer = buffer;
    }
    if (sticker1) {
        query.where.sticker1 = sticker1;
    }
    if (sticker2) {
        query.where.sticker2 = sticker2;
    }

    const threeStyleModel = getThreeStyleModel(part);

    threeStyleModel
        .findAll(query)
        .then((result) => {
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
            res.status(400).send(err.message);
        });
};

const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const part = req.params.part;

    const buffer = req.body.buffer.replace(/\s*$/, '').replace(/^\s*/, '');
    const sticker1 = req.body.sticker1.replace(/\s*$/, '').replace(/^\s*/, '');
    const sticker2 = req.body.sticker2.replace(/\s*$/, '').replace(/^\s*/, '');
    const setup = req.body.setup.replace(/\s*$/, '').replace(/^\s*/, '');
    const move1 = req.body.move1.replace(/\s*$/, '').replace(/^\s*/, '');
    const move2 = req.body.move2.replace(/\s*$/, '').replace(/^\s*/, '');

    const okCond1 = (move1 !== '' && move2 !== '');
    const okCond2 = (move1 === '' && move2 === '' && setup !== '');

    const isValidCycle = (() => {
        if (part === 'corner') {
            const alg = makeThreeStyleAlg(3, setup, move1, move2);
            return alg.isValidThreeStyleCorner(buffer, sticker1, sticker2);
        } else if (part === 'edgeMiddle') {
            const alg = makeThreeStyleAlg(3, setup, move1, move2);
            return alg.isValidThreeStyleEdge(buffer, sticker1, sticker2);
        } else if (part === 'edgeWing') {
            const alg = makeThreeStyleAlg(4, setup, move1, move2);
            return alg.isValidThreeStyleWingEdge(buffer, sticker1, sticker2);
        } else if (part === 'centerX') {
            const alg = makeThreeStyleAlg(4, setup, move1, move2);
            return alg.isValidThreeStyleXCenter(buffer, sticker1, sticker2);
        } else if (part === 'centerT') {
            // FIXME update cuberyl for 4BLD
            return false;
            // const alg = makeThreeStyleAlg(5, setup, move1, move2);
            // return alg.isValidThreeStyleTCenter(buffer, sticker1, sticker2);
        }
    })();

    if (!userName || !buffer || !sticker1 || !sticker2 || !(okCond1 || okCond2) || !constant.partTypeNames.includes(part)) {
        res.status(400).send('');
        return;
    }

    if (!isValidCycle) {
        res.status(400).send('3-styleが正しくありません');
        return;
    }

    const numberOfMoves = utils.getNumberOfMoves(setup, move1, move2);
    const stickers = `${buffer} ${sticker1} ${sticker2}`;

    const threeStyleModel = getThreeStyleModel(part);

    //  重複登録を防ぐために、登録済みの手順のIDを持っておく
    return threeStyleModel
        .findAll({
            where: {
                userName,
                buffer,
                setup,
                move1,
                move2,
            },
        })
        .then(origAlgsInSameBuffer => {
            const algToValidId = {};

            origAlgsInSameBuffer.map(origAlg => {
                let alg;
                let isValidCycle;
                if (part === 'corner') {
                    alg = makeThreeStyleAlg(3, origAlg.setup, origAlg.move1, origAlg.move2);
                    isValidCycle = alg.isValidThreeStyleCorner(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                } else if (part === 'edgeMiddle') {
                    alg = makeThreeStyleAlg(3, origAlg.setup, origAlg.move1, origAlg.move2);
                    isValidCycle = alg.isValidThreeStyleEdge(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                } else if (part === 'edgeWing') {
                    alg = makeThreeStyleAlg(4, origAlg.setup, origAlg.move1, origAlg.move2);
                    isValidCycle = alg.isValidThreeStyleWingEdge(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                } else if (part === 'centerX') {
                    alg = makeThreeStyleAlg(4, origAlg.setup, origAlg.move1, origAlg.move2);
                    isValidCycle = alg.isValidThreeStyleXCenter(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                } else if (part === 'centerT') {
                    alg = makeThreeStyleAlg(5, origAlg.setup, origAlg.move1, origAlg.move2);
                    isValidCycle = alg.isValidThreeStyleTCenter(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                }

                const algNotation = alg.getNotation();
                if (isValidCycle && !(algNotation in algToValidId)) {
                    algToValidId[algNotation] = origAlg.id;
                }
            });

            // ここはnotationを使うだけだからorder=3にしてしまっていいはず
            const algNotation = makeThreeStyleAlg(3, setup, move1, move2).getNotation();
            if (algNotation in algToValidId) {
                res.status(400).send('既に登録済みの手順です');
                return;
            }

            return threeStyleModel
                .create({
                    userName,
                    numberOfMoves,
                    buffer,
                    sticker1,
                    sticker2,
                    stickers,
                    setup,
                    move1,
                    move2,
                })
                .then((result) => {
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
                    res.status(400).send('');
                });
        })
        .catch(() => {
            res.status(400).send('');
        });
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
exports.makeThreeStyleAlg = makeThreeStyleAlg;
