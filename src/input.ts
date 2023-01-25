import {GameConfig, PlayerConfiguration} from './game-config'
import {GamepadConnectSummary, GamepadMonitor, TriggerName} from './gamepad-monitor'
import {KeyboardMonitor} from './keyboard-monitor'
import {MenuOwnership} from './menu'
import {PlayerSpecies} from './player'
import tweakables from './tweakables'
import {MenuSelectResult, PlayerSide} from './types'

class Input {
  private pads: GamepadMonitor
  private keyboard: KeyboardMonitor

  private gameConfig: GameConfig

  public constructor(gameConfig: GameConfig) {
    this.gameConfig = gameConfig
    this.pads = new GamepadMonitor()
    this.keyboard = new KeyboardMonitor()
  }
  public updateInputStates(): void {
    this.keyboard.update()
    this.pads.update()
  }

  public isKeyboardConnected(): boolean {
    return true // for now
  }

  private getKeyboardSet(pI: PlayerSide) {
    const rightPlayerConfig = this.gameConfig.playerConfig(PlayerSide.Right) as PlayerConfiguration
    const isTwoPlayerGame = rightPlayerConfig.species === PlayerSpecies.Human
    const kSet = isTwoPlayerGame ? tweakables.twoPlayerControls : tweakables.onePlayerControls
    if (pI === PlayerSide.Left) return kSet.p0
    else return kSet.p1
  }
  public swapGamepadSides() {
    this.pads.swapSides()
  }
  public wasKeyboardPauseHit(): boolean {
    return this.keyboard.anyKeysJustPushed(['Enter', 'Space'])
  }
  public checkGamepadPauseHit(): null | PlayerSide {
    for (const pI of [PlayerSide.Left, PlayerSide.Right]) {
      if (this.pads.anyButtonsPushedBy(pI, ['start'])) return pI
    }
    return null
  }

  public wasMenuSelectJustPushed(owner: MenuOwnership): MenuSelectResult {
    const res: MenuSelectResult = {
      selected: false,
      byPlayerSide: null,
      byKeyboard: false,
    }
    if (this.keyboard.anyKeysJustPushed(['Enter', 'Space'])) {
      res.selected = true
      res.byKeyboard = true
    } else {
      const toCheck = owner ? [owner] : [PlayerSide.Left, PlayerSide.Right]
      for (const playerSide of toCheck) {
        if (this.pads.anyButtonsPushedBy(playerSide, ['psX'])) {
          res.selected = true
          res.byPlayerSide = playerSide
        }
      }
    }
    return res
  }

  public wasMenuLeftJustPushed(owner: MenuOwnership): boolean {
    if (this.keyboard.anyKeysJustPushed(['KeyA', 'KeyJ', 'ArrowLeft'])) return true
    if (owner) {
      return this.pads.anyButtonsPushedBy(owner, ['dPadLeft'])
    } else {
      return this.pads.anyButtonsPushedByAnyone(['dPadLeft'])
    }
  }
  public wasMenuRightJustPushed(owner: MenuOwnership): boolean {
    if (this.keyboard.anyKeysJustPushed(['KeyD', 'KeyL', 'ArrowRight'])) return true
    if (owner) {
      return this.pads.anyButtonsPushedBy(owner, ['dPadRight'])
    } else {
      return this.pads.anyButtonsPushedByAnyone(['dPadRight'])
    }
  }
  public wasMenuExitJustPushed(owner: MenuOwnership): boolean {
    if (owner) return this.pads.anyButtonsPushedBy(owner, ['psO', 'start'])
    else return this.pads.anyButtonsPushedByAnyone(['psO', 'start'])
  }
  public wasPostgameProceedJustPushed(): boolean {
    return this.pads.anyButtonsPushedByAnyone(['psO', 'psX', 'start']) || this.wasMenuSelectJustPushed(null).selected
  }
  public wasPlayerJustDisconnectedFromGamepad(playerSide: PlayerSide) {
    return this.pads.wasPlayerJustDisconnected(playerSide)
  }
  public wasPlayerJustConnectedToGamepad(playerSide: PlayerSide) {
    return this.pads.wasPlayerJustConnected(playerSide)
  }
  public doesPlayerHaveGamepad(playerSide: PlayerSide) {
    return this.pads.doesPlayerHaveGamepad(playerSide)
  }
  public gamepadConnectSummary(): GamepadConnectSummary {
    return {
      left: this.pads.getStateFromPlayer(PlayerSide.Left),
      right: this.pads.getStateFromPlayer(PlayerSide.Right),
    }
  }
  public isJumpPressed(pI: PlayerSide): boolean {
    const set = this.getKeyboardSet(pI)
    return this.keyboard.anyKeyDown(set.jump) || this.pads.anyButtonDown(pI, ['psX'])
  }
  /**
   * returns 0 if trigger near 0, within tolerance
   * defined in tweakables. otherwise returns value up to 1
   */
  public getTrigger(playerSide: PlayerSide, triggerName: TriggerName): number {
    const x = this.pads.getTrigger(playerSide, triggerName)
    if (x < tweakables.triggerTolerance) return 0
    return x
  }

  /**
   * returns 0 if thumbstick near the middle, within tolerance
   * defined in tweakables. otherwise returns value
   * @param playerSide - playerSide
   */
  public getLeftThumbStickX(playerSide: PlayerSide): number {
    const x = this.pads.getThumbStick(playerSide, 'left').x
    if (Math.abs(x) < tweakables.thumbstickCenterTolerance) return 0
    else return x
  }
  public isLeftPressed(pI: PlayerSide): boolean {
    const set = this.getKeyboardSet(pI)
    const keyboardLeft = this.keyboard.anyKeyDown(set.left) && !this.keyboard.anyKeyDown(set.right)
    const dPadLeft = this.pads.anyButtonDown(pI, ['dPadLeft'])
    return keyboardLeft || dPadLeft
  }
  public isRightPressed(pI: PlayerSide): boolean {
    const set = this.getKeyboardSet(pI)
    const keyboardRight = this.keyboard.anyKeyDown(set.right) && !this.keyboard.anyKeyDown(set.left)
    const dPadRight = this.pads.anyButtonDown(pI, ['dPadRight'])
    return keyboardRight || dPadRight
  }
  public isGrowPressed(pI: PlayerSide): boolean {
    const set = this.getKeyboardSet(pI)
    return this.keyboard.anyKeyDown(set.grow)
  }
  public isShrinkPressed(pI: PlayerSide): boolean {
    const set = this.getKeyboardSet(pI)
    return this.keyboard.anyKeyDown(set.shrink)
  }
  public wasDebugKeyJustPushed(): boolean {
    return this.keyboard.anyKeysJustPushed(['KeyG'])
  }
}

export {Input}
