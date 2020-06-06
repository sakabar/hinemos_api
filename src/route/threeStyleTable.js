const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const utils = require('../lib/utils');

const ThreeStyleCorner = sequelize.import(path.join(__dirname, '../model/threeStyleCorner'));
const ThreeStyleEdgeMiddle = sequelize.import(path.join(__dirname, '../model/threeStyleEdgeMiddle'));

const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const threeStyleTable = req.body.threeStyleTable;
    const part = req.params.part;
    const buffer = req.body.buffer;

    if (!userName || !threeStyleTable || !(part === 'corner' || part === 'edgeMiddle')) {
        res.status(400).send(getBadRequestError());
        return;
    }

    let threeStyleModel;
    if (part === 'corner') {
        threeStyleModel = ThreeStyleCorner;
    } else if (part === 'edgeMiddle') {
        threeStyleModel = ThreeStyleEdgeMiddle;
    }

    const destroyCond = {
        userName,
    };

    if (typeof buffer !== 'undefined') {
        destroyCond.buffer = buffer;
    };

    sequelize
        .transaction((t) => {
            // まず今のthreeStyleを消す
            return threeStyleModel
                .destroy({
                    where: destroyCond,
                    transaction: t,
                })
                .then(() => {
                    // 次に、UIの表から入力された情報で更新
                    const promises = [];
                    for (let i = 0; i < threeStyleTable.length; i++) {
                        const ts = threeStyleTable[i];

                        // FIXME stickersを得る手順が複数の場所で重複している。関数化したほうがいいかも
                        const stickers = `${ts.buffer} ${ts.sticker1} ${ts.sticker2}`;
                        const instance = {
                            userName,
                            numberOfMoves: utils.getNumberOfMoves(ts.setup, ts.move1, ts.move2),
                            buffer: ts.buffer,
                            sticker1: ts.sticker1,
                            sticker2: ts.sticker2,
                            stickers,
                            setup: ts.setup,
                            move1: ts.move1,
                            move2: ts.move2,
                        };

                        promises.push(
                            threeStyleModel
                                .create(instance, {
                                    transaction: t,
                                })
                                .then((result) => {
                                    return {
                                        code: 200,
                                        params: instance,
                                        msg: 'OK',
                                    };
                                })
                                .catch((err) => {
                                    const msg = `『「${stickers}」に手順を登録しようとしたところ、エラーが発生しました。${err}』`;

                                    throw new Error(msg);
                                }));
                    }

                    return Promise.all(promises)
                        .then((result) => {
                            return 200;
                        })
                        .catch((err) => {
                            throw new Error(err);
                        });
                })
                .catch((err) => {
                    throw new Error(err);
                });
        })
        .then((result) => {
            if (result === 200) {
                const ans = {
                    success: {
                        code: 200,
                        result,
                    },
                };
                res.json(ans);
                res.status(200);
            } else {
                throw new Error('error');
            }
        })
        .catch((err) => {
            res.status(400).send(getBadRequestError(err));
        });
};

exports.postProcess = postProcess;
