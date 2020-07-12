const { sequelize, } = require('../model');
const path = require('path');
const {
    getBadRequestError,
} = require('../lib/utils');

const NumberingCorner = sequelize.import(path.join(__dirname, '../model/numberingCorner'));
const NumberingEdgeMiddle = sequelize.import(path.join(__dirname, '../model/numberingEdgeMiddle'));

const getProcess = (req, res, next) => {
    const part = req.params.part;
    const userName = req.params.userName;
    const letters = req.query.letters;

    if (!userName || !(part === 'corner' || part === 'edgeMiddle')) {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    const query = {
        where: {
            userName,
        },
    };
    if (letters) {
        query.where.letter = letters.split(/(.)/).filter(x => x);
    }

    // cornerかedgeMiddle以外の場合、既にハジかれている
    let numberingModel;
    if (part === 'corner') {
        numberingModel = NumberingCorner;
    } else if (part === 'edgeMiddle') {
        numberingModel = NumberingEdgeMiddle;
    }

    return numberingModel
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
        .catch(() => {
            res.status(400).send(getBadRequestError(''));
        });
};

const postProcess = (req, res, next) => {
    const part = req.params.part;
    const userName = req.decoded.userName;
    const numberings = Array.from(new Set(req.body.numberings)); // [{sticker, numbering,}]

    // ナンバリングで重複を排除した時に数が一致しないということは、重複が存在するということなのでNG
    const uniqedLn = Array.from(new Set(numberings.map(x => x.letter))).length;
    const assertCond = uniqedLn === numberings.length;

    if (!userName || !req.body.numberings || uniqedLn === 0 || !assertCond || !(part === 'corner' || part === 'edgeMiddle')) {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    let numberingModel;
    if (part === 'corner') {
        numberingModel = NumberingCorner;
    } else if (part === 'edgeMiddle') {
        numberingModel = NumberingEdgeMiddle;
    }

    sequelize
        .transaction((t) => {
            // まず今のnumberingを消す
            return numberingModel
                .destroy({
                    where: {
                        userName,
                    },
                    transaction: t,
                })
                .then((result) => {
                    // 次に、UIから入力された情報で更新
                    const promises = [];
                    for (let i = 0; i < numberings.length; i++) {
                        const sticker = numberings[i].sticker;
                        const letter = numberings[i].letter;
                        const instance = {
                            userName,
                            sticker,
                            letter,
                        };

                        promises.push(
                            numberingModel
                                .create(instance, {
                                    transaction: t,
                                })
                                .then((result) => {
                                    return {
                                        code: 200,
                                        params: instance,
                                        msg: 'OK',
                                    };
                                }));
                    }

                    return Promise.all(promises)
                        .then((ans) => {
                            res.json(ans);
                            res.status(200);
                        })
                        .catch(() => {
                            res.status(400).send(getBadRequestError(''));
                        });
                });
        });
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
