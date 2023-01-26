import {AiName, ais, KnownAi} from './ai/ai'
import {Color, Colors} from './color'
import {Display, TextureName} from './display'
import {persistence} from './persistence'
import {PlayerSpecies} from './player'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {GameTime, PlayerSide, Texture2D, Vector2} from './types'
import {vec, sign} from './utils'

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
  subtext?: string
  action: MenuAction
  opponentType?: PlayerSpecies
  ai?: KnownAi
  numBalls?: number
  card: TextureName
  unlockRequirement?: UnlockRequirement
}

const allMenuItems: MenuEntry[] = [
  {text: 'Quit', action: MenuAction.Exit, card: 'menuCardExit'},
  {text: 'Return to Game', action: MenuAction.ReturnToGame, card: 'menuCardReturnToGame'},
  {
    text: 'Human v. Human',
    action: MenuAction.Play,
    card: 'menuCardHuman1Ball',
    opponentType: PlayerSpecies.Human,
    numBalls: 1,
  },
  {
    text: 'Human v. Human',
    action: MenuAction.Play,
    card: 'menuCardHuman2Balls',
    opponentType: PlayerSpecies.Human,
    numBalls: 2,
  },
  {
    text: 'Challenge Green',
    ai: ais.Green,
    action: MenuAction.Play,
    card: 'menuCardPlayGreen',
    opponentType: PlayerSpecies.Ai,
    numBalls: 1,
  },
  {
    text: 'Challenge Purple',
    ai: ais.Purple,
    action: MenuAction.Play,
    card: 'menuCardPlayPurple',
    opponentType: PlayerSpecies.Ai,
    numBalls: 2,
    unlockRequirement: {
      defeat: 'Green',
      defeatType: 'win',
    },
  },
  {
    text: 'Challenge Black',
    ai: ais.Black,
    action: MenuAction.Play,
    card: 'menuCardPlayBlack',
    opponentType: PlayerSpecies.Ai,
    numBalls: 1,
    unlockRequirement: {
      defeat: 'Purple',
      defeatType: 'no-jumping',
    },
  },
  {
    text: 'Challenge White',
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
]

type MenuOwnership = PlayerSide | null

class Menu {
  private display: Display
  private menuItems: MenuEntry[]
  private selectedMenuIndex: number
  private allowReturnToGame: boolean
  private playerOwnsMenu: MenuOwnership // If this is null, any controller can control menu.

  public constructor(display: Display) {
    this.allowReturnToGame = true
    this.display = display
    this.menuItems = allMenuItems
    this.selectedMenuIndex = 2
    this.playerOwnsMenu = null
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
      else return `Defeat ${ur.defeat} to unlock`
    } else if (ur.defeatType === 'no-jumping') {
      if (d.noJumpWins > 0) return false
      else return `Defeat ${ur.defeat} without jumping to unlock`
    } else if (ur.defeatType === 'shutout') {
      if (d.shutoutWins > 0) return false
      else return `Shutout ${ur.defeat} to unlock`
    } else {
      throw new Error(`unknown unlock requirement ${ur.defeatType}`)
    }
  }
  private action(num: number) {
    return this.menuItems[num].action
  }
  private beat(totalSeconds: number) {
    return 2.0 * Math.PI * totalSeconds * (tweakables.menu.bpm / 60)
  }
  private drawDancingMenuText(s: string, destination: Vector2, totalSeconds: number, relSize: number) {
    /* dancing stuff */
    const beat = this.beat(totalSeconds)
    const sizeMultiplier = 0.2 + Math.sin(beat / 2) / 100 + Math.sin(beat / 8) / 100
    const size = sizeMultiplier * relSize
    const rotation = -0.1 + Math.sin(beat) / 32
    const backgroundColor = new Color(0.0, 0.0, 0.0, 0.75)
    const backgroundColor2 = new Color(0.0, 0.0, 0.0, 0.15)
    const foregroundColor = Colors.white
    const p0 = vec.add(destination, {x: -0.01, y: -0.01})
    const p1 = vec.add(destination, {x: 0.01, y: 0.02})
    const p2 = destination
    const font = this.display.font('extraBold')
    this.spriteBatch.drawStringCentered(s, font, size, p0, backgroundColor2, rotation)
    this.spriteBatch.drawStringCentered(s, font, size, p1, backgroundColor, rotation)
    this.spriteBatch.drawStringCentered(s, font, size, p2, foregroundColor, rotation)
  }

  /**
   * returns -2 if this card is 2 to the left of the currently selected card
   */
  private cardOffset(i: number): number {
    return i - this.selectedMenuIndex
  }
  private cardCenter(i: number): Vector2 {
    const tMenu = tweakables.menu
    const offset = this.cardOffset(i)
    const offsetDir = offset ? sign(offset) : 0
    const offsetCurve = offset ? sign(offset) * Math.sqrt(Math.abs(offset)) : 0
    return {
      x: tMenu.cardStackStart.x + tMenu.cardStackSpacing.x * offsetCurve + offsetDir * tMenu.afterChosenOffset.x,
      y: tMenu.cardStackStart.y + Math.abs(tMenu.cardStackSpacing.y * offsetCurve) + tMenu.afterChosenOffset.y,
    }
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
    // shadow
    this.spriteBatch.drawTextureCentered(shadowTexture, sCenter, dims, rotation, 1)
    // then the card itself
    this.spriteBatch.drawTextureCentered(texture, center, dims, rotation, 1)
    // then lock overlay, if it's locked
    if (lockReason) {
      this.spriteBatch.drawTextureCentered(lockOverlay, center, dims, rotation, tMenu.lockOverlayAlpha)
    }

    // now any attachments, such as #ball icons, etc.
    const cosRot = Math.cos(rotation)
    const ballSize = cardWidth * tMenu.cardBallSize
    const ball1Pos = {
      x: center.x + ((cosRot * dims.w) / 2) * tMenu.cardBall1Pos.x,
      y: center.y + ((cosRot * dims.h) / 2) * tMenu.cardBall1Pos.y,
    }
    const ball2Pos = {
      x: center.x + ((cosRot * dims.w) / 2) * tMenu.cardBall2Pos.x,
      y: center.y + ((cosRot * dims.h) / 2) * tMenu.cardBall2Pos.y,
    }
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

    // Draw the dancing text if it is currently selected
    const seconds = gameTime.totalGameTime.totalSeconds
    if (isSelected) {
      const textCenter = vec.add(center, tMenu.textOffsetFromCard)
      if (item.subtext) {
        const pos = vec.add(textCenter, tMenu.subtextOffset)
        this.drawDancingMenuText(item.subtext, pos, seconds + 1, tMenu.subtextRelSize)
      }
      this.drawDancingMenuText(item.text, textCenter, seconds, 1)
    }
  }

  public draw(allowReturnToGame: boolean, gameTime: GameTime): void {
    this.allowReturnToGame = allowReturnToGame
    if (!allowReturnToGame && this.selection === MenuAction.ReturnToGame) {
      this.moveRight(this.playerOwnsMenu)
    }
    const tMenu = tweakables.menu

    // draw a cover over the existing game
    this.spriteBatch.drawScreenOverlay(tMenu.coverColor)

    // TODO: see if this is slow; menu is pretty msall
    const drawOrder = Object.keys(this.menuItems).sort(
      (a, b) => Math.abs(this.cardOffset(parseInt(b))) - Math.abs(this.cardOffset(parseInt(a))),
    )
    for (const k of drawOrder) {
      const i = parseInt(k)
      if (this.action(i) === MenuAction.ReturnToGame && !this.allowReturnToGame) continue
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

  public moveRight(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) {
      this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuItems.length
      if (this.selection === MenuAction.ReturnToGame && !this.allowReturnToGame) {
        this.selectedMenuIndex++
      }
    }
  }
  public moveLeft(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) {
      this.selectedMenuIndex--
      if (this.selectedMenuIndex >= 0 && this.selection === MenuAction.ReturnToGame && !this.allowReturnToGame) {
        this.selectedMenuIndex--
      }
      if (this.selectedMenuIndex < 0) {
        this.selectedMenuIndex = this.menuItems.length - 1
      }
    }
  }
  public getWhoOwnsMenu(): MenuOwnership {
    return this.playerOwnsMenu
  }
  public setWhoOwnsMenu(playerSide: PlayerSide | null) {
    this.playerOwnsMenu = playerSide
  }
}

export {MenuAction, Menu, MenuOwnership}
