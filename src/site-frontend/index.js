"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const site_utils_1 = require("./site-utils");
const game_loader_1 = require("../../src/game-loader");
/**
 * any site JavaScript can start here.
 */
class Site {
    gameLoader;
    constructor() {
        this.addHandlers();
    }
    run() {
        console.log('running. isMobileDevice=', (0, site_utils_1.isMobile)());
        if ((0, site_utils_1.$)('#game-canvas-wrapper')) {
            this.loadGame();
        }
    }
    addHandlers() {
        (0, site_utils_1.$)('#btn-erase-storage').addEventListener('click', () => this.eraseLocalStorage());
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
        });
    }
    async launchGame() {
        if (this.gameLoader?.isLoaded) {
            (0, site_utils_1.$)('body').classList.add('in-game');
            (0, site_utils_1.$)('#page-container').remove();
            await this.gameLoader.run();
        }
    }
    keyDown(e) {
        if (e.key === ' ')
            this.launchGame();
    }
}
new Site().run();
