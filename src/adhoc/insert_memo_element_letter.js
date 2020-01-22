const { sequelize, } = require('../model');
const path = require('path');

const MemoElement = sequelize.import(path.join(__dirname, '../model/memoElement'));

const hiraganas = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(/(.{1})/).filter(x => x);

const bulk = [];

// 1字のひらがな
for (let i = 0; i < hiraganas.length; i++) {
    const hiragana = hiraganas[i];
    const element = {
        type: 'letter',
        tag: hiragana,
        length: 1,
    };

    bulk.push(element);
}

// 2字のひらがな
for (let i = 0; i < hiraganas.length; i++) {
    const letter1 = hiraganas[i];
    for (let k = 0; k < hiraganas.length; k++) {
        const letter2 = hiraganas[k];
        const tag = `${letter1}${letter2}`;

        const element = {
            type: 'letter',
            tag,
            length: 2,
        };

        bulk.push(element);
    }
}

MemoElement.bulkCreate(bulk);
