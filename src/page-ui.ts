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
      this.refresh()
    }
  }

  // -----------------------------------------------------------

  private refresh() {
    // TODO: something that doesn't require rechecking all the assets
    // for not-modified
    window.location.reload()
  }

  // -----------------------------------------------------------

  private isMobile(): boolean {
    if (/iPad|Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      return true
    } else {
      return false
    }
  }

  // -----------------------------------------------------------

  private introDiv(): string {
    const mobileMessage = this.isMobile()
      ? `
      <div style="text-align:center;font-size:2em;margin-top:40px;">
         ⚠️ <b>T.C.F.T.G</b> will play on an <b>iPad</b>, but only with an
         external keyboard. It will not play on phones.
        </p>
      </div>
    `
      : ''
    return `    <div class="game-intro-wrapper">
    <div class="intro-note" style="max-width:100%;">
      <div style="text-align:center">
        <img src="/images/site/cover.png" width="100%">
        <div id="load-stats" style="text-align:center;font-size:0.9em;height:14px;"></div>
        ${mobileMessage}        
        <div id="launch-instructions"  style="text-align:center;font-size:1.1em;height:20px;margin-top:20px;"></div>
      </div>
      <h4 style="margin-top:50px;">Controls & notes</h4>
      <p>
      🎮: T.C.F.T.G. works with 1 or 2 gamepads. (PS5, XBox, etc. controllers work when plugged into your computer.)
      <br><br>
      If you're using a keyboard:
      <br><br>
        Player 1 ⌨️: <b>a w d</b> to move
      <br>
        Player 2 ⌨️: <b>i j l</b> or <b>arrow keys</b>
      </p>
      <h4>Latest changes</h4>
      <p>
      Unlockable enemies
      </p>
      <h4>Links</h4>
      <ul>
       <li><a href="https://github.com/malgorithms/they-came-from-the-ground">source code</a></li>
       <li><a href="#no" id="btn-erase-storage">erase local stats</a></li>
       <li>my personal website, <a href="https://chriscoyne.com">ChrisCoyne.com</a></li>
       <li>my twitter, <a href="https://twitter.com/malgorithms">@malgorithms</a></li>
      </ul>
      <h4>About</h4>
      <p>
        This game is a free, open-source hobby project by <b>Chris Coyne</b> (<a href="https://chriscoyne.com">chriscoyne.com</a>) with help from friends. The GitHub readme shows how to run your own
        copy of the game. It's a joy to change the game physics and rules. The original inspiration for this game was Slime Volleyball, by Quin Pendragon. Music in T.C.F.T.G. by my friend
        Christian Rudder, of the band <a href="https://en.wikipedia.org/wiki/Bishop_Allen">Bishop Allen</a>.
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
    const eraseBtn = document.getElementById('btn-erase-storage') as HTMLElement
    eraseBtn.onclick = () => {
      if (confirm('sure? this will clear your game stats and unlocks.')) {
        window.localStorage.clear()
        alert('done!')
        this.refresh()
      }
    }
  }
}

export {PageUi}
