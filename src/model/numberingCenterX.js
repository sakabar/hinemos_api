const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const centers = [
        'Bdl', 'Bdr', 'Blu', 'Bru',
        'Dbl', 'Dbr', 'Dfl', 'Dfr',
        'Fdl', 'Fdr', 'Flu', 'Fru',
        'Lbd', 'Lbu', 'Ldf', 'Lfu',
        'Rbd', 'Rbu', 'Rdf', 'Rfu',
        'Ubl', 'Ubr', 'Ufl', 'Ufr',
    ];

    const db = sequelize.define('numbering_center_x', {
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
        tableName: 'numbering_center_x',
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
