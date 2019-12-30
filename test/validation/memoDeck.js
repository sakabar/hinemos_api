const memoDeckValidation = require('../../src/validation/memoDeck');
const assert = require('assert');
const { validationResult, } = require('express-validator');

describe('validation/memoDeck.js', () => {
    describe('postProcess()', () => {
        it('正常系', async () => {
            const req = {
                body: {
                    elementIdsList: [
                        [ 1, 2, ],
                        [ 3, 4, 5, ],
                    ],
                },
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(true, errors.isEmpty());
        });

        it('異常系: elementIdsListというキーが存在しない', async () => {
            const req = {
                body: {},
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: elementIdsListがnull', async () => {
            const req = {
                body: {
                    elementIdsList: null,
                },
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: elementIdsListがundefined', async () => {
            const req = {
                body: {
                    elementIdsList: undefined,
                },
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: elementIdsListがリストではない', async () => {
            const req = {
                body: {
                    elementIdsList: 42,
                },
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: elementIdsListがリストのリストではない', async () => {
            const req = {
                body: {
                    elementIdsList: [ 42, ],
                },
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });

        it('異常系: elementIdsList: [[]]', async () => {
            const req = {
                body: {
                    elementIdsList: [ 42, ],
                },
            };

            for (const fn of memoDeckValidation.postProcess) {
                await fn(req, {}, () => {});
            }
            const errors = validationResult(req);
            assert.deepStrictEqual(false, errors.isEmpty());
        });
    });
});
