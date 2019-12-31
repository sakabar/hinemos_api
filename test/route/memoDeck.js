const assert = require('assert');
const memoDeck = require('../../src/route/memoDeck');
const { sequelize, } = require('../../src/model');
const path = require('path');
const sinon = require('sinon');

const MemoDeck = sequelize.import(path.join(__dirname, '../../src/model/memoDeck'));
const MemoDeckElement = sequelize.import(path.join(__dirname, '../../src/model/memoDeckElement'));

// process.on('unhandledRejection', console.dir);

describe('route/memoDeck.js', () => {
    describe('postProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('正常系', () => {
            const req = {
                body: {},
            };

            req.body.elementIdsList = [
                [ '1', ],
                [ '2', '3', ],
            ];

            const expectedJson = {
                success: {
                    code: 200,
                    result: {
                        deckIds: [ 100, 101, ],
                        deckElementIdsDict: {
                            100: [ 10, ],
                            101: [ 101, 102, ],
                        },
                    },
                },
            };

            const expectedStatus = 200;

            // 中でres.jsonやres.statusが呼ばれる
            // 本来はそのresをexpressが使うが、今回はアサートする関数を渡すことでチェックしている
            const res = {
                json: (ansJson) => {
                    assert.deepStrictEqual(ansJson, expectedJson);
                },
                status: (status) => {
                    assert.deepStrictEqual(status, expectedStatus);
                },
            };

            const transactionStub = sinon.stub(sequelize, 'transaction');
            // transaction
            const t = {
                commit: () => {},
                rollback: () => {},
            };
            transactionStub.returns(Promise.resolve(t));

            const memoDeckCreateStub = sinon.stub(MemoDeck, 'create');
            memoDeckCreateStub.onFirstCall()
                .returns(Promise.resolve({ deckId: 100, }));
            memoDeckCreateStub.onSecondCall()
                .returns(new Promise((resolve) => resolve({ deckId: 101, })));
            memoDeckCreateStub.onThirdCall().throws(new Error('3rd call'));

            const memoDeckElementBulkCreateStub = sinon.stub(MemoDeckElement, 'bulkCreate');
            memoDeckElementBulkCreateStub.withArgs(
                [
                    {
                        deckId: 100,
                        ind: 0,
                        elementId: 1,
                    },
                    {
                        deckId: 101,
                        ind: 0,
                        elementId: 2,
                    },
                    {
                        deckId: 101,
                        ind: 1,
                        elementId: 3,
                    },
                ], { transaction: t, }).returns(new Promise((resolve) => resolve([])));
            memoDeckElementBulkCreateStub.throws(new Error('unexpected argument'));

            const memoDeckElementFindallStub = sinon.stub(MemoDeckElement, 'findAll');

            memoDeckElementFindallStub.withArgs({
                attributes: [
                    [ 'deck_element_id', 'deckElementId', ],
                ],
                where: {
                    deckId: 100,
                },
                order: [
                    [ 'ind', 'DESC', ],
                ],
                transaction: t,
            }).returns(
                Promise.resolve([
                    { deckElementId: 10, },
                ])
            );

            memoDeckElementFindallStub.withArgs({
                attributes: [
                    [ 'deck_element_id', 'deckElementId', ],
                ],
                where: {
                    deckId: 101,
                },
                order: [
                    [ 'ind', 'DESC', ],
                ],
                transaction: t,
            }).returns(
                Promise.resolve([
                    { deckElementId: 101, },
                    { deckElementId: 102, },
                ])
            );
            memoDeckElementFindallStub.returns(new Promise((resolve) => resolve([])));

            // 呼ばれないはずなのでassert.fail()
            const next = () => {
                assert.fail('next() was called.');
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoDeck.postProcess(req, res, next);
        });
    });
});
