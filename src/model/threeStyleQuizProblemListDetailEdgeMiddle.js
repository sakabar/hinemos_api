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

    const db = sequelize.define('three_sytle_quiz_problem_list_detail_edge_middle', {
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
        tableName: 'three_style_quiz_problem_list_detail_edge_middle',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const ProblemListNameEdgeMiddle = sequelize.import(path.join(__dirname, '/threeStyleQuizProblemListNameEdgeMiddle'));
    db.belongsTo(ProblemListNameEdgeMiddle, {
        foreignKey: 'problemListId',
        targetKey: 'problemListId',
        onDelete: 'cascade',
    });

    return db;
};
