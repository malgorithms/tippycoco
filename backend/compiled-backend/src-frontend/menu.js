"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Menu = exports.MenuAction = void 0;
const ai_1 = require("./ai/ai");
const color_1 = require("./color");
const persistence_1 = require("./persistence");
const player_1 = require("./player");
const tweakables_1 = __importDefault(require("./tweakables"));
const utils_1 = require("./utils");
const springlike_1 = require("./springlike");
var MenuAction;
(function (MenuAction) {
    MenuAction["ReturnToGame"] = "return-to-game";
    MenuAction["Play"] = "play";
    MenuAction["Exit"] = "exit";
})(MenuAction || (MenuAction = {}));
exports.MenuAction = MenuAction;
const returnToGameEntry = { text: 'Return to Game', action: MenuAction.ReturnToGame, card: 'menuCardReturnToGame' };
function aiEntry(ai, numBalls, card, unlockRequirement) {
    const res = {
        text: (0, ai_1.aiToNickname)(ai),
        action: MenuAction.Play,
        opponentType: player_1.PlayerSpecies.Ai,
        ai,
        numBalls,
        card,
        unlockRequirement,
    };
    if ((0, ai_1.aiToName)(ai) === 'Gray')
        res.ballTexture = 'ballTennis';
    return res;
}
function humanEntry(numBalls) {
    return {
        text: numBalls === 1 ? `1 ball` : `${numBalls} balls`,
        action: MenuAction.Play,
        card: 'menuCardHuman1Ball',
        opponentType: player_1.PlayerSpecies.Human,
        numBalls,
    };
}
const menuRows = [];
// this one is special as we'll pop it off/reinsert it as needed.
const returnRow = {
    title: ' ',
    entries: [returnToGameEntry],
};
//menuRows.push(returnRow)
menuRows.push({
    title: 'Solo',
    entries: [
        aiEntry(ai_1.ais.Green, 1, 'menuCardPlayGreen'),
        aiEntry(ai_1.ais.Orange, 1, 'menuCardPlayOrange', { defeat: 'Green', defeatType: 'win' }),
        aiEntry(ai_1.ais.Gray, 1, 'menuCardPlayGray', { defeat: 'Orange', defeatType: 'win' }),
        aiEntry(ai_1.ais.Purple, 2, 'menuCardPlayPurple', { defeat: 'Gray', defeatType: 'win' }),
        aiEntry(ai_1.ais.Yellow, 1, 'menuCardPlayYellow', { defeat: 'Purple', defeatType: 'no-jumping' }),
        aiEntry(ai_1.ais.Black, 1, 'menuCardPlayBlack', { defeat: 'Yellow', defeatType: 'win' }),
        aiEntry(ai_1.ais.White, 2, 'menuCardPlayWhite', { defeat: 'Black', defeatType: 'shutout' }),
    ],
});
menuRows.push({
    title: '2 Player',
    entries: [humanEntry(1), humanEntry(2)],
});
menuRows.push({
    title: 'Give up',
    entries: [{ text: 'Quit', action: MenuAction.Exit, card: 'menuCardExit' }],
});
class Menu {
    unlockAll;
    display;
    rows;
    selRow = 0;
    selCol = 0;
    playerOwnsMenu = null; // If this is null, any controller can control menu.
    constructor(display) {
        this.display = display;
        this.rows = menuRows;
        this.unlockAll = false;
    }
    get spriteBatch() {
        return this.display.getSpriteBatch();
    }
    get selection() {
        return this.selectedEntry.action;
    }
    get selectedEntry() {
        return this.selectedRow.entries[this.selCol];
    }
    get selectedRow() {
        return this.rows[this.selRow];
    }
    getEntry(row, col) {
        return this.rows[row].entries[col];
    }
    findRowColForMenuAction(menuAction) {
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            for (let j = 0; j < row.entries.length; j++) {
                const entry = row.entries[j];
                if (entry.action === menuAction)
                    return [i, j];
            }
        }
        throw new Error('not found');
    }
    select(menuOption, playerSide) {
        if (menuOption === MenuAction.ReturnToGame) {
            this.enforceAllowReturn(true);
        }
        if (this.playerOwnsMenu === null || this.playerOwnsMenu === playerSide) {
            const [row, col] = this.findRowColForMenuAction(menuOption);
            this.selCol = col;
            this.selRow = row;
            this.updateSpringCardTargets();
        }
    }
    isLockedReason(entry) {
        if (entry.unlockRequirement && !this.unlockAll) {
            return this.lockCheckReason(entry.unlockRequirement);
        }
        return false;
    }
    /**
     * returns false if not locked, otherwise a string explaining why
     * @param ur
     * @returns
     */
    lockCheckReason(ur) {
        const d = persistence_1.persistence.data.aiRecord[ur.defeat];
        if (ur.defeatType === 'win') {
            if (d.wins > 0)
                return false;
            else
                return `defeat ${(0, ai_1.aiToNickname)(ur.defeat)}`;
        }
        else if (ur.defeatType === 'no-jumping') {
            if (d.noJumpWins > 0)
                return false;
            else
                return `beat ${(0, ai_1.aiToNickname)(ur.defeat)} w/o jumping`;
        }
        else if (ur.defeatType === 'shutout') {
            if (d.shutoutWins > 0)
                return false;
            else
                return `shut out ${(0, ai_1.aiToNickname)(ur.defeat)}`;
        }
        else {
            throw new Error(`unknown unlock requirement ${ur.defeatType}`);
        }
    }
    isOnLockedSelection() {
        return this.isLockedReason(this.selectedEntry) ? true : false;
    }
    beat(totalSeconds) {
        return 2.0 * Math.PI * totalSeconds * (tweakables_1.default.menu.bpm / 60);
    }
    drawDancingMenuText(s, destination, totalSeconds, relSize) {
        /* dancing stuff */
        const beat = this.beat(totalSeconds);
        const sizeMultiplier = 0.2 + Math.sin(beat / 2) / 100 + Math.sin(beat / 8) / 100;
        const size = sizeMultiplier * relSize;
        const rotation = -0.1 + Math.sin(beat / 16) / 32;
        const backgroundColor = new color_1.Color(0.0, 0.0, 0.0, 0.75);
        const backgroundColor2 = new color_1.Color(0.0, 0.0, 0.0, 0.15);
        const foregroundColor = color_1.Colors.white;
        const p0 = utils_1.vec.add(destination, { x: -0.01, y: -0.01 });
        const p1 = utils_1.vec.add(destination, { x: 0.01, y: 0.02 });
        const p2 = destination;
        const font = this.display.font('extraBold');
        this.spriteBatch.drawStringCentered(s, font, size, p0, backgroundColor2, rotation, false);
        this.spriteBatch.drawStringCentered(s, font, size, p1, backgroundColor, rotation, false);
        this.spriteBatch.drawStringCentered(s, font, size, p2, foregroundColor, rotation, false);
    }
    getSpringCard(row, col) {
        const entry = this.getEntry(row, col);
        if (entry.springCard)
            return entry.springCard;
        else {
            const tCfg = tweakables_1.default.menu.springCards;
            const pos = this.targetCardCenter(row, col);
            const width = this.targetCardWidth(row, col);
            const sc = new springlike_1.SpringCard(pos, width, tCfg.velK, tCfg.sizeK, tCfg.velDamp, tCfg.sizeDamp);
            entry.springCard = sc;
            return sc;
        }
    }
    updateSpringCardTargets() {
        for (let row = 0; row < this.rows.length; row++) {
            for (let col = 0; col < this.rows[row].entries.length; col++) {
                const sc = this.getSpringCard(row, col);
                sc.targetPos = this.targetCardCenter(row, col);
                sc.targetSize = this.targetCardWidth(row, col);
            }
        }
    }
    targetCardCenter(row, col) {
        const tM = tweakables_1.default.menu;
        const vRect = this.display.viewableRegion;
        const ctr = { x: (vRect.x1 + vRect.x2) / 2, y: (vRect.y1 + vRect.y2) / 2 };
        const y = ctr.y + (this.selRow - row) * tM.rowHeight;
        // if we're to the left of the selected one, we treat differently from to the right
        const colOffset = col - this.selCol;
        let x = 0;
        if (colOffset < 0) {
            x = ctr.x + (col - this.selCol) * tM.colLeftWidth; // vRect.x1 + marg + col * tM.cardWidth
        }
        else {
            x = ctr.x + (col - this.selCol) * tM.colRightWidth; // vRect.x1 + marg + col * tM.cardWidth
        }
        return { x, y };
    }
    targetCardWidth(row, col) {
        const tM = tweakables_1.default.menu;
        if (row === this.selRow && col === this.selCol)
            return tM.cardWidthSelectedCard;
        else if (row === this.selRow)
            return tM.cardWidthSelectedRow;
        else
            return tM.cardWidth;
    }
    cardWidth(gameTime, row, col) {
        const beat = this.beat(gameTime.totalGameTime.totalSeconds);
        const bounce = tweakables_1.default.menu.cardSizeBounce;
        const sizeMultiplier = Math.sin(beat / 8) * bounce + Math.sin(beat / 32) * bounce;
        const sc = this.getSpringCard(row, col);
        return sc.size * (1 + sizeMultiplier);
    }
    cardRotation(gameTime, row, col) {
        const beat = this.beat(gameTime.totalGameTime.totalSeconds) + row + col;
        const bounce = tweakables_1.default.menu.cardRotationBounce;
        const rot = Math.sin(beat / 16) * bounce + Math.sin(beat / 64) * bounce;
        if (row === this.selRow && col === this.selCol)
            return rot;
        else if (row === this.selRow)
            return -rot;
        else
            return rot;
    }
    drawCard(row, col, center, isSelected, gameTime) {
        const tMenu = tweakables_1.default.menu;
        const entry = this.getEntry(row, col);
        const cardWidth = this.cardWidth(gameTime, row, col);
        const texture = this.display.getTexture(entry.card);
        const dims = this.spriteBatch.autoDim(cardWidth, texture);
        const rotation = this.cardRotation(gameTime, row, col);
        const shadowTexture = this.display.getTexture('menuCardShadow');
        const lockOverlay = this.display.getTexture('menuCardLockOverlay');
        const sCenter = utils_1.vec.add(center, { x: 0.03, y: -0.03 });
        const lockReason = this.isLockedReason(entry);
        const cosRot = Math.cos(rotation); // useful for attachments
        const relPos = (v) => ({
            x: center.x + ((cosRot * dims.w) / 2) * v.x,
            y: center.y + ((cosRot * dims.h) / 2) * v.y,
        });
        // shadow
        this.spriteBatch.drawTextureCentered(shadowTexture, sCenter, dims, rotation, 1);
        // then the card itself
        this.spriteBatch.drawTextureCentered(texture, center, dims, rotation, 1);
        // now any attachments, such as #ball icons, etc.
        const ballSize = cardWidth * tMenu.cardBallSize;
        const ball1Pos = relPos(tMenu.cardBall1Pos);
        const ball2Pos = relPos(tMenu.cardBall2Pos);
        const ball1Texture = this.display.getTexture(entry.ballTexture ?? 'ball1');
        const ball2Texture = this.display.getTexture(entry.ballTexture ?? 'ball2');
        const ballRot = isSelected ? gameTime.totalGameTime.totalSeconds : rotation;
        if (entry.numBalls === 1) {
            this.spriteBatch.drawTextureCentered(ball1Texture, ball1Pos, { w: ballSize, h: ballSize }, ballRot, 1);
        }
        if (entry.numBalls === 2) {
            this.spriteBatch.drawTextureCentered(ball1Texture, ball2Pos, { w: ballSize, h: ballSize }, ballRot, 1);
            this.spriteBatch.drawTextureCentered(ball2Texture, ball1Pos, { w: ballSize, h: ballSize }, ballRot, 1);
        }
        // then lock overlay, if it's locked
        if (lockReason) {
            this.spriteBatch.drawTextureCentered(lockOverlay, center, dims, rotation, tMenu.lockOverlayAlpha);
            if (isSelected) {
                const txtCenter = relPos(tMenu.lockReasonPos);
                const txtCenter2 = relPos({ x: 0, y: -0 });
                const font = this.display.font('extraBold');
                this.spriteBatch.drawStringCentered(lockReason, font, tMenu.lockReasonSubsize, txtCenter, tMenu.lockReasonColor, -2 * rotation, false);
                this.spriteBatch.drawStringCentered('LOCKED', font, tMenu.lockReasonSize, txtCenter2, tMenu.lockReasonColor, -2 * rotation, false);
            }
        }
        // Draw the dancing text if it is currently selected
        const seconds = gameTime.totalGameTime.totalSeconds;
        if (isSelected /*&& !lockReason*/) {
            const textCenter = utils_1.vec.add(center, tMenu.textOffsetFromCard);
            this.drawDancingMenuText(entry.text, textCenter, seconds, 1);
        }
        const ai = entry.ai;
        if (isSelected && ai && !lockReason) {
            this.drawCardStats(entry, ai);
        }
    }
    drawCardStatLine(sL, sR, pos, isBad) {
        const tMenu = tweakables_1.default.menu;
        const colL = tMenu.statsColorLeft;
        const colR = isBad ? tMenu.statsColorRightBad : tMenu.statsColorRight;
        const sizeL = tMenu.statsFontSize;
        const sizeR = sizeL * tMenu.statsRightColFontMult;
        const fontL = this.display.font('regular');
        const fontR = this.display.font('extraBold');
        const drawOptsL = { textAlign: 'right' };
        const drawOptsR = { textAlign: 'left' };
        const posR = utils_1.vec.add(pos, tMenu.statsRightColAdj);
        this.spriteBatch.drawString(sL, fontL, sizeL, pos, colL, 0, drawOptsL);
        this.spriteBatch.drawString(sR, fontR, sizeR, posR, colR, 0, drawOptsR);
    }
    drawCardStats(item, ai) {
        // Stats at the bottom
        const tMenu = tweakables_1.default.menu;
        const pos = utils_1.vec.copy(tMenu.statsPosition);
        const record = persistence_1.persistence.data.aiRecord[(0, ai_1.aiToName)(ai)];
        const fastestWin = record.fastestWin ?? Infinity;
        const lSpace = tMenu.statsFontSize * tMenu.statsLineSpacing;
        this.drawCardStatLine(`wins:`, `${record.wins}`, pos, record.wins < 1);
        if (record.wins) {
            pos.y -= lSpace;
            this.drawCardStatLine(`shutouts:`, `${record.shutoutWins}`, pos, record.shutoutWins < 1);
            pos.y -= lSpace;
            this.drawCardStatLine(`no jump wins:`, `${record.noJumpWins}`, pos, record.noJumpWins < 1);
            pos.y -= lSpace;
            let emoji = '';
            for (const time of tMenu.statsFastestWinFlames) {
                if (fastestWin < time)
                    emoji += '🔥';
            }
            this.drawCardStatLine(`fastest win:`, `${fastestWin.toFixed(3)} ${emoji}`, pos, fastestWin > 60);
        }
        pos.y -= lSpace;
        this.drawCardStatLine(`plays:`, `${record.wins + record.losses}`, pos, false);
    }
    enforceAllowReturn(allow) {
        if (allow && this.rows[0] !== returnRow) {
            this.rows.splice(0, 0, returnRow);
            this.selRow = 0;
            this.selCol = 0;
        }
        if (!allow && this.rows[0] === returnRow) {
            this.rows.splice(0, 1);
        }
    }
    advanceSpringCards(dtSec) {
        for (let row = 0; row < this.rows.length; row++) {
            for (let col = 0; col < this.rows[row].entries.length; col++) {
                this.getSpringCard(row, col).step(dtSec);
            }
        }
    }
    rowNumsSortedByDrawOrder() {
        return Object.keys(this.rows)
            .sort((a, b) => Math.abs(this.selRow - parseInt(b)) - Math.abs(this.selRow - parseInt(a)))
            .map((s) => parseInt(s));
    }
    colNumsSortedByDrawOrder(entries) {
        return Object.keys(entries)
            .sort((a, b) => Math.abs(this.selCol - parseInt(b)) - Math.abs(this.selCol - parseInt(a)))
            .map((s) => parseInt(s));
    }
    draw(allowReturnToGame, gameTime) {
        const dtSec = gameTime.elapsedGameTime.totalSeconds;
        this.advanceSpringCards(dtSec);
        this.enforceAllowReturn(allowReturnToGame);
        const tMenu = tweakables_1.default.menu;
        // draw a cover over the existing game
        this.spriteBatch.drawScreenOverlay(tMenu.coverColor);
        // TODO: see if this is slow; menu is pretty small
        const rowNums = this.rowNumsSortedByDrawOrder();
        for (const rowNum of rowNums) {
            const colNums = this.colNumsSortedByDrawOrder(this.rows[rowNum].entries);
            for (const colNum of colNums) {
                const entry = this.getEntry(rowNum, colNum);
                const sc = entry.springCard;
                if (sc) {
                    if (rowNum === this.selRow && colNum === this.selCol) {
                        // since this one is done last, we can do the dark overlay
                        // underneath it, and cover all the other cards
                        this.spriteBatch.drawScreenOverlay(tMenu.deselectedCardColor);
                        this.drawCard(rowNum, colNum, sc.pos, true, gameTime);
                    }
                    else {
                        this.drawCard(rowNum, colNum, sc.pos, false, gameTime);
                    }
                }
            }
        }
        for (const rowNum of rowNums) {
            this.drawRowLabel(rowNum);
        }
    }
    drawRowLabel(rowNum) {
        const row = this.rows[rowNum];
        const tM = tweakables_1.default.menu;
        const sc = row.entries[0].springCard;
        if (sc) {
            const pos = utils_1.vec.add(sc.pos, { x: -0.6, y: -0.1 });
            const s = row.title;
            const font = this.display.font('extraBold');
            const c = rowNum === this.selRow ? tM.rowLabelSelectedColor : tM.rowLabelColor;
            this.spriteBatch.drawString(s, font, 0.05, pos, c, -0.7);
        }
    }
    advance(x, y) {
        this.selRow = (this.selRow + y + this.rows.length) % this.rows.length;
        const numCols = this.rows[this.selRow].entries.length;
        this.selCol = (this.selCol + x + numCols) % numCols;
        this.updateSpringCardTargets();
    }
    moveRight(owner) {
        if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner)
            this.advance(1, 0);
    }
    moveLeft(owner) {
        if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner)
            this.advance(-1, 0);
    }
    moveDown(owner) {
        if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner)
            this.advance(0, 1);
    }
    moveUp(owner) {
        if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner)
            this.advance(0, -1);
    }
    getWhoOwnsMenu() {
        return this.playerOwnsMenu;
    }
    setWhoOwnsMenu(playerSide) {
        this.playerOwnsMenu = playerSide;
    }
}
exports.Menu = Menu;
