import {Game} from './game'
import {ContentLoadStats} from './types'

/**
 * responsible for creating the game and putting into a page.
 * draws a little loader underneath it.
 */

type onDoneCb = () => void
class GameLoader {
  private loadMonitorEl: HTMLElement
  private _game: Game
  private _isLoaded = false
  private _isRunning = false
  constructor(parentEl: HTMLElement, loadMonitorEl: HTMLElement, onDone: onDoneCb) {
    this.loadMonitorEl = loadMonitorEl
    this._game = new Game(parentEl, (s) => {
      this.contentLoadMonitor(s, onDone)
    })
  }
  public get game() {
    return this._game
  }
  public get isLoaded() {
    return this._isLoaded
  }
  public get isRunning() {
    return this._isRunning
  }
  private lPad(n: number, len: number) {
    let s = `${n}`
    while (s.length < len) s = `0${s}`
    return s
  }
  private async contentLoadMonitor(s: ContentLoadStats, onDone: onDoneCb) {
    const $el = this.loadMonitorEl
    const w = 200
    const leftW = 1 + (s.done / s.total) * w
    const rightW = 1 + w - leftW
    const emoji = s.done === s.total ? '✅' : '🔥'
    const text = `${emoji} ${this.lPad(s.done, 3)}/${s.total} textures &amp; sounds.`
    if ($el)
      $el.innerHTML = `
          <div style="display:inline-block;width:${leftW}px;
                height:0.6em;background-color:#00f"></div
          ><div style="display:inline-block;width:${rightW}px;
                height:0.6em;background-color:#eee"
          ></div>
    ${text}
    `
    if (s.done === s.total) {
      this._isLoaded = true
      onDone()
    }
  }
  public async run() {
    if (!this._isLoaded) throw new Error('Game is not loaded yet')
    if (!this._isRunning) {
      this._isRunning = true
      await this._game.run()
    }
  }
}

export {GameLoader}
