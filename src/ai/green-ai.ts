import {PlayerSide} from '../types'
import {AiBase, AiThinkArg} from './ai-base'

class GreenAi extends AiBase {
  private reactionTime: number // won't go for balls that are further than this from being interesting
  constructor() {
    super()
    this.reactionTime = 0.4
  }
  public think(o: AiThinkArg) {
    const me = o.me
    const dt: number = o.gameTime.elapsedGameTime.totalMilliseconds / 1000
    // Just jump sometimes
    if (o.accumulatedPointTime < 1) {
      GreenAi.jumpIfOkay(me)
    }
    GreenAi.goToSize(dt, me, 0.9)

    if (o.accumulatedPointTime < 1.0) return

    let stateToWatch = this.getNextBallEnteringMyJumpRange(o, o.myPlayerSide)
    const amLeft = o.myPlayerSide === PlayerSide.Left
    if (!stateToWatch.isKnown) stateToWatch = this.getNextBallHittingOnMySide(o, o.myPlayerSide)
    if (stateToWatch.isKnown) stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0

    // What to do if we have no idea
    if (!stateToWatch?.isKnown) {
      if (me.physics.center.x < o.gameConfig.net.center.x + o.gameConfig.net.width / 2 + (2 * me.physics.diameter) / 3)
        this.moveRight(o.gameTime, me)
      else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o.gameTime, me)
      else this.moveRationally(o.gameTime, me, 0.0)
      return
    }
    if (stateToWatch.time < this.reactionTime) {
      // Let's add some randomness for stupidity
      stateToWatch.pos.x += (o.gameConfig.balls[0].physics.diameter * Math.sin(o.gameTime.totalGameTime.totalSeconds)) / 1.5
      stateToWatch.pos.y += (o.gameConfig.balls[0].physics.diameter * Math.sin(o.gameTime.totalGameTime.totalSeconds)) / 1.5

      // At this point we know we have a state to watch
      // keep me on my side of net
      if (!amLeft && me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
        GreenAi.jumpIfOkay(me)
        this.moveRight(o.gameTime, me)
      } else if (
        me.physics.center.x > stateToWatch.pos.x + me.physics.diameter / 10.0 &&
        o.gameTime.totalGameTime.totalMilliseconds - this.lastMoveRight > 300.0
      ) {
        this.moveLeft(o.gameTime, me)
      } else if (
        me.physics.center.x < stateToWatch.pos.x - me.physics.diameter / 10.0 &&
        o.gameTime.totalGameTime.totalMilliseconds - this.lastMoveLeft > 300.0
      ) {
        this.moveRight(o.gameTime, me)
      } else {
        this.moveRationally(o.gameTime, me, 0.0)
      }

      let timeTillJump = me.getTimeToJumpToHeight(o.gameGravity.y, stateToWatch.pos.y)

      // Add a random amount from it to jump an unpredictable late (or early) amount.
      timeTillJump += 0.3 * Math.sin(o.accumulatedPointTime)

      // Only jump sometimes
      const seconds = Math.floor(o.gameTime.totalGameTime.totalSeconds)
      if (stateToWatch.time < timeTillJump && seconds % 2 != 0) GreenAi.jumpIfOkay(me)
    }
  }
}

export {GreenAi}
