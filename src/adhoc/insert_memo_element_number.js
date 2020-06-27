const { sequelize, } = require('../model');
const path = require('path');

const MemoElement = sequelize.import(path.join(__dirname, '../model/memoElement'));

const bulk = [];

// 1桁の数字
for (let i = 0; i < 10; i++) {
    const tag = `${i}`;
    const element = {
        type: 'number',
        tag,
        length: tag.length,
    };

    bulk.push(element);
}

// 2桁の数字
for (let i = 0; i < 10; i++) {
    for (let k = 0; k < 10; k++) {
        const tag = `${i}${k}`;
        const element = {
            type: 'number',
            tag,
            length: tag.length,
        };

        bulk.push(element);
    }
}

MemoElement.bulkCreate(bulk);
