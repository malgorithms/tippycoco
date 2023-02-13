"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Colors = exports.Color = void 0;
class Color {
    r;
    g;
    b;
    a;
    constructor(r, g, b, a) {
        if (typeof a !== 'number' || isNaN(a))
            throw new Error(`I demand alpha.`);
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    toHtmlRgb() {
        if (this.a === 1)
            return `rgb(${this.r * 255},${this.g * 255},${this.b * 255})`;
        else
            return `rgba(${this.r * 255},${this.g * 255},${this.b * 255},${this.a})`;
    }
}
exports.Color = Color;
const Colors = {
    white: new Color(1, 1, 1, 1),
    black: new Color(0, 0, 0, 1),
};
exports.Colors = Colors;
