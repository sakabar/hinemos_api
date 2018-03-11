const assert = require('assert');
const utils = require('../../src/lib/utils');

describe('utils.js', () => {
    describe('getMoveType', () => {
        it('正常系: Lw\'2', () => {
            assert.equal(utils.getMoveType('Lw\'2'), 'Lw');
        });

        it('異常系: 入力が空の場合はエラー', () => {
            assert.throws(() => { utils.getMoveType('') }, Error);
        });

        it('異常系: 想定しているパターンに一致しない', () => {
            assert.throws(() => { utils.getMoveType('L L') }, Error);
        });
    });

    describe('getNumberOfOverlappedMoves', () => {
        it('正常系: setupなし', () => {
            const setupArr = [];
            const move1Arr = ['U'];
            const move2Arr = ['R', 'D', 'R\''];
            const expected = 0;
            const actual = utils.getNumberOfOverlappedMoves(setupArr, move1Arr, move2Arr);
            assert.equal(actual, expected);
        });

        it('正常系: setupとmove1で重複', () => {
            const setupArr = ['R'];
            const move1Arr = ['R', 'D', 'R\''];
            const move2Arr = ['U'];
            const expected = 1;
            const actual = utils.getNumberOfOverlappedMoves(setupArr, move1Arr, move2Arr);
            assert.equal(actual, expected);
        });

        it('正常系: setupとmove2で重複', () => {
            const setupArr = ['R'];
            const move1Arr = ['U'];
            const move2Arr = ['R', 'D', 'R\''];
            const expected = 1;
            const actual = utils.getNumberOfOverlappedMoves(setupArr, move1Arr, move2Arr);
            assert.equal(actual, expected);
        });
    });

    describe('getNumberOfMoves', () => {
        it('正常系: setupなし', () => {
            const setup = '';
            const move1 = 'U';
            const move2 = 'R D R\'';
            const expected = 8;
            const actual = utils.getNumberOfMoves(setup, move1, move2);
            assert.equal(actual, expected);
        });

        it('正常系: setupとmove1で重複', () => {
            const setup = 'R';
            const move1 = 'R D R\'';
            const move2 = 'U';
            const expected = 9;
            const actual = utils.getNumberOfMoves(setup, move1, move2);
            assert.equal(actual, expected);
        });

        it('正常系: setupとmove2で重複', () => {
            const setup = 'R';
            const move1 = 'U';
            const move2 = 'R D R\'';
            const expected = 9;
            const actual = utils.getNumberOfMoves(setup, move1, move2);
            assert.equal(actual, expected);
        });

        it('正常系: setupのみ', () => {
            const setup = 'D Rw2 U R U\' Rw2 D R\' D2';
            const move1 = '';
            const move2 = '';
            const expected = 9;
            const actual = utils.getNumberOfMoves(setup, move1, move2);
            assert.equal(actual, expected);
        });
    });
});

