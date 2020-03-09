function dieRoll() {
    return Math.floor(Math.random() * 6 + 1);
}

function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

exports.dieRoll = dieRoll;
exports.choice = choice;