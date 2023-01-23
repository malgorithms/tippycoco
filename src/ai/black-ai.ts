import {PlayerSide} from '../types'
import {AiBase, AiThinkArg} from './ai-base'
import {WhiteAi} from './white-ai'

//
// TODO: replace that this is just using a green AI.
//

class BlackAi extends AiBase {
  private hiddenWhiteBrain: WhiteAi
  constructor() {
    super()
    this.hiddenWhiteBrain = new WhiteAi()
  }
  public think(o: AiThinkArg): void {
    if ((o.p0Score + o.p1Score) % 3 == 0 && Math.sin(o.accumulatedPointTime / 3) < 0) {
      this.hiddenWhiteBrain.think(o)
      return
    }
    const me = o.me
    const dt = o.gameTime.elapsedGameTime.totalSeconds

    // Just jump sometimes
    if (o.accumulatedPointTime < 1) {
      BlackAi.jumpIfOkay(me)
    }
    BlackAi.goToSize(dt, me, 0.9)

    if (o.accumulatedPointTime < 1.0) return

    let stateToWatch = o.ballPredictions[0].ballEnteringJumpRange(o.myPlayerSide)
    const amLeft = o.myPlayerSide === PlayerSide.Left
    if (!stateToWatch.isKnown) stateToWatch = o.ballPredictions[0].ballHittingGround
    if (stateToWatch.isKnown) stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0

    // What to do if we have no idea
    if (!stateToWatch.isKnown) {
      if (me.physics.center.x < o.gameConfig.net.center.x + o.gameConfig.net.width / 2 + (2 * me.physics.diameter) / 3)
        this.moveRight(o.gameTime, me)
      else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o.gameTime, me)
      else this.moveRationally(o.gameTime, me, 0.0)
      return
    }

    // Let's add some randomness for stupidity
    stateToWatch.pos.x += (o.gameConfig.balls[0].physics.diameter * Math.sin(o.gameTime.elapsedGameTime.totalSeconds)) / 6
    stateToWatch.pos.y += (o.gameConfig.balls[0].physics.diameter * Math.sin(o.gameTime.elapsedGameTime.totalSeconds)) / 6

    // At this point we know we have a state to watch
    if (!amLeft && me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
      // keep me on my side of net
      BlackAi.jumpIfOkay(me)
      this.moveRight(o.gameTime, me)
    } else if (
      me.physics.center.x > stateToWatch.pos.x + me.physics.diameter / 10.0 &&
      o.gameTime.totalGameTime.totalMilliseconds - this.lastMoveRight > 5
    )
      this.moveLeft(o.gameTime, me)
    else if (
      me.physics.center.x < stateToWatch.pos.x - me.physics.diameter / 10.0 &&
      o.gameTime.totalGameTime.totalMilliseconds - this.lastMoveLeft > 5
    )
      this.moveRight(o.gameTime, me)
    else this.moveRationally(o.gameTime, me, 0.0)

    const timeTillJump = me.getTimeToJumpToHeight(o.gameGravity.y, stateToWatch.pos.y)

    // Only jump sometimes
    if (stateToWatch.time < timeTillJump && o.gameTime.totalGameTime.totalSeconds % 50 != 0) BlackAi.jumpIfOkay(me)
  }
}
export {BlackAi}
