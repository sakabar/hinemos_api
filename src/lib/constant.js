const characterType = {
    hiragana: 'hiragana',
    alphabet: 'alphabet',
};

const partType = {
    corner: { value: 0, name: 'corner', japanese: 'コーナー', },
    edgeMiddle: { value: 1, name: 'edgeMiddle', japanese: 'ミドルエッジ', },
    edgeWing: { value: 2, name: 'edgeWing', japanese: 'ウイングエッジ', },
    centerX: { value: 3, name: 'centerX', japanese: 'Xセンター', },
    centerT: { value: 4, name: 'centerT', japanese: '+センター', },
};

const partTypeNames = Object.values(partType).map(obj => obj.name);

exports.characterType = characterType;
exports.partType = partType;
exports.partTypeNames = partTypeNames;
