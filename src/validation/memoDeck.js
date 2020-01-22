const { body, } = require('express-validator');

const getProcess = [
];

const postProcess = [
    body('elementIdsList')
        .exists({ checkNull: true, })
        .isArray({ min: 1, })
        .custom((value, { req, }) => {
            return req.body.elementIdsList.filter(elementIds => !elementIds.length || elementIds.length === 0).length === 0;
        })
        .withMessage('param is invalid for memoDeck.postProcess'),
];

exports.getProcess = getProcess;
exports.postProcess = postProcess;
