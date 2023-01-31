import {AiBase} from './ai/base'

enum PlayerSide {
  Left = 'left',
  Right = 'right',
}

enum PlayerSpecies {
  Ai = 'ai',
  Human = 'human',
}
type ValueOf<T> = T[keyof T]

type KeyboardKeyCode = string // as seen in event.code; ' ' for space, etc.

interface PlayerKeyboardSet {
  jump: KeyboardKeyCode[]
  left: KeyboardKeyCode[]
  right: KeyboardKeyCode[]
  grow: KeyboardKeyCode[]
  shrink: KeyboardKeyCode[]
}
interface KeyboardControlSet {
  p0: PlayerKeyboardSet
  p1: PlayerKeyboardSet
}
interface Texture2D {
  img: HTMLImageElement
  width: number
  height: number
}
interface GameTime {
  elapsedGameTime: {
    totalSeconds: number
    totalMilliseconds: number
  }
  totalGameTime: {
    totalSeconds: number
    totalMilliseconds: number
  }
}
interface Vector2 {
  x: number
  y: number
}
interface Dims {
  w: number
  h: number
}
interface Rectangle {
  x1: number
  y1: number
  x2: number
  y2: number
}
interface FutureState {
  pos: Vector2
  time: number
  isKnown: boolean
}
interface CircleCircleCollision {
  didCollide: boolean
  angle: number
  pointOfContact: Vector2
  c1MomentumDelta: Vector2
  c2MomentumDelta: Vector2
  c1EnergyDelta: number
  c2EnergyDelta: number
}
interface NewPlayerArg {
  maxVel: Vector2
  diameter: number
  mass: number
  xSpringConstant: number
  gravityMultiplier: number
  targetXVel: number
  species: PlayerSpecies
  ai: AiBase | null
}

interface MenuSelectResult {
  selected: boolean
  byKeyboard: boolean
  byPlayerSide: PlayerSide | null
}

interface ContentLoadStats {
  total: number
  done: number
}
type ContentLoadMonitor = (ls: ContentLoadStats) => void

interface FontDef {
  family: string
  weight: number
  url: string
}

interface TextDrawOptions {
  textAlign?: CanvasTextAlign
  textBaseline?: CanvasTextBaseline
}

enum GameState {
  PreStart = 'pre-start',
  Intro1 = 'intro1',
  Intro2 = 'intro2',
  Intro3 = 'intro3',
  MainMenu = 'main-menu',
  PointScored = 'point-scored',
  Victory = 'victory',
  PreAction = 'pre-action', // the half-second or so before they pop out of the ground; also time for player 2 to select controller
  Action = 'action',
  Paused = 'paused',
  AutoPaused = 'auto-paused', // happens if player disconnects controller
  PreExitMessage = 'pre-exit-message',
  PreExitCredits = 'pre-exit-credts',
  Exit = 'exit',
}

export {
  ValueOf,
  GameState,
  GameTime,
  PlayerKeyboardSet,
  KeyboardControlSet,
  PlayerSide,
  Vector2,
  FutureState,
  CircleCircleCollision,
  NewPlayerArg,
  Dims,
  FontDef,
  Texture2D,
  Rectangle,
  ContentLoadMonitor,
  ContentLoadStats,
  MenuSelectResult,
  TextDrawOptions,
  PlayerSpecies,
}
