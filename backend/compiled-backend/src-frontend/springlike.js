"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpringCard = void 0;
const utils_1 = require("./utils");
class Spring1D {
    _x;
    _vel;
    _damp;
    _k;
    targetX;
    constructor(x, vel, targetX, k, damp) {
        this._x = x;
        this._vel = vel;
        this._k = k;
        this._damp = damp;
        this.targetX = targetX;
    }
    get x() {
        return this._x;
    }
    step(dtSec) {
        this._x += this._vel * dtSec;
        const fSpring = (this.targetX - this._x) * this._k;
        const fDamp = this._damp * this._vel;
        const acc = fSpring + fDamp;
        this._vel += acc * dtSec;
    }
}
class Spring2D {
    _pos;
    _vel;
    _damp;
    _k;
    targetPos;
    constructor(pos, vel, targetPos, k, damp) {
        this._pos = utils_1.vec.copy(pos);
        this._vel = utils_1.vec.copy(vel);
        this._k = k;
        this._damp = damp;
        this.targetPos = utils_1.vec.copy(targetPos);
    }
    get pos() {
        return utils_1.vec.copy(this._pos);
    }
    step(dtSec) {
        this._pos.x += this._vel.x * dtSec;
        this._pos.y += this._vel.y * dtSec;
        const fSpring = { x: 0, y: 0 };
        const springDiff = utils_1.vec.sub(this.targetPos, this.pos);
        if (springDiff.x || springDiff.y) {
            const springDir = utils_1.vec.normalized(springDiff);
            const dist = utils_1.vec.len(springDiff);
            fSpring.x = springDir.x * this._k * dist;
            fSpring.y = springDir.y * this._k * dist;
        }
        const fDamp = utils_1.vec.scale(this._vel, this._damp);
        const acc = utils_1.vec.add(fDamp, fSpring);
        this._vel.x += acc.x * dtSec;
        this._vel.y += acc.y * dtSec;
    }
}
/**
 * a card that has a size that can spring around (a 1d spring) and a position (a 2d spring)
 * we'll use it for menus
 */
class SpringCard {
    posSpring;
    sizeSpring;
    constructor(pos, size, velSpringK, sizeSpringK, velDamp, sizeDamp) {
        this.posSpring = new Spring2D(pos, { x: 0, y: 0 }, pos, velSpringK, velDamp);
        this.sizeSpring = new Spring1D(size, 0, size, sizeSpringK, sizeDamp);
    }
    step(dtSec) {
        this.posSpring.step(dtSec);
        this.sizeSpring.step(dtSec);
    }
    set targetSize(targetSize) {
        this.sizeSpring.targetX = targetSize;
    }
    set targetPos(targetPos) {
        this.posSpring.targetPos = targetPos;
    }
    get size() {
        return this.sizeSpring.x;
    }
    get pos() {
        return this.posSpring.pos;
    }
}
exports.SpringCard = SpringCard;
