"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Atmosphere = void 0;
const cloud_1 = require("./cloud");
const tweakables_1 = __importDefault(require("./tweakables"));
const utils_1 = require("./utils");
class Atmosphere {
    numClouds = tweakables_1.default.cloud.num;
    display;
    clouds = new Array();
    activeSkies = new Array();
    sunnyCloudTextures = new Array(); // has a 1-1 relationship with DarkCloudTextures list
    darkCloudTextures = new Array(); // has a 1-1 relationship with SunnyCloudTextures list
    canvasManager;
    constructor(display, canvasManager) {
        this.display = display;
        this.canvasManager = canvasManager;
    }
    get canvasWidth() {
        return this.canvasManager.width;
    }
    get canvasHeight() {
        return this.canvasManager.height;
    }
    getFractionTransitioned(i) {
        const now = Date.now();
        if (this.activeSkies.length <= 1)
            return 1;
        const currSky = this.activeSkies[i];
        const elapsed = now - currSky.whenSpawned;
        if (elapsed >= tweakables_1.default.atmosphere.skyTransitionMs)
            return 1;
        return elapsed / tweakables_1.default.atmosphere.skyTransitionMs;
    }
    get sunniness() {
        if (this.activeSkies.length === 0)
            return 1;
        if (this.activeSkies.length === 1) {
            return this.activeSkies[0].sunniness;
        }
        const f = this.getFractionTransitioned(this.activeSkies.length - 1);
        const currSky = this.activeSkies[this.activeSkies.length - 1];
        const prevSky = this.activeSkies[this.activeSkies.length - 2];
        return currSky.sunniness * f + prevSky.sunniness * (1 - f);
    }
    skyForOpponent(opp) {
        const ai = opp.ai;
        const tNames = ai?.skyTextureNames ?? {
            sunny: 'sunnyBackgroundBlue',
            dark: 'darkBackground',
        };
        return {
            sunny: this.display.getTexture(tNames.sunny),
            dark: this.display.getTexture(tNames.dark),
        };
    }
    changeSkyForOpponent(opp, sunniness) {
        const textures = this.skyForOpponent(opp);
        if (sunniness === 1)
            this.changeSky(textures.sunny, 1);
        else
            this.changeSky(textures.dark, 0);
    }
    changeSky(texture, sunniess) {
        this.activeSkies.push({
            texture,
            whenSpawned: Date.now(),
            sunniness: sunniess,
        });
        if (this.activeSkies.length > tweakables_1.default.atmosphere.maxSkies) {
            throw new Error('too many skies!');
        }
    }
    pruneAncientSkies() {
        const freshest = this.activeSkies[this.activeSkies.length - 1];
        const deleteOldAfter = freshest.whenSpawned + tweakables_1.default.atmosphere.skyTransitionMs;
        if (Date.now() > deleteOldAfter) {
            this.activeSkies = [freshest];
        }
    }
    addCloudTextures(sunnyTexture, darkTexture) {
        this.sunnyCloudTextures.push(sunnyTexture);
        this.darkCloudTextures.push(darkTexture);
    }
    draw(sb) {
        this.pruneAncientSkies();
        const view = this.canvasManager.viewableRegion;
        const bottomOfSkyRight = { x: view.x2, y: tweakables_1.default.net.center.y - tweakables_1.default.net.height / 2 };
        const ctr = utils_1.vec.avg({ x: view.x1, y: view.y2 }, bottomOfSkyRight);
        const dims = {
            w: bottomOfSkyRight.x - view.x1 + 0.1,
            h: view.y2 - bottomOfSkyRight.y + 0.1,
        };
        const numSkies = this.activeSkies.length;
        for (let i = 0; i < numSkies; i++) {
            const frac = this.getFractionTransitioned(i);
            const sky = this.activeSkies[i];
            const alpha = frac;
            sb.drawTextureCentered(sky.texture, ctr, dims, 0, alpha);
        }
        const nightMoonHeight = view.y2 * tweakables_1.default.moon.nightHeightFrac;
        const dayMoonHeight = view.y1;
        const moonHeight = nightMoonHeight - Math.sqrt(this.sunniness) * (nightMoonHeight - dayMoonHeight);
        const moonLoc = {
            x: ctr.x + (1 - this.sunniness) * (view.x2 - ctr.x) * tweakables_1.default.moon.widthFrac,
            y: moonHeight,
        };
        const moonTexture = this.display.getTexture('moon');
        const moonDims = sb.autoDim(0.1, moonTexture);
        sb.drawTextureCentered(moonTexture, moonLoc, moonDims, 0, 1);
        for (const c of this.clouds) {
            sb.drawTextureCentered(c.sunnyTexture, c.pos, sb.autoDim(c.width, c.sunnyTexture), 0, this.sunniness);
            sb.drawTextureCentered(c.darkTexture, c.pos, sb.autoDim(c.width, c.darkTexture), 0, 1 - this.sunniness);
        }
    }
    step(dt) {
        for (const c of this.clouds) {
            c.step(dt);
        }
    }
    fillClouds() {
        const t = tweakables_1.default;
        const vMin = t.cloud.minVel;
        const vMax = t.cloud.maxVel;
        for (let i = 0; i < this.numClouds; i++) {
            const sunny = this.sunnyCloudTextures[i % this.sunnyCloudTextures.length];
            const dark = this.darkCloudTextures[i % this.darkCloudTextures.length];
            const vx = vMax.x + Math.random() * (vMax.x - vMin.x);
            const vy = vMin.y + Math.random() * (vMax.y - vMin.y);
            const vel = { x: vx, y: vy };
            const width = sunny.width / 1000;
            const rect = {
                x1: t.leftWall.center.x - 1.5,
                x2: t.rightWall.center.x + 1.5,
                y1: t.leftWall.center.y - t.leftWall.height / 2,
                y2: t.rightWall.center.y + t.rightWall.height / 2,
            };
            this.clouds.push(new cloud_1.Cloud(rect, sunny, dark, vel, { x: 0, y: 0 }, width));
        }
    }
}
exports.Atmosphere = Atmosphere;
