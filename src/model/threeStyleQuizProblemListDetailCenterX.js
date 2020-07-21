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

    const db = sequelize.define('three_sytle_quiz_problem_list_detail_center_x', {
        problemListId: {
            field: 'problem_list_id',
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        buffer: {
            field: 'buffer',
            type: DataTypes.ENUM(centers),
            allowNull: false,
            primaryKey: true,
        },
        sticker1: {
            field: 'sticker1',
            type: DataTypes.ENUM(centers),
            allowNull: false,
            primaryKey: true,
        },
        sticker2: {
            field: 'sticker2',
            type: DataTypes.ENUM(centers),
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
        tableName: 'three_style_quiz_problem_list_detail_center_x',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const ProblemListNameCenterX = sequelize.import(path.join(__dirname, '/threeStyleQuizProblemListNameCenterX'));
    db.belongsTo(ProblemListNameCenterX, {
        foreignKey: 'problemListId',
        targetKey: 'problemListId',
        onDelete: 'cascade',
    });

    return db;
};
