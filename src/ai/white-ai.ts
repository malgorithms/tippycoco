import {unknownState} from '../future-prediction'
import {FutureState, PlayerSide} from '../types'
import {AiBase, AiThinkArg} from './ai-base'

class WhiteAi extends AiBase {
  // not jumping right at the start of a point prevents WhiteAi from
  // getting aced with an underbelly serve
  private noJumpingBefore = 1.5
  constructor() {
    super()
  }
  private jmp(o: AiThinkArg) {
    if (o.accumulatedPointTime > this.noJumpingBefore) WhiteAi.jumpIfOkay(o.me)
  }

  public think(o: AiThinkArg): void {
    const me = o.me
    const opponent = o.opponent
    if (!opponent) throw new Error('bs')
    const dt = o.gameTime.elapsedGameTime.totalSeconds
    WhiteAi.goToSize(dt, me, 0.7)

    if (o.accumulatedPointTime < 1.0) return
    else {
      WhiteAi.goToSize(dt, me, 0.0)
    }
    // PERFORM A MIRROR MANEUVER
    if (o.accumulatedPointTime < 0.5) {
      let offset =
        (me.physics.center.x - o.gameConfig.net.center.x - (o.gameConfig.net.center.x - opponent.physics.center.x)) / me.physics.diameter
      if (offset > 1.0) offset = 1.0
      if (offset < -1.0) offset = 1.0
      this.moveRationally(o.gameTime, me, -offset)
      if (opponent.physics.center.y > me.physics.center.y) {
        this.jmp(o)
      }
      return
    }

    if (o.gameConfig.balls[0].physics.vel.x == 0 && o.gameConfig.balls[0].physics.center.x == 0.25) {
      // Don't move if opponent hasn't.
      return
    }

    let stateToWatch: FutureState = unknownState()
    const amLeft = o.myPlayerSide === PlayerSide.Left
    const enteringMyRange = this.getNextBallEnteringMyJumpRange(o, o.myPlayerSide)
    const landingOnMySide = this.getNextBallHittingOnMySide(o, o.myPlayerSide)
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
      if ((Math.floor(o.accumulatedPointTime) / 10) % 2 == 1) {
        if (me.physics.center.x > o.gameConfig.net.center.x + o.gameConfig.net.width / 2) {
          this.jmp(o)
          this.moveLeft(o.gameTime, me)
        } else if (me.physics.center.x < o.gameConfig.net.center.x - o.gameConfig.net.width / 2) {
          this.jmp(o)
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
      this.jmp(o)
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

    // When is it safe to jump?
    //1. when there's no known landing
    if (stateToWatch.time < timeTillJump && !landingOnMySide.isKnown) {
      this.jmp(o)
    }
    //2. when there's 1 known landing
    let count = 0
    for (const f of o.ballPredictions) {
      if (f.ballHittingGround.isKnown) {
        count++
      }
    }
    if (count <= 1 && stateToWatch.time < timeTillJump) {
      this.jmp(o)
    }
  }
}
export {WhiteAi}
