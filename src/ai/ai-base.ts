import {FuturePrediction, unknownState} from '../future-prediction'
import {GameConfig} from '../game-config'
import {Player} from '../player'
import {RectangularObstacle} from '../rectangular-obstacle'
import tweakables from '../tweakables'
import {FutureState, GameTime, PlayerSide, Vector2} from '../types'

interface AiThinkArg {
  gameTime: GameTime
  accumulatedPointTime: number
  gameConfig: GameConfig
  myPlayerSide: PlayerSide
  futurePredictionList: FuturePrediction[]
  gameGravity: Vector2
  p0Score: number
  p1Score: number
  me: Player
  opponent: Player
}

abstract class AiBase {
  protected lastMoveLeft: number
  protected lastMoveRight: number
  constructor() {
    this.lastMoveLeft = 0
    this.lastMoveRight = 0
  }

  public abstract think(o: AiThinkArg): void

  protected getNextBallEnteringMyJumpRange(futurePredictionList: FuturePrediction[], myPlayerSide: PlayerSide): FutureState {
    let result: FutureState = unknownState()
    for (let i = 0; i < futurePredictionList.length; i++) {
      const pred = futurePredictionList[i]
      const lookup = pred.ballEnteringJumpRange(myPlayerSide)
      if (!lookup) throw new Error('failed to lookup')
      if (i === 0 || !result?.isKnown || lookup.time < result.time) {
        result = lookup
      }
    }
    return result
  }

  protected getNextBallHittingOnMySide(
    futurePredictionList: FuturePrediction[],
    myPlayerSide: PlayerSide,
    net: RectangularObstacle,
  ): FutureState {
    const result: FutureState = unknownState()
    const amLeft = myPlayerSide === PlayerSide.Left
    for (const p of futurePredictionList) {
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
    return result
  }

  static goToSize(dt: number, me: Player, fractionOfWayFromSmallToLarge: number): void {
    const minD = tweakables.player.minDiameter
    const maxD = tweakables.player.maxDiameter
    const targetSize = minD + fractionOfWayFromSmallToLarge * (maxD - minD)
    if (me.physics.diameter < targetSize) me.grow(dt, tweakables.player.growSpeed)
    else if (me.physics.diameter > targetSize) me.grow(dt, -tweakables.player.growSpeed)
  }
  protected moveLeft(gameTime: GameTime, me: Player) {
    this.lastMoveLeft = gameTime.totalGameTime.totalMilliseconds
    me.moveLeft()
  }
  protected moveRight(gameTime: GameTime, me: Player) {
    this.lastMoveRight = gameTime.totalGameTime.totalMilliseconds
    me.moveRight()
  }
  protected moveRationally(gameTime: GameTime, me: Player, fractionOfMaxVelocity: number) {
    if (fractionOfMaxVelocity < 0) this.lastMoveLeft = gameTime.totalGameTime.totalMilliseconds
    else if (fractionOfMaxVelocity > 0) this.lastMoveRight = gameTime.totalGameTime.totalMilliseconds
    me.moveRationally(fractionOfMaxVelocity)
  }
  protected static jumpIfOkay(me: Player) {
    if (me.isOnHeight(0.0)) {
      me.jump()
    }
  }
}

export {AiBase, AiThinkArg}
