import {TextureName} from '../content-load-list'
import {Game} from '../game'
import {EyeConfig} from '../types'
import {vec} from '../utils'
import {AiBase, AiThinkArg, FutureBall} from './base'

const REACTION_TIME_MS = 100
const KISS_DURATION_MS = 830
const KAPOW_DURATION_SEC = 5
const MIN_MS_BETWEEN_KISSES = 1000

class YellowAi extends AiBase {
  private lastKissyFace: number
  constructor(game: Game) {
    super(game)
    this.lastKissyFace = Date.now()
  }

  public couldIKissNow() {
    return Date.now() - this.lastKissyFace > MIN_MS_BETWEEN_KISSES
  }
  public get amKissing() {
    return this.lastKissyFace > Date.now() - KISS_DURATION_MS
  }
  public get textureName(): TextureName {
    return this.amKissing ? 'yellowPlayerKissing1' : 'yellowPlayer'
  }
  public kiss(o: AiThinkArg) {
    this.lastKissyFace = Date.now()
    this.playSound('kiss', 1, 3, 0)
    const kapowLocation = vec.add(o.me.physics.center, {x: 0, y: o.me.physics.radius})
    const rot = 0 - Math.random() * 0.5
    this.kapow.addAKapow('kapowKiss', kapowLocation, rot, 0.2, KAPOW_DURATION_SEC)
  }
  public get eyes() {
    if (this.amKissing) return [] // eyes closed ;-)
    const eyes: EyeConfig[] = [
      {
        // left
        offset: {x: -0.19, y: 0.05},
        size: 0.4,
        movementRadius: 0.05,
        blinkScale: 0.1,
        blinkEveryMs: 2000,
        blinkDurationMs: 100,
        pupilTexture: 'pupilAngry1',
      },
      {
        // right
        offset: {x: 0.16, y: -0.1},
        size: 0.4,
        movementRadius: 0.05,
        blinkScale: 0.1,
        blinkEveryMs: 5000,
        blinkDurationMs: 100,
        pupilTexture: 'pupilAngry2',
      },
    ]
    return eyes
  }

  private timeTillICanReachLanding(o: AiThinkArg) {
    const landing = this.getNextBallHittingOnMySide(o)
    if (!landing) return Infinity
    return Math.abs(landing.pos.x - o.me.physics.center.x) / o.me.maxVel.x
  }

  private wouldILandAroundTheSameTimeAsTheBall(o: AiThinkArg) {
    const timeTillBallLands = o.balls[0].physics.calcTimeTillLanding()
    const timeTillILand = o.me.getMyJumpTime()
    const ballBeatsMeBy = timeTillILand - timeTillBallLands
    if (ballBeatsMeBy > 0 && ballBeatsMeBy < 0.2) return true
    return false
  }
  private isThereABallRightAboveMe(o: AiThinkArg) {
    // jump if it's right above me
    for (const b of o.balls) {
      const deltaX = b.physics.center.x - o.me.physics.center.x
      const deltaY = b.physics.center.y - o.me.physics.center.y
      if (deltaX > -0.05 && deltaX < 0 && deltaY < o.me.physics.diameter * 2) return true
    }
    return false
  }

  public think(o: AiThinkArg): void {
    const me = o.me
    // I am a full-size beast.
    this.goToSize(o, 1)
    const enteringMyRange = this.getNextBallEnteringMyJumpRange(o)
    const landingOnMySide = this.getNextBallHittingOnMySide(o)
    const timeToGetThere = this.timeTillICanReachLanding(o)
    let stateToWatch: FutureBall | null = null
    if (landingOnMySide && (!enteringMyRange || landingOnMySide.time < timeToGetThere + 0.1)) {
      stateToWatch = landingOnMySide
      stateToWatch.pos.x += 0.16 * me.physics.radius
    } else if (enteringMyRange) {
      stateToWatch = enteringMyRange
      stateToWatch.pos.x += 0.16 * me.physics.radius
    }

    if (o.balls[0].physics.center.x > 0) {
      if (this.wouldILandAroundTheSameTimeAsTheBall(o)) this.jumpIfPossible(o)
    }

    if (this.isThereABallRightAboveMe(o) && o.me.isInJumpPosition) {
      this.jumpIfPossible(o)
    }
    const amAirborn = o.me.physics.center.y > o.me.physics.radius * 1.5
    if (amAirborn && this.couldIKissNow()) {
      const distSq = vec.distSq(me.physics.center, o.opponent.physics.center)
      const touchDist = me.physics.radius + o.opponent.physics.radius
      if (distSq < 1.05 * (touchDist * touchDist)) {
        this.kiss(o)
      }
    }

    // What to do if we have no idea
    if (!stateToWatch) {
      // Half the time go to the top of the net. The other half, do other crap.
      if ((o.accumulatedPointSeconds / 10) % 2 == 1) {
        if (me.physics.center.x > o.net.center.x + o.net.width / 2) {
          //this.jumpIfPossible(o)
          this.moveLeft(o)
        } else if (me.physics.center.x < o.net.center.x - o.net.width / 2) {
          //this.jumpIfPossible(o)
          this.moveRight(o)
        } else {
          const speed = (o.net.center.x - me.physics.center.x) / (o.net.width / 2)
          this.moveRationally(o, speed)
        }
      } else {
        if (me.physics.center.x < o.net.center.x + o.net.width / 2 + (2 * me.physics.diameter) / 3) this.moveRight(o)
        else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o)
        else {
          this.stopMoving(o)
        }
      }
      return
    }
    // At this point we know we have a state to watch
    if (me.physics.center.x < o.net.center.x - o.net.width / 2) {
      // keep me on my side of net
      //this.jumpIfPossible(o)
      this.moveRight(o)
    } else {
      this.tryToGetToX(o, stateToWatch.pos.x, stateToWatch.time, REACTION_TIME_MS)
    }
  }
}

export {YellowAi as _YellowAi}
