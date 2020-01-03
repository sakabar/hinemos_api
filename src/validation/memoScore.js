const { body, } = require('express-validator');

const getProcess = [
    body('userName')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('userName param is invalid for memoScore.getProcess'),
    // body('event')
    //     .withMessage('event param is invalid for memoScore.getProcess'),
    // body('mode')
    //     .withMessage('mode param is invalid for memoScore.getProcess'),
];

const postProcess = [
    body('trialId')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('trialId param is invalid for memoScore.postProcess'),

    body('totalMemoSec')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('totalMemoSec param is invalid for memoScore.postProcess'),

    body('successDeckNum')
        .exists()
        .withMessage('successDeckNum param is invalid for memoScore.postProcess'),

    body('triedDeckNum')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('triedDeckNum param is invalid for memoScore.postProcess'),

    body('allDeckNum')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('allDeckNum param is invalid for memoScore.postProcess'),

    body('successElementNum')
        .exists()
        .withMessage('successElementNum param is invalid for memoScore.postProcess'),

    body('triedElementNum')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('triedElementNum param is invalid for memoScore.postProcess'),

    body('allElementNum')
        .exists({ checkNull: true, })
        .notEmpty()
        .isString()
        .withMessage('allElementNum param is invalid for memoScore.postProcess'),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
