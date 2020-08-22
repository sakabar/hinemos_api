const { sequelize, } = require('../model');
const path = require('path');
const constant = require('../lib/constant');

const ThreeStyleCorner = sequelize.import(path.join(__dirname, '../model/threeStyleCorner'));
const ThreeStyleEdgeMiddle = sequelize.import(path.join(__dirname, '../model/threeStyleEdgeMiddle'));
const ThreeStyleEdgeWing = sequelize.import(path.join(__dirname, '../model/threeStyleEdgeWing'));
const ThreeStyleCenterX = sequelize.import(path.join(__dirname, '../model/threeStyleCenterX'));
const ThreeStyleCenterT = sequelize.import(path.join(__dirname, '../model/threeStyleCenterT'));

const NumberingCorner = sequelize.import(path.join(__dirname, '../model/numberingCorner'));
const NumberingEdgeMiddle = sequelize.import(path.join(__dirname, '../model/numberingEdgeMiddle'));
const NumberingEdgeWing = sequelize.import(path.join(__dirname, '../model/numberingEdgeWing'));
const NumberingCenterX = sequelize.import(path.join(__dirname, '../model/numberingCenterX'));
const NumberingCenterT = sequelize.import(path.join(__dirname, '../model/numberingCenterT'));

const getThreeStyleModel = (part) => {
    if (part === 'corner') {
        return ThreeStyleCorner;
    } else if (part === 'edgeMiddle') {
        return ThreeStyleEdgeMiddle;
    } else if (part === 'edgeWing') {
        return ThreeStyleEdgeWing;
    } else if (part === 'centerX') {
        return ThreeStyleCenterX;
    } else if (part === 'centerT') {
        return ThreeStyleCenterT;
    }
};

const getNumberingModel = (part) => {
    if (part === 'corner') {
        return NumberingCorner;
    } else if (part === 'edgeMiddle') {
        return NumberingEdgeMiddle;
    } else if (part === 'edgeWing') {
        return NumberingEdgeWing;
    } else if (part === 'centerX') {
        return NumberingCenterX;
    } else if (part === 'centerT') {
        return NumberingCenterT;
    } else {
        return null;
    }
};

const getProcess = (req, res, next) => {
    const userName = req.query.userName;
    const letters = req.query.letters;
    const part = req.params.part;

    if (!userName || !letters || !constant.partTypeNames.includes(part)) {
        res.status(400).send('');
        return;
    }

    const numberingQuery = {
        where: {
            userName,
            letter: [ '@', ...letters.split(''), ],
        },
    };

    const numberingModel = getNumberingModel(part);
    const threeStyleModel = getThreeStyleModel(part);

    return numberingModel
        .findAll(numberingQuery)
        .then((results) => {
            // buffer, sticker1, sticker2 で 3
            if (results.length !== 3) {
                res.status(400).send('');
                return;
            }

            const buffer = results.filter(x => x.letter === '@')[0].sticker;
            const sticker1 = results.filter(x => x.letter === letters[0])[0].sticker;
            const sticker2 = results.filter(x => x.letter === letters[1])[0].sticker;

            const threeStyleQuery = {
                where: {
                    userName,
                    buffer,
                    sticker1,
                    sticker2,
                },
            };

            return threeStyleModel
                .findAll(threeStyleQuery)
                .then((threeStyles) => {
                    const ans = {
                        success: {
                            code: 200,
                            result: threeStyles,
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
