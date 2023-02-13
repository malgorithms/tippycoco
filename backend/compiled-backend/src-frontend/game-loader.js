"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLoader = void 0;
const game_1 = require("./game");
class GameLoader {
    loadMonitorEl;
    _game;
    _isLoaded = false;
    _isRunning = false;
    constructor(parentEl, loadMonitorEl, onDone) {
        this.loadMonitorEl = loadMonitorEl;
        this._game = new game_1.Game(parentEl, (s) => {
            this.contentLoadMonitor(s, onDone);
        });
    }
    get game() {
        return this._game;
    }
    get isLoaded() {
        return this._isLoaded;
    }
    get isRunning() {
        return this._isRunning;
    }
    lPad(n, len) {
        let s = `${n}`;
        while (s.length < len)
            s = `0${s}`;
        return s;
    }
    async contentLoadMonitor(s, onDone) {
        const $el = this.loadMonitorEl;
        const w = 200;
        const leftW = 1 + (s.done / s.total) * w;
        const rightW = 1 + w - leftW;
        const emoji = s.done === s.total ? '✅' : '🔥';
        const text = `${emoji} ${this.lPad(s.done, 3)}/${s.total} textures &amp; sounds.`;
        if ($el)
            $el.innerHTML = `
          <div style="display:inline-block;width:${leftW}px;
                height:0.6em;background-color:#00f"></div
          ><div style="display:inline-block;width:${rightW}px;
                height:0.6em;background-color:#eee"
          ></div>
    ${text}
    `;
        if (s.done === s.total) {
            this._isLoaded = true;
            onDone();
        }
    }
    async run() {
        if (!this._isLoaded)
            throw new Error('Game is not loaded yet');
        if (!this._isRunning) {
            this._isRunning = true;
            await this._game.run();
        }
    }
}
exports.GameLoader = GameLoader;
