"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundManager = void 0;
const content_load_list_1 = require("./content-load-list");
const tweakables_1 = __importDefault(require("./tweakables"));
const types_1 = require("./types");
class SoundManager {
    content;
    sounds = new Map();
    // these sounds, if played in rapid succession, keep getting a higher pitch
    autoPitchIncrementers = new Set(tweakables_1.default.sound.autoPitchSet);
    autoPitchPlays = new Array();
    constructor(content) {
        this.content = content;
    }
    async loadSound(path, name) {
        const eff = await this.content.loadSoundEffect(path);
        this.sounds.set(name, eff);
    }
    async loadContent() {
        const promises = [];
        Object.entries(content_load_list_1.soundSources).forEach(([name, source]) => promises.push(this.loadSound(source, name)));
        await Promise.all(promises);
    }
    getSound(name) {
        const effect = this.sounds.get(name);
        if (!effect)
            throw new Error(`no sound was loaded with name ${name}`);
        return effect;
    }
    countRecentAutoPitchPlays() {
        while (this.autoPitchPlays.length && this.autoPitchPlays[0].dateNow < Date.now() - 1000 * tweakables_1.default.sound.autoPitchSecStorage) {
            this.autoPitchPlays.splice(0, 1);
        }
        return this.autoPitchPlays.length;
    }
    play(name, volume, pitch, pan, loop) {
        if (this.autoPitchIncrementers.has(name)) {
            pitch += tweakables_1.default.sound.autoPitchInc * this.countRecentAutoPitchPlays();
            this.autoPitchPlays.push({ soundName: name, dateNow: Date.now() });
        }
        this.getSound(name).play(volume, pitch, pan, loop);
    }
    playIfNotPlaying(name, volume, pitch, pan, loop) {
        const instance = this.getSound(name).getInstanceIfPlaying();
        if (instance) {
            instance.volume = volume;
            instance.pan = pan;
            instance.pitch = pitch;
        }
        else {
            this.play(name, volume, pitch, pan, loop);
        }
    }
    stopIfPlaying(name) {
        this.getSound(name).stopIfPlaying();
    }
    playGrowthNoise(playerSide, vel) {
        console.log(`playing growth noise`, playerSide, vel);
        const isLeft = playerSide === types_1.PlayerSide.Left;
        if (vel < 0.0 && isLeft)
            this.playIfNotPlaying('p1Shrinkage', 0.5, -vel, 0.0, false);
        else if (vel > 0.0 && isLeft)
            this.playIfNotPlaying('p1Growth', 0.5, vel, 0.0, false);
        else if (vel < 0.0 && !isLeft)
            this.playIfNotPlaying('p2Shrinkage', 0.5, -vel, 0.0, false);
        else if (vel > 0.0 && !isLeft)
            this.playIfNotPlaying('p2Growth', 0.5, vel, 0.0, false);
    }
    fadeGrowthNoise(playerSide) {
        if (playerSide === types_1.PlayerSide.Left) {
            this.getSound('p1Shrinkage').fadeOutIfPlaying(0.25);
            this.getSound('p1Growth').fadeOutIfPlaying(0.25);
        }
        else {
            this.getSound('p2Shrinkage').fadeOutIfPlaying(0.25);
            this.getSound('p2Growth').fadeOutIfPlaying(0.25);
        }
    }
}
exports.SoundManager = SoundManager;
