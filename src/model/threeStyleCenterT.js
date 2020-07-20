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

    const db = sequelize.define('three_style_center_t', {
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
        numberOfMoves: {
            field: 'number_of_moves',
            type: DataTypes.INTEGER,
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
        // buffer[SP]sticker1[SP]sticker2
        // (buffer, sticker1, sticker2)に対して一意に決まるが、
        // 簡単のためカラムを用意
        stickers: {
            field: 'stickers',
            type: DataTypes.STRING,
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
        tableName: 'three_style_center_t',
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
