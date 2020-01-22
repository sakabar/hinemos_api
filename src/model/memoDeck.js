module.exports = (sequelize, DataTypes) => {
    const db = sequelize.define('memo_deck', {
        deckId: {
            field: 'deck_id',
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
    }, {
        freezeTableName: true,
        tableName: 'memo_deck',
        charset: 'utf8',
        collate: 'utf8_unicode_ci',
    });

    return db;
};
