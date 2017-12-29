const path = require('path');

module.exports = (sequelize, DataTypes) => {
    let db = sequelize.define('letter_pair', {
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        word: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        letters: {
            field: 'letters',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'letter_pair',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const User = sequelize.import(path.join(__dirname, '/user'));
    db.belongsTo(User, {
        foreignKey: 'userName',
        targetKey: 'userName',
    });

    return db;
};
