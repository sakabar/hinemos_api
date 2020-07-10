const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');

const LetterPair = sequelize.import(path.join(__dirname, '../model/letterPair'));

const postProcess = (req, res, next) => {
    const hiraganas = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(/(.{1})/).filter(x => x);

    const userName = req.params.userName;
    const inputWord = req.body.word;
    const letters = req.body.letters;

    const lettersOk = letters.split(/(.)/).filter(x => x).every(ch => hiraganas.includes(ch));
    if ((req.decoded.userName !== userName) || !inputWord || !letters || !lettersOk) {
        res.status(400).send(getBadRequestError(''));
        return;
    }

    const words = inputWord.replace(/\s/g, '').split(/[,，、/／]/).filter(x => x.length > 0);
    const promises = [];
    for (let i = 0; i < words.length; i++) {
        const word = words[i];

        promises.push(
            LetterPair
                .create({
                    userName,
                    word,
                    letters,
                })
                .then((ans) => {
                    return ans;
                }, () => {
                    return [];
                })
        );
    }

    Promise.all(promises)
        .then((results) => {
            const ans = {
                success: {
                    code: 200,
                    result: results,
                },
            };

            res.json(ans);
            res.status(200);
        }, (err) => {
            const ans = {
                error: {
                    code: 400,
                    msg: err,
                },
            };

            res.json(ans);
            res.status(400);
        });
};

exports.postProcess = postProcess;
