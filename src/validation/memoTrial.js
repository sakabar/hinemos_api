const { body, } = require('express-validator');

const getProcess = [
];

const postProcess = [
    body('userName')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .withMessage('userName param is invalid for memoTrial.postProcess'),
    body('event')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .withMessage('event param is invalid for memoTrial.postProcess'),
    body('mode')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .withMessage('mode param is invalid for memoTrial.postProcess'),
    body('deckIds')
        .exists({ checkNull: true, })
        .isArray({ min: 1, }),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
