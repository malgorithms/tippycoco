"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cloud = void 0;
class Cloud {
    // Private members
    _age;
    _sunnyTexture;
    _darkTexture;
    _vel;
    _pos;
    _width;
    _constraint; // constraint
    // Public Methods
    constructor(constraint, sunnyTexture, darkTexture, vel, pos, width) {
        this._age = 0;
        this._constraint = constraint;
        this._sunnyTexture = sunnyTexture;
        this._darkTexture = darkTexture;
        this._vel = vel;
        this._pos = pos;
        this._width = width;
    }
    get width() {
        return this._width;
    }
    get sunnyTexture() {
        return this._sunnyTexture;
    }
    get darkTexture() {
        return this._darkTexture;
    }
    get age() {
        return this._age;
    }
    get pos() {
        return this._pos;
    }
    step(dt) {
        const c = this._constraint;
        this._pos.x += this._vel.x * dt;
        this._pos.y += this._vel.y * dt;
        if (this._vel.x < 0 && this._pos.x < c.x1)
            this._pos.x = c.x2;
        if (this._vel.x > 0 && this._pos.x > c.x2)
            this._pos.x = c.x1;
        if (this._vel.y < 0 && this._pos.y < c.y1)
            this._pos.y = c.y2;
        if (this._vel.y > 0 && this._pos.y > c.y2)
            this._pos.y = c.y1;
        if (this._pos.y > c.y2) {
            this._pos.y = c.y2;
            this._vel.y = -Math.abs(this._vel.y);
        }
        if (this._pos.y < c.y1) {
            this._pos.y = c.y1;
            this._vel.y = Math.abs(this._vel.y);
        }
        this._age += dt;
    }
}
exports.Cloud = Cloud;
