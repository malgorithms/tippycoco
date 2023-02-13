"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpriteBatch = void 0;
const tweakables_1 = __importDefault(require("./tweakables"));
class SpriteBatch {
    canvasManager;
    constructor(canvasManager) {
        this.canvasManager = canvasManager;
    }
    get ctx() {
        return this.canvasManager.ctx;
    }
    transformCtxForCenteredObject(center, dims, rot, scale, flipY) {
        const w = dims.w;
        const h = dims.h;
        const rotCenterX = w / 2;
        const rotCenterY = h / 2;
        this.ctx.translate(center.x, center.y);
        if (flipY)
            this.ctx.transform(1, 0, 0, -1, 0, 0); // flip y-axis
        this.ctx.scale(scale, scale);
        if (rot)
            this.ctx.rotate(-rot);
        this.ctx.translate(-rotCenterX, -rotCenterY);
    }
    /**
     * draws a texture on the canvasManager, scaled appropriately. So none of the params
     * here are dealing with pixels, but actual game units
     */
    drawTextureCentered(t, center, dims, rot, alpha) {
        if (alpha <= 0)
            return;
        this.ctx.save();
        this.transformCtxForCenteredObject(center, dims, rot, 1, true);
        this.ctx.globalAlpha = alpha;
        this.ctx.drawImage(t.img, 0, 0, dims.w, dims.h);
        this.ctx.restore();
    }
    drawStringCenteredExactly(s, font, size, center, color, rot) {
        if (color.a === 0)
            return;
        this.ctx.save();
        const pxCenter = this.canvasManager.canvasToPixelPos(center);
        this.ctx.font = this.fontDescriptor(font, size);
        const boxTm = this.ctx.measureText(s);
        const boxWidth = boxTm.width;
        const boxHeight = boxTm.actualBoundingBoxAscent + boxTm.actualBoundingBoxDescent;
        this.ctx.resetTransform();
        const rotCenterX2 = boxWidth / 2;
        const rotCenterY2 = -boxHeight / 2;
        this.ctx.translate(pxCenter.x, pxCenter.y);
        this.ctx.rotate(rot ?? 0);
        this.ctx.translate(-rotCenterX2, -rotCenterY2);
        this.ctx.fillStyle = color.toHtmlRgb();
        this.ctx.fillText(s, 0, 0);
        this.ctx.restore();
    }
    drawStringCentered(s, font, size, center, color, rot, exactMiddleVert) {
        if (exactMiddleVert) {
            this.drawStringCenteredExactly(s, font, size, center, color, rot);
        }
        else {
            this.drawString(s, font, size, center, color, rot, { textAlign: 'center', textBaseline: 'middle' });
        }
    }
    drawString(s, font, size, pos, color, rot, opts) {
        opts ??= {};
        if (color.a === 0)
            return;
        this.ctx.save();
        const pxPos = this.canvasManager.canvasToPixelPos(pos);
        this.ctx.font = this.fontDescriptor(font, size);
        this.ctx.resetTransform();
        this.ctx.translate(pxPos.x, pxPos.y);
        if (rot)
            this.ctx.rotate(rot);
        if (opts.textBaseline)
            this.ctx.textBaseline = opts.textBaseline;
        if (opts.textAlign)
            this.ctx.textAlign = opts.textAlign;
        this.ctx.fillStyle = color.toHtmlRgb();
        this.ctx.fillText(s, 0, 0);
        this.ctx.restore();
    }
    drawTextureInRect(t, rect, alpha) {
        const w = rect.x2 - rect.x1;
        const h = rect.y2 - rect.y1;
        const center = { x: (rect.x1 + rect.x2) / 2, y: (rect.y1 + rect.y2) / 2 };
        this.drawTextureCentered(t, center, { w, h }, 0, alpha);
    }
    drawScreenOverlay(color) {
        this.ctx.save();
        this.ctx.resetTransform();
        this.ctx.fillStyle = color.toHtmlRgb();
        this.ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height);
        this.ctx.restore();
    }
    /**
     * returns width and height object for the given texture,
     * given a desired width passed in. basically just scales to aspectRatio.
     * @param width
     * @param texture2d
     * @returns
     */
    autoDim(width, texture2d) {
        return {
            w: width,
            h: (width * texture2d.height) / texture2d.width,
        };
    }
    /**
     * returns something like "bold 12px 'nunito sans', sans-serif"
     * @param font - font definition
     * @param size - the size in game coordinates; gets converted to pixels
     * @returns string
     */
    fontDescriptor(font, size) {
        const pixelWidth = this.canvasManager.pixelWidth(1);
        const pxSize = size / pixelWidth;
        const res = `${font.weight} ${pxSize.toFixed(4)}px "${font.family}", ${tweakables_1.default.fontFamilyFallback}`;
        //console.log(`Got font descriptor "${res}"`)
        return res;
    }
}
exports.SpriteBatch = SpriteBatch;
