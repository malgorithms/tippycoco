"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$ = exports.isMobile = void 0;
function isMobile() {
    if (/iPad|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return true;
    }
    else {
        return false;
    }
}
exports.isMobile = isMobile;
const $ = (s) => document.querySelector(s);
exports.$ = $;
