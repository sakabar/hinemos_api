const { sequelize, } = require('../model');
const path = require('path');

const MemoElementType = sequelize.import(path.join(__dirname, '../model/memoElementType'));

const types = [
    'letter',
    'card',
    'number',
];

const bulk = types.map(type => {
    return {
        type,
    };
});

MemoElementType.bulkCreate(bulk);
