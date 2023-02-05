import {AiName, ais, aiToName, aiToNickname, KnownAi} from './ai/ai'
import {Color, Colors} from './color'
import {Display} from './display'
import {TextureName} from './content-load-list'
import {persistence} from './persistence'
import {PlayerSpecies} from './player'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {GameTime, PlayerSide, TextDrawOptions, Texture2D, Vector2} from './types'
import {vec} from './utils'

enum MenuAction {
  ReturnToGame = 'return-to-game',
  Play = 'play',
  Exit = 'exit',
}
type UnlockRequirement = {
  defeat: AiName
  defeatType: 'win' | 'shutout' | 'no-jumping'
}
type CardPosition = {
  row: number
  col: number
}
interface MenuEntry {
  text: string
  subtext?: string
  action: MenuAction
  opponentType?: PlayerSpecies
  ai?: KnownAi
  numBalls?: number
  card: TextureName
  unlockRequirement?: UnlockRequirement
}

const returnToGameEntry: MenuEntry = {text: 'Return to Game', action: MenuAction.ReturnToGame, card: 'menuCardReturnToGame'}
const allMenuItems: MenuEntry[] = [
  {text: 'Quit', action: MenuAction.Exit, card: 'menuCardExit'},
  {
    text: aiToNickname(ais.Green),
    ai: ais.Green,
    action: MenuAction.Play,
    card: 'menuCardPlayGreen',
    opponentType: PlayerSpecies.Ai,
    numBalls: 1,
  },
  {
    text: aiToNickname(ais.Orange),
    ai: ais.Orange,
    action: MenuAction.Play,
    card: 'menuCardPlayOrange',
    opponentType: PlayerSpecies.Ai,
    numBalls: 1,
    unlockRequirement: {
      defeat: 'Green',
      defeatType: 'win',
    },
  },
  {
    text: aiToNickname(ais.Purple),
    ai: ais.Purple,
    action: MenuAction.Play,
    card: 'menuCardPlayPurple',
    opponentType: PlayerSpecies.Ai,
    numBalls: 2,
    unlockRequirement: {
      defeat: 'Orange',
      defeatType: 'win',
    },
  },
  {
    text: aiToNickname(ais.Yellow),
    ai: ais.Yellow,
    action: MenuAction.Play,
    card: 'menuCardPlayYellow',
    opponentType: PlayerSpecies.Ai,
    numBalls: 1,
    unlockRequirement: {
      defeat: 'Purple',
      defeatType: 'no-jumping',
    },
  },
  {
    text: aiToNickname(ais.Black),
    ai: ais.Black,
    action: MenuAction.Play,
    card: 'menuCardPlayBlack',
    opponentType: PlayerSpecies.Ai,
    numBalls: 1,
    unlockRequirement: {
      defeat: 'Yellow',
      defeatType: 'shutout',
    },
  },
  {
    text: aiToNickname(ais.White),
    ai: ais.White,
    action: MenuAction.Play,
    card: 'menuCardPlayWhite',
    opponentType: PlayerSpecies.Ai,
    numBalls: 2,
    unlockRequirement: {
      defeat: 'Black',
      defeatType: 'shutout',
    },
  },
  {
    text: '1 v. 1',
    action: MenuAction.Play,
    card: 'menuCardHuman1Ball',
    opponentType: PlayerSpecies.Human,
    numBalls: 1,
  },
  {
    text: '1 v. 1',
    action: MenuAction.Play,
    card: 'menuCardHuman2Balls',
    opponentType: PlayerSpecies.Human,
    numBalls: 2,
  },
]

type MenuOwnership = PlayerSide | null

class Menu {
  private display: Display
  private menuItems: MenuEntry[]
  private selectedMenuIndex = 1
  private playerOwnsMenu: MenuOwnership = null // If this is null, any controller can control menu.

