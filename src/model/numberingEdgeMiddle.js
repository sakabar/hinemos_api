const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const edges = [
        'UR', 'UB', 'UL', 'UF',
        'RF', 'RU', 'RB', 'RD',
        'LF', 'LU', 'LB', 'LD',
        'FU', 'FR', 'FD', 'FL',
        'BR', 'BU', 'BL', 'BD',
        'DR', 'DF', 'DL', 'DB',
    ];

    const db = sequelize.define('numbering_edge_middle', {
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            primaryKey: true,
        },
        sticker: {
            field: 'sticker',
            type: DataTypes.ENUM(edges),
            primaryKey: true,
        },
        letter: {
            field: 'letter',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'numbering_edge_middle',
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
