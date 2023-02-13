"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundEffectInstance = exports.SoundEffect = void 0;
const utils_1 = require("./utils");
class SoundEffectInstance {
    defaultPlaybackRate;
    effect;
    source;
    gainNode;
    pannerNode;
    _isFading;
    constructor(effect, volume, pitch, pan, loop) {
        this.effect = effect;
        this._isFading = false;
        this.source = this.audioContext.createBufferSource();
        this.defaultPlaybackRate = this.source.playbackRate.value;
        this.source.buffer = this.audioBuffer;
        this.gainNode = this.audioContext.createGain();
        this.pannerNode = this.audioContext.createStereoPanner();
        this.connectNodes();
        // These are changed via setters that use the nodes.
        // They can also be called after the fact, once the sound
        // is playing.
        this.pan = pan;
        this.pitch = pitch;
        this.volume = volume;
        // start playing
        this.source.loop = loop;
        this.source.start(0, 0);
        this.source.onended = () => this.effect._notifyOfInstanceDone(this);
    }
    connectNodes() {
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.pannerNode);
        this.pannerNode.connect(this.audioContext.destination);
    }
    stop() {
        this.source.stop();
        this.effect._notifyOfInstanceDone(this);
    }
    get audioContext() {
        return this.effect.audioContext;
    }
    get audioBuffer() {
        return this.effect.audioBuffer;
    }
    get currTime() {
        return this.audioContext.currentTime;
    }
    set pan(pan) {
        if (pan < -1 || pan > 1)
            throw new Error(`bad pan ${pan}`);
        this.pannerNode.pan.setValueAtTime(pan, this.currTime);
    }
    set volume(volume) {
        if (volume < 0 || volume > 1)
            throw new Error(`bad volume ${volume}`);
        this.gainNode.gain.linearRampToValueAtTime(volume, this.currTime);
    }
    set pitch(pitch) {
        pitch = Math.max(-0.99, pitch);
        const rate = this.defaultPlaybackRate * (1 + pitch);
        this.source.playbackRate.setValueAtTime(rate, this.currTime);
    }
    async fadeOut(seconds) {
        if (!this._isFading) {
            this._isFading = true;
            this.gainNode.gain.linearRampToValueAtTime(0, this.currTime + seconds);
            await (0, utils_1.timeout)(seconds * 1000);
            this.stop();
        }
    }
}
exports.SoundEffectInstance = SoundEffectInstance;
class SoundEffect {
    _audioBuffer;
    _audioContext;
    playingInstances = new Array();
    constructor(audioBuffer, audioContext) {
        this._audioBuffer = audioBuffer;
        this._audioContext = audioContext;
    }
    get numPlaying() {
        return this.playingInstances.length;
    }
    get audioContext() {
        return this._audioContext;
    }
    get audioBuffer() {
        return this._audioBuffer;
    }
    get isPlaying() {
        return this.playingInstances.length > 0;
    }
    getInstanceIfPlaying() {
        return this.playingInstances[0] || null;
    }
    play(volume, pitch, pan, loop) {
        const instance = new SoundEffectInstance(this, volume, pitch, pan, loop);
        this.playingInstances.push(instance);
        return instance;
    }
    stopIfPlaying() {
        this.playingInstances.forEach((s) => s.stop());
    }
    _notifyOfInstanceDone(instance) {
        this.playingInstances.splice(this.playingInstances.indexOf(instance), 1);
    }
    async fadeOutIfPlaying(seconds) {
        this.getInstanceIfPlaying()?.fadeOut(seconds);
    }
}
exports.SoundEffect = SoundEffect;
