const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');

const ThreeStyleQuizProblemListNameCorner = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameCorner'));
const ThreeStyleQuizProblemListNameEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameEdgeMiddle'));

const NumberingCorner = sequelize.import(path.join(__dirname, '../../src/model/numberingCorner'));
const NumberingEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/numberingEdgeMiddle'));

const getNumberingModel = (part) => {
    if (part === 'corner') {
        return NumberingCorner;
    } else if (part === 'edgeMiddle') {
        return NumberingEdgeMiddle;
    } else {
        return null;
    }
};

const getProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const part = req.params.part;

    let model;
    if (part === 'corner') {
        model = ThreeStyleQuizProblemListNameCorner;
    } else if (part === 'edgeMiddle') {
        model = ThreeStyleQuizProblemListNameEdgeMiddle;
    } else {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    const numberingModel = getNumberingModel(part);

    return numberingModel.findOne(
        {
            where: {
                userName,
                letter: '@',
            },
            raw: true,
        }
    )
        .then(ans => {
            const buffer = ans.sticker;

            const query = {
                where: {
                    userName,
                    buffer,
                },
            };

            return model
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
                }, () => {
                    res.status(400).send(getBadRequestError(''));
                });
        });
};

// titles: コンマ区切りの文字列
const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const part = req.params.part;

    const numberingModel = getNumberingModel(part);
    const titles = req.body.titles;
    if (!userName || !titles || !(part === 'corner' || part === 'edgeMiddle') || !numberingModel) {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    let model;
    if (part === 'corner') {
        model = ThreeStyleQuizProblemListNameCorner;
    } else if (part === 'edgeMiddle') {
        model = ThreeStyleQuizProblemListNameEdgeMiddle;
    } else {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    sequelize
        .transaction((t) => {
            return numberingModel.findOne(
                {
                    where: {
                        userName,
                        letter: '@',
                    },
                    raw: true,
                }
            )
                .then(ans => {
                    const buffer = ans.sticker;

                    const promises = titles.split(',').map(title => {
                        const instance = {
                            userName,
                            buffer,
                            title,
                        };

                        return model
                            .create(instance, {
                                transaction: t,
                            })
                            .then((result) => {
                                return result;
                            });
                    });

                    return Promise.all(promises)
                        .then(result => {
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
                            t.rollback();
                            res.status(400).send(getBadRequestError(''));
                        });
                });
        });
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
