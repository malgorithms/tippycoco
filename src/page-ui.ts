import {Game} from './game'
import {ContentLoadStats} from './types'
import {timeout} from './utils'

class PageUi {
  parentEl: HTMLElement
  private game: Game
  private runYet: boolean
  constructor(parentEl: HTMLElement) {
    this.runYet = false
    this.parentEl = parentEl
    this.generateLayout()
    const canvasWrapper = this.findDiv('#game-canvas-wrapper')
    this.game = new Game(canvasWrapper, (s) => this.contentLoadMonitor(s))
  }

  private lPad(n: number, len: number) {
    let s = `${n}`
    while (s.length < len) s = `0${s}`
    return s
  }
  private async contentLoadMonitor(s: ContentLoadStats) {
    const $el = document.getElementById('load-stats')
    const w = 100
    const leftW = 1 + (s.done / s.total) * w
    const rightW = 1 + w - leftW
    let text = `${s.done === s.total ? '✅' : '🔥'} ${this.lPad(s.done, 3)}/${s.total} textures &amp; sounds.`
    if (this.runYet) text = 'Almost there...will launch when loaded'
    if ($el)
      $el.innerHTML = `
    <div style="display:inline-block;width:${leftW}px;height:11px;background-color:#00f"></div><div style="display:inline-block;width:${rightW}px;height:10px;background-color:#eee"></div>
    ${text}
    `
    if (s.done === s.total) {
      const launchInst = document.getElementById('launch-instructions') as HTMLElement
      while (!this.runYet) {
        launchInst.innerHTML = '&nbsp;'
        await timeout(500)
        launchInst.innerHTML = `Press <b>[spacebar]</b> to play.`
        await timeout(1500)
      }
    }
  }

  // -----------------------------------------------------------
  // PRIVATE
  // -----------------------------------------------------------

  private findDiv(selectors: string): HTMLDivElement {
    return this.parentEl.querySelector(selectors) as HTMLDivElement
  }

  private async onRunClick() {
    if (!this.runYet) {
      const btn = document.getElementById('btn-go') as HTMLElement
      if (btn) {
        btn.style.display = 'none'
      }
      document.body.classList.add('in-game')
      this.runYet = true
      await this.game.run()
      // game is over
      window.location.reload()
    }
  }

  // -----------------------------------------------------------

  private introDiv(): string {
    return `    <div class="game-intro-wrapper">
    <div class="intro-note" style="width:679px;margin:auto;">
    <img src="/images/site/cover.png" width="679" height="271">
    <div id="load-stats" style="text-align:center;font-size:0.9em;height:14px;"></div>
    <div id="launch-instructions"  style="text-align:center;font-size:0.9em;height:14px;margin-top:14px;"></div>
    <h4 style="margin-top:50px;">Controls & notes</h4>
    <p>
    🎮: T.C.F.T.G. works with 1 or 2 gamepads, and/or keyboard: 
    <br><br>
      Player 1 ⌨️: <b>a w d</b> to move
    <br>
      Player 2 ⌨️: <b>i j l</b> or <b>arrow keys</b>
    </p>
    <h4>Latest changes</h4>
    <p>
     Fixed control of menu when paused by controller
    </p>
    <h4>About</h4>
    <p>
     This game is a free, open-source hobby project by <b>Chris Coyne</b> (<a href="https://chriscoyne.com">chriscoyne.com</a>) with help from friends. Contributions accepted. Source code at
     <a href="https://github.com/malgorithms/they-came-from-the-ground">https://github.com/malgorithms/they-came-from-the-ground</a>. The GitHub readme shows how to run your own
     copy of the game. It's fun to change the game physics and rules.
    </p>
    </div>
    </div>`
  }

  private generateLayout(): void {
    this.parentEl.innerHTML = `
    <div class="world-container">
        <div id="game-canvas-wrapper">
        ${this.introDiv()}
        </div>
    </div>`
    const loaded = Date.now()
    // in Chrome, we need to trigger anything audio related by user action, or it won't play.
    window.onkeydown = (e) => {
      if (Date.now() - loaded > 100 && e.key === ' ') {
        this.onRunClick()
      }
    }
    const btn = document.getElementById('btn-go') as HTMLElement
    if (btn) btn.onclick = () => this.onRunClick()
  }
}

export {PageUi}
