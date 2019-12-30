module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_element_type', {
        type: {
            field: 'type',
            type: DataTypes.STRING,
            primaryKey: true,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_element_type',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    return db;
};
