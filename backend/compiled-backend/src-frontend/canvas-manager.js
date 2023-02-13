"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanvasManager = void 0;
const constants_1 = __importDefault(require("./constants"));
const tweakables_1 = __importDefault(require("./tweakables"));
const utils_1 = require("./utils");
class CanvasManager {
    parentEl;
    canvas;
    _ctx;
    center = tweakables_1.default.display.zoomCenter;
    _currViewRegion = { x1: -Infinity, x2: Infinity, y1: -Infinity, y2: Infinity };
    _currOnePixel = 1;
    _currInverseTransform = new DOMMatrix();
    _zoomScale = tweakables_1.default.display.zoomScale.start;
    constructor(parentEl) {
        this.parentEl = parentEl;
    }
    initialDraw() {
        this.generateCanvas();
        this.recalcCtxTransform();
    }
    recalcCtxTransform() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const unitScale = Math.min(ch / 2, cw / 2);
        this.ctx.resetTransform();
        this.ctx.transform(1, 0, 0, -1, 0, ch); // flip y-axis
        this.ctx.translate(cw / 2, ch / 2); // re-center to middle
        this.ctx.scale(unitScale, unitScale); // scale to unit
        this.ctx.translate(-this.center.x / this.zoomScale, -this.center.y / this.zoomScale); // now shift to desired center
        this.ctx.scale(1 / this.zoomScale, 1 / this.zoomScale); // scale from there
        const topLeft = this.pixelToCanvasPos({ x: 0, y: 0 });
        const bottomRight = this.pixelToCanvasPos({ x: this.width, y: this.height });
        this._currViewRegion = { x1: topLeft.x, x2: bottomRight.x, y1: bottomRight.y, y2: topLeft.y };
        this._currOnePixel = this.pixelToCanvasPos({ x: 1, y: 1 }).x - this.pixelToCanvasPos({ x: 0, y: 0 }).x;
        this._currInverseTransform = this.ctx.getTransform().inverse();
    }
    get viewableRegion() {
        return this._currViewRegion;
    }
    get onePixel() {
        return this._currOnePixel;
    }
    get zoomScale() {
        return this._zoomScale;
    }
    get ctx() {
        return this._ctx;
    }
    get width() {
        return this.canvas.width;
    }
    get height() {
        return this.canvas.height;
    }
    clearCanvas() {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }
    generateCanvas() {
        this.parentEl.innerHTML = '';
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'game-canvas';
        this.parentEl.append(this.canvas);
        this._ctx = this.canvas.getContext('2d');
        this.canvas.style.opacity = '1.0';
        this.setCanvasDims();
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }
    setCanvasDims() {
        const c = this.canvas;
        const w = this.parentEl.offsetWidth;
        const h = this.parentEl.offsetHeight;
        c.width = w * constants_1.default.dpr;
        c.height = h * constants_1.default.dpr;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        this.recalcCtxTransform();
    }
    onWindowResize() {
        this.setCanvasDims();
        this.recalcCtxTransform();
    }
    pixelToCanvasPos(p) {
        return utils_1.vec.transform(p, this._currInverseTransform);
    }
    canvasToPixelPos(p) {
        return utils_1.vec.transform(p, this.ctx.getTransform());
    }
    pixelWidth(pixels) {
        return this._currOnePixel * pixels;
    }
    adjustZoomLevel(maxBallHeight, dt) {
        const cfg = tweakables_1.default.display.zoomScale;
        let idealZoomLevel = cfg.ballHeightMult * maxBallHeight;
        if (idealZoomLevel > cfg.max)
            idealZoomLevel = cfg.max;
        else if (idealZoomLevel < cfg.min)
            idealZoomLevel = cfg.min;
        this._zoomScale += (idealZoomLevel - this.zoomScale) * dt * cfg.springConstant;
        this.recalcCtxTransform();
    }
}
exports.CanvasManager = CanvasManager;
