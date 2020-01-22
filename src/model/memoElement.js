const path = require('path');

module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_element', {
        elementId: {
            field: 'element_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        type: {
            field: 'type',
            type: DataTypes.STRING,
            allowNull: false,
        },
        tag: {
            field: 'tag',
            type: DataTypes.STRING,
            allowNull: false,
        },
        length: {
            field: 'length',
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_element',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    const MemoElementType = sequelize.import(path.join(__dirname, '/memoElementType'));
    db.belongsTo(MemoElementType, {
        foreignKey: 'type',
        targetKey: 'type',
    });

    return db;
};
