// "Lw'2 => Lw"
const getMoveType = (moveStr) => {
    if (!moveStr) {
        throw new Error('Error: 入力が空です');
    }

    const m = moveStr.match(/^([A-Za-z]+)'?2?$/);
    if (m) {
        return m[1];
    } else {
        throw new Error('Error: パターンが一致しません。');
    }
};

const getNumberOfOverlappedMoves = (setupArr, move1Arr, move2Arr) => {
    let ans = 0;

    const setupLn = setupArr.length;
    const move1Ln = move2Arr.length;
    const move2Ln = move2Arr.length;

    // セットアップの最後とmove1の最初のキャンセル
    if (setupLn !== 0 && move1Ln !== 0 && getMoveType(setupArr[setupLn - 1]) === getMoveType(move1Arr[0])) {
        ans += 1;
    }

    // move2の逆手順の最後と逆セットアップのキャンセル
    if (setupLn !== 0 && move2Ln !== 0 && getMoveType(move2Arr[move2Ln - 1]) === getMoveType(setupArr[setupLn - 1])) {
        ans += 1;
    }

    return ans;
};

const getNumberOfMoves = (setup, move1, move2) => {
    const rotateNotaions = [ 'x', 'x\'', 'y', 'y\'', 'z', 'z\'', ];

    const setupArr = setup.split(' ').filter(x => x).filter(x => !rotateNotaions.includes(x));
    const setupLn = setupArr.length;

    const move1Arr = move1.split(' ').filter(x => x).filter(x => !rotateNotaions.includes(x));
    const move1Ln = move1Arr.length;

    const move2Arr = move2.split(' ').filter(x => x).filter(x => !rotateNotaions.includes(x));
    const move2Ln = move2Arr.length;

    const overlapped = getNumberOfOverlappedMoves(setupArr, move1Arr, move2Arr);
    let numberOfMoves = 0;
    if (move1Ln === 0 && move2Ln === 0) {
        // Cyclic Shiftなどの特殊な場合
        numberOfMoves = setupLn;
    } else {
        numberOfMoves = (setupLn + move1Ln + move2Ln) * 2 - overlapped;
    }

    return numberOfMoves;
};

exports.getMoveType = getMoveType;
exports.getNumberOfOverlappedMoves = getNumberOfOverlappedMoves;
exports.getNumberOfMoves = getNumberOfMoves;
