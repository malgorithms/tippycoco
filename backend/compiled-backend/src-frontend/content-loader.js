"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentLoader = void 0;
const sound_effect_1 = require("./sound-effect");
class ContentLoader {
    audioContext = new AudioContext();
    loadStats = { total: 0, done: 0 };
    loadMonitor;
    constructor(loadMonitor) {
        this.loadMonitor = loadMonitor;
    }
    get isLoaded() {
        return this.loadStats.total === this.loadStats.done;
    }
    async loadFont(familyName, url, weight) {
        this.loadStats.total++;
        const ffd = { weight: `${weight}` };
        const ff = new FontFace(`${familyName}`, `url(${url})`, ffd);
        document.fonts.add(ff);
        await ff.load();
        this.loadStats.done++;
        return ff;
    }
    loadImage(url) {
        this.loadStats.total++;
        this.loadMonitor(this.getLoadStats());
        return new Promise((resolve, reject) => {
            this.loadStats.done++;
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
            this.loadMonitor(this.getLoadStats());
        });
    }
    async loadTexture2d(url) {
        this.loadStats.total++;
        //await timeout(Math.random() * 5000)
        this.loadMonitor(this.getLoadStats());
        const img = await this.loadImage(url);
        this.loadStats.done++;
        const res = {
            width: img.width,
            height: img.height,
            img: img,
        };
        if (isNaN(img.width) || img.width === 0) {
            throw new Error(`Could not load image asset ${url}`);
        }
        this.loadMonitor(this.getLoadStats());
        return res;
    }
    async loadSoundEffect(path) {
        this.loadStats.total++;
        this.loadMonitor(this.getLoadStats());
        const response = await window.fetch(path);
        const arrBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrBuffer);
        this.loadStats.done++;
        this.loadMonitor(this.getLoadStats());
        return new sound_effect_1.SoundEffect(audioBuffer, this.audioContext);
    }
    getLoadStats() {
        return {
            done: this.loadStats.done,
            total: this.loadStats.total,
        };
    }
}
exports.ContentLoader = ContentLoader;
