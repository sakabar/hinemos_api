const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_deck_element', {
        deckElementId: {
            field: 'deck_element_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        deckId: {
            field: 'deck_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        ind: {
            field: 'ind',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        elementId: {
            field: 'element_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_deck_element',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const MemoDeck = sequelize.import(path.join(__dirname, '/memoDeck'));
    db.belongsTo(MemoDeck, {
        foreignKey: 'deckId',
        targetKey: 'deckId',
    });

    const MemoElement = sequelize.import(path.join(__dirname, '/memoElement'));
    db.belongsTo(MemoElement, {
        foreignKey: 'elementId',
        targetKey: 'elementId',
    });

    return db;
};
