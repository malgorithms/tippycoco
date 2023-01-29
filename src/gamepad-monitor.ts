import tweakables from './tweakables'
import {PlayerSide, Vector2} from './types'
import {timeout} from './utils'

type GamepadId = string

interface GamePadState {
  isConnected: boolean
  triggers: {
    left: number
    right: number
  }
  thumbSticks: {
    left: Vector2
    right: Vector2
  }
  buttons: {
    dPadUp: boolean
    dPadDown: boolean
    dPadLeft: boolean
    dPadRight: boolean
    psX: boolean // equivalent placement to X button on playstation, or the jump button in most games
    psO: boolean // equivalent placement to O button on playstation, or the "back" in most games
    start: boolean
    leftStick: boolean
    rightStick: boolean
    rightShoulder: boolean
  }
}
interface GamepadConnectSummary {
  left: GamePadState | null
  right: GamePadState | null
}

type ButtonName = keyof GamePadState['buttons']
type ThumbstickName = keyof GamePadState['thumbSticks']
type TriggerName = keyof GamePadState['triggers']

class GamepadMonitor {
  private currAssigned = new Map<PlayerSide, Gamepad>()
  private prevAssigned = new Map<PlayerSide, Gamepad>()
  private unassigned = new Array<Gamepad>()
  private currState = new Map<GamepadId, GamePadState>()
  private prevState = new Map<GamepadId, GamePadState>()

  constructor() {
    window.addEventListener('gamepadconnected', (e) => this.connect(e.gamepad))
    window.addEventListener('gamepaddisconnected', (e) => this.disconnect(e.gamepad))
    this.pollingLoop()
  }

  public update() {
    this.prevState = new Map()
    for (const [gamepadId, gamepadState] of this.currState.entries()) {
      this.prevState.set(gamepadId, gamepadState)
    }
    this.currState = new Map()

    const gamepads = navigator.getGamepads()
    for (const gamepad of gamepads) {
      if (gamepad) {
        const state = this.getStateFromGamepad(gamepad)
        this.currState.set(gamepad.id, state)
      }
    }
    this.prevAssigned = new Map(this.currAssigned)
  }
  public swapSides() {
    console.log(`Swapping controller sides`)
    const prevLeft = this.currAssigned.get(PlayerSide.Left)
    const prevRight = this.currAssigned.get(PlayerSide.Right)
    this.currAssigned = new Map()
    if (prevLeft) this.currAssigned.set(PlayerSide.Right, prevLeft)
    if (prevRight) this.currAssigned.set(PlayerSide.Left, prevRight)
  }
  public wasPlayerJustDisconnected(playerSide: PlayerSide): boolean {
    return !this.currAssigned.has(playerSide) && this.prevAssigned.has(playerSide)
  }
  public wasPlayerJustConnected(playerSide: PlayerSide): boolean {
    return this.currAssigned.has(playerSide) && !this.prevAssigned.has(playerSide)
  }
  public doesPlayerHaveGamepad(playerSide: PlayerSide): boolean {
    return this.currAssigned.has(playerSide)
  }

  private wasThumbstickPushedXBy(playerSide: PlayerSide, stickName: ThumbstickName, x: number): boolean {
    const gamepad = this.currAssigned.get(playerSide)
    if (!gamepad) return false
    const currState = this.currState.get(gamepad.id)
    const prevState = this.prevState.get(gamepad.id)
    let currPushed
    let prevPushed
    if (x < 0) {
      currPushed = currState && currState.thumbSticks[stickName].x < x
      prevPushed = prevState && prevState.thumbSticks[stickName].x < x
    } else {
      currPushed = currState && currState.thumbSticks[stickName].x > x
      prevPushed = prevState && prevState.thumbSticks[stickName].x > x
    }
    if (currPushed && !prevPushed) return true
    return false
  }
  public wasThumbstickPushedLeftBy(playerSide: PlayerSide, thumbstickName: ThumbstickName): boolean {
    return this.wasThumbstickPushedXBy(playerSide, thumbstickName, -tweakables.input.thumbstickPush)
  }
  public wasThumbstickPushedRightBy(playerSide: PlayerSide, thumbstickName: ThumbstickName): boolean {
    return this.wasThumbstickPushedXBy(playerSide, thumbstickName, tweakables.input.thumbstickPush)
  }
  public wasThumbstickPushedLeft(thumbstickName: ThumbstickName) {
    for (const playerSide of this.currAssigned.keys()) {
      const found = this.wasThumbstickPushedLeftBy(playerSide, thumbstickName)
      if (found) return true
    }
    return false
  }
  public wasThumbstickPushedRight(thumbstickName: ThumbstickName) {
    for (const playerSide of this.currAssigned.keys()) {
      const found = this.wasThumbstickPushedRightBy(playerSide, thumbstickName)
      if (found) return true
    }
    return false
  }
  public anyButtonsPushedByAnyone(buttonNames: ButtonName[]) {
    for (const playerSide of this.currAssigned.keys()) {
      const found = this.anyButtonsPushedBy(playerSide, buttonNames)
      if (found) return true
    }
    return false
  }
  public anyButtonDown(playerSide: PlayerSide, buttonNames: ButtonName[]) {
    const gamepad = this.currAssigned.get(playerSide)
    if (gamepad) {
      for (const buttonName of buttonNames) {
        const currState = this.currState.get(gamepad.id)
        if (currState) {
          if (currState.buttons[buttonName]) {
            return true
          }
        }
      }
    }
    return false
  }
  public anyButtonsPushedBy(playerSide: PlayerSide, buttonNames: ButtonName[]) {
    const gamepad = this.currAssigned.get(playerSide)
    if (gamepad) {
      for (const buttonName of buttonNames) {
        const currState = this.currState.get(gamepad.id)
        const prevState = this.prevState.get(gamepad.id)
        const currPushed = currState && currState.buttons[buttonName]
        const prevPushed = prevState && prevState.buttons[buttonName]
        if (currPushed && !prevPushed) {
          return true
        }
      }
    }
    return false
  }
  public getTrigger(playerSide: PlayerSide, triggerName: TriggerName): number {
    const gamepad = this.currAssigned.get(playerSide)
    if (gamepad) {
      const state = this.currState.get(gamepad.id)
      if (state) return state.triggers[triggerName]
      else 0
    }
    return 0
  }

