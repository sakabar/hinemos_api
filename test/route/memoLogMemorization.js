const assert = require('assert');
const memoLogMemorization = require('../../src/route/memoLogMemorization');
const { sequelize, } = require('../../src/model');
const path = require('path');
const sinon = require('sinon');

const MemoDeckElement = sequelize.import(path.join(__dirname, '../../src/model/memoDeckElement'));
const MemoLogMemorization = sequelize.import(path.join(__dirname, '../../src/model/memoLogMemorization'));

// process.on('unhandledRejection', console.dir);

describe('route/memoLogMemorization.js', () => {
    describe('getProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('異常系: 名前が違う', () => {
            const req = {
                decoded: {
                    userName: 'taro',
                },
                body: {
                    userName: 'saburo',
                },
            };

            const expectedJson = {
                error: {
                    message: 'Bad Request: invalid user name: saburo != taro',
                    code: 400,
                },
            };

            const expectedStatus = 400;

            // 中でres.jsonやres.statusが呼ばれる
            // 本来はそのresをexpressが使うが、今回はアサートする関数を渡すことでチェックしている
            const res = {
                json: (ansJson) => {
                    assert.deepStrictEqual(ansJson, expectedJson);
                },
                status: (status) => {
                    assert.deepStrictEqual(status, expectedStatus);
                    return {
                        // res.status(400).json(ansJson) のような場合
                        json: (ansJson) => {
                            assert.deepStrictEqual(ansJson, expectedJson);
                        },
                    };
                },
            };

            // 呼ばれないはずなのでassert.fail()
            const next = (err) => {
                assert.fail(`next() was called : ${err}`);
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoLogMemorization.getProcess(req, res, next);
        });
    });

    describe('postProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('正常系', () => {
            const req = {
                // 認証によって付与される
                decoded: {
                    userName: 'taro',
                },
                body: {
                    logs: [
                        {
                            trialDeckId: '1',
                            userName: 'taro',
                            ind: '2',
                            deckInd: '3',
                            pairInd: '4',
                            posInd: '5',
                            deckElementId: '6',
                            memoSec: '7.0',
                        },
                        {
                            trialDeckId: '11',
                            userName: 'taro',
                            ind: '12',
                            deckInd: '13',
                            pairInd: '14',
                            posInd: '15',
                            deckElementId: '16',
                            memoSec: '17.0',
                        },
                    ],
                },
            };

            const expectedInstance1 = {
                trialDeckId: 1,
                userName: 'taro',
                ind: 2,
                deckInd: 3,
                pairInd: 4,
                posInd: 5,
                deckElementId: 6,
                memoSec: 7.0,
                elementId: 8,
            };

            const expectedInstance2 = {
                trialDeckId: 11,
                userName: 'taro',
                ind: 12,
                deckInd: 13,
                pairInd: 14,
                posInd: 15,
                deckElementId: 16,
                memoSec: 17.0,
                elementId: 18,
            };

            const expectedJson = {
                success: {
                    code: 200,
                    result: {
                        logs: [
                            expectedInstance1,
                            expectedInstance2,
                        ],
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

            const deckElementFindAllStub = sinon.stub(MemoDeckElement, 'findAll');
            deckElementFindAllStub.withArgs(
                {
                    attributes: [
                        [ 'deck_element_id', 'deckElementId', ],
                        [ 'element_id', 'elementId', ],
                    ],
                    where: {
                        deckElementId: [ 6, 16, ],
                    },
                    transaction: t,
                }
            ).returns(Promise.resolve([
                { deckElementId: 6, elementId: 8, },
                { deckElementId: 16, elementId: 18, },
            ]));
            deckElementFindAllStub.throws(new Error('unexpected argument for findAll()'));

            const memoLogMemorizationBulkCreateStub = sinon.stub(MemoLogMemorization, 'bulkCreate');
            memoLogMemorizationBulkCreateStub.withArgs([
                {
                    trialDeckId: 1,
                    userName: 'taro',
                    ind: 2,
                    deckInd: 3,
                    pairInd: 4,
                    posInd: 5,
                    deckElementId: 6,
                    memoSec: 7.0,
                    elementId: 8,
                },
                {
                    trialDeckId: 11,
                    userName: 'taro',
                    ind: 12,
                    deckInd: 13,
                    pairInd: 14,
                    posInd: 15,
                    deckElementId: 16,
                    memoSec: 17.0,
                    elementId: 18,
                },
            ], { transaction: t, }).returns(Promise.resolve([]));
            memoLogMemorizationBulkCreateStub.throws(new Error('unexpected argument for bulkCreate()'));

            // 呼ばれないはずなのでassert.fail()
            const next = (err) => {
                assert.fail(`next() was called: ${err}`);
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoLogMemorization.postProcess(req, res, next);
        });

        it('異常系: 自分以外のユーザの情報を登録しようとしたらエラー', () => {
            const req = {
                // 認証によって付与される
                decoded: {
                    userName: 'saburo',
                },
                body: {
                    logs: [
                        {
                            trialDeckId: '1',
                            userName: 'taro', // APIを叩くユーザと異なる名前
                            ind: '2',
                            deckInd: '3',
                            pairInd: '4',
                            posInd: '5',
                            deckElementId: '6',
                            memoSec: '7.0',
                        },
                        {
                            trialDeckId: '11',
                            userName: 'saburo',
                            ind: '12',
                            deckInd: '13',
                            pairInd: '14',
                            posInd: '15',
                            deckElementId: '16',
                            memoSec: '17.0',
                        },
                    ],
                },
            };

            const expectedJson = {
                error: {
                    message: 'Bad Request: invalid user name: taro != saburo',
                    code: 400,
                },
            };

            const expectedStatus = 400;

            // 中でres.jsonやres.statusが呼ばれる
            // 本来はそのresをexpressが使うが、今回はアサートする関数を渡すことでチェックしている
            const res = {
                json: (ansJson) => {
                    assert.deepStrictEqual(ansJson, expectedJson);
                },
                status: (status) => {
                    assert.deepStrictEqual(status, expectedStatus);
                    return {
                        // res.status(400).json(ansJson) のような場合
                        json: (ansJson) => {
                            assert.deepStrictEqual(ansJson, expectedJson);
                        },
                    };
                },
            };

            // 呼ばれないはずなのでassert.fail()
            const next = (err) => {
                assert.fail(`next() was called: ${err}`);
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoLogMemorization.postProcess(req, res, next);
        });
    });
});
