import {Ball} from '../ball'
import {FuturePrediction, unknownState} from '../future-prediction'
import {Player} from '../player'
import {RectangularObstacle} from '../rectangular-obstacle'
import tweakables from '../tweakables'
import {FutureState, GameTime, PlayerSide, Vector2} from '../types'

interface FutureBall {
  pos: Vector2
  time: number
}

interface AiThinkArg {
  gameTime: GameTime
  accumulatedPointSeconds: number
  myPlayerSide: PlayerSide
  balls: Ball[]
  ballPredictions: FuturePrediction[]
  gameGravity: Vector2
  p0Score: number
  p1Score: number
  me: Player
  opponent: Player
  net: RectangularObstacle
}

abstract class AiBase {
  private _lastMoveLeft: number
  private _lastMoveRight: number
  private _lastJump: number
  constructor() {
    this._lastMoveLeft = 0
    this._lastMoveRight = 0
    this._lastJump = 0
  }
  /**
   * @returns milliseconds since I've last jumped, or Infinity if never
   */
  public msSinceMyLastJump(o: AiThinkArg): number {
    return this._lastJump ? o.gameTime.totalGameTime.totalMilliseconds - this._lastJump : Infinity
  }
  /**
   * @returns milliseconds since I've last moved left, or Infinity if never
   */
  public msSinceMyLastMoveLeft(o: AiThinkArg): number {
    return this._lastMoveLeft ? o.gameTime.totalGameTime.totalMilliseconds - this._lastMoveLeft : Infinity
  }
  /**
   * @returns milliseconds since I've last moved right, or Infinity if never
   */
  public msSinceMyLastMoveRight(o: AiThinkArg): number {
    return this._lastMoveRight ? o.gameTime.totalGameTime.totalMilliseconds - this._lastMoveRight : Infinity
  }

  public abstract think(o: AiThinkArg): void

  protected getNextBallEnteringMyJumpRange(o: AiThinkArg): FutureBall | null {
    const myPlayerSide = o.myPlayerSide
    let result: FutureState = unknownState()
    for (const pred of o.ballPredictions) {
      const lookup = pred.ballEnteringJumpRange(myPlayerSide)
      if (!lookup) throw new Error('failed to lookup')
      if (!result?.isKnown || lookup.time < result.time) {
        result = lookup
      }
    }
    return this.futureStateToBall(result)
  }

  protected getNextBallHittingOnMySide(o: AiThinkArg): FutureBall | null {
    const myPlayerSide = o.myPlayerSide
    const net = o.net
    const result: FutureState = unknownState()
    const amLeft = myPlayerSide === PlayerSide.Left
    for (const p of o.ballPredictions) {
      const hittingGround = p.ballHittingGround
      if ((amLeft && hittingGround.pos.x > net.center.x) || (!amLeft && hittingGround.pos.x < net.center.x)) {
        continue
      }
      if (hittingGround.isKnown && hittingGround.time < result.time) {
        result.isKnown = true
        result.time = hittingGround.time
        result.pos = hittingGround.pos
      }
    }
    return this.futureStateToBall(result)
  }

  // This is a bit prettier for writing the inherited classes, since
  // there is no nonsense data when nothing known
  private futureStateToBall(fs: FutureState): FutureBall | null {
    if (fs.isKnown) return {pos: fs.pos, time: fs.time}
    return null
  }

  protected goToSize(o: AiThinkArg, fractionOfWayFromSmallToLarge: number): void {
    const gameTime = o.gameTime
    const me = o.me
    const dt = gameTime.elapsedGameTime.totalMilliseconds / 1000
    const minD = tweakables.player.minDiameter
    const maxD = tweakables.player.maxDiameter
    const targetSize = minD + fractionOfWayFromSmallToLarge * (maxD - minD)
    if (me.physics.diameter < targetSize) me.grow(dt, tweakables.player.growSpeed)
    else if (me.physics.diameter > targetSize) me.grow(dt, -tweakables.player.growSpeed)
  }
  protected moveLeft(o: AiThinkArg) {
    this._lastMoveLeft = o.gameTime.totalGameTime.totalMilliseconds
    o.me.moveLeft()
  }
  protected moveRight(o: AiThinkArg) {
    this._lastMoveRight = o.gameTime.totalGameTime.totalMilliseconds
    o.me.moveRight()
  }
  protected amIAboveTheNet(o: AiThinkArg) {
    const px = o.me.physics.center.x
    const net = o.net
    return px > net.center.x - net.width / 2 && px < net.center.x + net.width / 2
  }
  protected amIOnTheWrongSide(o: AiThinkArg) {
    const net = o.net
    const px = o.me.physics.center.x
    if (o.myPlayerSide === PlayerSide.Left) return px > net.center.x + net.width / 2
    else return px < net.center.x - net.width / 2
  }

  /**
   *
   * @param o
   * @param fractionOfMaxVelocity - -1...1 how close to max speed
   */
  protected moveRationally(o: AiThinkArg, fractionOfMaxVelocity: number) {
    if (fractionOfMaxVelocity < 0) this._lastMoveLeft = o.gameTime.totalGameTime.totalMilliseconds
    else if (fractionOfMaxVelocity > 0) this._lastMoveRight = o.gameTime.totalGameTime.totalMilliseconds
    o.me.moveRationally(fractionOfMaxVelocity)
  }
  /**
   * stop moving left/right
   */
  protected stopMoving(o: AiThinkArg) {
    o.me.moveRationally(0)
  }
  /**
   * jumps but only if you're in position to
   * @param gameTime for storing when you last jumped
   * @param me myself
   */
  protected jumpIfPossible(o: AiThinkArg) {
    this._lastJump = o.gameTime.totalGameTime.totalMilliseconds
    o.me.jump()
  }
  protected isInJumpingPosition(player: Player) {
    return player.isInJumpPosition
  }
  /**
   * this goto tries to be a little smoother, acting with rational speed as it's close to it's destination
   */
  protected tryToGetToX(o: AiThinkArg, x: number, sec: number, reactionTimeMs: number) {
    if (sec <= 0) return
    const cx = o.me.physics.center.x
    const dx = x - cx
    const speedNeeded = dx / sec
    const speed = speedNeeded * 2 // we go faster than we need to
    let scale = speed / o.me.maxVel.x
    if (scale > 1) scale = 1
    if (scale < -1) scale = -1
    if (scale > 0 && this.msSinceMyLastMoveLeft(o) > reactionTimeMs) {
      this.moveRationally(o, scale)
    } else if (scale < 0 && this.msSinceMyLastMoveRight(o) > reactionTimeMs) {
      this.moveRationally(o, scale)
    }
  }
}

export {AiBase, AiThinkArg, FutureBall}
