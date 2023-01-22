import {Game} from './game'
import {ContentLoadStats} from './types'

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

  private contentLoadMonitor(s: ContentLoadStats): void {
    const $el = document.getElementById('load-stats')
    const w = 100
    const leftW = (s.done / s.total) * w
    const rightW = w - leftW
    let text = `${s.done === s.total ? '✅ Loaded' : 'Pre-loading'} ${s.done} of ${s.total} textures &amp; sounds.`
    if (this.runYet) text = '✅ Almost there...will launch when loaded'
    if ($el)
      $el.innerHTML = `
    <div style="display:inline-block;width:${leftW}px;height:11px;background-color:#00f"></div><div style="display:inline-block;width:${rightW}px;height:10px;background-color:#eee"></div>
    ${text}
    `
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
      btn.style.display = 'none'
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
    <div class="intro-note" style="width:514px;margin:auto;">
    <img src="/images/site/cover.png" width="514" height="325">
    <div id="load-stats" style="text-align:center;font-size:0.9em;height:14px;"></div>
    <p><b>To launch the game</b>, connect your 🎮 🎮 (if you've got them) and hit <span id="btn-go">&lt;spacebar&gt;</span>.</p>
    <h4>Controls & notes</h4>
    <p>
    🎮: T.C.F.T.G. works with 2 gamepads. Or keyboard: 
    <br><br>
      Player 1 ⌨️: <b>a w d</b> to move
    <br>
      Player 2 ⌨️: <b>i j l</b> or <b>arrow keys</b>
    </p>
    <hr>
    <h4>Latest notes</h4>
    <p>
     Gamepads working, at least some, in Safari and Chrome. Not FF yet.
    </p>
    <h4>About</h4>
    <p>
     This game is a free, open source hobby project by <b>Chris Coyne</b> (<a href="https://chriscoyne.com">chriscoyne.com</a>) and some help from friends. Contributions accepted. Source code at
     <a href="https://github.com/malgorithms/they-came-from-the-ground">https://github.com/malgorithms/they-came-from-the-ground</a>
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
    btn.onclick = () => this.onRunClick()
  }
}

export {PageUi}
