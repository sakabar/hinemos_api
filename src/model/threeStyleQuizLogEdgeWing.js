const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const edgesFUr = [
        'BDr', 'BLd', 'BRu', 'BUl',
        'DBl', 'DFr', 'DLf', 'DRb',
        'FDl', 'FLu', 'FRd', 'FUr',
        'LBu', 'LDb', 'LFd', 'LUf',
        'RBd', 'RDf', 'RFu', 'RUb',
        'UBr', 'UFl', 'ULb', 'URf',
    ];

    const edgesUFr = [
        'BDl', 'BLu', 'BRd', 'BUr',
        'DBr', 'DFl', 'DLb', 'DRf',
        'FDr', 'FLd', 'FRu', 'FUl',
        'LBd', 'LDf', 'LFu', 'LUb',
        'RBu', 'RDb', 'RFd', 'RUf',
        'UBl', 'UFr', 'ULf', 'URb',
    ];

    const edges = edgesFUr.concat(edgesUFr);

    let db = sequelize.define('three_style_quiz_log_edge_wing', {
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
        usedHint: {
            field: 'used_hint',
            type: DataTypes.INTEGER,
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
        tableName: 'three_style_quiz_log_edge_wing',
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
