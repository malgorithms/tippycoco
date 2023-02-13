"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomByteHexString = exports.sign = exports.aspectRatio = exports.vec = exports.timeout = void 0;
function timeout(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
exports.timeout = timeout;
function sign(n) {
    if (n > 0)
        return 1;
    else if (n < 0)
        return -1;
    else
        throw new Error(`0 (Nan, etc) is unsigned`);
}
exports.sign = sign;
const vec = {
    copy: (v) => ({ x: v.x, y: v.y }),
    sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
    add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
    lenSq: (v) => v.x * v.x + v.y * v.y,
    len: (v) => Math.sqrt(vec.lenSq(v)),
    scale: (v, k) => ({ x: v.x * k, y: v.y * k }),
    normalized: (v) => {
        const len = vec.len(v);
        return { x: v.x / len, y: v.y / len };
    },
    dotProduct: (v1, v2) => v1.x * v2.x + v1.y * v2.y,
    zero: () => ({ x: 0, y: 0 }),
    transform: (p, matrix) => {
        const x = p.x * matrix.a + p.y * matrix.c + matrix.e;
        const y = p.x * matrix.b + p.y * matrix.d + matrix.f;
        return { x, y };
    },
    avg: (v1, v2) => ({
        x: (v1.x + v2.x) / 2,
        y: (v1.y + v2.y) / 2,
    }),
    rotated90Ccw: (v) => ({
        x: -v.y,
        y: v.x,
    }),
    distSq: (v1, v2) => vec.lenSq(vec.sub(v1, v2)),
};
exports.vec = vec;
function randomByteHexString(numBytes) {
    return Array.from(crypto.getRandomValues(new Uint8Array(numBytes)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}
exports.randomByteHexString = randomByteHexString;
const aspectRatio = (t) => t.width / t.height;
exports.aspectRatio = aspectRatio;
