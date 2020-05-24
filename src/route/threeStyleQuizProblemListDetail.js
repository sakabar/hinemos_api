const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');

const ThreeStyleQuizProblemListDetailCorner = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailCorner'));
const ThreeStyleQuizProblemListDetailEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailEdgeMiddle'));

const NumberingCorner = sequelize.import(path.join(__dirname, '../../src/model/numberingCorner'));
const NumberingEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/numberingEdgeMiddle'));

const getProblemListDetailModel = (part) => {
    if (part === 'corner') {
        return ThreeStyleQuizProblemListDetailCorner;
    } else if (part === 'edgeMiddle') {
        return ThreeStyleQuizProblemListDetailEdgeMiddle;
    } else {
        return null;
    }
};

// 同じパーツ(or Xセンターなどでの同じ)のステッカーかどうか判定
const isInSamePiece = (part, sticker1, sticker2) => {
    if (part === 'corner' || part === 'edgeMiddle') {
        const s1 = Array.from(sticker1).sort().join('');
        const s2 = Array.from(sticker2).sort().join('');
        return s1 === s2;
    } else {
        throw new Error('unexpected partType');
    }
};

const getNumberingModel = (part) => {
    if (part === 'corner') {
        return NumberingCorner;
    } else if (part === 'edgeMiddle') {
        return NumberingEdgeMiddle;
    } else {
        return null;
    }
};

// 取り得るレターペアの一覧を
const getAllNumberingPair = (part, userName) => {
    const numberingModel = getNumberingModel(part);
    if (!numberingModel) {
        return [];
    }

    return numberingModel
        .findAll({
            where: {
                userName,
            },
            raw: true,
        })
        .then((numberings) => {
            const buffer = numberings.filter(numbering => numbering.letter === '@')[0];
            const numberingsWithoutBuffer = numberings.filter(a => a.letter !== '@');

            const ans = [];

            for (let i = 0; i < numberingsWithoutBuffer.length; i++) {
                const numbering1 = numberingsWithoutBuffer[i];

                for (let k = 0; k < numberingsWithoutBuffer.length; k++) {
                    const numbering2 = numberingsWithoutBuffer[k];

                    const record = {
                        userName,
                        buffer: buffer.sticker,
                        sticker1: numbering1.sticker,
                        sticker2: numbering2.sticker,
                        letter1: numbering1.letter,
                        letter2: numbering2.letter,
                        letters: `${numbering1.letter}${numbering2.letter}`,
                    };

                    ans.push(record);
                }
            }

            return ans.filter(record => !isInSamePiece(part, record.sticker1, record.sticker2));
        })
        .catch((err) => {
            console.dir(err);
            return [];
        });
};

const getProcess = (req, res, next) => {
    // const userName = req.decoded.userName;
    const userName = 'tsakakib'; // FIXME
    const part = req.params.part;
    const problemListId = parseInt(req.query.problemListId) || null;

    const problemListDetailModel = getProblemListDetailModel(part);

    if (!problemListDetailModel) {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    return (() => {
        if (problemListId) {
            return problemListDetailModel
                .findAll(
                    {
                        where: {
                            userName,
                            problemListId,
                        },
                        raw: true,
                    }
                );
        } else {
            return getAllNumberingPair(part, userName);
        }
    })()
        .then((result) => {
            const ans = {
                success: {
                    code: 200,
                    result,
                },
            };

            res.json(ans);
            res.status(200);
        }, (err) => {
            console.dir(err);
            res.status(400).send(getBadRequestError(''));
        });

    // やろうとしていることが結構複雑
    // problemListIdから、表示したいstickersを引く
    // そのstickersとJOINして、手順を引く

    // ナンバリングに変換 … → JOINが3回になっちゃうからダメかー。
    // stickersから手順を引く
    // stickersからクイズの結果を引く (これ今APIある?)

    // return model
    //     .findAll(query)
    //     .then((result) => {
    //         const ans = {
    //             success: {
    //                 code: 200,
    //                 result,
    //             },
    //         };

    //         res.json(ans);
    //         res.status(200);
    //     }, () => {
    //         res.status(400).send(getBadRequestError(''));
    //     });
};

// titles: コンマ区切りの文字列
const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const part = req.params.part;

    const buffer = req.body.buffer;
    const titles = req.body.titles;

    if (!userName || !titles || !(part === 'corner' || part === 'edgeMiddle') || !buffer) {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    let model;
    if (part === 'corner') {
        model = ThreeStyleQuizProblemListDetailCorner;
    } else if (part === 'edgeMiddle') {
        model = ThreeStyleQuizProblemListDetailEdgeMiddle;
    } else {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    sequelize
        .transaction((t) => {
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
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
