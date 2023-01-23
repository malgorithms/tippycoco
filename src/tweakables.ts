import {GameControlKeyboardSet as KeyboardControlSet, NewPlayerArg, PlayerKeyboardSet} from './types'

//
// TODO: extract all the garbage I hard-coded in game.ts into here
//

const twoPlayerControls: KeyboardControlSet = {
  p0: {
    left: ['KeyA'],
    right: ['KeyD'],
    jump: ['KeyW'],
    shrink: ['KeyQ'],
    grow: ['KeyE'],
  },
  p1: {
    left: ['KeyJ', 'ArrowLeft'],
    right: ['KeyL', 'ArrowRight'],
    jump: ['KeyI', 'ArrowUp'],
    shrink: ['KeyU', 'Period'],
    grow: ['KeyO', 'Slash'],
  },
}

// allow any of the above for one player games
const p0Set: PlayerKeyboardSet = {
  left: twoPlayerControls.p0.left.concat(twoPlayerControls.p1.left),
  right: twoPlayerControls.p0.right.concat(twoPlayerControls.p1.right),
  jump: twoPlayerControls.p0.jump.concat(twoPlayerControls.p1.jump),
  shrink: twoPlayerControls.p0.shrink.concat(twoPlayerControls.p1.shrink),
  grow: twoPlayerControls.p0.grow.concat(twoPlayerControls.p1.grow),
}
const onePlayerControls: KeyboardControlSet = {
  p0: p0Set,
  p1: p0Set,
}

export default {
  twoPlayerControls,
  onePlayerControls,
  menu: {
    bpm: 87, // beats per minute for menu, etc.
    lineSpacing: 1.05,
  },
  fpsSampleCount: 100, // loops
  ballPlayerLaunchTime: 0.5,
  winningScore: 5,
  winByTwo: true,
  gameGravity: {x: 0, y: -1.9},
  timeAfterPointToFreeze: 0.5,
  timeAfterPointToReturnHome: 1.5,
  predictFutureEvery: 0.3,
  physicsDt: 0.002, // seconds,
  predictionLookahead: 1.5,
  predictionPhysicsDt: 0.005,
  predictionStorageDt: 0.01,
  thumbstickCenterTolerance: 0.05, // anything this close to center is returned as 0
  triggerTolerance: 0.05, // anything this close to 0 is just 0
  triggerGrowthMult: 0.4, //
  keyboardGrowthRate: 0.1,
  net: {
    center: {x: 0.5, y: 0.025},
    width: 0.08,
    height: 0.055,
  },
  leftWall: {
    center: {x: -0.129, y: 0.5},
    width: 0.2579,
    height: 1.0,
  },
  rightWall: {
    center: {x: 1.129, y: 0.5},
    width: 0.2579,
    height: 1.0,
  },
  floorFront: {
    yMax: 0, // draws below this line
  },
  floorBack: {
    yMax: 0.0365,
    yMin: -0.07,
  },
  ball: {
    defaultSettings: {
      mass: 0.1,
      diameter: 0.08,
      maxSpeed: 1.4,
    },
  },
  proximityTolerance: 0.001,
  player: {
    growSpeed: 0.1,
    minDiameter: 0.09,
    maxDiameter: 0.175,
    defaultSettings: {
      maxVel: {x: 0.8, y: 1.2},
      diameter: 0.15,
      mass: 3,
      xSpringConstant: 30,
      gravityMultiplier: 1.9, // relative to ball
      targetXVel: 0,
    } as NewPlayerArg,
  },
} as const
