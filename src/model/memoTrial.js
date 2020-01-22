const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_trial', {
        trialId: {
            field: 'trial_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            allowNull: false,
        },
        event: {
            field: 'event',
            type: DataTypes.STRING,
            allowNull: false,
        },
        mode: {
            field: 'mode',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_trial',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const User = sequelize.import(path.join(__dirname, '/user'));
    db.belongsTo(User, {
        foreignKey: 'userName',
        targetKey: 'userName',
    });

    const MemoEvent = sequelize.import(path.join(__dirname, '/memoEvent'));
    db.belongsTo(MemoEvent, {
        foreignKey: 'event',
        targetKey: 'event',
    });

    const MemoMode = sequelize.import(path.join(__dirname, '/memoMode'));
    db.belongsTo(MemoMode, {
        foreignKey: 'mode',
        targetKey: 'mode',
    });

    return db;
};
