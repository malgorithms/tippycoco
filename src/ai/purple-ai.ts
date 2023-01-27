import {AiBase, AiThinkArg, FutureBall} from './base'

const REACTION_TIME_MS = 25 // seconds

class PurpleAi extends AiBase {
  constructor() {
    super()
  }
  private timeTillICanReachLanding(o: AiThinkArg) {
    const landing = this.getNextBallHittingOnMySide(o)
    if (!landing) return Infinity
    return Math.abs(landing.pos.x - o.me.physics.center.x) / o.me.maxVel.x
  }

  public think(o: AiThinkArg): void {
    const me = o.me

    if (o.accumulatedPointSeconds < 1.0) return
    // Gonna shrink as small as possible
    this.goToSize(o, 0)

    if (o.gameConfig.balls[0].physics.vel.x == 0 && o.gameConfig.balls[0].physics.center.x == 0.25) {
      // could have it do some kind of taunting here
      return
    }

    const enteringMyRange = this.getNextBallEnteringMyJumpRange(o)
    const landingOnMySide = this.getNextBallHittingOnMySide(o)
    const timeToGetThere = this.timeTillICanReachLanding(o)
    let stateToWatch: FutureBall | null = null
    if (landingOnMySide && (!enteringMyRange || landingOnMySide.time < timeToGetThere + 0.1)) {
      stateToWatch = landingOnMySide
      stateToWatch.pos.x -= 0.16 * me.physics.diameter
    } else if (enteringMyRange) {
      stateToWatch = enteringMyRange
      stateToWatch.pos.x -= 0.16 * me.physics.diameter
    }

    // What to do if we have no idea
    if (!stateToWatch) {
      // Half the time go to the top of the net. The other half, do other crap.
      if ((o.accumulatedPointSeconds / 10) % 2 == 1) {
        if (me.physics.center.x > o.gameConfig.net.center.x + o.gameConfig.net.width / 2) {
          this.jumpIfPossible(o)
          this.moveLeft(o)
        } else if (me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
          this.jumpIfPossible(o)
          this.moveRight(o)
        } else {
          const speed = (o.gameConfig.net.center.x - me.physics.center.x) / (o.gameConfig.net.width / 2)
          this.moveRationally(o, speed)
        }
      } else {
        if (me.physics.center.x < o.gameConfig.net.center.x + o.gameConfig.net.width / 2 + (2 * me.physics.diameter) / 3) this.moveRight(o)
        else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o)
        else {
          //console.log(1)
          this.stopMoving(o)
        }
      }
      return
    }
    // At this point we know we have a state to watch
    if (me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
      // keep me on my side of net
      this.jumpIfPossible(o)
      this.moveRight(o)
    } else {
      this.tryToGetToX(o, stateToWatch.pos.x, stateToWatch.time, REACTION_TIME_MS)
    }
  }
}
export {PurpleAi as _PurpleAi}
