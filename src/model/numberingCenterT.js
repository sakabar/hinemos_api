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

    const db = sequelize.define('numbering_center_t', {
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            primaryKey: true,
        },
        sticker: {
            field: 'sticker',
            type: DataTypes.ENUM(centers),
            primaryKey: true,
        },
        letter: {
            field: 'letter',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'numbering_center_t',
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
