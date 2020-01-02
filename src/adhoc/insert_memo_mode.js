const { sequelize, } = require('../model');
const path = require('path');

const MemoMode = sequelize.import(path.join(__dirname, '../model/memoMode'));

const modes = [
    'memorization',
    'transformation',
];

const bulk = modes.map(mode => {
    return {
        mode,
    };
});

MemoMode.bulkCreate(bulk);
