"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unknownState = exports.FuturePrediction = void 0;
const types_1 = require("./types");
const unknownState = () => ({
    pos: { x: Infinity, y: Infinity },
    time: Infinity,
    isKnown: false,
});
exports.unknownState = unknownState;
class FuturePrediction {
    ballStates = new Array();
    ballHittingGround = unknownState();
    ballCrossingNet = unknownState();
    ballEnteringPlayerJumpRange = new Map([
        [types_1.PlayerSide.Left, unknownState()],
        [types_1.PlayerSide.Right, unknownState()],
    ]);
    ballEnteringJumpRange(playerSide) {
        const res = this.ballEnteringPlayerJumpRange.get(playerSide);
        if (!res)
            throw new Error(`Could not check jump range for ${playerSide}`);
        return res;
    }
    setBallEnteringJumpRange(playerSide, futureState) {
        this.ballEnteringPlayerJumpRange.set(playerSide, futureState);
    }
}
exports.FuturePrediction = FuturePrediction;
