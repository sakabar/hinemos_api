module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_mode', {
        mode: {
            field: 'mode',
            type: DataTypes.STRING,
            primaryKey: true,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_mode',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    return db;
};
