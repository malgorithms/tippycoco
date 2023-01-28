import {Color} from './color'
import {KeyboardControlSet, NewPlayerArg, PlayerKeyboardSet, PlayerSpecies} from './types'

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
    bpm: 87, // beats per minute for menu, to match the music
    cardWidth: 0.7, // game units
    cardWidthSelected: 1.0, // selected card this much bigger
    cardStackStart: {x: 0.5, y: 0.5},
    cardStackSpacing: {x: 0.2, y: 0.0}, // game units
    textOffsetFromCard: {x: 0, y: 0.4},
    afterChosenOffset: {x: 0.1, y: -0.1},
    coverColor: new Color(0, 0, 0, 0.3), //  background over existing game
    deselectedCardColor: new Color(0, 0, 0, 0.2), //  background over existing game
    cardBall1Pos: {x: 0.85, y: 0.73}, // fractional position on card's surface!
    cardBall2Pos: {x: 0.85, y: 0.58}, // fractional position on card's surface!
    lockReasonPos: {x: 0, y: -0.4}, // fraction position on card's surface
    lockReasonColor: new Color(1, 1, 1, 0.8),
    cardBallSize: 0.08, // fractional to card's size
    cardSizeBounce: 0.05,
    cardRotationBounce: 0.03,
    subtextOffset: {x: 0, y: -0.2},
    subtextRelSize: 0.4,
    lockOverlayAlpha: 0.8,
    statsPosition: {x: 1, y: -0.1},
    statsColorLeft: new Color(0.5, 1, 0, 0.5),
    statsColorRight: new Color(0.5, 1, 0, 0.7),
    statsColorRightBad: new Color(1, 1, 0, 0.7),
    statsFontSize: 0.035,
    statsLineSpacing: 1.2,
    statsRightColAdj: {x: 0.02, y: -0.0025},
    statsRightColFontMult: 1.1,
    statsFastestWinFlames: [60, 45, 30, 15],
  },
  input: {
    triggerTolerance: 0.05, // anything this close to 0 is just 0
    triggerGrowthMult: 0.4, //
    thumbstickPush: 0.6, // how far stick has to go to be considered pushed like a dpad
  },
  fpsSampleCount: 100, // loops
  ballPlayerLaunchTime: 0.5,
  winningScore: 5,
  gameGravity: {x: 0, y: -1.9},
  timeAfterPointToFreeze: 0.5,
  timeAfterPointToReturnHome: 1.5,
  predictFutureEvery: 0.3,
  physicsDt: 0.002, // seconds,
  redrawTargetMs: 4,
  predictionLookahead: 1.75,
  predictionPhysicsDt: 0.004,
  predictionStorageDt: 0.02,
  thumbstickCenterTolerance: 0.05, // anything this close to center is returned as 0
  keyboardGrowthRate: 0.1,
  fontFamilyFallback: "'Courier New', Arial",
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
  cloud: {
    num: 5,
    minVel: {x: 0.01, y: -0.01},
    maxVel: {x: 0.07, y: 0.01},
  },
  atmosphere: {
    timeToTurnSunny: 2,
    timeToTurnDark: 3,
    maxSkies: 3,
    skyTransitionMs: 1000,
  },
  moon: {
    nightHeightFrac: 0.75,
    widthFrac: 0.3,
  },
  proximityTolerance: 0.001,
  player: {
    growSpeed: 0.1,
    minDiameter: 0.09,
    maxDiameter: 0.175,
    jumpSpeedAfterPoint: 1.5,
    defaultSettings: () =>
      ({
        maxVel: {x: 0.8, y: 1.2},
        diameter: 0.15,
        mass: 3,
        xSpringConstant: 30,
        gravityMultiplier: 1.9, // relative to ball
        targetXVel: 0,
        species: PlayerSpecies.Human,
        ai: null,
      } as NewPlayerArg),
  },
} as const
