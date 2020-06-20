// const Sequelize = require('sequelize');
const { sequelize, } = require('../model');
const path = require('path');
const utils = require('../lib/utils');
// const { Algorithm, } = require('cuberyl');

// const Op = Sequelize.Op;

const ThreeStyleCorner = sequelize.import(path.join(__dirname, '../model/threeStyleCorner'));
const ThreeStyleEdgeMiddle = sequelize.import(path.join(__dirname, '../model/threeStyleEdgeMiddle'));

const getThreeStyleModel = (part) => {
    let threeStyleModel;
    if (part === 'corner') {
        threeStyleModel = ThreeStyleCorner;
    } else if (part === 'edgeMiddle') {
        threeStyleModel = ThreeStyleEdgeMiddle;
    }

    return threeStyleModel;
};

// const makeThreeStyleAlg = (order, setup, move1, move2) => {
//     if (setup !== '' && move1 === '' && move2 === '') {
//         return new Algorithm(order, setup.replace(/'2/g, '2'));
//     } else {
//         return Algorithm.makeThreeStyle(order, setup.replace(/'2/g, '2'), move1.replace(/'2/g, '2'), move2.replace(/'2/g, '2'));
//     }
// };

const getProcess = (req, res, next) => {
    const userName = req.query.userName;
    const buffer = req.query.buffer;
    const sticker1 = req.query.sticker1;
    const sticker2 = req.query.sticker2;
    const part = req.params.part;
    // const setup = req.query.setup;
    // const move1 = req.query.move1;
    // const move2 = req.query.move2;

    if (!(part === 'corner' || part === 'edgeMiddle')) {
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

    if (!userName || !buffer || !sticker1 || !sticker2 || !(okCond1 || okCond2) || !(part === 'corner' || part === 'edgeMiddle')) {
        res.status(400).send('');
        return;
    }

    const numberOfMoves = utils.getNumberOfMoves(setup, move1, move2);
    const stickers = `${buffer} ${sticker1} ${sticker2}`;

    const threeStyleModel = getThreeStyleModel(part);

    threeStyleModel
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
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
