"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyboardMonitor = void 0;
class KeyboardMonitor {
    keysDown = new Set();
    prevKeysDown = new Set();
    constructor() {
        this.registerKeyboardActions();
    }
    update() {
        this.prevKeysDown = new Set(this.keysDown);
    }
    isKeyDown(code) {
        return this.keysDown.has(code);
    }
    anyKeyDown(codes) {
        for (const c of codes) {
            if (this.isKeyDown(c))
                return true;
        }
        return false;
    }
    anyKeysJustPushed(codes) {
        for (const c of codes) {
            if (this.wasKeyJustPushed(c))
                return true;
        }
        return false;
    }
    wasKeyJustPushed(code) {
        if (!this.prevKeysDown)
            return false;
        const isPressed = this.keysDown.has(code);
        const wasPressed = this.prevKeysDown.has(code);
        if (this.prevKeysDown.size !== this.keysDown.size)
            return isPressed && !wasPressed;
        return false;
    }
    // ---- PRIVACY PLEASE
    registerKeyboardActions() {
        window.addEventListener('keydown', (event) => {
            this.keysDown.add(event.code);
        });
        window.addEventListener('keyup', (event) => {
            this.keysDown.delete(event.code);
        });
    }
}
exports.KeyboardMonitor = KeyboardMonitor;
