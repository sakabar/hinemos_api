const assert = require('assert');
const memoScore = require('../../src/route/memoScore');
const { sequelize, } = require('../../src/model');
const path = require('path');
const sinon = require('sinon');

const MemoScore = sequelize.import(path.join(__dirname, '../../src/model/memoScore'));

process.on('unhandledRejection', console.dir);

describe('route/memoScore.js', () => {
    describe('getProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('異常系: 名前が違う', () => {
            const req = {
                decoded: {
                    userName: 'taro',
                },
                query: {
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
            return memoScore.getProcess(req, res, next);
        });
    });

    describe('postProcess()', () => {
        afterEach(() => {
            sinon.restore();
        });

        it('正常系:全てのパラメータあり', () => {
            const req = {
                body: {
                    trialId: '1',
                    totalMemoSec: '123.4',

                    successDeckNum: '2',
                    triedDeckNum: '3',
                    allDeckNum: '4',

                    successElementNum: '50',
                    triedElementNum: '90',
                    allElementNum: '100',
                },
            };

            const params = {
                trialId: 1,
                totalMemoSec: 123.4,

                successDeckNum: 2,
                triedDeckNum: 3,
                triedDeckAcc: 2 / 3.0,
                allDeckNum: 4,
                allDeckAcc: 0.5,

                successElementNum: 50,
                triedElementNum: 90,
                triedElementAcc: 50 / 90.0,
                allElementNum: 100,
                allElementAcc: 0.5,
            };

            const expectedJson = {
                success: {
                    code: 200,
                    result: {
                        score: {
                            memoScoreId: 99,
                            ...params,
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

            const memoScoreCreateStub = sinon.stub(MemoScore, 'create');
            memoScoreCreateStub.withArgs(
                {
                    ...params,
                }).returns(Promise.resolve({ memoScoreId: 99, ...params, }));
            memoScoreCreateStub.throws(new Error('unexpected argument'));

            // 呼ばれないはずなのでassert.fail()
            const next = (err) => {
                assert.fail(`next() was called : ${err}`);
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoScore.postProcess(req, res, next);
        });

        it('正常系:空文字のパラメータあり', () => {
            const req = {
                body: {
                    trialId: '1',
                    totalMemoSec: '123.4',

                    successDeckNum: '',
                    triedDeckNum: '3',
                    allDeckNum: '4',

                    successElementNum: '',
                    triedElementNum: '90',
                    allElementNum: '100',
                },
            };

            const params = {
                trialId: 1,
                totalMemoSec: 123.4,

                successDeckNum: null,
                triedDeckNum: 3,
                triedDeckAcc: null,
                allDeckNum: 4,
                allDeckAcc: null,

                successElementNum: null,
                triedElementNum: 90,
                triedElementAcc: null,
                allElementNum: 100,
                allElementAcc: null,
            };

            const expectedJson = {
                success: {
                    code: 200,
                    result: {
                        score: {
                            memoScoreId: 99,
                            ...params,
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

            const memoScoreCreateStub = sinon.stub(MemoScore, 'create');
            memoScoreCreateStub.withArgs(
                {
                    ...params,
                }).returns(Promise.resolve({ memoScoreId: 99, ...params, }));
            memoScoreCreateStub.throws(new Error('unexpected argument'));

            // 呼ばれないはずなのでassert.fail()
            const next = (err) => {
                assert.fail(`next() was called : ${err}`);
            };

            // returnすることで、mochaがPromiseを実際に解決してくれて、
            // 内部のアサートが機能する
            return memoScore.postProcess(req, res, next);
        });
    });
});
