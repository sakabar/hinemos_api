const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_log_recall', {
        recallLogId: {
            field: 'recall_log_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        trialDeckId: {
            field: 'trial_deck_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        userName: {
            // 情報としては冗長だが、集計を楽にするために非正規化して保存
            field: 'user_name',
            type: DataTypes.STRING,
            allowNull: false,
        },
        ind: {
            field: 'ind',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        deckInd: {
            field: 'deck_ind',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        pairInd: {
            field: 'pair_ind',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        posInd: {
            field: 'pos_ind',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        deckElementId: {
            field: 'deck_element_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        elementId: {
            // 情報としては冗長だが、集計を楽にするために非正規化して保存
            field: 'element_id',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        solutionElementId: {
            // どのイメージを回答したか。無回答もしくはelementとして存在しない場合はnull
            field: 'solution_element_id',
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        losingMemorySec: {
            // 記憶時に見ていない場合は意味がないのでnullとする
            field: 'losing_memory_sec',
            type: DataTypes.DOUBLE,
            allowNull: true,
        },
        isCorrect: {
            // 情報としては冗長だが、集計をやりやすくするために保存
            field: 'is_correct',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_log_recall',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const MemoTrialDeck = sequelize.import(path.join(__dirname, '/memoTrialDeck'));
    db.belongsTo(MemoTrialDeck, {
        foreignKey: 'trialDeckId',
        targetKey: 'trialDeckId',
    });

    const User = sequelize.import(path.join(__dirname, '/user'));
    db.belongsTo(User, {
        foreignKey: 'userName',
        targetKey: 'userName',
    });

    const MemoDeckElement = sequelize.import(path.join(__dirname, '/memoDeckElement'));
    db.belongsTo(MemoDeckElement, {
        foreignKey: 'deckElementId',
        targetKey: 'deckElementId',
    });

    const MemoElement = sequelize.import(path.join(__dirname, '/memoElement'));
    db.belongsTo(MemoElement, {
        foreignKey: 'elementId',
        targetKey: 'elementId',
    });

    return db;
};
