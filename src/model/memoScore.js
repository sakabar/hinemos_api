const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_score', {
        memoScoreId: {
            field: 'memo_score_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        trialId: {
            field: 'trial_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        totalMemoSec: {
            field: 'total_memo_sec',
            type: DataTypes.FLOAT,
            allowNull: false,
        },
        // ここからDeck
        successDeckNum: {
            field: 'success_deck_num',
            type: DataTypes.INTEGER,
            allowNull: true, //
        },
        triedDeckNum: {
            field: 'tried_deck_num',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        triedDeckAcc: {
            field: 'tried_deck_acc',
            type: DataTypes.FLOAT,
            allowNull: true, //
        },

        allDeckNum: {
            field: 'all_deck_num',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        allDeckAcc: {
            field: 'all_deck_acc',
            type: DataTypes.FLOAT,
            allowNull: true, //
        },
        // ここからElement
        successElementNum: {
            field: 'success_element_num',
            type: DataTypes.INTEGER,
            allowNull: true, //
        },
        triedElementNum: {
            field: 'tried_element_num',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        triedElementAcc: {
            field: 'tried_element_acc',
            type: DataTypes.FLOAT,
            allowNull: true, //
        },

        allElementNum: {
            field: 'all_element_num',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        allElementAcc: {
            field: 'all_element_acc',
            type: DataTypes.FLOAT,
            allowNull: true, //
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_score',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const MemoTrial = sequelize.import(path.join(__dirname, '/memoTrial'));
    db.belongsTo(MemoTrial, {
        foreignKey: 'trialId',
        targetKey: 'trialId',
    });

    return db;
};
