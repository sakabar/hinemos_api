const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const edges = [
        'BD', 'BL', 'BR', 'BU',
        'DB', 'DF', 'DL', 'DR',
        'FD', 'FL', 'FR', 'FU',
        'LB', 'LD', 'LF', 'LU',
        'RB', 'RD', 'RF', 'RU',
        'UB', 'UF', 'UL', 'UR',
    ];

    const db = sequelize.define('three_sytle_quiz_list_edge_middle', {
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
        buffer: {
            field: 'buffer',
            type: DataTypes.ENUM(edges),
            allowNull: false,
        },
        sticker1: {
            field: 'sticker1',
            type: DataTypes.ENUM(edges),
            allowNull: false,
        },
        sticker2: {
            field: 'sticker2',
            type: DataTypes.ENUM(edges),
            allowNull: false,
        },
        stickers: {
            field: 'stickers',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'three_style_quiz_list_edge_middle',
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
