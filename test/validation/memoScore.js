const memoScoreValidation = require('../../src/validation/memoScore');
const assert = require('assert');
const { validationResult, } = require('express-validator');

describe('validation/memoScore.js', () => {
    describe('getProcess()', () => {
        it('正常系', async () => {
            const req = {
                body: {
                    userName: 'taro',
                },
            };

            for (const fn of memoScoreValidation.getProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(true, errors.isEmpty());
        });

        it('異常系: userNameがない', async () => {
            const req = {
                body: {
                    // userName: 'taro',
                },
            };

            for (const fn of memoScoreValidation.getProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: userNameが空文字列', async () => {
            const req = {
                body: {
                    userName: '',
                },
            };

            for (const fn of memoScoreValidation.getProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });
    });

    describe('postProcess()', () => {
        it('正常系:全てのパラメータあり', async () => {
            const req = {
                body: {
                    trialId: '1',
                    totalMemoSec: '123.4',

                    successDeckNum: '1',
                    triedDeckNum: '2',
                    allDeckNum: '2',

                    successElementNum: '50',
                    triedElementNum: '100',
                    allElementNum: '100',

                },
            };

            for (const fn of memoScoreValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(true, errors.isEmpty());
        });

        it('正常系: successDeckNum, successElementNumが空文字でもOK', async () => {
            const req = {
                body: {
                    trialId: '1',
                    totalMemoSec: '123.4',

                    successDeckNum: '',
                    triedDeckNum: '2',
                    allDeckNum: '2',

                    successElementNum: '',
                    triedElementNum: '100',
                    allElementNum: '100',
                },
            };

            for (const fn of memoScoreValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(true, errors.isEmpty());
        });

        it('異常系: successDeckNumが空', async () => {
            const req = {
                body: {
                    trialId: '1',
                    totalMemoSec: '123.4',

                    // successDeckNum: '',
                    triedDeckNum: '2',
                    allDeckNum: '2',

                    successElementNum: '',
                    triedElementNum: '100',
                    allElementNum: '100',
                },
            };

            for (const fn of memoScoreValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: successElementNumが空', async () => {
            const req = {
                body: {
                    trialId: '1',
                    totalMemoSec: '123.4',

                    successDeckNum: '',
                    triedDeckNum: '2',
                    allDeckNum: '2',

                    // successElementNum: '',
                    triedElementNum: '100',
                    allElementNum: '100',
                },
            };

            for (const fn of memoScoreValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });
    });
});
