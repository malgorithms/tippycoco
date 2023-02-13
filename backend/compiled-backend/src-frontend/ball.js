"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ball = void 0;
const circular_object_1 = require("./circular-object");
const tweakables_1 = __importDefault(require("./tweakables"));
const utils_1 = require("./utils");
class Ball {
    physics;
    maxSpeed;
    bounceSoundName;
    textureName;
    constructor(o) {
        this.physics = new circular_object_1.CircularObject({
            center: o.center,
            vel: o.vel,
            diameter: o.diameter,
            density: o.density,
            orientation: o.orientation,
            angularVel: o.angularVel,
            gravityMultiplier: 1,
            canSpin: true,
            bumpOffFrictionPoints: tweakables_1.default.physics.ballBumpOffFrictionPoints,
            spinElasticityOffFrictionPoints: tweakables_1.default.physics.ballSpinElasticityOffFrictionPoints,
        });
        this.bounceSoundName = o.bounceSoundName ?? 'bounce';
        this.textureName = o.textureName;
        this.maxSpeed = o.maxSpeed;
    }
    get bounceOffFlowerSoundName() {
        if (this.bounceSoundName !== 'bounce')
            return this.bounceSoundName;
        return 'bounceFlower';
    }
    deepCopy() {
        return new Ball({
            center: this.physics.center,
            vel: this.physics.vel,
            diameter: this.physics.diameter,
            density: this.physics.density,
            maxSpeed: this.maxSpeed,
            orientation: this.physics.orientation,
            angularVel: this.physics.angularVel,
            bounceSoundName: this.bounceSoundName,
            textureName: this.textureName,
        });
    }
    trimSpeedIfNecessary() {
        const v = this.physics.vel;
        if (utils_1.vec.lenSq(v) > this.maxSpeed * this.maxSpeed) {
            this.physics.vel = utils_1.vec.scale(utils_1.vec.normalized(v), this.maxSpeed);
        }
    }
    stepVelocity(dt, extraMult, trimSpeedIfNecessary) {
        this.physics.vel.y += dt * this.physics.gravityY * extraMult;
        if (trimSpeedIfNecessary)
            this.trimSpeedIfNecessary();
        this.physics.angularVel -= this.physics.angularVel * dt * tweakables_1.default.physics.ballAngularFriction;
    }
    stepPositionAndOrientation(dt) {
        const centerShift = utils_1.vec.scale(this.physics.vel, dt);
        this.physics.center = utils_1.vec.add(this.physics.center, centerShift);
        this.physics.orientation += dt * this.physics.angularVel;
    }
}
exports.Ball = Ball;
