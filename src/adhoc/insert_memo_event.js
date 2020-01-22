const { sequelize, } = require('../model');
const path = require('path');

const MemoEvent = sequelize.import(path.join(__dirname, '../model/memoEvent'));

const events = [
    'mbld',
    'cards',
];

const bulk = events.map(event => {
    return {
        event,
    };
});

MemoEvent.bulkCreate(bulk);
