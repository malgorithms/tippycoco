import {AiName, ais, aiToName, aiToNickname, KnownAi} from './ai/ai'
import {Color, Colors} from './color'
import {Display} from './display'
import {TextureName} from './content-load-list'
import {persistence} from './persistence'
import {PlayerSpecies} from './player'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {GameTime, PlayerSide, TextDrawOptions, Vector2} from './types'
import {vec} from './utils'
import {SpringCard} from './springlike'

enum MenuAction {
  ReturnToGame = 'return-to-game',
  Play = 'play',
  Exit = 'exit',
}
type UnlockRequirement = {
  defeat: AiName
  defeatType: 'win' | 'shutout' | 'no-jumping'
}
interface MenuEntry {
  text: string
  action: MenuAction
  opponentType?: PlayerSpecies
  ai?: KnownAi
  numBalls?: number
  card: TextureName
  unlockRequirement?: UnlockRequirement
  springCard?: SpringCard
  ballTexture?: TextureName
}
type MenuRow = {
  title: string
  entries: MenuEntry[]
}

const returnToGameEntry: MenuEntry = {text: 'Return to Game', action: MenuAction.ReturnToGame, card: 'menuCardReturnToGame'}

function aiEntry(ai: KnownAi, numBalls: number, card: TextureName, unlockRequirement?: UnlockRequirement): MenuEntry {
  const res: MenuEntry = {
    text: aiToNickname(ai),
    action: MenuAction.Play,
    opponentType: PlayerSpecies.Ai,
    ai,
    numBalls,
    card,
    unlockRequirement,
  }
  if (aiToName(ai) === 'Gray') res.ballTexture = 'ballTennis'
  return res
}
function humanEntry(numBalls: number): MenuEntry {
  return {
    text: numBalls === 1 ? `1 ball` : `${numBalls} balls`,
    action: MenuAction.Play,
    card: 'menuCardHuman1Ball',
    opponentType: PlayerSpecies.Human,
    numBalls,
  }
}

const menuRows: MenuRow[] = []

// this one is special as we'll pop it off/reinsert it as needed.
const returnRow: MenuRow = {
  title: ' ',
  entries: [returnToGameEntry],
}
//menuRows.push(returnRow)
menuRows.push({
  title: '1 Player',
  entries: [
    aiEntry(ais.Green, 1, 'menuCardPlayGreen'),
    aiEntry(ais.Orange, 1, 'menuCardPlayOrange', {defeat: 'Green', defeatType: 'win'}),
    aiEntry(ais.Gray, 1, 'menuCardPlayGray', {defeat: 'Orange', defeatType: 'win'}),
    aiEntry(ais.Purple, 2, 'menuCardPlayPurple', {defeat: 'Gray', defeatType: 'win'}),
    aiEntry(ais.Yellow, 1, 'menuCardPlayYellow', {defeat: 'Purple', defeatType: 'no-jumping'}),
    aiEntry(ais.Black, 1, 'menuCardPlayBlack', {defeat: 'Yellow', defeatType: 'win'}),
    aiEntry(ais.White, 2, 'menuCardPlayWhite', {defeat: 'Black', defeatType: 'shutout'}),
  ],
})

menuRows.push({
  title: '2 Player',
  entries: [humanEntry(1), humanEntry(2)],
})

menuRows.push({
  title: 'Give up',
  entries: [{text: 'Quit', action: MenuAction.Exit, card: 'menuCardExit'}],
})

type MenuOwnership = PlayerSide | null

class Menu {
  private display: Display
  private rows: MenuRow[]
  private selRow = 0
  private selCol = 0
  private playerOwnsMenu: MenuOwnership = null // If this is null, any controller can control menu.

