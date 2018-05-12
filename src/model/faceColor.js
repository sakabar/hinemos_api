const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const faces = [ 'B', 'D', 'F', 'L', 'R', 'U', ];

    const db = sequelize.define('face_color', {
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            primaryKey: true,
        },
        face: {
            type: DataTypes.ENUM(faces),
            primaryKey: true,
        },
        color: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'face_color',
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
