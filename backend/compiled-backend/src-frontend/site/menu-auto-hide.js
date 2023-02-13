"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuAutoHider = void 0;
const game_1 = require("../game");
const utils_1 = require("../utils");
const site_utils_1 = require("./site-utils");
class MenuAutoHider {
    game;
    lastMouseMove = Date.now();
    constructor(game) {
        this.game = game;
        window.addEventListener('mousemove', () => this.recordMouseUse());
        this.loop();
    }
    recordMouseUse() {
        this.lastMouseMove = Date.now();
    }
    get msSinceMouseUsed() {
        return Date.now() - this.lastMouseMove;
    }
    async loop() {
        while (true) {
            await (0, utils_1.timeout)(100);
            if (this.game.getGameState() === game_1.GameState.Action || this.msSinceMouseUsed > 1000) {
                this.hideMenu();
            }
            else {
                this.showMenu();
            }
        }
    }
    hideMenu() {
        (0, site_utils_1.$)('.navbar').style.display = 'none';
    }
    showMenu() {
        (0, site_utils_1.$)('.navbar').style.display = '';
    }
}
exports.MenuAutoHider = MenuAutoHider;
