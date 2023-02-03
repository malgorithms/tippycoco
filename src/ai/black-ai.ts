import {TextureName} from '../content-load-list'
import {Game} from '../game'
import {PlayerSide} from '../types'
import {AiBase, AiThinkArg} from './base'
import {_WhiteAi} from './white-ai'

const REACTION_TIME_MS = 20

//
// TODO: replace that this is just using a green AI.
//

class BlackAi extends AiBase {
  private hiddenWhiteBrain: _WhiteAi
  constructor(game: Game) {
    super(game)
    this.hiddenWhiteBrain = new _WhiteAi(game)
  }
  public get textureName(): TextureName {
    return 'blackPlayer'
  }
  public think(o: AiThinkArg): void {
    if ((o.p0Score + o.p1Score) % 3 == 0 && Math.sin(o.accumulatedPointSeconds / 3) < 0) {
      this.hiddenWhiteBrain.think(o)
      return
    }
    const me = o.me

    // Just jump sometimes
    if (o.accumulatedPointSeconds < 1) {
      this.jumpIfPossible(o)
    }
    this.goToSize(o, 0.9)

    if (o.accumulatedPointSeconds < 1.0) return

    let stateToWatch = o.ballPredictions[0].ballEnteringJumpRange(o.me.playerSide)
    const amLeft = o.me.playerSide === PlayerSide.Left
    if (!stateToWatch.isKnown) stateToWatch = o.ballPredictions[0].ballHittingGround
    if (stateToWatch.isKnown) stateToWatch.pos.x += ((amLeft ? -1.0 : 1.0) * me.physics.diameter) / 6.0

    // What to do if we have no idea
    if (!stateToWatch.isKnown) {
      if (me.physics.center.x < o.net.center.x + o.net.width / 2 + (2 * me.physics.diameter) / 3) this.moveRight(o)
      else if (me.physics.center.x > 1.0 - (2 * me.physics.diameter) / 3) this.moveLeft(o)
      else this.stopMoving(o)
      return
    }

    // Let's add some randomness for stupidity
    stateToWatch.pos.x += (o.balls[0].physics.diameter * Math.sin(o.gameTime.elapsedGameTime.totalSeconds)) / 6
    stateToWatch.pos.y += (o.balls[0].physics.diameter * Math.sin(o.gameTime.elapsedGameTime.totalSeconds)) / 6

    // At this point we know we have a state to watch
    if (!amLeft && me.physics.center.x < o.net.center.x - o.net.width / 2) {
      // keep me on my side of net
      this.jumpIfPossible(o)
      this.moveRight(o)
    } else {
      this.tryToGetToX(o, stateToWatch.pos.x, stateToWatch.time, REACTION_TIME_MS)
    }
    const timeTillJump = me.getTimeToJumpToHeight(stateToWatch.pos.y)

    // Only jump sometimes
    if (stateToWatch.time < timeTillJump && o.gameTime.totalGameTime.totalSeconds % 50 != 0) {
      this.jumpIfPossible(o)
    }
  }
}

// import from ai.ts not here, to use
export {BlackAi as _BlackAi}
