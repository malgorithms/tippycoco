import {TextureName} from '../content-load-list'
import {Game} from '../game'
import {EyeConfig, SkyAssignmentNames} from '../types'
import {AiBase, AiThinkArg, FutureBall} from './base'

const REACTION_TIME_MS = 25 // seconds

const friendlyEyeConfig: EyeConfig[] = [
  {
    // left
    offset: {x: -0.22, y: 0.05},
    size: 0.2,
    movementRadius: 0.05,
    blinkScale: 0.1,
    blinkEveryMs: 5000,
    blinkDurationMs: 100,
    pupilTexture: 'pupil',
  },
  {
    // right
    offset: {x: 0.145, y: 0.141},
    size: 0.2,
    movementRadius: 0.05,
    blinkScale: 0.1,
    blinkEveryMs: 5000,
    blinkDurationMs: 100,
    pupilTexture: 'pupil',
  },
]

const angryEyeConfig: EyeConfig[] = friendlyEyeConfig

class PurpleAi extends AiBase {
  private amAngry: boolean
  constructor(game: Game) {
    super(game)
    this.amAngry = false
  }
  public get eyes() {
    return this.amAngry ? angryEyeConfig : friendlyEyeConfig
  }

  private timeTillICanReachLanding(o: AiThinkArg) {
    const landing = this.getNextBallHittingOnMySide(o)
    if (!landing) return Infinity
    return Math.abs(landing.pos.x - o.me.physics.center.x) / o.me.maxVel.x
  }
  public get skyTextureNames(): SkyAssignmentNames {
    return {
      sunny: 'sunnyBackgroundPurplish',
      dark: 'darkBackground',
    }
  }
  public get textureName(): TextureName {
    return this.amAngry ? 'purplePlayerAngry' : 'purplePlayer'
  }

  private areAllBallsOnMySide(o: AiThinkArg): boolean {
    for (const b of o.balls) {
      if (b.physics.center.x < 0) return false
    }
    return true
  }
  public think(o: AiThinkArg): void {
    const me = o.me
    this.amAngry = this.areAllBallsOnMySide(o)

    if (o.accumulatedPointSeconds < 1.0) return
    // Gonna shrink small
    this.goToSize(o, 0.35)

    if (o.balls[0].physics.vel.x == 0 && o.balls[0].physics.center.x == 0.25) {
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

    for (const b of o.balls) {
      const deltaX = b.physics.center.x - o.me.physics.center.x
      const deltaY = b.physics.center.y - o.me.physics.center.y
      if (deltaX > -0.05 && deltaX < 0 && deltaY < o.me.physics.diameter * 2) this.jumpIfPossible(o)
    }

    // What to do if we have no idea
    if (!stateToWatch) {
      // Half the time go to the top of the net. The other half, do other crap.
      if ((o.accumulatedPointSeconds / 10) % 2 == 1) {
        if (me.physics.center.x > o.net.center.x + o.net.width / 2) {
          this.jumpIfPossible(o)
          this.moveLeft(o)
        } else if (me.physics.center.x < o.net.center.x - o.net.width / 2) {
          this.jumpIfPossible(o)
          this.moveRight(o)
        } else {
          const speed = (o.net.center.x - me.physics.center.x) / (o.net.width / 2)
          this.moveRationally(o, speed)
        }
      } else {
        if (me.physics.center.x < o.net.center.x + o.net.width / 2 + (2 * me.physics.diameter) / 3) this.moveRight(o)
        else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o)
        else {
          //console.log(1)
          this.stopMoving(o)
        }
      }
      return
    }
    // At this point we know we have a state to watch
    if (me.physics.center.x < o.net.center.x - o.net.width / 2) {
      // keep me on my side of net
      this.jumpIfPossible(o)
      this.moveRight(o)
    } else {
      this.tryToGetToX(o, stateToWatch.pos.x, stateToWatch.time, REACTION_TIME_MS)
    }
  }
}
export {PurpleAi as _PurpleAi}
