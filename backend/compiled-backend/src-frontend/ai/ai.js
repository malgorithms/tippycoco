"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiToNickname = exports.aiNames = exports.aiToName = exports.ais = void 0;
const black_ai_1 = require("./black-ai");
const orange_ai_1 = require("./orange-ai");
const green_ai_1 = require("./green-ai");
const purple_ai_1 = require("./purple-ai");
const white_ai_1 = require("./white-ai");
const yellow_ai_1 = require("./yellow-ai");
const gray_ai_1 = require("./gray-ai");
const ais = {
    Green: green_ai_1._GreenAi,
    Black: black_ai_1._BlackAi,
    White: white_ai_1._WhiteAi,
    Purple: purple_ai_1._PurpleAi,
    Orange: orange_ai_1._OrangeAi,
    Yellow: yellow_ai_1._YellowAi,
    Gray: gray_ai_1._GrayAi,
};
exports.ais = ais;
const aiNicknames = {
    Green: 'Groon',
    Black: 'Black Tie',
    White: 'Skarball',
    Purple: 'Pinky Woo',
    Orange: 'The Juice',
    Yellow: 'Lemonae',
    Gray: 'Tippy Coco',
};
const aiNames = Object.keys(ais);
exports.aiNames = aiNames;
function aiToName(ai) {
    for (const k in ais) {
        const name = k;
        if (ai instanceof ais[name] || ai === ais[name]) {
            return name;
        }
    }
    console.log(ai);
    throw new Error('Unknown Ai.');
}
exports.aiToName = aiToName;
function aiToNickname(ai) {
    if (typeof ai === 'string')
        return aiNicknames[ai];
    return aiNicknames[aiToName(ai)] || 'Unnamed Hero';
}
exports.aiToNickname = aiToNickname;
