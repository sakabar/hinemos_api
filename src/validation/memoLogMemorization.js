const { body, } = require('express-validator');

const getProcess = [
];

const postProcess = [
    body('trialDeckId')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('trialDeckId param is invalid for memoLogMemorization.postProcess'),
    body('userName')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('userName param is invalid for memoLogMemorization.postProcess'),
    body('ind')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('ind param is invalid for memoLogMemorization.postProcess'),
    body('deckInd')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('deckInd param is invalid for memoLogMemorization.postProcess'),
    body('pairInd')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('pairInd param is invalid for memoLogMemorization.postProcess'),
    body('posInd')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('posInd param is invalid for memoLogMemorization.postProcess'),
    body('deckElementId')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('deckElementId param is invalid for memoLogMemorization.postProcess'),
    body('memoSec')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('memoSec param is invalid for memoLogMemorization.postProcess'),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
