"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircularObject = void 0;
const tweakables_1 = __importDefault(require("./tweakables"));
const utils_1 = require("./utils");
class CircularObject {
    center;
    vel;
    diameter;
    _angularVel;
    orientation;
    density;
    _gravityMultiplier;
    canSpin;
    spinElasticityOffFrictionPoints;
    bumpOffFrictionPoints;
    constructor(o) {
        this.center = utils_1.vec.copy(o.center);
        this._angularVel = o.angularVel;
        this.vel = utils_1.vec.copy(o.vel);
        this.diameter = o.diameter;
        this.orientation = o.orientation;
        this.density = o.density;
        this._gravityMultiplier = o.gravityMultiplier;
        this.canSpin = o.canSpin;
        this.bumpOffFrictionPoints = o.bumpOffFrictionPoints;
        this.spinElasticityOffFrictionPoints = o.spinElasticityOffFrictionPoints;
    }
    get gravityMultiplier() {
        return this._gravityMultiplier;
    }
    get gravityY() {
        return tweakables_1.default.gameGravity.y * this._gravityMultiplier;
    }
    get mass() {
        return this.area * this.density;
    }
    get area() {
        return Math.PI * this.radius * this.radius;
    }
    get radius() {
        return this.diameter / 2;
    }
    get angularVel() {
        if (!this.canSpin)
            return 0;
        return this._angularVel;
    }
    set angularVel(x) {
        const vMax = tweakables_1.default.physics.maxAngVel;
        if (!this.canSpin)
            this._angularVel = 0;
        else
            this._angularVel = Math.max(-vMax, Math.min(x, vMax));
    }
    distanceToRadians(dist) {
        return dist / this.radius;
    }
    /**
     * if passed the center of the circle, this would just return the velocity of the ball
     * but if passed something on the surface, say the top of the ball's location in world coords,
     * it would return the velocity of the ball + adjustment for angular speed of the point
     * on the ball there.
     * @param relPoint
     */
    getAtomVelocityAtWorldPoint(worldPoint, isSimulation) {
        if (worldPoint.x === this.center.x && worldPoint.y === this.center.y) {
            throw new Error(`Why are we calculating getAtomVelocity at circle's center?`);
        }
        else {
            const dP = utils_1.vec.sub(worldPoint, this.center);
            const normalTowardsPoint = utils_1.vec.normalized(dP);
            // this is the direction the point we're considering is heading, dur to the spin
            const dirDueToSpin = utils_1.vec.rotated90Ccw(normalTowardsPoint);
            const speedDueToSpin = this.angularVel * utils_1.vec.len(dP);
            const velDueToSpin = utils_1.vec.scale(dirDueToSpin, speedDueToSpin);
            const totalVel = utils_1.vec.add(velDueToSpin, this.vel);
            const totalSpeedInSpinDir = utils_1.vec.dotProduct(totalVel, dirDueToSpin);
            const totalAngularVel = this.distanceToRadians(totalSpeedInSpinDir);
            //if (!isSimulation) {
            //  console.log(`atom velocity:
            //            ball center: ${this.center.x.toFixed(3)},${this.center.y.toFixed(3)}
            //               ball vel: ${this.vel.x.toFixed(2)},${this.vel.y.toFixed(2)}
            //            ball angVel: ${this._angularVel}
            //            world point: ${worldPoint.x.toFixed(2)},${worldPoint.y.toFixed(2)}
            //              rel point: ${dP.x.toFixed(2)},${dP.y.toFixed(2)}
            //           velDueToSpin: ${velDueToSpin.x.toFixed(2)},${velDueToSpin.y.toFixed(2)}
            //           dirDueToSpin: ${dirDueToSpin.x.toFixed(2)},${dirDueToSpin.y.toFixed(2)}
            //               totalVel: ${totalVel.x.toFixed(2)},${totalVel.y.toFixed(2)}
            //    totalSpeedInSpinDir: ${totalSpeedInSpinDir.toFixed(2)}
            //        totalAngularVel: ${totalAngularVel.toFixed(2)}
            //  `)
            //}
            return {
                totalVel,
                totalAngularVel,
                totalSpeedInSpinDir,
                dirDueToSpin,
            };
        }
    }
    getBallMaxHeight(gravity) {
        const vy = this.vel.y;
        const py = this.center.y;
        const energyPermass = py * -gravity.y + (vy * vy) / 2;
        const maxHeight = energyPermass / -gravity.y;
        return maxHeight;
    }
    handleHittingOtherCircle(other, elasticity, isSimulation) {
        const result = {
            didCollide: false,
            angle: 0,
            pointOfContact: { x: Infinity, y: Infinity },
            c1MomentumDelta: { x: Infinity, y: Infinity },
            c2MomentumDelta: { x: Infinity, y: Infinity },
            c1EnergyDelta: Infinity,
            c2EnergyDelta: Infinity,
        };
        // Exit early if their rectangles don't overlap
        const thisRadius = this.radius;
        const otherRadius = other.radius;
        if (this.center.x + thisRadius < other.center.x - otherRadius ||
            this.center.x - thisRadius > other.center.x + otherRadius ||
            this.center.y + thisRadius < other.center.y - otherRadius ||
            this.center.y - thisRadius > other.center.y + otherRadius)
            return result;
        const ed = elasticity; // elasticity
        const displacement = utils_1.vec.sub(this.center, other.center);
        const distance = utils_1.vec.len(displacement);
        if (distance < this.radius + other.radius) {
            const a = utils_1.vec.scale(displacement, 1 / distance);
            const va1 = this.vel.x * a.x + this.vel.y * a.y;
            const vb1 = -this.vel.x * a.y + this.vel.y * a.x;
            const va2 = other.vel.x * a.x + other.vel.y * a.y;
            const vb2 = -other.vel.x * a.y + other.vel.y * a.x;
            const vaP1 = va1 + ((1 + ed) * (va2 - va1)) / (1 + this.mass / other.mass);
            const vaP2 = va2 + ((1 + ed) * (va1 - va2)) / (1 + other.mass / this.mass);
            const thisOldEnergy = 0.5 * this.mass * utils_1.vec.lenSq(this.vel);
            const otherOldEnergy = 0.5 * other.mass * utils_1.vec.lenSq(other.vel);
            const thisOldMomentum = utils_1.vec.scale(this.vel, this.mass);
            const otherOldMomentum = utils_1.vec.scale(other.vel, other.mass);
            const pointOfContact = { x: this.center.x - a.x * this.radius, y: this.center.y - a.y * this.radius };
            const thisSpinInfo = this.getAtomVelocityAtWorldPoint(pointOfContact, isSimulation);
            const otherSpinInfo = other.getAtomVelocityAtWorldPoint(pointOfContact, isSimulation);
            // we'll let them add spin to each other, but only if they're not really resting
            // on each other (rel speeds would be very low in that case)
            const relSpeed = utils_1.vec.len(utils_1.vec.sub(this.vel, other.vel));
            //if (!isSimulation) console.log(relSpeed)
            let thisSpinBounceLoss = { x: 0, y: 0 };
            let otherSpinBounceLoss = { x: 0, y: 0 };
            if (relSpeed > tweakables_1.default.physics.minRelSpeedToAllowBallSpins) {
                if (this.canSpin) {
                    const thisAngularVelDelta = tweakables_1.default.physics.ballOnBallFrictionSpin * thisSpinInfo.totalAngularVel;
                    this.angularVel -= thisAngularVelDelta;
                    const bounceScale = thisSpinInfo.totalSpeedInSpinDir * this.bumpOffFrictionPoints;
                    thisSpinBounceLoss = utils_1.vec.scale(thisSpinInfo.dirDueToSpin, bounceScale);
                }
                if (other.canSpin) {
                    const otherAngularVelDelta = tweakables_1.default.physics.ballOnBallFrictionSpin * otherSpinInfo.totalAngularVel;
                    other.angularVel -= otherAngularVelDelta;
                    const bounceScale = otherSpinInfo.totalSpeedInSpinDir * other.bumpOffFrictionPoints;
                    //if (!isSimulation) console.log('yo', otherSpinInfo.totalSpeedInSpinDir, other.spinBumpOffFrictionPoints, bounceScale)
                    otherSpinBounceLoss = utils_1.vec.scale(otherSpinInfo.dirDueToSpin, bounceScale);
                }
            }
            // ok, update their velocities
            this.vel.x = vaP1 * a.x - vb1 * a.y;
            this.vel.y = vaP1 * a.y + vb1 * a.x;
            other.vel.x = vaP2 * a.x - vb2 * a.y;
            other.vel.y = vaP2 * a.y + vb2 * a.x;
            // any spinBounceLoss
            this.vel.x -= thisSpinBounceLoss.x;
            this.vel.y -= thisSpinBounceLoss.y;
            other.vel.x -= otherSpinBounceLoss.x;
            other.vel.y -= otherSpinBounceLoss.y;
            const thisNewEnergy = 0.5 * this.mass * utils_1.vec.lenSq(this.vel);
            const otherNewEnergy = 0.5 * other.mass * utils_1.vec.lenSq(other.vel);
            const thisNewMomentum = utils_1.vec.scale(this.vel, this.mass);
            const otherNewMomentum = utils_1.vec.scale(other.vel, other.mass);
            // Finally, make sure displacement is at least radii.
            const appropriateSeparation = 1.0 * (this.radius + other.radius);
            if (distance < appropriateSeparation && this.mass > other.mass) {
                const toSub = utils_1.vec.scale(a, appropriateSeparation - distance);
                other.center = utils_1.vec.sub(other.center, toSub);
            }
            else if (distance < appropriateSeparation && this.mass <= other.mass) {
                const toAdd = utils_1.vec.scale(a, appropriateSeparation - distance);
                this.center = utils_1.vec.add(this.center, toAdd);
            }
            result.pointOfContact = utils_1.vec.add(other.center, utils_1.vec.scale(a, other.radius));
            result.angle = Math.atan2(a.y, a.x);
            result.c1EnergyDelta = thisNewEnergy - thisOldEnergy;
            result.c2EnergyDelta = otherNewEnergy - otherOldEnergy;
            result.c1MomentumDelta = utils_1.vec.sub(thisNewMomentum, thisOldMomentum);
            result.c2MomentumDelta = utils_1.vec.sub(otherNewMomentum, otherOldMomentum);
            result.didCollide = true;
            return result;
        }
        else {
            result.didCollide = false;
            return result;
        }
    }
    handleHittingPoint(point, elasticity, isSimulation) {
        const displacement = utils_1.vec.sub(point, this.center);
        const distance = utils_1.vec.len(displacement);
        if (distance < this.radius) {
            const displacementNormal = utils_1.vec.normalized(displacement);
            const velTowardCollision = utils_1.vec.scale(displacementNormal, utils_1.vec.dotProduct(this.vel, displacementNormal));
            const velPerpendicularToCollision = utils_1.vec.sub(this.vel, velTowardCollision);
            this.vel = utils_1.vec.add(velPerpendicularToCollision, utils_1.vec.scale(velTowardCollision, -1 * elasticity));
            this.center = utils_1.vec.sub(point, utils_1.vec.scale(displacementNormal, this.radius));
            this.adjSpinOffFrictionPoint(point, isSimulation);
            return true;
        }
        return false;
    }
    handleHittingVerticalSegment(lowerPoint, upperPoint, elasticity, isSimulation) {
        if (this.center.y >= lowerPoint.y && this.center.y <= upperPoint.y) {
            const displacementFromCenter = lowerPoint.x - this.center.x;
            // if ball hitting, coming from the left
            if (displacementFromCenter > 0 && displacementFromCenter < this.radius && this.vel.x > 0) {
                this.adjSpinOffFrictionPoint({ x: this.center.x + this.radius, y: this.center.y }, isSimulation);
                this.vel.x *= -elasticity;
                this.center.x = lowerPoint.x - this.radius;
                return true;
            }
            // ball hitting, coming from the right
            else if (displacementFromCenter < 0 && displacementFromCenter > -this.radius && this.vel.x < 0) {
                this.adjSpinOffFrictionPoint({ x: this.center.x - this.radius, y: this.center.y }, isSimulation);
                this.vel.x *= -elasticity;
                this.center.x = lowerPoint.x + this.radius;
                return true;
            }
        }
        return false;
    }
    handleHittingHorizontalSegment(leftPoint, rightPoint, elasticity, isSimulation) {
        if (this.center.x >= leftPoint.x && this.center.x <= rightPoint.x) {
            const displacementFromCenter = leftPoint.y - this.center.y;
            // if ball hitting, coming from the bottom
            if (displacementFromCenter > 0 && displacementFromCenter < this.radius && this.vel.y > 0) {
                this.adjSpinOffFrictionPoint({ x: this.center.x, y: this.center.y + this.radius }, isSimulation);
                this.vel.y *= -elasticity;
                this.center.y = leftPoint.y - this.radius;
                return true;
            }
            // ball hitting, coming from the top
            else if (displacementFromCenter < 0 && displacementFromCenter > -this.radius && this.vel.y < 0) {
                this.adjSpinOffFrictionPoint({ x: this.center.x, y: this.center.y - this.radius }, isSimulation);
                this.vel.y *= -elasticity;
                this.center.y = leftPoint.y + this.radius;
                return true;
            }
        }
        return false;
    }
    /**
     * when the ball hits a net or wall, it loses some spin (or gains). That energy has to be adjusted from
     * movement energy though.
     * @param worldPoint
     * @param isSimulation
     */
    adjSpinOffFrictionPoint(worldPoint, isSimulation) {
        const spinInfo = this.getAtomVelocityAtWorldPoint(worldPoint, isSimulation);
        const spinLoss = spinInfo.totalAngularVel * this.spinElasticityOffFrictionPoints;
        const bounceScale = spinInfo.totalSpeedInSpinDir * this.bumpOffFrictionPoints;
        this.vel = utils_1.vec.sub(this.vel, utils_1.vec.scale(spinInfo.dirDueToSpin, bounceScale));
        this.angularVel -= spinLoss;
        //if (!isSimulation) {
        //  console.log(`Off point, adj=${spinInfo.totalSpeedInSpinDir}. angularVel=${this.angularVel}`)
        //}
    }
    /**
     * this assumes it doesn't bounce off anything or have any friction; just
     * gravity
     */
    calcTimeTillLanding() {
        // x = x0 + v0t + 0.5at^2
        // 0 = x0 + v0t + 0.5at^2
        // t = -v0 - sqrt(v0*v0 - 2 * g * x0) / g
        const a = this.gravityY;
        const v0 = this.vel.y;
        const x0 = this.center.y - this.radius;
        if (x0 <= 0)
            return 0;
        return (-v0 - Math.sqrt(v0 * v0 - 2 * x0 * a)) / a;
    }
}
exports.CircularObject = CircularObject;
