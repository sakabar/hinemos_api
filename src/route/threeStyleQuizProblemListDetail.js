const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');

const ThreeStyleQuizProblemListNameCorner = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameCorner'));
const ThreeStyleQuizProblemListNameEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameEdgeMiddle'));
const ThreeStyleQuizProblemListNameEdgeWing = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameEdgeWing'));
const ThreeStyleQuizProblemListNameCenterX = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameCenterX'));
const ThreeStyleQuizProblemListNameCenterT = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListNameCenterT'));

const ThreeStyleQuizProblemListDetailCorner = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailCorner'));
const ThreeStyleQuizProblemListDetailEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailEdgeMiddle'));
const ThreeStyleQuizProblemListDetailEdgeWing = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailEdgeWing'));
const ThreeStyleQuizProblemListDetailCenterX = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailCenterX'));
const ThreeStyleQuizProblemListDetailCenterT = sequelize.import(path.join(__dirname, '../../src/model/threeStyleQuizProblemListDetailCenterT'));

const NumberingCorner = sequelize.import(path.join(__dirname, '../../src/model/numberingCorner'));
const NumberingEdgeMiddle = sequelize.import(path.join(__dirname, '../../src/model/numberingEdgeMiddle'));
const NumberingEdgeWing = sequelize.import(path.join(__dirname, '../model/numberingEdgeWing'));
const NumberingCenterX = sequelize.import(path.join(__dirname, '../model/numberingCenterX'));
const NumberingCenterT = sequelize.import(path.join(__dirname, '../model/numberingCenterT'));

const getProblemListDetailModel = (part) => {
    if (part === 'corner') {
        return ThreeStyleQuizProblemListDetailCorner;
    } else if (part === 'edgeMiddle') {
        return ThreeStyleQuizProblemListDetailEdgeMiddle;
    } else if (part === 'edgeWing') {
        return ThreeStyleQuizProblemListDetailEdgeWing;
    } else if (part === 'centerX') {
        return ThreeStyleQuizProblemListDetailCenterX;
    } else if (part === 'centerT') {
        return ThreeStyleQuizProblemListDetailCenterT;
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
    } else if (part === 'edgeWing') {
        return sticker1 === sticker2;
    } else if (part === 'centerX' || part === 'centerT') {
        return sticker1[0] === sticker2[0];
    }

    return false;
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

const getThreeStyleQuizProblemListNameModel = (part) => {
    if (part === 'corner') {
        return ThreeStyleQuizProblemListNameCorner;
    } else if (part === 'edgeMiddle') {
        return ThreeStyleQuizProblemListNameEdgeMiddle;
    } else if (part === 'edgeWing') {
        return ThreeStyleQuizProblemListNameEdgeWing;
    } else if (part === 'centerX') {
        return ThreeStyleQuizProblemListNameCenterX;
    } else if (part === 'centerT') {
        return ThreeStyleQuizProblemListNameCenterT;
    } else {
        return null;
    }
};

// 3-styleに出てくる全てのレターペアの一覧を返す
const getAllNumberingPair = (part, userName) => {
    const numberingModel = getNumberingModel(part);
    if (!numberingModel) {
        return {};
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

            // ひらがなの昇順でソート
            numberingsWithoutBuffer.sort((a, b) => {
                if (a.letter < b.letter) return -1;
                if (a.letter === b.letter) return 0;
                if (a.letter > b.letter) return 1;
            });

            const ans = [];

            for (let i = 0; i < numberingsWithoutBuffer.length; i++) {
                const numbering1 = numberingsWithoutBuffer[i];

                for (let k = 0; k < numberingsWithoutBuffer.length; k++) {
                    const numbering2 = numberingsWithoutBuffer[k];

                    const record = {
                        buffer: buffer.sticker,
                        sticker1: numbering1.sticker,
                        sticker2: numbering2.sticker,
                        stickers: `${buffer.sticker} ${numbering1.sticker} ${numbering2.sticker}`,
                        letter1: numbering1.letter,
                        letter2: numbering2.letter,
                        letters: `${numbering1.letter}${numbering2.letter}`,
                        // 作成日時は無いが、一応それぞれの問題リストDetailを引いたときに合わせて
                        // カラムは用意しておく
                        createdAt: null,
                        updatedAt: null,
                    };

                    ans.push(record);
                }
            }

            const detail = ans.filter(record => !isInSamePiece(part, record.sticker1, record.sticker2));

            return {
                buffer,
                detail,
            };
        })
        .catch((err) => {
            console.dir(err);
            return {};
        });
};

const getProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const part = req.params.part;
    const problemListId = parseInt(req.body.problemListId) || null;

    const threeStyleQuizProblemListNameModel = getThreeStyleQuizProblemListNameModel(part);
    const problemListDetailModel = getProblemListDetailModel(part);
    const numberingModel = getNumberingModel(part);

    if (!threeStyleQuizProblemListNameModel || !problemListDetailModel || !numberingModel) {
        res.status(400).send(getBadRequestError('part名が不正です'));
        return;
    }

    return (() => {
        if (problemListId) {
            return numberingModel
                .findAll(
                    {
                        where: {
                            userName,
                        },
                        raw: true,
                    }
                )
                .then(numberings => {
                    const buffer = numberings.filter(numbering => numbering.letter === '@')[0];

                    const stickerToLetter = {};
                    for (let i = 0; i < numberings.length; i++) {
                        const numbering = numberings[i];
                        stickerToLetter[numbering.sticker] = numbering.letter;
                    }

                    return threeStyleQuizProblemListNameModel
                        .findAll(
                            {
                                where: {
                                    userName,
                                    problemListId,
                                },
                                raw: true,
                            }
                        )
                        .then(listNames => {
                            if (listNames.length === 0) {
                                const msg = `No such problemListId for ${userName} : ${problemListId}`;
                                return Promise.reject(new Error(msg));
                            }

                            return problemListDetailModel
                                .findAll(
                                    {
                                        where: {
                                            problemListId,
                                        },
                                        raw: true,
                                    }
                                )
                                .then(problemListDetails => {
                                    const detail = problemListDetails.map(problemListDetail => {
                                        const letter1 = stickerToLetter[problemListDetail.sticker1];
                                        const letter2 = stickerToLetter[problemListDetail.sticker2];
                                        const letters = `${letter1}${letter2}`;
                                        problemListDetail.letters = letters;
                                        return problemListDetail;
                                    });

                                    return {
                                        buffer,
                                        detail,
                                    };
                                })
                                .catch((err) => {
                                    console.dir(err);
                                    return Promise.reject(new Error());
                                });
                        })
                        .catch((err) => {
                            console.dir(err);
                            return Promise.reject(new Error());
                        });
                })
                .catch((err) => {
                    console.dir(err);
                    return Promise.reject(new Error());
                });
        } else {
            return getAllNumberingPair(part, userName);
        }
    })()
        .then((result) => {
            const ans = {
                success: {
                    code: 200,
                    // フォーマットが他のAPIと違うのは変だが、resultが0件のときも
                    // バッファの情報を読み取れるようにする
                    buffer: result.buffer.sticker,
                    result: result.detail,
                },
            };

            res.json(ans);
            res.status(200);
        })
        .catch(() => {
            res.status(400).send(getBadRequestError());
        });
};

const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const part = req.params.part;
    const problemListId = req.body.problemListId;

    // "DF UR UB,DF UR UL"のように、stickersをコンマでつないだ文字列
    const stickersStr = req.body.stickersStr;

    const problemListDetailModel = getProblemListDetailModel(part);
    const threeStyleQuizProblemListNameModel = getThreeStyleQuizProblemListNameModel(part);

    if (!userName || !problemListId || !problemListDetailModel || !threeStyleQuizProblemListNameModel) {
        res.status(400).send(getBadRequestError('パラメータが不正です'));
        return;
    }

    return threeStyleQuizProblemListNameModel
        .findOne({
            where: {
                userName,
                problemListId,
            },
        })
        .then(problemList => {
            const buffer = problemList.buffer;

            const instances = stickersStr
                .split(',')
                .map(stickers => stickers.split(' '))
                .filter(lst => lst.length === 3)
                .map(lst => {
                    return {
                        problemListId,
                        buffer: lst[0],
                        sticker1: lst[1],
                        sticker2: lst[2],
                        stickers: `${lst[0]} ${lst[1]} ${lst[2]}`,
                    };
                })
                .filter(obj => obj.buffer === buffer);

            if (instances.length === 0) {
                console.dir('ゼロ');
                res.status(400).send(getBadRequestError(''));
                return;
            }

            return problemListDetailModel.bulkCreate(
                instances,
                {
                    // 1つのリストに同じ手順が複数レコード登録されることを避ける
                    updateOnDuplicate: [ 'updatedAt', ],
                })
                .then(() => {
                    // 問題リスト内の手順数を取得し、problemListNameのレコードを更新
                    // 既に登録された手順はスキップされるので、単にinstance.lengthを
                    // 加えるだけだと実際の手順数よりも多くなってしまってダメ

                    problemListDetailModel.count(
                        {
                            where: {
                                problemListId: problemList.problemListId,
                            },
                        })
                        .then(dataCount => {
                            return threeStyleQuizProblemListNameModel
                                .update({
                                    numberOfAlgs: dataCount,
                                }, {
                                    where: {
                                        problemListId: problemList.problemListId,
                                    },
                                })
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
                                    console.dir(err);
                                    res.status(400).send(getBadRequestError(''));
                                });
                        })
                        .catch((err) => {
                            console.dir(err);
                            res.status(400).send(getBadRequestError(''));
                        });
                })
                .catch((err) => {
                    console.dir(err);
                    res.status(400).send(getBadRequestError(''));
                });
        })
        .catch((err) => {
            console.dir(err);
            res.status(400).send(getBadRequestError(''));
        });
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
