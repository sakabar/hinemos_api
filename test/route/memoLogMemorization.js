const assert = require('assert');
const memoLogMemorization = require('../../src/route/memoLogMemorization');
const { sequelize, } = require('../../src/model');
const path = require('path');
const sinon = require('sinon');

// const MemoTrial = sequelize.import(path.join(__dirname, '../../src/model/memoTrial'));
// const MemoTrialDeck = sequelize.import(path.join(__dirname, '../../src/model/memoTrialDeck'));
const MemoDeckElement = sequelize.import(path.join(__dirname, '../../src/model/memoDeckElement'));
const MemoLogMemorization = sequelize.import(path.join(__dirname, '../../src/model/memoLogMemorization'));

// process.on('unhandledRejection', console.dir);

describe('route/memoLogMemorization.js', () => {
    describe('postProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('正常系', () => {
            const req = {
                body: {
                    trialDeckId: '1',
                    userName: 'taro',
                    ind: '2',
                    deckInd: '3',
                    pairInd: '4',
                    posInd: '5',
                    deckElementId: '6',
                    memoSec: '7.0',
                },
            };

            const expectedInstance = {
                memorizationLogId: 8,
                trialDeckId: 1,
                userName: 'taro',
                ind: 2,
                deckInd: 3,
                pairInd: 4,
                posInd: 5,
                deckElementId: 6,
                elementId: 9,
                memoSec: 7.0,
            };
            const expectedJson = {
                success: {
                    code: 200,
                    result: expectedInstance,
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
                        [ 'element_id', 'elementId', ],
                    ],
                    where: {
                        deckElementId: 6,
                    },
                    transaction: t,
                }
            ).returns(Promise.resolve([ { elementId: 9, }, ]));
            deckElementFindAllStub.throws(new Error('unexpected argument for findAll()'));

            const memoLogMemorizationCreateStub = sinon.stub(MemoLogMemorization, 'create');
            memoLogMemorizationCreateStub.withArgs(
                {
                    trialDeckId: 1,
                    userName: 'taro',
                    ind: 2,
                    deckInd: 3,
                    pairInd: 4,
                    posInd: 5,
                    deckElementId: 6,
                    elementId: 9,
                    memoSec: 7.0,
                }, { transaction: t, }).returns(Promise.resolve(expectedInstance));
            memoLogMemorizationCreateStub.throws(new Error('unexpected argument for create()'));

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
