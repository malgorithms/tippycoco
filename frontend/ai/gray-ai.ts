import {TextureName} from '../content-load-list'
import {Game} from '../game'
import {EyeConfig, SkyAssignmentNames} from '../types'
import {vec} from '../utils'
import {AiBase, AiThinkArg, FutureBall} from './base'

const REACTION_TIME_MS = 100
const KAPOW_DURATION_SEC = 1

const eyes: EyeConfig[] = [
  {
    offset: {x: -0.35, y: 0.1},
    size: 0.2,
    movementRadius: 0.06,
    blinkScale: 0.1,
    blinkEveryMs: 3000,
    blinkDurationMs: 100,
    pupilTexture: 'pupil',
  },
  {
    offset: {x: 0.45, y: 0.1},
    size: 0.2,
    movementRadius: 0.01,
    blinkScale: 0.1,
    blinkEveryMs: 3000,
    blinkDurationMs: 100,
    pupilTexture: 'pupil',
  },
]

class GrayAi extends AiBase {
  private lastWhine: number
  constructor(game: Game) {
    super(game)
    this.lastWhine = Date.now()
  }
  public get eyes() {
    return eyes
  }
  public get skyTextureNames(): SkyAssignmentNames {
    return {
      sunny: 'sunnyBackgroundBlue',
      dark: 'darkBackground',
    }
  }
  public drawExtrasInFrontOfCharacter(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#000'

    // left ear
    ctx.beginPath()
    ctx.moveTo(-0.8, 0.6)
    ctx.lineTo(-0.85, 0.8)
    ctx.lineTo(-1.1, 1.5)
    ctx.lineTo(-0.7, 2.1)
    ctx.lineTo(-0.45, 1.7)
    ctx.lineTo(-0.35, 1.3)
    ctx.lineTo(0, 1)
    ctx.fill()

    // right ear
    ctx.beginPath()
    ctx.moveTo(0.8, 0.65)
    ctx.lineTo(0.75, 0.74)
    ctx.lineTo(1.4, 1.3)
    ctx.lineTo(0.6, 2.0)
    ctx.lineTo(0.5, 1.4)
    ctx.lineTo(0.3, 1.1)
    ctx.lineTo(0, 1)
    ctx.fill()
  }

  public get textureName(): TextureName {
    return 'grayPlayer'
  }
  private jumpBark(o: AiThinkArg) {
    if (this.jumpIfPossible(o)) {
      if (Math.random() < 0.1) {
        this.playSound('dogBark', 1, 0.5, 0)
        const kapowLocation = vec.add(o.me.physics.center, {x: 0, y: o.me.physics.radius})
        const rot = 0 - Math.random() * 0.5
        this.kapow.addAKapow('kapowWoof', kapowLocation, rot, 0.2, KAPOW_DURATION_SEC)
      }
    }
  }
  private maybeWhine(o: AiThinkArg) {
    const sec = o.accumulatedPointSeconds
    if (o.p0Score >= 4 && o.p0Score > o.p1Score) {
      if (sec > 1 && sec < 2 && Date.now() - this.lastWhine > 2000) {
        this.lastWhine = Date.now()
        this.playSound('dogWhine', 1, 0, 0)
        const kapowLocation = vec.add(o.me.physics.center, {x: 0, y: o.me.physics.radius})
        const rot = 0 - Math.random() * 0.5
        this.kapow.addAKapow('kapowWhine', kapowLocation, rot, 0.2, KAPOW_DURATION_SEC)
      }
    }
  }

  private isThereABallRightAboveMe(o: AiThinkArg) {
    // jump if it's right above me
    for (const b of o.balls) {
      const deltaX = b.physics.center.x - o.me.physics.center.x
      const deltaY = b.physics.center.y - o.me.physics.center.y
      if (deltaX > -0.05 && deltaX < 0 && deltaY < o.me.physics.diameter * 5) return true
    }
    return false
  }
  private amIOnTheWrongSideOfTheNext(o: AiThinkArg) {
    if (o.me.physics.center.x < o.net.center.x && o.me.physics.center.y < o.me.physics.radius / 5) return true
    return false
  }

  public think(o: AiThinkArg): void {
    const me = o.me
    this.maybeWhine(o)
    this.goToSize(o, 0.0)
    const enteringMyRange = this.getNextBallEnteringMyJumpRange(o)
    const landingOnMySide = this.getNextBallHittingOnMySide(o)
    let stateToWatch: FutureBall | null = null
    if (landingOnMySide) stateToWatch = landingOnMySide
    else if (enteringMyRange) stateToWatch = enteringMyRange
    else stateToWatch = {time: 0, pos: {y: 0, x: o.balls[0].physics.center.x}}
    stateToWatch.pos.x += 0.1 * me.physics.diameter
    if (this.isThereABallRightAboveMe(o)) this.jumpBark(o)
    this.tryToGetToX(o, stateToWatch.pos.x, stateToWatch.time, REACTION_TIME_MS)
    if (this.amIOnTheWrongSideOfTheNext(o)) {
      this.moveRight(o)
      this.jumpBark(o)
    }
  }
}

export {GrayAi as _GrayAi}
