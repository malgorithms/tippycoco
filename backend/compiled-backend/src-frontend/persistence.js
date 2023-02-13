"use strict";
/**
 *  This class is for maintaining state across multiple plays of the game
 *  in the same browser.
 *
 *  One thing we want to be careful of is the player having 2 tabs open at once with the
 *  game. If they unlock something in one, we wouldn't want them to lose it in the other by
 *  the second overwriting local storage. So we should try to increment values
 *  in the local store and then always use that as a source of truth, not what's in memory
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistence = void 0;
const ai_1 = require("./ai/ai");
const constants_1 = __importDefault(require("./constants"));
const utils_1 = require("./utils");
class Persistence {
    constructor() {
        this.writeData(this.data);
        const hoursAgo = (Date.now() - this.data.firstPlayed) / 3600000;
        const d = this.data;
        console.log(`You have completed ${d.games.completed} game(s) on this computer.`);
        //console.log(this.data)
        this.log('ready to play.');
    }
    get data() {
        let o = {};
        try {
            const str = window.localStorage.getItem('gameData');
            o = JSON.parse(str ?? '{}');
        }
        catch (err) {
            console.error(err);
        }
        const data = {
            gameVersion: o.gameVersion ?? constants_1.default.version,
            firstPlayed: o.firstPlayed ?? Date.now(),
            lastPlayed: o.lastPlayed ?? Date.now(),
            games: {
                started: o.games?.started ?? 0,
                completed: o.games?.completed ?? 0,
            },
            aiRecord: this.emptyAiRecord(),
            playerId: o.playerId ?? this.randomPlayerId(),
        };
        const prevRecord = o.aiRecord || {};
        for (const aiName of ai_1.aiNames) {
            data.aiRecord[aiName] = {
                wins: prevRecord[aiName]?.wins ?? 0,
                losses: prevRecord[aiName]?.losses ?? 0,
                shutoutWins: prevRecord[aiName]?.shutoutWins ?? 0,
                noJumpWins: prevRecord[aiName]?.noJumpWins ?? 0,
                fastestWin: prevRecord[aiName]?.fastestWin ?? null,
            };
        }
        return data;
    }
    writeData(d) {
        window.localStorage.setItem('gameData', JSON.stringify(d));
    }
    incGamesStarted(numBalls, species, aiName) {
        this.log(`game started. numBalls=${numBalls}, species=${species}, ai=${aiName || ''}`);
        const d = this.data;
        const now = Date.now();
        d.lastPlayed = now;
        d.games.started++;
        this.writeData(d);
    }
    incGamesCompleted() {
        this.log('game complete.');
        const d = this.data;
        d.lastPlayed = Date.now();
        d.games.completed++;
        this.writeData(d);
    }
    recordResultAgainstAi(aiName, win, shutoutWin, seconds, jumpCount) {
        this.log(`ai result. against=${aiName} win=${win} shutout=${shutoutWin} seconds=${seconds} jumps=${jumpCount}`);
        const d = this.data;
        const record = d.aiRecord[aiName];
        //console.log({aiName, win, shutoutWin, seconds, jumpCount})
        if (win) {
            record.wins++;
            if (shutoutWin)
                record.shutoutWins++;
            if (!jumpCount)
                record.noJumpWins++;
            if (!record.fastestWin || seconds < record.fastestWin)
                record.fastestWin = seconds;
        }
        else {
            record.losses++;
        }
        //console.log(`About to write`, JSON.stringify(d, null, 2))
        //console.log(`Before write:`, JSON.stringify(this.data, null, 2))
        this.writeData(d);
        //console.log(`After write:`, JSON.stringify(this.data, null, 2))
    }
    emptyAiRecord() {
        const res = {};
        for (const aiName of ai_1.aiNames) {
            res[aiName] = { wins: 0, losses: 0, shutoutWins: 0, noJumpWins: 0, fastestWin: null };
        }
        return res;
    }
    randomPlayerId() {
        return (0, utils_1.randomByteHexString)(16);
    }
    log(text) {
        const msg = { action: 'log', playerId: this.data.playerId, text };
        const post = JSON.stringify(msg);
        const url = '/api/persistence';
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
        xhr.send(post);
        xhr.onload = () => {
            if (xhr.status === 201) {
                //console.log(`log: ${text}`)
            }
        };
    }
}
const persistence = new Persistence();
exports.persistence = persistence;
