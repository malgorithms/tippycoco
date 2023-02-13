"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._GreenAi = void 0;
const base_1 = require("./base");
const PREDICT_SEC = 0.8; // seconds in the future green will see
const REACTION_TIME_MS = 200; // I can't change wiggle direction faster than this
/**
 *  This AI serves as a good simple example how to write a TCFTG player.
 *  It's not too bright but the code is simple and clean.
 */
class GreenAi extends base_1.AiBase {
    constructor(game) {
        super(game);
    }
    /**
     * typically our players don't change their textures throughout a game,
     * but this is called on every draw to get the name of the texture to use,
     * in case you animate your texture.
     *
     * (see content-load-list.ts for all textures)
     */
    get textureName() {
        return 'greenPlayer';
    }
    /**
     * here we customize what background we want for sunny (not game point)
     * or dark (game point). Again, see content-load-list.ts for explanation
     */
    get skyTextureNames() {
        return {
            sunny: 'sunnyBackgroundGreen',
            dark: 'darkBackground',
        };
    }
    /**
     * `think` is the function you must implement in your AI. it takes a general
     * object `o` that has a bunch of game state. Your think function is called many
     * times per second. It doesn't return anything. Instead, you send movement
     * commands such as `this.jumpIfPossible(o)` or `this.moveLeft(o)`
     * @param o
     */
    think(o) {
        // I just jump sometimes
        if (o.accumulatedPointSeconds < 1)
            this.jumpIfPossible(o);
        // And hang out at 90% size
        this.goToSize(o, 0.9);
        // I try not to move otherwise during the first second of a point
        if (o.accumulatedPointSeconds < 1)
            return;
        // Ok, now I need a point of interest. First thing I look for is
        // a ball entering my jump range. If there isn't one coming, even worse,
        // maybe it is on its way to hit on my side.
        const target = this.getNextBallHittingOnMySide(o) || this.getNextBallEnteringMyJumpRange(o);
        if (!target) {
            this.moveRationally(o, 0.1); // let's just move right at 10% speed
            this.jumpIfPossible(o);
        }
        else {
            // I'll try to stay a bit to the right of the position
            target.pos.x += 0.1 * o.me.physics.diameter;
            if (target.time < PREDICT_SEC) {
                // Let's add some randomness for stupidity, but have that randomness a function of the
                // current time, so it's not flickering all over the place.
                const errMax = o.me.physics.radius;
                const err = errMax * Math.sin(o.gameTime.totalGameTime.totalSeconds);
                target.pos.x += o.balls[0].physics.diameter * err;
                target.pos.y += o.balls[0].physics.diameter * err;
                // At this point we know we have a state to watch
                // keep me on my side of net
                if (this.amIAboveTheNet(o) || this.amIOnTheWrongSide(o)) {
                    this.jumpIfPossible(o);
                    this.moveRight(o);
                }
                else {
                    // the base class has this helper that uses a rational move speed to
                    // try to get to a spot by a certain time.
                    this.tryToGetToX(o, target.pos.x, target.time, REACTION_TIME_MS);
                }
                // Remaining question is...do I jump? Let's be a bit "random" about it.
                const seconds = Math.floor(o.gameTime.totalGameTime.totalSeconds);
                const isOddSecond = seconds % 2;
                const timeErr = 0.1 * Math.sin(o.accumulatedPointSeconds);
                const timeTillJump = o.me.getTimeToJumpToHeight(target.pos.y) + timeErr;
                if (target.time < timeTillJump && isOddSecond)
                    this.jumpIfPossible(o);
            }
        }
    }
}
exports._GreenAi = GreenAi;