  public constructor(display: Display) {
    this.display = display
    this.rows = menuRows
  }
  private get spriteBatch(): SpriteBatch {
    return this.display.getSpriteBatch()
  }
  public get selection(): MenuAction {
    return this.selectedEntry.action
  }
  public get selectedEntry() {
    return this.selectedRow.entries[this.selCol]
  }
  private get selectedRow() {
    return this.rows[this.selRow]
  }
  private getEntry(row: number, col: number) {
    return this.rows[row].entries[col]
  }
  private findRowColForMenuAction(menuAction: MenuAction): [number, number] {
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]
      for (let j = 0; j < row.entries.length; j++) {
        const entry = row.entries[j]
        if (entry.action === menuAction) return [i, j]
      }
    }
    throw new Error('not found')
  }
  public select(menuOption: MenuAction, playerSide: PlayerSide | null) {
    if (menuOption === MenuAction.ReturnToGame) {
      this.enforceAllowReturn(true)
    }
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === playerSide) {
      const [row, col] = this.findRowColForMenuAction(menuOption)
      this.selCol = col
      this.selRow = row
      this.updateSpringCardTargets()
    }
  }
  private isLockedReason(entry: MenuEntry): false | string {
    if (entry.unlockRequirement) {
      return this.lockCheckReason(entry.unlockRequirement)
    }
    return false
  }
  /**
   * returns false if not locked, otherwise a string explaining why
   * @param ur
   * @returns
   */
  private lockCheckReason(ur: UnlockRequirement): false | string {
    const d = persistence.data.aiRecord[ur.defeat]
    if (ur.defeatType === 'win') {
      if (d.wins > 0) return false
      else return `defeat ${aiToNickname(ur.defeat)}`
    } else if (ur.defeatType === 'no-jumping') {
      if (d.noJumpWins > 0) return false
      else return `beat ${aiToNickname(ur.defeat)} w/o jumping`
    } else if (ur.defeatType === 'shutout') {
      if (d.shutoutWins > 0) return false
      else return `shut out ${aiToNickname(ur.defeat)}`
    } else {
      throw new Error(`unknown unlock requirement ${ur.defeatType}`)
    }
  }
  public isOnLockedSelection(): boolean {
    return this.isLockedReason(this.selectedEntry) ? true : false
  }
  private beat(totalSeconds: number) {
    return 2.0 * Math.PI * totalSeconds * (tweakables.menu.bpm / 60)
  }
  private drawDancingMenuText(s: string, destination: Vector2, totalSeconds: number, relSize: number) {
    /* dancing stuff */
    const beat = this.beat(totalSeconds)
    const sizeMultiplier = 0.2 + Math.sin(beat / 2) / 100 + Math.sin(beat / 8) / 100
    const size = sizeMultiplier * relSize
    const rotation = -0.1 + Math.sin(beat / 16) / 32
    const backgroundColor = new Color(0.0, 0.0, 0.0, 0.75)
    const backgroundColor2 = new Color(0.0, 0.0, 0.0, 0.15)
    const foregroundColor = Colors.white
    const p0 = vec.add(destination, {x: -0.01, y: -0.01})
    const p1 = vec.add(destination, {x: 0.01, y: 0.02})
    const p2 = destination
    const font = this.display.font('extraBold')
    this.spriteBatch.drawStringCentered(s, font, size, p0, backgroundColor2, rotation, false)
    this.spriteBatch.drawStringCentered(s, font, size, p1, backgroundColor, rotation, false)
    this.spriteBatch.drawStringCentered(s, font, size, p2, foregroundColor, rotation, false)
  }

  private getSpringCard(row: number, col: number): SpringCard {
    const entry = this.getEntry(row, col)
    if (entry.springCard) return entry.springCard
    else {
      const tCfg = tweakables.menu.springCards
      const pos = this.targetCardCenter(row, col)
      const width = this.targetCardWidth(row, col)
      const sc = new SpringCard(pos, width, tCfg.velK, tCfg.sizeK, tCfg.velDamp, tCfg.sizeDamp)
      entry.springCard = sc
      return sc
    }
  }
  private updateSpringCardTargets() {
    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < this.rows[row].entries.length; col++) {
        const sc = this.getSpringCard(row, col)
        sc.targetPos = this.targetCardCenter(row, col)
        sc.targetSize = this.targetCardWidth(row, col)
      }
    }
  }

  private targetCardCenter(row: number, col: number): Vector2 {
    const tM = tweakables.menu
    const vRect = this.display.viewableRegion
    const ctr: Vector2 = {x: (vRect.x1 + vRect.x2) / 2, y: (vRect.y1 + vRect.y2) / 2}
    const y = ctr.y + (this.selRow - row) * tM.rowHeight
    // if we're to the left of the selected one, we treat differently from to the right
    const colOffset = col - this.selCol
    let x = 0
    if (colOffset < 0) {
      x = ctr.x + (col - this.selCol) * tM.colLeftWidth // vRect.x1 + marg + col * tM.cardWidth
    } else {
      x = ctr.x + (col - this.selCol) * tM.colRightWidth // vRect.x1 + marg + col * tM.cardWidth
    }
    return {x, y}
  }

  private targetCardWidth(row: number, col: number): number {
    const tM = tweakables.menu
    if (row === this.selRow && col === this.selCol) return tM.cardWidthSelectedCard
    else if (row === this.selRow) return tM.cardWidthSelectedRow
    else return tM.cardWidth
  }
  private cardWidth(gameTime: GameTime, row: number, col: number): number {
    const beat = this.beat(gameTime.totalGameTime.totalSeconds)
    const bounce = tweakables.menu.cardSizeBounce
    const sizeMultiplier = Math.sin(beat / 8) * bounce + Math.sin(beat / 32) * bounce
    const sc = this.getSpringCard(row, col)
    return sc.size * (1 + sizeMultiplier)
  }
  private cardRotation(gameTime: GameTime, row: number, col: number): number {
    const beat = this.beat(gameTime.totalGameTime.totalSeconds) + row + col
    const bounce = tweakables.menu.cardRotationBounce
    const rot = Math.sin(beat / 16) * bounce + Math.sin(beat / 64) * bounce
    if (row === this.selRow && col === this.selCol) return rot
    else if (row === this.selRow) return -rot
    else return rot
  }

  private drawCard(row: number, col: number, center: Vector2, isSelected: boolean, gameTime: GameTime) {
    const tMenu = tweakables.menu
    const entry = this.getEntry(row, col)
    const cardWidth = this.cardWidth(gameTime, row, col)
    const texture = this.display.getTexture(entry.card)
    const dims = this.spriteBatch.autoDim(cardWidth, texture)
    const rotation = this.cardRotation(gameTime, row, col)
    const shadowTexture = this.display.getTexture('menuCardShadow')
    const lockOverlay = this.display.getTexture('menuCardLockOverlay')
    const sCenter = vec.add(center, {x: 0.03, y: -0.03})
    const lockReason = this.isLockedReason(entry)
    const cosRot = Math.cos(rotation) // useful for attachments
    const relPos = (v: Vector2): Vector2 => ({
      x: center.x + ((cosRot * dims.w) / 2) * v.x,
      y: center.y + ((cosRot * dims.h) / 2) * v.y,
    })

    // shadow
    this.spriteBatch.drawTextureCentered(shadowTexture, sCenter, dims, rotation, 1)
    // then the card itself
    this.spriteBatch.drawTextureCentered(texture, center, dims, rotation, 1)

    // now any attachments, such as #ball icons, etc.
    const ballSize = cardWidth * tMenu.cardBallSize
    const ball1Pos = relPos(tMenu.cardBall1Pos)
    const ball2Pos = relPos(tMenu.cardBall2Pos)
    const ball1Texture = this.display.getTexture(entry.ballTexture ?? 'ball1')
    const ball2Texture = this.display.getTexture(entry.ballTexture ?? 'ball2')
    const ballRot = isSelected ? gameTime.totalGameTime.totalSeconds : rotation
    if (entry.numBalls === 1) {
      this.spriteBatch.drawTextureCentered(ball1Texture, ball1Pos, {w: ballSize, h: ballSize}, ballRot, 1)
    }
    if (entry.numBalls === 2) {
      this.spriteBatch.drawTextureCentered(ball1Texture, ball2Pos, {w: ballSize, h: ballSize}, ballRot, 1)
      this.spriteBatch.drawTextureCentered(ball2Texture, ball1Pos, {w: ballSize, h: ballSize}, ballRot, 1)
    }

    // then lock overlay, if it's locked
    if (lockReason) {
      this.spriteBatch.drawTextureCentered(lockOverlay, center, dims, rotation, tMenu.lockOverlayAlpha)
      if (isSelected) {
        const txtCenter = relPos(tMenu.lockReasonPos)
        const txtCenter2 = relPos({x: 0, y: -0})
        const font = this.display.font('extraBold')
        this.spriteBatch.drawStringCentered(
          lockReason,
          font,
          tMenu.lockReasonSubsize,
          txtCenter,
          tMenu.lockReasonColor,
          -2 * rotation,
          false,
        )
        this.spriteBatch.drawStringCentered('LOCKED', font, tMenu.lockReasonSize, txtCenter2, tMenu.lockReasonColor, -2 * rotation, false)
      }
    }

    // Draw the dancing text if it is currently selected
    const seconds = gameTime.totalGameTime.totalSeconds
    if (isSelected /*&& !lockReason*/) {
      const textCenter = vec.add(center, tMenu.textOffsetFromCard)
      this.drawDancingMenuText(entry.text, textCenter, seconds, 1)
    }
    const ai = entry.ai
    if (isSelected && ai && !lockReason) {
      this.drawCardStats(entry, ai)
    }
  }

  private drawCardStatLine(sL: string, sR: string, pos: Vector2, isBad: boolean) {
    const tMenu = tweakables.menu
    const colL = tMenu.statsColorLeft
    const colR = isBad ? tMenu.statsColorRightBad : tMenu.statsColorRight
    const sizeL = tMenu.statsFontSize
    const sizeR = sizeL * tMenu.statsRightColFontMult
    const fontL = this.display.font('regular')
    const fontR = this.display.font('extraBold')
    const drawOptsL: TextDrawOptions = {textAlign: 'right'}
    const drawOptsR: TextDrawOptions = {textAlign: 'left'}
    const posR = vec.add(pos, tMenu.statsRightColAdj)
    this.spriteBatch.drawString(sL, fontL, sizeL, pos, colL, 0, drawOptsL)
    this.spriteBatch.drawString(sR, fontR, sizeR, posR, colR, 0, drawOptsR)
  }

  private drawCardStats(item: MenuEntry, ai: KnownAi) {
    // Stats at the bottom
    const tMenu = tweakables.menu
    const pos = vec.copy(tMenu.statsPosition)
    const record = persistence.data.aiRecord[aiToName(ai)]
    const fastestWin = record.fastestWin ?? Infinity
    const lSpace = tMenu.statsFontSize * tMenu.statsLineSpacing
    this.drawCardStatLine(`wins:`, `${record.wins}`, pos, record.wins < 1)
    if (record.wins) {
      pos.y -= lSpace
      this.drawCardStatLine(`shutouts:`, `${record.shutoutWins}`, pos, record.shutoutWins < 1)
      pos.y -= lSpace
      this.drawCardStatLine(`no jump wins:`, `${record.noJumpWins}`, pos, record.noJumpWins < 1)
      pos.y -= lSpace
      let emoji = ''
      for (const time of tMenu.statsFastestWinFlames) {
        if (fastestWin < time) emoji += '🔥'
      }
      this.drawCardStatLine(`fastest win:`, `${fastestWin.toFixed(3)} ${emoji}`, pos, fastestWin > 60)
    }
    pos.y -= lSpace
    this.drawCardStatLine(`plays:`, `${record.wins + record.losses}`, pos, false)
  }

  public enforceAllowReturn(allow: boolean) {
    if (allow && this.rows[0] !== returnRow) {
      this.rows.splice(0, 0, returnRow)
      this.selRow = 0
      this.selCol = 0
    }
    if (!allow && this.rows[0] === returnRow) {
      this.rows.splice(0, 1)
    }
  }

  private advanceSpringCards(dtSec: number) {
    for (let row = 0; row < this.rows.length; row++) {
      for (let col = 0; col < this.rows[row].entries.length; col++) {
        this.getSpringCard(row, col).step(dtSec)
      }
    }
  }

  private rowNumsSortedByDrawOrder() {
    return Object.keys(this.rows)
      .sort((a, b) => Math.abs(this.selRow - parseInt(b)) - Math.abs(this.selRow - parseInt(a)))
      .map((s) => parseInt(s))
  }
  private colNumsSortedByDrawOrder(entries: MenuEntry[]) {
    return Object.keys(entries)
      .sort((a, b) => Math.abs(this.selCol - parseInt(b)) - Math.abs(this.selCol - parseInt(a)))
      .map((s) => parseInt(s))
  }

  public draw(allowReturnToGame: boolean, gameTime: GameTime): void {
    const dtSec = gameTime.elapsedGameTime.totalSeconds
    this.advanceSpringCards(dtSec)

    this.enforceAllowReturn(allowReturnToGame)
    const tMenu = tweakables.menu

    // draw a cover over the existing game
    this.spriteBatch.drawScreenOverlay(tMenu.coverColor)

    // TODO: see if this is slow; menu is pretty small
    const rowNums = this.rowNumsSortedByDrawOrder()
    for (const rowNum of rowNums) {
      const colNums = this.colNumsSortedByDrawOrder(this.rows[rowNum].entries)
      for (const colNum of colNums) {
        const entry = this.getEntry(rowNum, colNum)
        const sc = entry.springCard
        if (sc) {
          if (rowNum === this.selRow && colNum === this.selCol) {
            // since this one is done last, we can do the dark overlay
            // underneath it, and cover all the other cards
            this.spriteBatch.drawScreenOverlay(tMenu.deselectedCardColor)
            this.drawCard(rowNum, colNum, sc.pos, true, gameTime)
          } else {
            this.drawCard(rowNum, colNum, sc.pos, false, gameTime)
          }
        }
      }
    }
    for (const rowNum of rowNums) {
      this.drawRowLabel(rowNum)
    }
  }
  private drawRowLabel(rowNum: number) {
    const row = this.rows[rowNum]
    const tM = tweakables.menu
    const sc = row.entries[0].springCard
    if (sc) {
      const pos = vec.add(sc.pos, {x: -0.6, y: -0.1})
      const s = row.title
      const font = this.display.font('extraBold')
      const c = rowNum === this.selRow ? tM.rowLabelSelectedColor : tM.rowLabelColor
      this.spriteBatch.drawString(s, font, 0.05, pos, c, -0.7)
    }
  }

  private advance(x: number, y: number) {
    this.selRow = (this.selRow + y + this.rows.length) % this.rows.length
    const numCols = this.rows[this.selRow].entries.length
    this.selCol = (this.selCol + x + numCols) % numCols
    this.updateSpringCardTargets()
  }
  public moveRight(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) this.advance(1, 0)
  }
  public moveLeft(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) this.advance(-1, 0)
  }
  public moveDown(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) this.advance(0, 1)
  }
  public moveUp(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) this.advance(0, -1)
  }
  public getWhoOwnsMenu(): MenuOwnership {
    return this.playerOwnsMenu
  }
  public setWhoOwnsMenu(playerSide: PlayerSide | null) {
    this.playerOwnsMenu = playerSide
  }
}

export {MenuAction, Menu, MenuOwnership}
