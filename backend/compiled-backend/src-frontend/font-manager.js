"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FontManager = void 0;
const fontsToLoad = {
    extraBold: { family: 'Nunito Sans', weight: 600, url: '/fonts/NunitoSans/NunitoSans-ExtraBold.ttf' },
    regular: { family: 'Nunito Sans', weight: 400, url: '/fonts/NunitoSans/NunitoSans-Regular.ttf' },
};
class FontManager {
    content;
    fonts = new Map();
    constructor(content) {
        this.content = content;
    }
    getFont(name) {
        const res = this.fonts.get(name);
        if (!res)
            throw new Error(`Could not getFont() ${name}`);
        return res;
    }
    async loadOneFont(name, request) {
        await this.content.loadFont(request.family, request.url, request.weight);
        this.fonts.set(name, request);
    }
    async loadContent() {
        console.log(`Starting to load fonts`);
        const p = [];
        const start = Date.now();
        for (const k of Object.keys(fontsToLoad)) {
            const fontName = k;
            const request = fontsToLoad[fontName];
            p.push(this.loadOneFont(fontName, request));
        }
        await Promise.all(p);
        console.log(`Fonts loaded in ${Date.now() - start}ms.`);
        // This will throw an error in many browsers but is good for testing in Chrome/Safari:
        //console.log(`Fonts loaded in ${Date.now() - start}ms. Now available = `)
        //for (const f of document.fonts.entries()) {
        //  console.log('font: ', f)
        //}
    }
}
exports.FontManager = FontManager;
