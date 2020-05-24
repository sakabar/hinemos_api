const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('three_sytle_quiz_problem_list_name_corner', {
      problemListId: {
            field: 'problemListId',
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
            type: DataTypes.STRING,
            allowNull: false,
        },
        title: {
            field: 'title',
            type: DataTypes.STRING,
            allowNull: false,
        },
        numberOfAlgs: {
            field: 'numberOfAlgs',
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        freezeTableName: true,
        tableName: 'three_style_quiz_problem_list_name_corner',
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
