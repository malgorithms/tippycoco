import {Game, GameState} from '../game'
import {timeout} from '../utils'
import {$} from './site-utils'

class MenuAutoHider {
  private game: Game
  private lastMouseMove = Date.now()
  constructor(game: Game) {
    this.game = game
    window.addEventListener('mousemove', () => this.recordMouseUse())
    this.loop()
  }
  private recordMouseUse() {
    this.lastMouseMove = Date.now()
  }
  private get msSinceMouseUsed() {
    return Date.now() - this.lastMouseMove
  }
  private async loop() {
    while (true) {
      await timeout(100)
      if (this.game.getGameState() === GameState.Action || this.msSinceMouseUsed > 1000) {
        this.hideMenu()
      } else {
        this.showMenu()
      }
    }
  }
  private hideMenu() {
    $('.navbar').style.display = 'none'
  }
  private showMenu() {
    $('.navbar').style.display = ''
  }
}
export {MenuAutoHider}
