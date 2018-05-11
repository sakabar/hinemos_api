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

    const db = sequelize.define('three_style_edge', {
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
        setup: {
            field: 'setup',
            type: DataTypes.STRING,
            allowNull: true,
        },
        move1: {
            field: 'move1',
            type: DataTypes.STRING,
            allowNull: false,
        },
        move2: {
            field: 'move2',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'three_style_edge',
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
