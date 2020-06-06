const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const LetterPair = sequelize.import(path.join(__dirname, '../model/letterPair'));

const postProcess = (req, res, next) => {
    const userName = req.decoded.userName;
    const letterPairTable = req.body.letterPairTable;

    if (!userName || !letterPairTable) {
        res.status(400).json(getBadRequestError(''));
        return;
    }

    // 同じ単語が複数のlettersに割り当てられていたらエラーを出す
    const wordToLetters = {};
    letterPairTable.map(record => {
        const letters = record.letters;
        const words = record.words;

        words.map(word => {
            if (word in wordToLetters) {
                const msg = `『エラー: ひらがな「${wordToLetters[word]}」と「${letters}」の両方に単語「${word}」が使われています。』`;
                throw new Error(msg);
            } else {
                wordToLetters[word] = letters;
            }
        });
    });

    const wordsInRequest = letterPairTable.map(r => r.words).reduce((acc, crr) => { return acc.concat(crr); }, []);

    sequelize
        .transaction((t) => {
            // まず今のletterPairの中から、新しいLetterPairTableに含まれていない単語を消す
            return LetterPair
                .destroy({
                    where: {
                        userName,
                        words: {
                            [Op.notIn]: wordsInRequest,
                        },
                    },
                    transaction: t,
                })
                .then((result) => {
                    // 次に、UIの表から入力された情報でupsert
                    const promises = [];
                    for (let i = 0; i < letterPairTable.length; i++) {
                        const words = letterPairTable[i].words;
                        for (let k = 0; k < words.length; k++) {
                            const letters = letterPairTable[i].letters;
                            const word = letterPairTable[i].words[k];

                            const instance = {
                                userName,
                                word,
                                letters,
                            };

                            promises.push(
                                LetterPair
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
                                    .catch(() => {
                                        const msg = `『ひらがな「${String(instance.letters)}」に単語「${String(instance.word)}」を割り当てようとしたところ、エラーが発生しました。』`;
                                        throw new Error(msg);
                                    }));
                        }
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
            res.status(400).json(getBadRequestError(err));
        });
};

exports.postProcess = postProcess;
