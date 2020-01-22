const { body, } = require('express-validator');

const getProcess = [
    body('userName')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .withMessage('userName param is invalid for memoLogMemorization.getProcess'),
];

const postProcess = [
    body('logs')
        .exists({ checkNull: true, })
        .notEmpty()
        .isArray({ min: 1, })
        .withMessage('logs param is invalid for memoLogMemorization.postProcess'),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
