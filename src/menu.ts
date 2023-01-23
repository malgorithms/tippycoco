import {Color, Colors} from './color'
import {Display} from './display'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {GameTime, PlayerSide, Rectangle, Texture2D, Vector2} from './types'
import {vec} from './utils'

enum MenuOptions {
  ReturnToGame = 'return-to-game',
  Play2Player1Ball = 'play-2-player-1-ball',
  Play2Player2Balls = 'play-2-player-2-balls',
  PlayGreen = 'play-green',
  PlayPurple = 'play-purple',
  PlayOrange = 'play-orange',
  PlayBlack = 'play-black',
  PlayWhite = 'play-white',
  Instructions = 'instructions',
  Exit = 'exit',
}
interface MenuEntry {
  text: string
  option: MenuOptions
}

type MenuOwnership = PlayerSide | null

class Menu {
  private display: Display
  private menuItems: MenuEntry[]
  private selectedMenuItem: number
  private allowReturnToGame: boolean
  private playerOwnsMenu: MenuOwnership // If this is null, any controller can control menu.

  public constructor(display: Display) {
    this.allowReturnToGame = true
    this.display = display
    this.menuItems = []
    this.menuItems.push({text: 'Return to Game', option: MenuOptions.ReturnToGame})
    this.menuItems.push({text: '2-Players, 1-Ball', option: MenuOptions.Play2Player1Ball})
    this.menuItems.push({text: '2-Players, 2-Balls', option: MenuOptions.Play2Player2Balls})
    this.menuItems.push({text: 'Challenge Green', option: MenuOptions.PlayGreen})
    this.menuItems.push({text: 'Challenge Black', option: MenuOptions.PlayBlack})
    this.menuItems.push({text: 'Challenge Purple', option: MenuOptions.PlayPurple})
    this.menuItems.push({text: 'Challenge White', option: MenuOptions.PlayWhite})
    this.menuItems.push({text: 'Instructions', option: MenuOptions.Instructions})
    this.menuItems.push({text: 'Exit', option: MenuOptions.Exit})
    this.selectedMenuItem = 1
    this.playerOwnsMenu = null
  }
  public get spriteBatch(): SpriteBatch {
    return this.display.getSpriteBatch()
  }
  public get canvasWidth(): number {
    return this.display.canvasWidth
  }
  public get canvasHeight(): number {
    return this.display.canvasHeight
  }

  public select(num: number, playerSide: PlayerSide | null) {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === playerSide) {
      this.selectedMenuItem = num
    }
  }
  public draw(allowReturnToGame: boolean, gameTime: GameTime): void {
    const seconds = gameTime.totalGameTime.totalSeconds
    const beat = 2.0 * Math.PI * seconds * (tweakables.menu.bpm / 60)
    this.allowReturnToGame = allowReturnToGame
    if (!allowReturnToGame && this.selectedMenuItem == 0) {
      this.selectedMenuItem = 1
    }
    let lineSpacing: Vector2 = {x: 0, y: -0.1}
    if (allowReturnToGame) {
      lineSpacing = vec.scale(lineSpacing, 0.9)
    }
    const startPosition: Vector2 = {x: 0.1, y: 0.9}
    const destination = startPosition

    for (let i = allowReturnToGame ? 0 : 1; i < this.menuItems.length; i++) {
      destination.y += lineSpacing.y
      if (i == 3 || i == 5 || i == 7 || (i == 1 && allowReturnToGame)) {
        destination.y -= 0.1
        const rect: Rectangle = {
          x1: destination.x,
          y1: destination.y - 0.14,
          x2: destination.x + 0.8,
          y2: destination.y - 0.15,
        }
        const texture = this.display.getTexture('menuDivider')
        this.spriteBatch.drawTextureInRect(texture, rect, 1)
        destination.y += 0.01
      }
      let sizeMultiplier = 0.1
      let r = 0.0 // rotation
      if (i === this.selectedMenuItem) {
        sizeMultiplier += 0.1 + Math.sin(beat / 2) / 20 + Math.sin(beat / 8) / 20
        r = -0.1 + Math.sin(beat) / 32
      }
      let backgroundColor = new Color(0.0, 0.0, 0.0, 0.75)
      let backgroundColor2 = new Color(0.0, 0.0, 0.0, 0.15)
      let foregroundColor = Colors.white

      if (i !== this.selectedMenuItem) {
        foregroundColor = new Color(foregroundColor.r, foregroundColor.g, foregroundColor.b, 0.75)
        backgroundColor = new Color(0.0, 0.0, 0.0, 0) //.05)  // invisible for now
        backgroundColor2 = new Color(0.0, 0.0, 0.0, 0) //.05) // invisible for now
        r = -0.003 + Math.sin(beat + i) / (200 + i)
      }
      const p0 = vec.add(destination, {x: -0.01, y: -0.01})
      const p1 = vec.add(destination, {x: 0.01, y: 0.02})
      const p2 = destination
      this.spriteBatch.drawStringUncentered(this.menuItems[i].text, p0, sizeMultiplier, backgroundColor2, r)
      this.spriteBatch.drawStringUncentered(this.menuItems[i].text, p1, sizeMultiplier, backgroundColor, r)
      this.spriteBatch.drawStringUncentered(this.menuItems[i].text, p2, sizeMultiplier, foregroundColor, r)
    }
    if (this.selectedMenuItem >= 1 && this.selectedMenuItem <= 6) {
      const p: Vector2 = {x: (2 * this.canvasWidth) / 3, y: (2 * this.canvasHeight) / 3}
      this.display.drawMenuBanner(this.getBannerTexture(this.selectedMenuItem), gameTime, p)
    }
  }

  public getBannerTexture(menuItem: number): Texture2D {
    switch (menuItem) {
      case 1:
        return this.display.getTexture('menuBanner2Player1Ball')
      case 2:
        return this.display.getTexture('menuBanner2Player2Balls')
      case 3:
        return this.display.getTexture('menuBannerGreen')
      case 4:
        return this.display.getTexture('menuBannerBlack')
      case 5:
        return this.display.getTexture('menuBannerPurple')
      default:
        return this.display.getTexture('menuBannerWhite')
    }
  }

  public moveDown(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) {
      this.selectedMenuItem = (this.selectedMenuItem + 1) % this.menuItems.length
      if (this.selectedMenuItem == 0 && !this.allowReturnToGame) this.selectedMenuItem++
    }
  }
  public moveUp(owner: MenuOwnership): void {
    if (this.playerOwnsMenu === null || this.playerOwnsMenu === owner) {
      this.selectedMenuItem--
      if ((this.selectedMenuItem == 0 && !this.allowReturnToGame) || this.selectedMenuItem < 0)
        this.selectedMenuItem = this.menuItems.length - 1
    }
  }
  public returnSelection(): MenuOptions {
    return this.menuItems[this.selectedMenuItem].option
  }

  public getWhoOwnsMenu(): MenuOwnership {
    return this.playerOwnsMenu
  }
  public setWhoOwnsMenu(playerSide: PlayerSide | null) {
    this.playerOwnsMenu = playerSide
  }
}

export {MenuOptions, Menu, MenuOwnership}
