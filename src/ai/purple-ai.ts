import {unknownState} from '../future-prediction'
import {FutureState, PlayerSide} from '../types'
import {AiBase, AiThinkArg} from './ai-base'
//
// TODO: replace that this is just using a green AI.
//

class PurpleAi extends AiBase {
  constructor() {
    super()
  }
  public think(o: AiThinkArg): void {
    const me = o.me
    const dt = o.gameTime.elapsedGameTime.totalSeconds

    if (o.accumulatedPointTime < 1.0) return
    PurpleAi.goToSize(dt, me, 0.0)

    if (o.gameConfig.balls[0].physics.vel.x == 0 && o.gameConfig.balls[0].physics.center.x == 0.25) {
      // could have it do some kind of taunting here
      return
    }

    let stateToWatch: FutureState = unknownState()
    const enteringMyRange = this.getNextBallEnteringMyJumpRange(o.ballPredictions, o.myPlayerSide)
    const amLeft = o.myPlayerSide === PlayerSide.Left
    const landingOnMySide = this.getNextBallHittingOnMySide(o.ballPredictions, o.myPlayerSide, o.gameConfig.net)
    const timeToLanding = Math.abs(landingOnMySide.pos.x - me.physics.center.x) / me.maxVel.x

    if (landingOnMySide.isKnown && (!enteringMyRange.isKnown || landingOnMySide.time < timeToLanding + 0.1)) {
      stateToWatch = landingOnMySide
      stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0
    } else if (enteringMyRange.isKnown) {
      stateToWatch = stateToWatch = enteringMyRange
      stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0
    }

    // What to do if we have no idea
    if (!stateToWatch?.isKnown) {
      // Half the time go to the top of the net. The other half, do other crap.
      if ((o.accumulatedPointTime / 10) % 2 == 1) {
        if (me.physics.center.x > o.gameConfig.net.center.x + o.gameConfig.net.width / 2) {
          PurpleAi.jumpIfOkay(me)
          this.moveLeft(o.gameTime, me)
        } else if (me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
          PurpleAi.jumpIfOkay(me)
          this.moveRight(o.gameTime, me)
        } else {
          this.moveRationally(o.gameTime, me, (o.gameConfig.net.center.x - me.physics.center.x) / (o.gameConfig.net.width / 2))
        }
      } else {
        if (me.physics.center.x < o.gameConfig.net.center.x + o.gameConfig.net.width / 2 + (2 * me.physics.diameter) / 3)
          this.moveRight(o.gameTime, me)
        else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o.gameTime, me)
        else this.moveRationally(o.gameTime, me, 0.0)
      }

      return
    }

    // At this point we know we have a state to watch
    if (!amLeft && me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
      // keep me on my side of net
      PurpleAi.jumpIfOkay(me)
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
  }
}
export {PurpleAi}
