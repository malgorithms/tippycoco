import {PlayerSide} from '../types'
import {AiBase, AiThinkArg, FutureBall} from './base'

// not jumping right at the start of a point prevents WhiteAi from
// getting aced with an underbelly serve
const NO_JUMP_BEFORE = 1.5
const REACTION_TIME_MS = 25

class WhiteAi extends AiBase {
  constructor() {
    super()
  }
  private j(o: AiThinkArg) {
    if (o.accumulatedPointSeconds > NO_JUMP_BEFORE) this.jumpIfPossible(o)
  }

  private timeTillICanReachLanding(o: AiThinkArg) {
    const landing = this.getNextBallHittingOnMySide(o)
    if (!landing) return Infinity
    return Math.abs(landing.pos.x - o.me.physics.center.x) / o.me.maxVel.x
  }

  public think(o: AiThinkArg): void {
    const me = o.me
    const opponent = o.opponent
    this.goToSize(o, 0.7)

    if (o.accumulatedPointSeconds < 1.0) return
    else {
      this.goToSize(o, 0)
    }

    // PERFORM A MIRROR MANEUVER
    if (o.accumulatedPointSeconds < 0.5) {
      let offset =
        (me.physics.center.x - o.gameConfig.net.center.x - (o.gameConfig.net.center.x - opponent.physics.center.x)) / me.physics.diameter
      if (offset > 1.0) offset = 1.0
      if (offset < -1.0) offset = 1.0
      this.moveRationally(o, -offset)
      if (opponent.physics.center.y > me.physics.center.y) {
        this.j(o)
      }
      return
    }

    if (o.gameConfig.balls[0].physics.vel.x == 0 && o.gameConfig.balls[0].physics.center.x == 0.25) {
      // Don't move if opponent hasn't.
      return
    }

    let stateToWatch: FutureBall | null = null
    const amLeft = o.myPlayerSide === PlayerSide.Left
    const enteringMyRange = this.getNextBallEnteringMyJumpRange(o)
    const landingOnMySide = this.getNextBallHittingOnMySide(o)
    const timeToReach = this.timeTillICanReachLanding(o)

    if (landingOnMySide && (!enteringMyRange || landingOnMySide.time < timeToReach + 0.1)) {
      stateToWatch = landingOnMySide
      stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0
    } else if (enteringMyRange) {
      stateToWatch = enteringMyRange
      stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0
    }

    // What to do if we have no idea
    if (!stateToWatch) {
      // Half the time go to the top of the net. The other half, do other crap.
      if ((Math.floor(o.accumulatedPointSeconds) / 10) % 2 == 1) {
        if (me.physics.center.x > o.gameConfig.net.center.x + o.gameConfig.net.width / 2) {
          this.j(o)
          this.moveLeft(o)
        } else if (me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
          this.j(o)
          this.moveRight(o)
        } else {
          const speed = (o.gameConfig.net.center.x - me.physics.center.x) / (o.gameConfig.net.width / 2)
          this.moveRationally(o, speed)
        }
      } else {
        if (me.physics.center.x < o.gameConfig.net.center.x + o.gameConfig.net.width / 2 + (2 * me.physics.diameter) / 3) this.moveRight(o)
        else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o)
        else this.stopMoving(o)
      }

      return
    }

    // At this point we know we have a state to watch
    if (!amLeft && me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
      // keep me on my side of net
      this.j(o)
      this.moveRight(o)
    } else {
      this.tryToGetToX(o, stateToWatch.pos.x, stateToWatch.time, REACTION_TIME_MS)
    }

    const timeTillJump = me.getTimeToJumpToHeight(o.gameGravity.y, stateToWatch.pos.y)

    // When is it safe to jump?
    //1. when there's no known landing
    if (stateToWatch.time < timeTillJump && !landingOnMySide) {
      this.j(o)
    }
    //2. when there's 1 known landing
    let count = 0
    for (const f of o.ballPredictions) {
      if (f.ballHittingGround.isKnown) {
        count++
      }
    }
    if (count <= 1 && stateToWatch.time < timeTillJump) {
      this.j(o)
    }
  }
}
export {WhiteAi as _WhiteAi}
