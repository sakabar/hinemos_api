const { sequelize, } = require('../model');
const path = require('path');

const MemoElement = sequelize.import(path.join(__dirname, '../model/memoElement'));

const suits = [ 'C', 'D', 'H', 'S', ];

const bulk = [];
for (let i = 0; i < suits.length; i++) {
    const suit = suits[i];
    for (let num = 1; num <= 13; num++) {
        const numStr = `${num}`.padStart(2, '0');
        const tag = `${suit}-${numStr}`;

        const element = {
            type: 'card',
            tag,
            length: 1,
        };

        bulk.push(element);
    }
}

MemoElement.bulkCreate(bulk);
