module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_event', {
        event: {
            field: 'event',
            type: DataTypes.STRING,
            primaryKey: true,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_event',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    return db;
};
