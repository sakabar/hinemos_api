const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_trial_deck', {
        trialDeckId: {
            field: 'trial_deck_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        trialId: {
            field: 'trial_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        ind: {
            field: 'ind',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        deckId: {
            field: 'deck_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_trial_deck',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const MemoTrial = sequelize.import(path.join(__dirname, '/memoTrial'));
    db.belongsTo(MemoTrial, {
        foreignKey: 'trialId',
        targetKey: 'trialId',
    });

    const MemoDeck = sequelize.import(path.join(__dirname, '/memoDeck'));
    db.belongsTo(MemoDeck, {
        foreignKey: 'deckId',
        targetKey: 'deckId',
    });

    return db;
};
