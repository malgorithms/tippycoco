"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KapowManager = exports.Kapow = void 0;
class Kapow {
    age = 0;
    maxAgeSec;
    kapowName;
    pos;
    orientation;
    size;
    constructor(kapowName, pos, orientation, size, maxAgeSec) {
        this.kapowName = kapowName;
        this.pos = pos;
        this.orientation = orientation;
        this.maxAgeSec = maxAgeSec;
        this.size = size;
    }
    stepAndTestForDeath(dt) {
        this.age += dt;
        this.size += dt / 40;
        return this.age >= this.maxAgeSec;
    }
    fractionOfWayToDeath() {
        return this.age / this.maxAgeSec;
    }
}
exports.Kapow = Kapow;
class KapowManager {
    kapows = new Array();
    addAKapow(kapowName, pos, orientation, size, maxAgeSec) {
        this.kapows.push(new Kapow(kapowName, pos, orientation, size, maxAgeSec));
    }
    step(dt) {
        for (let i = this.kapows.length - 1; i >= 0; i--) {
            if (this.kapows[i].stepAndTestForDeath(dt))
                this.kapows.splice(i, 1);
        }
    }
}
exports.KapowManager = KapowManager;
