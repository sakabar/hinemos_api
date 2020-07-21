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

    const db = sequelize.define('three_sytle_quiz_problem_list_detail_edge_wing', {
        problemListId: {
            field: 'problem_list_id',
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        buffer: {
            field: 'buffer',
            type: DataTypes.ENUM(edges),
            allowNull: false,
            primaryKey: true,
        },
        sticker1: {
            field: 'sticker1',
            type: DataTypes.ENUM(edges),
            allowNull: false,
            primaryKey: true,
        },
        sticker2: {
            field: 'sticker2',
            type: DataTypes.ENUM(edges),
            allowNull: false,
            primaryKey: true,
        },
        stickers: {
            field: 'stickers',
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'three_style_quiz_problem_list_detail_edge_wing',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const ProblemListNameEdgeWing = sequelize.import(path.join(__dirname, '/threeStyleQuizProblemListNameEdgeWing'));
    db.belongsTo(ProblemListNameEdgeWing, {
        foreignKey: 'problemListId',
        targetKey: 'problemListId',
        onDelete: 'cascade',
    });

    return db;
};
