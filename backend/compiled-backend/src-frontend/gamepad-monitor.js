"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamepadMonitor = void 0;
const tweakables_1 = __importDefault(require("./tweakables"));
const types_1 = require("./types");
const utils_1 = require("./utils");
class GamepadMonitor {
    currAssigned = new Map();
    prevAssigned = new Map();
    unassigned = new Array();
    currState = new Map();
    prevState = new Map();
    constructor() {
        window.addEventListener('gamepadconnected', (e) => this.connect(e.gamepad));
        window.addEventListener('gamepaddisconnected', (e) => this.disconnect(e.gamepad));
        this.pollingLoop();
    }
    update() {
        this.prevState = new Map();
        for (const [gamepadId, gamepadState] of this.currState.entries()) {
            this.prevState.set(gamepadId, gamepadState);
        }
        this.currState = new Map();
        const gamepads = navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (gamepad) {
                const state = this.getStateFromGamepad(gamepad);
                this.currState.set(gamepad.id, state);
            }
        }
        this.prevAssigned = new Map(this.currAssigned);
    }
    swapSides() {
        console.log(`Swapping controller sides`);
        const prevLeft = this.currAssigned.get(types_1.PlayerSide.Left);
        const prevRight = this.currAssigned.get(types_1.PlayerSide.Right);
        this.currAssigned = new Map();
        if (prevLeft)
            this.currAssigned.set(types_1.PlayerSide.Right, prevLeft);
        if (prevRight)
            this.currAssigned.set(types_1.PlayerSide.Left, prevRight);
    }
    wasPlayerJustDisconnected(playerSide) {
        return !this.currAssigned.has(playerSide) && this.prevAssigned.has(playerSide);
    }
    wasPlayerJustConnected(playerSide) {
        return this.currAssigned.has(playerSide) && !this.prevAssigned.has(playerSide);
    }
    doesPlayerHaveGamepad(playerSide) {
        return this.currAssigned.has(playerSide);
    }
    wasThumbstickPushedXBy(playerSide, stickName, x) {
        const gamepad = this.currAssigned.get(playerSide);
        if (!gamepad)
            return false;
        const currState = this.currState.get(gamepad.id);
        const prevState = this.prevState.get(gamepad.id);
        let currPushed;
        let prevPushed;
        if (x < 0) {
            currPushed = currState ? currState.thumbSticks[stickName].x < x : false;
            prevPushed = prevState ? prevState.thumbSticks[stickName].x < x : false;
        }
        else {
            currPushed = currState ? currState.thumbSticks[stickName].x > x : false;
            prevPushed = prevState ? prevState.thumbSticks[stickName].x > x : false;
        }
        if (currPushed && !prevPushed)
            return true;
        return false;
    }
    wasThumbstickPushedYBy(playerSide, stickName, y) {
        const yFlip = -y;
        const gamepad = this.currAssigned.get(playerSide);
        if (!gamepad)
            return false;
        const currState = this.currState.get(gamepad.id);
        const prevState = this.prevState.get(gamepad.id);
        let currPushed;
        let prevPushed;
        if (yFlip < 0) {
            currPushed = currState ? currState.thumbSticks[stickName].y < yFlip : false;
            prevPushed = prevState ? prevState.thumbSticks[stickName].y < yFlip : false;
        }
        else {
            currPushed = currState ? currState.thumbSticks[stickName].y > yFlip : false;
            prevPushed = prevState ? prevState.thumbSticks[stickName].y > yFlip : false;
        }
        if (currPushed && !prevPushed)
            return true;
        return false;
    }
    wasThumbstickPushedDownBy(playerSide, thumbstickName) {
        return this.wasThumbstickPushedYBy(playerSide, thumbstickName, -tweakables_1.default.input.thumbstickPush);
    }
    wasThumbstickPushedUpBy(playerSide, thumbstickName) {
        return this.wasThumbstickPushedYBy(playerSide, thumbstickName, tweakables_1.default.input.thumbstickPush);
    }
    wasThumbstickPushedLeftBy(playerSide, thumbstickName) {
        return this.wasThumbstickPushedXBy(playerSide, thumbstickName, -tweakables_1.default.input.thumbstickPush);
    }
    wasThumbstickPushedRightBy(playerSide, thumbstickName) {
        return this.wasThumbstickPushedXBy(playerSide, thumbstickName, tweakables_1.default.input.thumbstickPush);
    }
    wasThumbstickPushedDown(thumbstickName) {
        for (const playerSide of this.currAssigned.keys()) {
            const found = this.wasThumbstickPushedDownBy(playerSide, thumbstickName);
            if (found)
                return true;
        }
        return false;
    }
    wasThumbstickPushedUp(thumbstickName) {
        for (const playerSide of this.currAssigned.keys()) {
            const found = this.wasThumbstickPushedUpBy(playerSide, thumbstickName);
            if (found)
                return true;
        }
        return false;
    }
    wasThumbstickPushedLeft(thumbstickName) {
        for (const playerSide of this.currAssigned.keys()) {
            const found = this.wasThumbstickPushedLeftBy(playerSide, thumbstickName);
            if (found)
                return true;
        }
        return false;
    }
    wasThumbstickPushedRight(thumbstickName) {
        for (const playerSide of this.currAssigned.keys()) {
            const found = this.wasThumbstickPushedRightBy(playerSide, thumbstickName);
            if (found)
                return true;
        }
        return false;
    }
    anyButtonsPushedByAnyone(buttonNames) {
        for (const playerSide of this.currAssigned.keys()) {
            const found = this.anyButtonsPushedBy(playerSide, buttonNames);
            if (found)
                return true;
        }
        return false;
    }
    anyButtonDown(playerSide, buttonNames) {
        const gamepad = this.currAssigned.get(playerSide);
        if (gamepad) {
            for (const buttonName of buttonNames) {
                const currState = this.currState.get(gamepad.id);
                if (currState) {
                    if (currState.buttons[buttonName]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    anyButtonsPushedBy(playerSide, buttonNames) {
        const gamepad = this.currAssigned.get(playerSide);
        if (gamepad) {
            for (const buttonName of buttonNames) {
                const currState = this.currState.get(gamepad.id);
                const prevState = this.prevState.get(gamepad.id);
                const currPushed = currState && currState.buttons[buttonName];
                const prevPushed = prevState && prevState.buttons[buttonName];
                if (currPushed && !prevPushed) {
                    return true;
                }
            }
        }
        return false;
    }
    getTrigger(playerSide, triggerName) {
        const gamepad = this.currAssigned.get(playerSide);
        if (gamepad) {
            const state = this.currState.get(gamepad.id);
            if (state)
                return state.triggers[triggerName];
            else
                0;
        }
        return 0;
    }
    getThumbStick(playerSide, thumbstickName) {
        const gamepad = this.currAssigned.get(playerSide);
        if (gamepad) {
            const state = this.currState.get(gamepad.id);
            if (state)
                return state.thumbSticks[thumbstickName];
            else
                return { x: 0, y: 0 };
        }
        return { x: 0, y: 0 };
    }
    getStateFromPlayer(playerSide) {
        const gp = this.currAssigned.get(playerSide);
        const prev = this.prevAssigned.get(playerSide);
        if (!gp || !prev)
            return null;
        return this.getStateFromGamepad(gp);
    }
    getStateFromGamepad(gamepad) {
        const { buttons, axes } = gamepad;
        return {
            isConnected: true,
            triggers: {
                left: buttons[6].value,
                right: buttons[7].value,
            },
            thumbSticks: {
                left: { x: axes[0], y: axes[1] },
                right: { x: axes[2], y: axes[3] },
            },
            buttons: {
                dPadUp: buttons[12]?.pressed ?? false,
                dPadDown: buttons[13]?.pressed ?? false,
                dPadLeft: buttons[14]?.pressed ?? false,
                dPadRight: buttons[15]?.pressed ?? false,
                psX: gamepad.buttons[0]?.pressed ?? false,
                psO: gamepad.buttons[1]?.pressed ?? false,
                psSquare: gamepad.buttons[2]?.pressed ?? false,
                start: gamepad.buttons[9]?.pressed ?? false,
                leftStick: gamepad.buttons[10]?.pressed ?? false,
                rightStick: gamepad.buttons[11]?.pressed ?? false,
                rightShoulder: gamepad.buttons[5]?.pressed ?? false,
            },
        };
    }
    // some older browsers may miss a connect/disconnect
    // annoying that this has to exist
    async pollingLoop() {
        while (true) {
            await (0, utils_1.timeout)(500);
            const gamepads = navigator.getGamepads().reduce((arr, gp) => {
                gp && arr.push(gp);
                return arr;
            }, new Array());
            // notice anything new connected
            for (const gamepad of gamepads) {
                if (!this.isKnownYet(gamepad)) {
                    this.connect(gamepad);
                }
            }
            // notice anything previously connected that disappeared
            for (const prev of this.getAssignedAndUnassigned()) {
                if (gamepads.filter((gp) => gp.id === prev.id).length === 0) {
                    this.disconnect(prev);
                }
            }
        }
    }
    getAssignedAndUnassigned() {
        return Array.from(this.currAssigned.values()).concat(this.unassigned);
    }
    isKnownYet(gamepad) {
        for (const candidate of this.getAssignedAndUnassigned()) {
            if (gamepad.id === candidate.id)
                return true;
        }
        return false;
    }
    connect(gamepad) {
        if (!this.isKnownYet(gamepad)) {
            this.unassigned.push(gamepad);
            console.log('connected', gamepad);
            this.updateAssignments();
        }
    }
    updateAssignments() {
        for (const pSide of [types_1.PlayerSide.Left, types_1.PlayerSide.Right]) {
            if (!this.currAssigned.get(pSide) && this.unassigned.length) {
                const gamePad = this.unassigned.splice(0, 1)[0];
                this.currAssigned.set(pSide, gamePad);
            }
        }
    }
    disconnect(gamepad) {
        // remove from assigned
        for (const pSide of [types_1.PlayerSide.Left, types_1.PlayerSide.Right]) {
            const gamePad = this.currAssigned.get(pSide);
            if (gamePad && gamePad.id === gamepad.id) {
                console.log('disconnected from assigned', gamepad);
                this.currAssigned.delete(pSide);
            }
        }
        // remove from unassigned
        this.unassigned = this.unassigned.filter((u) => u.id !== gamepad.id);
        this.updateAssignments();
    }
}
exports.GamepadMonitor = GamepadMonitor;
