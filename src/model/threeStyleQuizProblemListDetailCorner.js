const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const corners = [
        'UBL', 'UBR', 'UFR', 'UFL',
        'RFU', 'RBU', 'RDF', 'RBD',
        'LBU', 'LFU', 'LBD', 'LDF',
        'FLU', 'FRU', 'FDL', 'FDR',
        'BRU', 'BLU', 'BDR', 'BDL',
        'DFR', 'DFL', 'DBR', 'DBL',
    ];

    const db = sequelize.define('three_sytle_quiz_problem_list_detail_corner', {
        problemListId: {
            field: 'problem_list_id',
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        buffer: {
            field: 'buffer',
            type: DataTypes.ENUM(corners),
            allowNull: false,
            primaryKey: true,
        },
        sticker1: {
            field: 'sticker1',
            type: DataTypes.ENUM(corners),
            allowNull: false,
            primaryKey: true,
        },
        sticker2: {
            field: 'sticker2',
            type: DataTypes.ENUM(corners),
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
        tableName: 'three_style_quiz_problem_list_detail_corner',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const ProblemListNameCorner = sequelize.import(path.join(__dirname, '/threeStyleQuizProblemListNameCorner'));
    db.belongsTo(ProblemListNameCorner, {
        foreignKey: 'problemListId',
        targetKey: 'problemListId',
        onDelete: 'cascade',
    });

    return db;
};
