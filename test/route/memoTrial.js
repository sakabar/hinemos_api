const assert = require('assert');
const memoTrial = require('../../src/route/memoTrial');
const { sequelize, } = require('../../src/model');
const path = require('path');
const sinon = require('sinon');

const MemoTrial = sequelize.import(path.join(__dirname, '../../src/model/memoTrial'));
const MemoTrialDeck = sequelize.import(path.join(__dirname, '../../src/model/memoTrialDeck'));

process.on('unhandledRejection', console.dir);

describe('route/memoTrial.js', () => {
    describe('postProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('正常系', () => {
            const userName = 'taro';
            const event = 'mbld';
            const mode = 'transformation';

            const req = {
                decoded: {
                    userName,
                },
                body: {
                    userName,
                    event,
                    mode,
                    deckIds: [ '1', '2', ],
                },
            };

            const expectedJson = {
                success: {
                    code: 200,
                    result: {
                        trialId: 99,
                        trialDeckIds: [ 101, 102, ],
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

            const memoTrialCreateStub = sinon.stub(MemoTrial, 'create');
            memoTrialCreateStub.withArgs(
                {
                    userName,
                    event,
                    mode,
                }, { transaction: t, }).returns(Promise.resolve({ trialId: 99, userName, event, mode, }));
            memoTrialCreateStub.throws(new Error('unexpected argument'));

            const memoTrialDeckBulkCreateStub = sinon.stub(MemoTrialDeck, 'bulkCreate');
            memoTrialDeckBulkCreateStub.withArgs(
                [
                    {
                        trialId: 99,
                        ind: 0,
                        deckId: 1,
                    },
                    {
                        trialId: 99,
                        ind: 1,
                        deckId: 2,
                    },
                ], { transaction: t, }).returns(new Promise((resolve) => resolve([])));
            memoTrialDeckBulkCreateStub.throws(new Error('unexpected arg'));

            const memoTrialDeckFindallStub = sinon.stub(MemoTrialDeck, 'findAll');
            memoTrialDeckFindallStub.withArgs({
                attributes: [
                    [ 'trial_deck_id', 'trialDeckId', ],
                ],
                where: {
                    trialId: 99,
                },
                order: [
                    [ 'ind', 'ASC', ],
                ],
                transaction: t,
            }).returns(
                Promise.resolve([
                    { trialDeckId: 101, },
                    { trialDeckId: 102, },
                ])
            );
            memoTrialDeckFindallStub.returns(Promise.resolve([]));

            // 呼ばれないはずなのでassert.fail()
            const next = () => {
                assert.fail('next() was called.');
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoTrial.postProcess(req, res, next);
        });

        it('異常系: 自分以外のユーザのデータを追加しようとするとエラー', () => {
            const userName = 'taro';
            const event = 'mbld';
            const mode = 'transformation';

            const req = {
                decoded: {
                    userName,
                },
                body: {
                    userName: 'saburo',
                    event,
                    mode,
                    deckIds: [ '1', '2', ],
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
                assert.fail(`next() was called: ${err}`);
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoTrial.postProcess(req, res, next);
        });
    });
});
