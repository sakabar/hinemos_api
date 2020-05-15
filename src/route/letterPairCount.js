const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');

const LetterPair = sequelize.import(path.join(__dirname, '../model/letterPair'));

// レターペア一括登録を高速化するために、(letters, words)ごとのカウントをSQLで算出
const getProcess = (req, res, next) => {
    const query = {
        attributes: [
            'letters',
            'word',
            [ sequelize.fn('count', sequelize.col('*')), 'userCount', ],
        ],
        group: [
            'letters',
            'word',
        ],
        order: [
            [ sequelize.fn('count', sequelize.col('*')), 'DESC', ],
        ],
    };

    return LetterPair
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
        .catch((e) => {
            res.status(400).json(getBadRequestError(e));
        });
};

exports.getProcess = getProcess;
