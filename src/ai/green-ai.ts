import {TextureName} from '../content-load-list'
import {Game} from '../game'
import {SkyAssignmentNames} from '../types'
import {AiBase, AiThinkArg} from './base'

const PREDICT_SEC = 0.6 // seconds in the future green will see
const REACTION_TIME_MS = 300 // I can't change wiggle direction faster than this

/**
 *  This AI serves as a good simple example how to write a TCFTG player.
 *  It's not too bright but the code is simple and clean.
 */

class GreenAi extends AiBase {
  constructor(game: Game) {
    super(game)
  }

  /**
   * typically our players don't change their textures throughout a game,
   * but this is called on every draw to get the name of the texture to use,
   * in case you animate your texture.
   *
   * (see content-load-list.ts for all textures)
   */
  public get textureName(): TextureName {
    return 'greenPlayer'
  }

  /**
   * here we customize what background we want for sunny (not game point)
   * or dark (game point). Again, see content-load-list.ts for explanation
   */
  public get skyTextureNames(): SkyAssignmentNames {
    return {
      sunny: 'sunnyBackgroundGreen',
      dark: 'darkBackground',
    }
  }
  /**
   * `think` is the function you must implement in your AI. it takes a general
   * object `o` that has a bunch of game state. Your think function is called many
   * times per second. It doesn't return anything. Instead, you send movement
   * commands such as `this.jumpIfPossible(o)` or `this.moveLeft(o)`
   * @param o
   */

  public think(o: AiThinkArg): void {
    // I just jump sometimes
    if (o.accumulatedPointSeconds < 1) this.jumpIfPossible(o)

    // And hang out at 90% size
    this.goToSize(o, 0.9)

    // I try not to move otherwise during the first second of a point
    if (o.accumulatedPointSeconds < 1) return

    // Ok, now I need a point of interest. First thing I look for is
    // a ball entering my jump range. If there isn't one coming, even worse,
    // maybe it is on its way to hit on my side.
    const target = this.getNextBallHittingOnMySide(o) || this.getNextBallEnteringMyJumpRange(o)

    if (!target) {
      this.moveRationally(o, 0.1) // let's just move right at 10% speed
      this.jumpIfPossible(o)
    } else {
      // I'll try to stay a bit to the right of the position
      target.pos.x += 0.16 * o.me.physics.diameter

      if (target.time < PREDICT_SEC) {
        // Let's add some randomness for stupidity, but have that randomness a function of the
        // current time, so it's not flickering all over the place.
        const err = Math.sin(o.gameTime.totalGameTime.totalSeconds) * 0.2
        target.pos.x += o.balls[0].physics.diameter * err
        target.pos.y += o.balls[0].physics.diameter * err

        // At this point we know we have a state to watch
        // keep me on my side of net
        if (this.amIAboveTheNet(o) || this.amIOnTheWrongSide(o)) {
          this.jumpIfPossible(o)
          this.moveRight(o)
        } else {
          // the base class has this helper that uses a rational move speed to
          // try to get to a spot by a certain time.
          this.tryToGetToX(o, target.pos.x, target.time, REACTION_TIME_MS)
        }

        // Remaining question is...do I jump?
        const seconds = Math.floor(o.gameTime.totalGameTime.totalSeconds)
        const isOddSecond = seconds % 2
        const timeErr = 0.1 * Math.sin(o.accumulatedPointSeconds)
        const timeTillJump = o.me.getTimeToJumpToHeight(target.pos.y) + timeErr
        if (target.time < timeTillJump && isOddSecond) this.jumpIfPossible(o)
      }
    }
  }
}

export {GreenAi as _GreenAi}
