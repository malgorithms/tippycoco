import {FutureState, PlayerSide} from './types'

const unknownState = (): FutureState => ({
  pos: {x: Infinity, y: Infinity},
  time: Infinity,
  isKnown: false,
})

class FuturePrediction {
  public ballStates: FutureState[]
  public ballHittingGround: FutureState
  public ballCrossingNet: FutureState
  private ballEnteringPlayerJumpRange: Map<PlayerSide, FutureState>

  constructor() {
    this.ballStates = []
    this.ballHittingGround = unknownState()
    this.ballCrossingNet = unknownState()
    this.ballEnteringPlayerJumpRange = new Map()
    this.ballEnteringPlayerJumpRange.set(PlayerSide.Left, unknownState())
    this.ballEnteringPlayerJumpRange.set(PlayerSide.Right, unknownState())
  }
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
