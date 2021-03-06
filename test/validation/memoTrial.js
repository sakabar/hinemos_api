const memoTrialValidation = require('../../src/validation/memoTrial');
const assert = require('assert');
const { validationResult, } = require('express-validator');

describe('validation/memoTrial.js', () => {
    describe('postProcess()', () => {
        it('正常系', async () => {
            const req = {
                body: {
                    userName: 'taro',
                    event: 'mbld',
                    mode: 'memorization',
                    deckIds: [ '1', '2', ],
                },
            };

            for (const fn of memoTrialValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(true, errors.isEmpty());
        });

        it('異常系: userNameが空', async () => {
            const req = {
                body: {
                    // userName: 'taro',
                    event: 'mbld',
                    mode: 'memorization',
                    deckIds: [ '1', '2', ],
                },
            };

            for (const fn of memoTrialValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: userNameが空文字列', async () => {
            const req = {
                body: {
                    userName: '',
                    event: 'mbld',
                    mode: 'memorization',
                    deckIds: [ '1', '2', ],
                },
            };

            for (const fn of memoTrialValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: modeが空', async () => {
            const req = {
                body: {
                    userName: 'taro',
                    event: 'mbld',
                    // mode: 'memorization',
                    deckIds: [ '1', '2', ],
                },
            };

            for (const fn of memoTrialValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: deckIdsが無い', async () => {
            const req = {
                body: {
                    userName: 'taro',
                    event: 'mbld',
                    mode: 'memorization',
                },
            };

            for (const fn of memoTrialValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: deckIdsが長さゼロ', async () => {
            const req = {
                body: {
                    userName: 'taro',
                    event: 'mbld',
                    mode: 'memorization',
                    deckIds: [],
                },
            };

            for (const fn of memoTrialValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });
    });
});
