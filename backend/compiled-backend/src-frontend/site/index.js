"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Site = void 0;
const site_utils_1 = require("./site-utils");
const game_loader_1 = require("../game-loader");
const menu_auto_hide_1 = require("./menu-auto-hide");
const utils_1 = require("../utils");
/**
 * any site JavaScript can start here.
 */
class Site {
    gameLoader;
    constructor() {
        this.addHandlers();
    }
    async run() {
        await (0, utils_1.timeout)(250); // all we are saying...is give paint a chance
        console.log('running. isMobileDevice=', (0, site_utils_1.isMobile)());
        if ((0, site_utils_1.$)('#game-canvas-wrapper')) {
            if ((0, site_utils_1.isMobile)())
                (0, site_utils_1.$)('.phone-warning').style.display = '';
            this.loadGame();
        }
    }
    addHandlers() {
        const btnEraseStorage = (0, site_utils_1.$)('#btn-erase-storage');
        btnEraseStorage?.addEventListener('click', () => this.eraseLocalStorage());
        window.addEventListener('keydown', (e) => this.keyDown(e));
    }
    eraseLocalStorage() {
        if (confirm('Are you sure? This will clear your game stats.')) {
            window.localStorage.clear();
            alert('done!');
            window.location.reload();
        }
    }
    async loadGame() {
        this.gameLoader = new game_loader_1.GameLoader((0, site_utils_1.$)('#game-canvas-wrapper'), (0, site_utils_1.$)('#load-stats'), () => {
            (0, site_utils_1.$)('#game-canvas-wrapper').classList.add('loaded');
            (0, site_utils_1.$)('#game-load-wrapper').classList.add('loaded');
        });
    }
    async launchGame() {
        const gL = this.gameLoader;
        if (gL) {
            if (gL.isLoaded && !gL.isRunning) {
                (0, site_utils_1.$)('body').classList.add('in-game');
                new menu_auto_hide_1.MenuAutoHider(gL.game);
                await gL.run();
                await window.location.reload();
            }
        }
    }
    keyDown(e) {
        if (e.key === ' ')
            this.launchGame();
    }
}
exports.Site = Site;
