"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryManager = void 0;
class HistoryManager {
    lastTimeRecorder = new Map();
    recordEvent(eventName, gameTime) {
        this.lastTimeRecorder.set(eventName, gameTime.totalGameTime.totalSeconds);
    }
    hasHappenedRecently(eventName, gameTime, seconds) {
        const lastTime = this.lastTimeRecorder.get(eventName);
        if (!lastTime)
            return false;
        if (gameTime.totalGameTime.totalSeconds - lastTime > seconds)
            return false;
        return true;
    }
}
exports.HistoryManager = HistoryManager;
