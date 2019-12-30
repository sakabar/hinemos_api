const { sequelize, } = require('../model');
const path = require('path');
const { getBadRequestError, } = require('../lib/utils');
const { validationResult, } = require('express-validator');

const MemoElement = sequelize.import(path.join(__dirname, '../model/memoElement'));

async function getProcess (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.json(getBadRequestError(errors.array()[0].msg));
        res.status(400);
        return;
    }

    const result = await MemoElement.findAll().catch(next);

    const ans = {
        success: {
            code: 200,
            result,
        },
    };

    res.json(ans);
    res.status(200);
};

const postProcess = (req, res, next) => {
    const result = {
        process: 'post',
    };
    const ans = {
        success: {
            code: 200,
            result,
        },
    };

    res.json(ans);
    res.status(200);
};

exports.getProcess = getProcess;
exports.postProcess = postProcess;
