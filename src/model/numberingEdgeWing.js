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

    const db = sequelize.define('numbering_edge_wing', {
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
        tableName: 'numbering_edge_wing',
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