  public constructor(display: Display) {
    this.display = display
    this.menuItems = allMenuItems
  }
  private get spriteBatch(): SpriteBatch {
    return this.display.getSpriteBatch()
  }
  public get selection(): MenuAction {
    return this.menuItems[this.selectedMenuIndex].action
  }
  public get selectionEntry() {
    return this.menuItems[this.selectedMenuIndex]
  }
  public select(menuOption: MenuAction, playerSide: PlayerSide | null) {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === playerSide) {
      for (let i = 0; i < this.menuItems.length; i++) {
        if (this.menuItems[i].action === menuOption) {
          this.selectedMenuIndex = i
          break
        }
      }
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
    const sel = this.menuItems[this.selectedMenuIndex]
    return this.isLockedReason(sel) ? true : false
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

  /**
   * returns -2 if this card is 2 to the left of the currently selected card
   */
  private cardOffset(i: number): number {
    return i - this.selectedMenuIndex
  }
  private cardNumToPosition(i: number): CardPosition {
    return {
      col: i % tweakables.menu.cols,
      row: Math.floor(i / tweakables.menu.cols),
    }
  }
  private cardPositionToNumber(cp: CardPosition): number {
    return cp.row * tweakables.menu.cols + cp.col
  }
  /**
   * lays out the card into a grid
   * @param i the ith item in the list of menu cards
   * @returns
   */
  private cardCenter(i: number): Vector2 {
    const tM = tweakables.menu
    const marg = tM.cardGridMargin
    const vRect = this.display.viewableRegion
    const numRows = Math.ceil(this.menuItems.length / tM.cols)
    const col = i % tM.cols
    const row = Math.floor(i / tM.cols)
    const xFrac = (1 + col * 2) / (tM.cols * 2)
    const yFrac = (1 + row * 2) / (numRows * 2)
    const x = vRect.x1 + marg + (vRect.x2 - vRect.x1) * (1 - marg) * xFrac + tM.cardGridShift.x
    const y = vRect.y2 - marg - (vRect.y2 - vRect.y1) * (1 - marg) * yFrac + tM.cardGridShift.y
    return {x, y}
  }
  private cardWidth(gameTime: GameTime, i: number): number {
    const beat = this.beat(gameTime.totalGameTime.totalSeconds)
    const bounce = tweakables.menu.cardSizeBounce
    const sizeMultiplier = Math.sin(beat / 8) * bounce + Math.sin(beat / 32) * bounce
    const offset = this.cardOffset(i)
    if (offset === 0) return tweakables.menu.cardWidthSelected * (1 - sizeMultiplier)
    return tweakables.menu.cardWidth * (1 + sizeMultiplier)
  }
  private cardRotation(gameTime: GameTime, i: number): number {
    const beat = this.beat(gameTime.totalGameTime.totalSeconds) + i
    const bounce = tweakables.menu.cardRotationBounce
    const rot = Math.sin(beat / 16) * bounce + Math.sin(beat / 64) * bounce
    const offset = this.cardOffset(i)
    if (offset === 0) return rot
    return -rot
  }

  private drawCard(i: number, center: Vector2, isSelected: boolean, gameTime: GameTime) {
    const tMenu = tweakables.menu
    const item = this.menuItems[i]
    const cardWidth = this.cardWidth(gameTime, i)
    const texture = this.display.getTexture(item.card)
    const dims = this.spriteBatch.autoDim(cardWidth, texture)
    const rotation = this.cardRotation(gameTime, i)
    const shadowTexture = this.display.getTexture('menuCardShadow')
    const lockOverlay = this.display.getTexture('menuCardLockOverlay')
    const sCenter = vec.add(center, {x: 0.03, y: -0.03})
    const lockReason = this.isLockedReason(item)
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
    const ball1Texture = this.display.getTexture('ball1')
    const ball2Texture = this.display.getTexture('ball2')
    const ballRot = isSelected ? gameTime.totalGameTime.totalSeconds : rotation
    if (item.numBalls === 1) {
      this.spriteBatch.drawTextureCentered(ball1Texture, ball1Pos, {w: ballSize, h: ballSize}, ballRot, 1)
    }
    if (item.numBalls === 2) {
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
      const subtext = item.subtext
      if (subtext) {
        const pos = vec.add(textCenter, tMenu.subtextOffset)
        this.drawDancingMenuText(subtext, pos, seconds + 1, tMenu.subtextRelSize)
      }
      this.drawDancingMenuText(item.text, textCenter, seconds, 1)
    }
    const ai = item.ai
    if (isSelected && ai && !lockReason) {
      this.drawCardStats(item, ai)
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
    if (allow && this.menuItems[1] !== returnToGameEntry) {
      this.menuItems.splice(1, 0, returnToGameEntry)
      this.selectedMenuIndex = 1
    }
    if (!allow && this.menuItems[1] === returnToGameEntry) {
      this.menuItems.splice(1, 1)
    }
  }

  public draw(allowReturnToGame: boolean, gameTime: GameTime): void {
    this.enforceAllowReturn(allowReturnToGame)
    const tMenu = tweakables.menu

    // draw a cover over the existing game
    this.spriteBatch.drawScreenOverlay(tMenu.coverColor)

    // TODO: see if this is slow; menu is pretty msall
    const drawOrder = Object.keys(this.menuItems).sort(
      (a, b) => Math.abs(this.cardOffset(parseInt(b))) - Math.abs(this.cardOffset(parseInt(a))),
    )
    for (const k of drawOrder) {
      const i = parseInt(k)
      const center = this.cardCenter(i)
      if (i === this.selectedMenuIndex) {
        // draw a second cover over the non-selected ones
        this.spriteBatch.drawScreenOverlay(tMenu.deselectedCardColor)
        this.drawCard(i, center, true, gameTime)
      } else {
        this.drawCard(i, center, false, gameTime)
      }
    }
  }

  public getCard(menuItem: number): Texture2D {
    return this.display.getTexture(this.menuItems[menuItem].card)
  }

  /**
   * moves to the next card, including wrapping around. The logic here
   * includes the fact that the menu might not be a perfect grid, so
   * for example, going up from the top row might not lead you to the bottom
   * row, if there isn't a card in that spot, and instead lead you to the next
   * to last row. Same with columns.
   */
  private advance(x: number, y: number) {
    const isOver = (cp: CardPosition) => this.cardPositionToNumber(cp) >= this.menuItems.length
    const cp = this.cardNumToPosition(this.selectedMenuIndex)
    cp.col += x
    if (cp.col >= tweakables.menu.cols || isOver(cp)) cp.col = 0
    if (cp.col < 0) {
      cp.col = tweakables.menu.cols - 1
      if (isOver(cp)) cp.col--
    }
    cp.row += y
    if (isOver(cp)) cp.row = 0
    if (cp.row < 0) {
      cp.row = Math.floor(this.menuItems.length / tweakables.menu.cols)
      if (isOver(cp)) cp.row--
    }
    this.selectedMenuIndex = this.cardPositionToNumber(cp)
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
