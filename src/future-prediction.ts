import {FutureState, PlayerSide} from './types'

const unknownState = () =>
  ({
    pos: {x: Infinity, y: Infinity},
    time: Infinity,
    isKnown: false,
  } as FutureState)

class FuturePrediction {
  public ballStates = new Array<FutureState>()
  public ballHittingGround = unknownState()
  public ballCrossingNet = unknownState()
  private ballEnteringPlayerJumpRange = new Map<PlayerSide, FutureState>([
    [PlayerSide.Left, unknownState()],
    [PlayerSide.Right, unknownState()],
  ])

  public ballEnteringJumpRange(playerSide: PlayerSide): FutureState {
    const res = this.ballEnteringPlayerJumpRange.get(playerSide)
    if (!res) throw new Error(`Could not check jump range for ${playerSide}`)
    return res
  }
  public setBallEnteringJumpRange(playerSide: PlayerSide, futureState: FutureState): void {
    this.ballEnteringPlayerJumpRange.set(playerSide, futureState)
  }
}

export {FuturePrediction, unknownState}
