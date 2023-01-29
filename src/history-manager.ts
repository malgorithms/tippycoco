import {GameTime} from './types'

class HistoryManager {
  private lastTimeRecorder = new Map<string, number>()
  public recordEvent(eventName: string, gameTime: GameTime) {
    this.lastTimeRecorder.set(eventName, gameTime.totalGameTime.totalSeconds)
  }
  public hasHappenedRecently(eventName: string, gameTime: GameTime, seconds: number) {
    const lastTime = this.lastTimeRecorder.get(eventName)
    if (!lastTime) return false
    if (gameTime.totalGameTime.totalSeconds - lastTime > seconds) return false
    return true
  }
}

export {HistoryManager}
