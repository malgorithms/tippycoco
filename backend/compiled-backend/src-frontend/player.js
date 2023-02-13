"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = exports.PlayerSpecies = void 0;
const circular_object_1 = require("./circular-object");
const tweakables_1 = __importDefault(require("./tweakables"));
const types_1 = require("./types");
Object.defineProperty(exports, "PlayerSpecies", { enumerable: true, get: function () { return types_1.PlayerSpecies; } });
const utils_1 = require("./utils");
class Player {
    xSpringConstant;
    species;
    playerSide;
    ai;
    physics;
    targetXVel; // desired speed, accelerates towards
    _jumpCount = 0;
    _isInJumpPosition = false;
    _isInDashPosition = false;
    _isDashing = false;
    maxVelAtSmallest;
    maxVelAtLargest;
    constructor(o) {
        this.physics = new circular_object_1.CircularObject({
            center: utils_1.vec.zero(),
            vel: utils_1.vec.zero(),
            diameter: o.diameter,
            density: o.density,
            orientation: 0,
            angularVel: 0,
            gravityMultiplier: o.gravityMultiplier,
            canSpin: false,
            spinElasticityOffFrictionPoints: 0,
            bumpOffFrictionPoints: 0,
        });
        this.playerSide = o.playerSide;
        this.maxVelAtLargest = o.maxVelAtLargest;
        this.maxVelAtSmallest = o.maxVelAtSmallest;
        this.targetXVel = o.targetXVel;
        this.xSpringConstant = o.xSpringConstant;
        this.species = o.species;
        this.ai = o.ai;
    }
    get textureName() {
        if (this.ai)
            return this.ai.textureName;
        else
            return this.playerSide === types_1.PlayerSide.Left ? 'redPlayer' : 'bluePlayer';
    }
    get jumpCount() {
        return this._jumpCount;
    }
    get isInJumpPosition() {
        return this._isInJumpPosition;
    }
    setIsInJumpPosition(canJump) {
        this._isInJumpPosition = canJump;
    }
    get canDashNow() {
        return this._isInDashPosition && !this.isDashing;
    }
    get isDashing() {
        return this._isDashing;
    }
    setIsInDashPosition(canDash) {
        this._isInDashPosition = canDash;
    }
    deepCopy() {
        const sp = new Player({
            maxVelAtSmallest: utils_1.vec.copy(this.maxVelAtSmallest),
            maxVelAtLargest: utils_1.vec.copy(this.maxVelAtLargest),
            diameter: this.physics.diameter,
            density: this.physics.density,
            xSpringConstant: this.xSpringConstant,
            gravityMultiplier: this.physics.gravityMultiplier,
            targetXVel: this.targetXVel,
            species: this.species,
            ai: this.ai,
            playerSide: this.playerSide,
        });
        sp.physics.center = utils_1.vec.copy(this.physics.center);
        sp.physics.vel = utils_1.vec.copy(this.physics.vel);
        sp.physics.orientation = this.physics.orientation;
        sp.physics.angularVel = this.physics.angularVel;
        sp._jumpCount = this._jumpCount;
        return sp;
    }
    get jumpSpeed() {
        return this.maxVel.y;
    }
    get maxVel() {
        const tP = tweakables_1.default.player;
        const phys = this.physics;
        const sizeFrac = (phys.diameter - tP.minDiameter) / (tP.maxDiameter - tP.minDiameter);
        const x = this.maxVelAtLargest.x + (this.maxVelAtSmallest.x - this.maxVelAtLargest.x) * (1 - sizeFrac);
        const y = this.maxVelAtLargest.y + (this.maxVelAtSmallest.y - this.maxVelAtLargest.y) * (1 - sizeFrac);
        return { x, y };
    }
    jump() {
        if (this.isInJumpPosition) {
            this._jumpCount++;
            this.physics.vel.y = this.jumpSpeed;
            return true;
        }
        return false;
    }
    dash(dir) {
        console.log('player::dash', this._isDashing);
        if (this.canDashNow) {
            this._isDashing = true;
            this.physics.density = 234;
            console.log('player::dash - YES');
            this._jumpCount++;
            const dirNormalized = utils_1.vec.normalized(dir);
            const speed = tweakables_1.default.player.dashMult * Math.max(this.maxVel.x, this.maxVel.y);
            this.physics.vel.x += dirNormalized.x * speed;
            this.physics.vel.y += dirNormalized.y * speed;
        }
    }
    grow(dt, vel) {
        const tP = tweakables_1.default.player;
        const phys = this.physics;
        phys.diameter += vel * dt;
        if (phys.diameter < tP.minDiameter)
            phys.diameter = tP.minDiameter;
        if (phys.diameter > tP.maxDiameter)
            phys.diameter = tP.maxDiameter;
    }
    moveRight() {
        this.targetXVel = this.maxVel.x;
    }
    moveLeft() {
        this.targetXVel = -this.maxVel.x;
    }
    moveRationally(fractionOfMaxVelocity) {
        this.targetXVel = this.maxVel.x * fractionOfMaxVelocity;
    }
    stepPosition(dt) {
        this.physics.center = utils_1.vec.add(this.physics.center, utils_1.vec.scale(this.physics.vel, dt));
    }
    stepVelocity(dt) {
        const idealVx = this.targetXVel;
        const difference = idealVx - this.physics.vel.x;
        this.physics.vel = utils_1.vec.add(this.physics.vel, { x: difference * dt * this.xSpringConstant, y: 0 });
        // gravity
        this.physics.vel.y += dt * this.physics.gravityY;
        if (utils_1.vec.lenSq(this.physics.vel) < this.maxVel.x) {
            this._isDashing = false;
        }
    }
    isOnHeight(height) {
        return this.physics.center.y <= height + tweakables_1.default.proximityTolerance;
    }
    isOnPlayer(opponent) {
        // Jump off opponent! Are you serious?! Yes.
        const diff = utils_1.vec.sub(this.physics.center, opponent.physics.center);
        const distance = utils_1.vec.len(diff);
        if (distance < this.physics.diameter / 2 + opponent.physics.diameter / 2 + tweakables_1.default.proximityTolerance) {
            // Only if above opponent
            if (this.physics.center.y > opponent.physics.center.y) {
                return true;
            }
        }
        return false;
    }
    isOnRectangle(obstacle) {
        // top-left corner
        const netTopLeftCorner = { x: obstacle.center.x - obstacle.width / 2, y: obstacle.center.y + obstacle.height / 2 };
        const distToNetTopLeft = utils_1.vec.len(utils_1.vec.sub(netTopLeftCorner, this.physics.center));
        if (distToNetTopLeft <= this.physics.diameter / 2 + tweakables_1.default.proximityTolerance) {
            return true;
        }
        // top-right corner
        const netTopRightCorner = { x: obstacle.center.x + obstacle.width / 2, y: obstacle.center.y + obstacle.height / 2 };
        const distToNetTopRight = utils_1.vec.len(utils_1.vec.sub(netTopRightCorner, this.physics.center));
        if (distToNetTopRight <= this.physics.diameter / 2 + tweakables_1.default.proximityTolerance) {
            return true;
        }
        // top of it
        if (this.physics.center.x > obstacle.center.x - obstacle.width / 2 && this.physics.center.x < obstacle.center.x + obstacle.width / 2) {
            const jumpHeight = obstacle.center.y + obstacle.height / 2 + this.physics.diameter / 2;
            if (this.isOnHeight(jumpHeight)) {
                return true;
            }
        }
        return false;
    }
    getMaxJumpHeight() {
        return (this.maxVel.y * this.maxVel.y) / (2 * Math.abs(this.physics.gravityY));
    }
    getTimeToJumpToHeight(height) {
        // y = y0 + v0t + 0.5at^2
        // y = 0 + vt + 0.5gt^2
        // 0.5gt^2 + vt - y = 0
        // (-v +- sqrt(v*v+2yg) ) / (g)
        const g = this.physics.gravityY;
        const v = this.maxVel.y;
        if (v * v + 2 * height * g < 0)
            return Infinity;
        else {
            const answer1 = (-v + Math.sqrt(v * v + 2 * height * g)) / g;
            const answer2 = (-v - Math.sqrt(v * v + 2 * height * g)) / g;
            if (answer1 > 0 && answer2 > 0 && answer1 < answer2)
                return answer1;
            else if (answer1 > 0 && answer2 > 0 && answer2 < answer1)
                return answer2;
            else if (answer2 > 0)
                return answer2;
            else if (answer1 > 0)
                return answer1;
            else
                return Infinity;
        }
    }
    /**
     *
     * @returns how long the player will stay in the air on a normal jump
     */
    getMyJumpTime = () => {
        // x = x0 + v0*t + 0.5at^2
        // 0 = 0 + v0t + 0.5at^2
        // 0 = v0 + 0.5at
        // -v0 = 0.5at
        // -2 * v0 / a = t
        return (-2 * this.jumpSpeed) / this.physics.gravityY;
    };
}
exports.Player = Player;
