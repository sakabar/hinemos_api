const { body, } = require('express-validator');

const getProcess = [
];

const postProcess = [
    body('userName')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .withMessage('userName param is invalid for memoDeck.postProcess'),
    body('mode')
        .exists({ checkNull: true, })
        .isString()
        .notEmpty()
        .custom((value, { req, }) => {
            return [ 'memorization', 'transformation', ].includes(req.body.mode);
        })
        .withMessage('mode param is invalid for memoDeck.postProcess'),
    body('deckIds')
        .exists({ checkNull: true, })
        .isArray({ min: 1, }),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
