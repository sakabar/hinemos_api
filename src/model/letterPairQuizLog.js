const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('letter_pair_quiz_log', {
        id: {
            field: 'id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            allowNull: false,
        },
        letters: {
            field: 'letters',
            type: DataTypes.STRING,
            allowNull: false,
        },
        isRecalled: {
            field: 'is_recalled',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        sec: {
            field: 'sec',
            type: DataTypes.FLOAT,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'letter_pair_quiz_log',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const User = sequelize.import(path.join(__dirname, '/user'));
    db.belongsTo(User, {
        foreignKey: 'userName',
        targetKey: 'userName',
    });

    const LetterPair = sequelize.import(path.join(__dirname, '/letterPair'));
    db.belongsTo(LetterPair, {
        foreignKey: 'letters',
        targetKey: 'letters',
    });

    return db;
};
