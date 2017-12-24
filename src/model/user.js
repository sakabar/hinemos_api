module.exports = (sequelize, DataTypes) => {
    return sequelize.define('user', {
        userName: {
            field: 'user_name',
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'user',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });
};
