"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const serve_favicon_1 = __importDefault(require("serve-favicon"));
const morgan_1 = __importDefault(require("morgan"));
const record_list_1 = require("./src-frontend/site/record-list");
const ai_1 = require("./src-frontend/ai/ai");
const tweakables_1 = __importDefault(require("./src-frontend/tweakables"));
const app = (0, express_1.default)();
const port = 3377;
const rootDir = path_1.default.join(__dirname, '..', '..');
app.set('view engine', 'toffee');
app.use(express_1.default.json());
app.use((0, morgan_1.default)('combined'));
app.enable('trust proxy');
app.use(express_1.default.static('dist'));
app.use((0, serve_favicon_1.default)(path_1.default.join(rootDir, 'dist', 'images', 'site', 'favicon.ico')));
const viewDir = path_1.default.join(rootDir, 'backend', 'views');
const serve = (res, fName, obj) => res.render(path_1.default.join(viewDir, fName), obj ?? {});
app.get('/', (_req, res) => serve(res, 'game.toffee'));
app.get('/play', (_req, res) => serve(res, 'game.toffee'));
app.get('/instructions', (_req, res) => serve(res, 'instructions.toffee'));
app.get('/about', (_req, res) => serve(res, 'about.toffee'));
app.get('/records', (_req, res) => serve(res, 'records.toffee', { reportedScores: record_list_1.reportedScores, aiToNickname: ai_1.aiToNickname }));
app.get('/community', (_req, res) => serve(res, 'community.toffee', { tweakables: tweakables_1.default }));
// Simple gameplay logging to see how often it is played/won/etc.
// without 3rd party cookie garbage.
const gameLog = path_1.default.join(__dirname, 'games.log');
function dateStr(d) {
    const p = (n, dig) => `${n}`.padStart(dig, '0');
    const year = d.getFullYear();
    const month = p(d.getMonth() + 1, 2);
    const date = p(d.getDate(), 2);
    const hour = p(d.getHours(), 2);
    const min = p(d.getMinutes(), 2);
    const sec = p(d.getSeconds(), 2);
    const ms = p(d.getMilliseconds(), 4);
    return `${year}-${month}-${date}-${hour}:${min}:${sec}.${ms}`;
}
//
// basic text logging of gameplay
//
app.post('/api/persistence', async (req, res) => {
    const o = req.body;
    if (o?.action === 'log') {
        const txt = (o?.text || '-').slice(0, 120);
        const logLine = `${dateStr(new Date())} [${o?.playerId ?? 'unknown'}] ${txt}`;
        await promises_1.default.appendFile(gameLog, logLine + '\n');
        console.log(logLine);
    }
    res.json({ status: 0 });
});
app.listen(port, () => console.log(`Listening. Visit http://localhost:${port}`));
