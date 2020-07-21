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

    const db = sequelize.define('three_sytle_quiz_problem_list_detail_center_t', {
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
        tableName: 'three_style_quiz_problem_list_detail_center_t',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const ProblemListNameCenterT = sequelize.import(path.join(__dirname, '/threeStyleQuizProblemListNameCenterT'));
    db.belongsTo(ProblemListNameCenterT, {
        foreignKey: 'problemListId',
        targetKey: 'problemListId',
        onDelete: 'cascade',
    });

    return db;
};
