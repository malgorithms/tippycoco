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
interface Dim {
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
}

enum GameState {
  PreStart,
  Intro1,
  Intro2,
  Intro3,
  MainMenu,
  PointScored,
  Victory,
  PreAction, // the half-second or so before they pop out of the ground; also time for player 2 to select controller
  Action,
  Paused,
  AutoPaused, // happens if player disconnects controller
  PreExitMessage,
  PreExitCredits,
  Exit,
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
  Dim,
  FontDef,
  Texture2D,
  Rectangle,
  ContentLoadMonitor,
  ContentLoadStats,
  MenuSelectResult,
  TextDrawOptions,
  PlayerSpecies,
}
