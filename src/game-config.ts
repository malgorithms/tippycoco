import {AiBase} from './ai/base'
import {Ball} from './ball'
import {Player, PlayerSpecies} from './player'
import {RectangularObstacle} from './rectangular-obstacle'
import tweakables from './tweakables'
import {PlayerSide} from './types'

class PlayerConfiguration {
  public species: PlayerSpecies = PlayerSpecies.Human
  public ai: AiBase | null = null
  public playerSide: PlayerSide = PlayerSide.Left
  constructor() {
    /* gonna remove this */
  }
}
class GameConfig {
  private playerConfigurations: Map<PlayerSide, PlayerConfiguration>
  private players: Map<PlayerSide, Player>
  public balls: Ball[]
  public net: RectangularObstacle
  public leftWall: RectangularObstacle
  public rightWall: RectangularObstacle
  public playerConfig(playerSide: PlayerSide): PlayerConfiguration {
    const cfg = this.playerConfigurations.get(playerSide)
    if (!cfg) throw new Error(`No config for side ${playerSide}`)
    return cfg
  }
  public player(playerSide: PlayerSide): Player {
    const p = this.players.get(playerSide)
    if (!p) throw new Error(`No player for side ${playerSide}`)
    return p
  }
  public setPlayer(playerSide: PlayerSide, p: Player): void {
    this.players.set(playerSide, p)
  }
  public get liveBalls(): Ball[] {
    return this.balls.filter((b) => b.isAlive)
  }
  constructor() {
    this.playerConfigurations = new Map()
    this.playerConfigurations.set(PlayerSide.Left, new PlayerConfiguration())
    this.playerConfigurations.set(PlayerSide.Right, new PlayerConfiguration())
    this.players = new Map()
    this.players.set(PlayerSide.Left, new Player(tweakables.player.defaultSettings))
    this.players.set(PlayerSide.Right, new Player(tweakables.player.defaultSettings))
    this.balls = []
    this.balls.push(
      new Ball(
        {x: 0.25, y: 0.5}, // Position
        {x: 0.0, y: 0.4}, // Velocity
        tweakables.ball.defaultSettings.diameter,
        tweakables.ball.defaultSettings.mass,
        tweakables.ball.defaultSettings.maxSpeed,
        0.0, // Orientation
        0.0, // Rotation Speed
        true, // Is Alive
      ),
    )
    this.balls.push(
      new Ball(
        {x: 0.75, y: 0.5}, // Position
        {x: 0.0, y: 0.4}, // Velocity
        tweakables.ball.defaultSettings.diameter,
        tweakables.ball.defaultSettings.mass,
        tweakables.ball.defaultSettings.maxSpeed,
        0.0, // Orientation
        0.0, // Rotation Speed
        true, // Is Alive
      ),
    )
    this.net = new RectangularObstacle(tweakables.net.center, tweakables.net.width, tweakables.net.height)
    this.leftWall = new RectangularObstacle(tweakables.leftWall.center, tweakables.leftWall.width, tweakables.leftWall.height)
    this.rightWall = new RectangularObstacle(tweakables.rightWall.center, tweakables.rightWall.width, tweakables.rightWall.height)
  }
}

export {PlayerConfiguration, GameConfig}
