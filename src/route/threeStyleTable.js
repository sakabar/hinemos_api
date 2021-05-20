const Sequelize = require('sequelize');
const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const utils = require('../lib/utils');
const constant = require('../lib/constant');
// const { Algorithm333, Algorithm444, } = require('cuberyl');
const threeStyleRoute = require('./threeStyle');

const Op = Sequelize.Op;

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

const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const threeStyleTable = req.body.threeStyleTable || [];
    const part = req.params.part;
    const buffer = req.body.buffer;

    if (!userName || !constant.partTypeNames.includes(part)) {
        res.status(400).send(getBadRequestError());
        return;
    }

    const order = threeStyleRoute.getOrder(part);

    const threeStyleModel = getThreeStyleModel(part);
    const numberingModel = getNumberingModel(part);

    // 3-styleの正しさを確認するコードを導入する前に登録されてしまった
    // 間違った手順がある場合は大丈夫か? →大丈夫
    // 例: 「かす」(DF FR UB)として [B' R2 B, M2] が登録されてしまっている場合
    // 新しい登録でパターン分け
    // パターン1: 「かす」 [B' R2 B, M2] (変化なし、また間違っている)
    //   →validationで引っかかり登録できない。DBには古い手順が残ったまま。でも、エラーが出るから分かるはず
    // パターン2: 「あさ」 [B' R2 B, M2] (また間違っている)
    //   →1と同様。
    // パターン3: 「あす」 [B' R2 B, M2] (正しい)
    //   → 元のレコードのbuffer, sticker1, sticker2, stickersを更新
    // パターン4: 「かす」 [U R U', M2] (正しい)
    //   → [B' R2 B, M2]はリクエストに入っていないのでDBから消される

    // 3-styleの正しさを確認するコードを導入する前に登録されてしまった
    // 同じ手順が複数登録されていた場合は大丈夫か? →大丈夫
    // 例: 「かす」(DF FR UB)として [B' R2 B, M2] (誤) [U R U', M2] (正) が登録されてしまっている場合
    // 新しい登録でパターン分け
    // パターン1: 「かす」 [B' R2 B, M2] (変化なし、また間違っている)
    //   →validationで引っかかり登録できない。DBには古い手順が残ったまま。でも、エラーが出るから分かるはず
    // パターン2: 「あさ」 [B' R2 B, M2] (また間違っている)
    //   →1と同様。
    // パターン3: 「あす」 [B' R2 B, M2] (正しい)
    //   → 元のレコードのbuffer, sticker1, sticker2, stickersを更新
    // パターン4: 「かす」 [U R U', M2] (正しい)
    //   → [B' R2 B, M2]はリクエストに入っていないのでDBから消される

    sequelize
        .transaction((t) => {
            return numberingModel
                .findAll({
                    where: {
                        userName,
                    },
                    transaction: t,
                })
                .then((numberings) => {
                    const numberingDict = {};
                    numberings.map(numbering => {
                        numberingDict[numbering.sticker] = numbering.letter;
                    });

                    // 3-style手順として正しいかどうかバリデーションする
                    // is [S, [A, B]] "DF RU RB" ?
                    // もし違うならエラーを出す。 (これにより、upsertする際に同じ値が複数存在する可能性が消える)
                    const errors = [];
                    for (let i = 0; i < threeStyleTable.length; i++) {
                        const ts = threeStyleTable[i];
                        const alg = threeStyleRoute.makeThreeStyleAlg(order, ts.setup, ts.move1, ts.move2);

                        const sortedBuffer = [ ...ts.buffer, ].sort().join('');
                        const sortedSticker1 = [ ...ts.sticker1, ].sort().join('');
                        const sortedSticker2 = [ ...ts.sticker2, ].sort().join('');

                        const isSamePartsCycle = (() => {
                            if (part === 'edgeMiddle' || part === 'corner') {
                                return (sortedBuffer === sortedSticker1 || sortedSticker1 === sortedSticker2 || sortedSticker2 === buffer);
                            } else {
                                return (ts.buffer === ts.sticker1 || ts.sticker1 === ts.sticker2 || ts.sticker2 === ts.buffer);
                            }
                        })();

                        if (isSamePartsCycle) {
                            const letter1 = numberingDict[ts.sticker1];
                            const letter2 = numberingDict[ts.sticker2];
                            const msg = `「${letter1}${letter2}」が同じパーツです`;
                            errors.push(msg);
                            continue;
                        }

                        const isValidCycle = (() => {
                            if (part === 'corner') {
                                return alg.isValidThreeStyleCorner(ts.buffer, ts.sticker1, ts.sticker2);
                            } else if (part === 'edgeMiddle') {
                                return alg.isValidThreeStyleEdge(ts.buffer, ts.sticker1, ts.sticker2);
                            } else if (part === 'edgeWing') {
                                return alg.isValidThreeStyleWingEdge(ts.buffer, ts.sticker1, ts.sticker2);
                            } else if (part === 'centerX') {
                                return alg.isValidThreeStyleXCenter(ts.buffer, ts.sticker1, ts.sticker2);
                            } else if (part === 'centerT') {
                                return alg.isValidThreeStyleTCenter(ts.buffer, ts.sticker1, ts.sticker2);
                            }
                        })();

                        if (!isValidCycle) {
                            const letter1 = numberingDict[ts.sticker1];
                            const letter2 = numberingDict[ts.sticker2];
                            const msg = `「${letter1}${letter2}」 (${ts.buffer} ${ts.sticker1} ${ts.sticker2}) の ${ts.shownMove} = ${alg.getNotation()} が正しくありません。`;
                            errors.push(msg);
                            continue;
                        }
                    };

                    if (errors.length > 0) {
                        res.status(400).send('\n' + errors.join('\n'));
                        return;
                    }

                    // threeStyleTablesの中身はvalidなものだけ → 同じ手順が複数あったら、片方はいらない
                    const algSet = new Set();
                    const uniqThreeStyleTable = [];
                    for (let i = 0; i < threeStyleTable.length; i++) {
                        const ts = threeStyleTable[i];

                        const alg = threeStyleRoute.makeThreeStyleAlg(order, ts.setup, ts.move1, ts.move2).getNotation();
                        if (!algSet.has(alg)) {
                            uniqThreeStyleTable.push(ts);
                        }

                        algSet.add(alg);
                    }

                    // 登録済みの手順の中で、invalidなものや重複しているものは消す
                    // そのために、残したい手順のidをalgToIdに入れておく
                    return threeStyleModel
                        .findAll({
                            where: {
                                userName,
                                buffer,
                            },
                            // 同じ手順がもし複数登録されていた場合に、古いほうを採用するため
                            // (validation前に登録されていた場合にありうる)
                            order: [
                                [ 'createdAt', 'ASC', ],
                            ],
                            transaction: t,
                        })
                        .then(origAlgsInSameBuffer => {
                            const algToValidId = {};

                            origAlgsInSameBuffer.map(origAlg => {
                                const alg = threeStyleRoute.makeThreeStyleAlg(order, origAlg.setup, origAlg.move1, origAlg.move2);
                                let isValidCycle;

                                if (part === 'corner') {
                                    isValidCycle = alg.isValidThreeStyleCorner(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                                } else if (part === 'edgeMiddle') {
                                    isValidCycle = alg.isValidThreeStyleEdge(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                                } else if (part === 'edgeWing') {
                                    isValidCycle = alg.isValidThreeStyleWingEdge(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                                } else if (part === 'centerX') {
                                    isValidCycle = alg.isValidThreeStyleXCenter(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                                } else if (part === 'centerT') {
                                    isValidCycle = alg.isValidThreeStyleTCenter(origAlg.buffer, origAlg.sticker1, origAlg.sticker2);
                                }

                                const algNotation = alg.getNotation();
                                if (isValidCycle && !(algNotation in algToValidId)) {
                                    algToValidId[algNotation] = origAlg.id;
                                }
                            });

                            // このリクエストに含まれていない手順か、含まれているが間違っている手順を消す
                            const destroyCond = {
                                userName,
                                [Op.or]: {
                                    // このリクエストに含まれていない手順
                                    [Op.not]: {
                                        [Op.or]: uniqThreeStyleTable.map(ts => {
                                            return {
                                                setup: ts.setup,
                                                move1: ts.move1,
                                                move2: ts.move2,
                                            };
                                        }),
                                    },
                                    // 含まれているが間違っている手順 = 「正しい手順のid」ではないid
                                    id: {
                                        [Op.notIn]: Object.values(algToValidId),
                                    },
                                },
                            };

                            if (typeof buffer !== 'undefined') {
                                destroyCond.buffer = buffer;
                            };

                            // まずリクエストに含まれていない手順を消す
                            return threeStyleModel
                                .destroy({
                                    where: destroyCond,
                                    transaction: t,
                                })
                                .then(() => {
                                    // 同じ手順が同じidになるようにする (ただし、違うバッファで同じ手順がある可能性があるので、
                                    // where条件にbufferを指定している

                                    // 次に、UIの表から入力された情報で更新
                                    const instances = uniqThreeStyleTable.map(ts => {
                                        const instance = {
                                            userName,
                                            numberOfMoves: utils.getNumberOfMoves(ts.setup, ts.move1, ts.move2),
                                            buffer: ts.buffer,
                                            sticker1: ts.sticker1,
                                            sticker2: ts.sticker2,
                                            stickers: `${ts.buffer} ${ts.sticker1} ${ts.sticker2}`,
                                            setup: ts.setup,
                                            move1: ts.move1,
                                            move2: ts.move2,
                                        };

                                        const algNotation = threeStyleRoute.makeThreeStyleAlg(order, ts.setup, ts.move1, ts.move2).getNotation();
                                        if (algNotation in algToValidId) {
                                            instance.id = algToValidId[algNotation];
                                        }

                                        return instance;
                                    });

                                    return threeStyleModel
                                        .bulkCreate(instances,
                                            {
                                                transaction: t,
                                                fields: [ 'id', 'userName', 'numberOfMoves', 'buffer', 'sticker1', 'sticker2', 'stickers', 'setup', 'move1', 'move2', ],
                                                updateOnDuplicate: [ 'buffer', 'sticker1', 'sticker2', 'stickers', ],
                                            }
                                        )
                                        .then(() => {
                                            const ans = {
                                                success: {
                                                    code: 200,
                                                    result: instances,
                                                },
                                            };
                                            res.json(ans);
                                            res.status(200);
                                        })
                                        .catch((err) => {
                                            throw new Error(err.message);
                                        });
                                })
                                .catch(err => {
                                    throw new Error(err.message);
                                });
                        })
                        .catch((err) => {
                            throw new Error(err.message);
                        });
                })
                .catch((err) => {
                    throw new Error(err.message);
                });
        });
};

exports.postProcess = postProcess;
