"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = void 0;
const gamepad_monitor_1 = require("./gamepad-monitor");
const keyboard_monitor_1 = require("./keyboard-monitor");
const player_1 = require("./player");
const tweakables_1 = __importDefault(require("./tweakables"));
const types_1 = require("./types");
class Input {
    pads = new gamepad_monitor_1.GamepadMonitor();
    keyboard = new keyboard_monitor_1.KeyboardMonitor();
    game;
    constructor(game) {
        this.game = game;
    }
    updateInputStates() {
        this.keyboard.update();
        this.pads.update();
    }
    isKeyboardConnected() {
        return true; // for now
    }
    getKeyboardSet(pI) {
        const isTwoPlayerGame = this.game.playerRight.species === player_1.PlayerSpecies.Human;
        const kSet = isTwoPlayerGame ? tweakables_1.default.twoPlayerControls : tweakables_1.default.onePlayerControls;
        if (pI === types_1.PlayerSide.Left)
            return kSet.p0;
        else
            return kSet.p1;
    }
    swapGamepadSides() {
        this.pads.swapSides();
    }
    wasKeyboardPauseHit() {
        return this.keyboard.anyKeysJustPushed(['Enter', 'Escape']);
    }
    checkGamepadPauseHit() {
        for (const pI of [types_1.PlayerSide.Left, types_1.PlayerSide.Right]) {
            if (this.pads.anyButtonsPushedBy(pI, ['start']))
                return pI;
        }
        return null;
    }
    wasMenuSelectJustPushed(owner) {
        const res = {
            selected: false,
            byPlayerSide: null,
            byKeyboard: false,
        };
        if (this.keyboard.anyKeysJustPushed(['Enter', 'Space'])) {
            res.selected = true;
            res.byKeyboard = true;
        }
        else {
            const toCheck = owner ? [owner] : [types_1.PlayerSide.Left, types_1.PlayerSide.Right];
            for (const playerSide of toCheck) {
                if (this.pads.anyButtonsPushedBy(playerSide, ['psX'])) {
                    res.selected = true;
                    res.byPlayerSide = playerSide;
                }
            }
        }
        return res;
    }
    wasMenuDownJustPushed(owner) {
        if (this.keyboard.anyKeysJustPushed(['KeyS', 'KeyK', 'ArrowDown']))
            return true;
        if (owner) {
            return this.pads.anyButtonsPushedBy(owner, ['dPadDown']) || this.pads.wasThumbstickPushedDownBy(owner, 'left');
        }
        else {
            return this.pads.anyButtonsPushedByAnyone(['dPadDown']) || this.pads.wasThumbstickPushedDown('left');
        }
    }
    wasMenuUpJustPushed(owner) {
        if (this.keyboard.anyKeysJustPushed(['KeyW', 'KeyI', 'ArrowUp']))
            return true;
        if (owner) {
            return this.pads.anyButtonsPushedBy(owner, ['dPadUp']) || this.pads.wasThumbstickPushedUpBy(owner, 'left');
        }
        else {
            return this.pads.anyButtonsPushedByAnyone(['dPadUp']) || this.pads.wasThumbstickPushedUp('left');
        }
    }
    wasMenuLeftJustPushed(owner) {
        if (this.keyboard.anyKeysJustPushed(['KeyA', 'KeyJ', 'ArrowLeft']))
            return true;
        if (owner) {
            return this.pads.anyButtonsPushedBy(owner, ['dPadLeft']) || this.pads.wasThumbstickPushedLeftBy(owner, 'left');
        }
        else {
            return this.pads.anyButtonsPushedByAnyone(['dPadLeft']) || this.pads.wasThumbstickPushedLeft('left');
        }
    }
    wasMenuRightJustPushed(owner) {
        if (this.keyboard.anyKeysJustPushed(['KeyD', 'KeyL', 'ArrowRight']))
            return true;
        if (owner) {
            return this.pads.anyButtonsPushedBy(owner, ['dPadRight']) || this.pads.wasThumbstickPushedRightBy(owner, 'left');
        }
        else {
            return this.pads.anyButtonsPushedByAnyone(['dPadRight']) || this.pads.wasThumbstickPushedRight('left');
        }
    }
    wasMenuExitJustPushed(owner) {
        if (this.keyboard.anyKeysJustPushed(['Escape']))
            return true;
        if (owner)
            return this.pads.anyButtonsPushedBy(owner, ['psO', 'start']);
        else
            return this.pads.anyButtonsPushedByAnyone(['psO', 'start']);
    }
    wasPostgameProceedJustPushed() {
        return this.pads.anyButtonsPushedByAnyone(['psO', 'psX', 'start']) || this.wasMenuSelectJustPushed(null).selected;
    }
    wasPlayerJustDisconnectedFromGamepad(playerSide) {
        return this.pads.wasPlayerJustDisconnected(playerSide);
    }
    wasPlayerJustConnectedToGamepad(playerSide) {
        return this.pads.wasPlayerJustConnected(playerSide);
    }
    doesPlayerHaveGamepad(playerSide) {
        return this.pads.doesPlayerHaveGamepad(playerSide);
    }
    gamepadConnectSummary() {
        return {
            left: this.pads.getStateFromPlayer(types_1.PlayerSide.Left),
            right: this.pads.getStateFromPlayer(types_1.PlayerSide.Right),
        };
    }
    wasDashJustPushed(pI) {
        const set = this.getKeyboardSet(pI);
        return this.keyboard.anyKeyDown(set.dash) || this.pads.anyButtonDown(pI, ['psSquare']);
    }
    isJumpPressed(pI) {
        const set = this.getKeyboardSet(pI);
        return this.keyboard.anyKeyDown(set.jump) || this.pads.anyButtonDown(pI, ['psX']);
    }
    /**
     * returns 0 if trigger near 0, within tolerance
     * defined in tweakables. otherwise returns value up to 1
     */
    getTrigger(playerSide, triggerName) {
        const x = this.pads.getTrigger(playerSide, triggerName);
        if (x < tweakables_1.default.input.triggerTolerance)
            return 0;
        return x;
    }
    /**
     * returns 0 if thumbstick near the middle, within tolerance
     * defined in tweakables. otherwise returns value
     * @param playerSide - playerSide
     */
    getLeftThumbStickX(playerSide) {
        const x = this.pads.getThumbStick(playerSide, 'left').x;
        if (Math.abs(x) < tweakables_1.default.thumbstickCenterTolerance)
            return 0;
        else
            return x;
    }
    /**
     * returns 0 if thumbstick near the middle, within tolerance
     * defined in tweakables. otherwise returns value
     * @param playerSide - playerSide
     */
    getLeftThumbStickY(playerSide) {
        const y = -this.pads.getThumbStick(playerSide, 'left').y;
        if (Math.abs(y) < tweakables_1.default.thumbstickCenterTolerance)
            return 0;
        else
            return y;
    }
    getXyDirectional(pS) {
        const res = {
            x: this.getLeftThumbStickX(pS),
            y: this.getLeftThumbStickY(pS),
        };
        console.log(res);
        if (!res.x && !res.y) {
            if (this.isLeftPressed(pS) && !this.isRightPressed(pS))
                res.x = -1;
            else if (this.isRightPressed(pS) && !this.isLeftPressed(pS))
                res.x = 1;
            if (this.isJumpPressed(pS))
                res.y = 1;
            // dive bomb if nothing pushed
            if (!res.x && !res.y)
                res.y = -1;
        }
        return res;
    }
    isLeftPressed(pI) {
        const set = this.getKeyboardSet(pI);
        const keyboardLeft = this.keyboard.anyKeyDown(set.left) && !this.keyboard.anyKeyDown(set.right);
        const dPadLeft = this.pads.anyButtonDown(pI, ['dPadLeft']);
        return keyboardLeft || dPadLeft;
    }
    isRightPressed(pI) {
        const set = this.getKeyboardSet(pI);
        const keyboardRight = this.keyboard.anyKeyDown(set.right) && !this.keyboard.anyKeyDown(set.left);
        const dPadRight = this.pads.anyButtonDown(pI, ['dPadRight']);
        return keyboardRight || dPadRight;
    }
    isGrowPressed(pI) {
        const set = this.getKeyboardSet(pI);
        return this.keyboard.anyKeyDown(set.grow);
    }
    isShrinkPressed(pI) {
        const set = this.getKeyboardSet(pI);
        return this.keyboard.anyKeyDown(set.shrink);
    }
    wasDebugKeyJustPushed() {
        return this.keyboard.anyKeysJustPushed(['KeyG']);
    }
}
exports.Input = Input;
