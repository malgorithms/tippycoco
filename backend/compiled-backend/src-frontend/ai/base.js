"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiBase = void 0;
const future_prediction_1 = require("../future-prediction");
const tweakables_1 = __importDefault(require("../tweakables"));
const types_1 = require("../types");
class AiBase {
    _lastMoveLeft;
    _lastMoveRight;
    _lastJump;
    _game;
    constructor(game) {
        this._lastMoveLeft = 0;
        this._lastMoveRight = 0;
        this._lastJump = 0;
        this._game = game;
    }
    /**
     * if you want weird eyes, like a different number of them,
     * or have them different size pupils or something, override this in your
     * inherited class
     */
    get eyes() {
        return tweakables_1.default.player.defaultEyes;
    }
    /**
     * @returns milliseconds since I've last jumped, or Infinity if never
     */
    msSinceMyLastJump(o) {
        return this._lastJump ? o.gameTime.totalGameTime.totalMilliseconds - this._lastJump : Infinity;
    }
    /**
     * @returns milliseconds since I've last moved left, or Infinity if never
     */
    msSinceMyLastMoveLeft(o) {
        return this._lastMoveLeft ? o.gameTime.totalGameTime.totalMilliseconds - this._lastMoveLeft : Infinity;
    }
    /**
     * @returns milliseconds since I've last moved right, or Infinity if never
     */
    msSinceMyLastMoveRight(o) {
        return this._lastMoveRight ? o.gameTime.totalGameTime.totalMilliseconds - this._lastMoveRight : Infinity;
    }
    getNextBallEnteringMyJumpRange(o) {
        const myPlayerSide = o.me.playerSide;
        let result = (0, future_prediction_1.unknownState)();
        for (const pred of o.ballPredictions) {
            const lookup = pred.ballEnteringJumpRange(myPlayerSide);
            if (!lookup)
                throw new Error('failed to lookup');
            if (!result?.isKnown || lookup.time < result.time) {
                result = lookup;
            }
        }
        return this.futureStateToBall(result);
    }
    getNextBallHittingOnMySide(o) {
        return this.getNextBallHittingOnSide(o, o.me.playerSide);
    }
    getNextBallHittingOnSide(o, playerSide) {
        const net = o.net;
        const result = (0, future_prediction_1.unknownState)();
        const amLeft = playerSide === types_1.PlayerSide.Left;
        for (const p of o.ballPredictions) {
            const hittingGround = p.ballHittingGround;
            if ((amLeft && hittingGround.pos.x > net.center.x) || (!amLeft && hittingGround.pos.x < net.center.x)) {
                continue;
            }
            if (hittingGround.isKnown && hittingGround.time < result.time) {
                result.isKnown = true;
                result.time = hittingGround.time;
                result.pos = hittingGround.pos;
            }
        }
        return this.futureStateToBall(result);
    }
    // This is a bit prettier for writing the inherited classes, since
    // there is no nonsense data when nothing known
    futureStateToBall(fs) {
        if (fs.isKnown)
            return { pos: fs.pos, time: fs.time };
        return null;
    }
    goToSize(o, fractionOfWayFromSmallToLarge) {
        const gameTime = o.gameTime;
        const me = o.me;
        const dt = gameTime.elapsedGameTime.totalMilliseconds / 1000;
        const minD = tweakables_1.default.player.minDiameter;
        const maxD = tweakables_1.default.player.maxDiameter;
        const targetSize = minD + fractionOfWayFromSmallToLarge * (maxD - minD);
        if (me.physics.diameter < targetSize)
            me.grow(dt, tweakables_1.default.player.growSpeed);
        else if (me.physics.diameter > targetSize)
            me.grow(dt, -tweakables_1.default.player.growSpeed);
    }
    playSound(soundName, volume, pitch, pan) {
        this._game.sound.play(soundName, volume, pitch, pan, false);
    }
    get kapow() {
        return this._game.kapow;
    }
    isBallInPlayYet(o) {
        return o.accumulatedPointSeconds > 0.5;
    }
    moveLeft(o) {
        if (this.isBallInPlayYet(o)) {
            this._lastMoveLeft = o.gameTime.totalGameTime.totalMilliseconds;
            o.me.moveLeft();
        }
    }
    moveRight(o) {
        if (this.isBallInPlayYet(o)) {
            this._lastMoveRight = o.gameTime.totalGameTime.totalMilliseconds;
            o.me.moveRight();
        }
    }
    amIAboveTheNet(o) {
        const px = o.me.physics.center.x;
        const net = o.net;
        return px > net.center.x - net.width / 2 && px < net.center.x + net.width / 2;
    }
    amIOnTheWrongSide(o) {
        const net = o.net;
        const px = o.me.physics.center.x;
        if (o.me.playerSide === types_1.PlayerSide.Left)
            return px > net.center.x + net.width / 2;
        else
            return px < net.center.x - net.width / 2;
    }
    /**
     *
     * @param o
     * @param fractionOfMaxVelocity - -1...1 how close to max speed
     */
    moveRationally(o, fractionOfMaxVelocity) {
        if (this.isBallInPlayYet(o)) {
            if (fractionOfMaxVelocity < 0)
                this._lastMoveLeft = o.gameTime.totalGameTime.totalMilliseconds;
            else if (fractionOfMaxVelocity > 0)
                this._lastMoveRight = o.gameTime.totalGameTime.totalMilliseconds;
            o.me.moveRationally(fractionOfMaxVelocity);
        }
    }
    /**
     * stop moving left/right
     */
    stopMoving(o) {
        o.me.moveRationally(0);
    }
    /**
     * jumps but only if you're in position to
     * @param gameTime for storing when you last jumped
     * @param me myself
     */
    jumpIfPossible(o) {
        if (this.isBallInPlayYet(o)) {
            this._lastJump = o.gameTime.totalGameTime.totalMilliseconds;
            return o.me.jump();
        }
        return false;
    }
    isInJumpingPosition(player) {
        return player.isInJumpPosition;
    }
    /**
     * this goto tries to be a little smoother, acting with rational speed as it's close to it's destination
     */
    tryToGetToX(o, x, sec, reactionTimeMs) {
        if (sec <= 0)
            sec = 0.01;
        const cx = o.me.physics.center.x;
        const dx = x - cx;
        const speedNeeded = dx / sec;
        const speed = speedNeeded * 2; // we go faster than we need to
        let scale = speed / o.me.maxVel.x;
        if (scale > 1)
            scale = 1;
        if (scale < -1)
            scale = -1;
        if (scale > 0 && this.msSinceMyLastMoveLeft(o) > reactionTimeMs) {
            this.moveRationally(o, scale);
        }
        else if (scale < 0 && this.msSinceMyLastMoveRight(o) > reactionTimeMs) {
            this.moveRationally(o, scale);
        }
    }
}
exports.AiBase = AiBase;
