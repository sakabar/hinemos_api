const { body, } = require('express-validator');

const getProcess = [
    body('userName')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .withMessage('userName param is invalid for memoLogRecall.getProcess'),
];

const postProcess = [
    body('logs')
        .exists({ checkNull: true, })
        .notEmpty()
        .isArray({ min: 1, })
        .withMessage('logs param is invalid for memoLogRecall.postProcess'),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
