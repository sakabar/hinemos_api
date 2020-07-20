const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const centers = [
        'Bd', 'Bl', 'Br', 'Bu',
        'Db', 'Df', 'Dl', 'Dr',
        'Fd', 'Fl', 'Fr', 'Fu',
        'Lb', 'Ld', 'Lf', 'Lu',
        'Rb', 'Rd', 'Rf', 'Ru',
        'Ub', 'Uf', 'Ul', 'Ur',
    ];

    const db = sequelize.define('three_style_quiz_log_center_t', {
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
            type: DataTypes.ENUM(centers),
            allowNull: false,
        },
        sticker1: {
            field: 'sticker1',
            type: DataTypes.ENUM(centers),
            allowNull: false,
        },
        sticker2: {
            field: 'sticker2',
            type: DataTypes.ENUM(centers),
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
        tableName: 'three_style_quiz_log_center_t',
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