  public getThumbStick(playerSide: PlayerSide, thumbstickName: ThumbstickName): Vector2 {
    const gamepad = this.currAssigned.get(playerSide)
    if (gamepad) {
      const state = this.currState.get(gamepad.id)
      if (state) return state.thumbSticks[thumbstickName]
      else return {x: 0, y: 0}
    }
    return {x: 0, y: 0}
  }

  public getStateFromPlayer(playerSide: PlayerSide): GamePadState | null {
    const gp = this.currAssigned.get(playerSide)
    const prev = this.prevAssigned.get(playerSide)
    if (!gp || !prev) return null
    return this.getStateFromGamepad(gp)
  }

  private getStateFromGamepad(gamepad: Gamepad): GamePadState {
    const {buttons, axes} = gamepad
    return {
      isConnected: true,
      triggers: {
        left: buttons[6].value,
        right: buttons[7].value,
      },
      thumbSticks: {
        left: {x: axes[0], y: axes[1]},
        right: {x: axes[2], y: axes[3]},
      },
      buttons: {
        dPadUp: buttons[12]?.pressed ?? false,
        dPadDown: buttons[13]?.pressed ?? false,
        dPadLeft: buttons[14]?.pressed ?? false,
        dPadRight: buttons[15]?.pressed ?? false,
        psX: gamepad.buttons[0]?.pressed ?? false,
        psO: gamepad.buttons[1]?.pressed ?? false,
        start: gamepad.buttons[9]?.pressed ?? false,
        leftStick: gamepad.buttons[10]?.pressed ?? false,
        rightStick: gamepad.buttons[11]?.pressed ?? false,
        rightShoulder: gamepad.buttons[5]?.pressed ?? false,
      },
    }
  }

  // some older browsers may miss a connect/disconnect
  // annoying that this has to exist
  private async pollingLoop() {
    while (true) {
      await timeout(500)
      const gamepads = navigator.getGamepads().reduce((arr, gp) => {
        gp && arr.push(gp)
        return arr
      }, new Array<Gamepad>())
      // notice anything new connected
      for (const gamepad of gamepads) {
        if (!this.isKnownYet(gamepad)) {
          this.connect(gamepad)
        }
      }
      // notice anything previously connected that disappeared
      for (const prev of this.getAssignedAndUnassigned()) {
        if (gamepads.filter((gp) => gp.id === prev.id).length === 0) {
          this.disconnect(prev)
        }
      }
    }
  }
  private getAssignedAndUnassigned(): Gamepad[] {
    return Array.from(this.currAssigned.values()).concat(this.unassigned)
  }

  private isKnownYet(gamepad: Gamepad) {
    for (const candidate of this.getAssignedAndUnassigned()) {
      if (gamepad.id === candidate.id) return true
    }
    return false
  }
  private connect(gamepad: Gamepad) {
    if (!this.isKnownYet(gamepad)) {
      this.unassigned.push(gamepad)
      console.log('connected', gamepad)
      this.updateAssignments()
    }
  }
  private updateAssignments() {
    for (const pSide of [PlayerSide.Left, PlayerSide.Right]) {
      if (!this.currAssigned.get(pSide) && this.unassigned.length) {
        const gamePad = this.unassigned.splice(0, 1)[0]
        this.currAssigned.set(pSide, gamePad)
      }
    }
  }
  private disconnect(gamepad: Gamepad) {
    // remove from assigned
    for (const pSide of [PlayerSide.Left, PlayerSide.Right]) {
      const gamePad = this.currAssigned.get(pSide)
      if (gamePad && gamePad.id === gamepad.id) {
        console.log('disconnected from assigned', gamepad)
        this.currAssigned.delete(pSide)
      }
    }
    // remove from unassigned
    this.unassigned = this.unassigned.filter((u) => u.id !== gamepad.id)
    this.updateAssignments()
  }
}
export {TriggerName, GamepadMonitor, ButtonName, GamepadConnectSummary}
