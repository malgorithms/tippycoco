import {AiBase, AiThinkArg} from './ai/base'
import {Ball} from './ball'
import {Colors} from './color'
import constants from './constants'
import {ContentLoader} from './content-loader'
import {Display} from './display'
import {FuturePrediction, unknownState} from './future-prediction'
import {GameConfig, PlayerConfiguration} from './game-config'
import {HistoryManager} from './history-manager'
import {Input} from './input'
import {KapowManager, KapowType} from './kapow-manager'
import {Menu, MenuAction} from './menu'
import {Player, PlayerSpecies} from './player'
import {SoundManager} from './sound-manager'
import tweakables from './tweakables'
import {ContentLoadMonitor, FutureState, GameState, GameTime, NewPlayerArg, PlayerSide, Vector2} from './types'
import {timeout, vec} from './utils'
import {persistence} from './persistence'
import {aiToName} from './ai/ai'

class Game {
  private content: ContentLoader
  private display!: Display
  private input!: Input
  private sound!: SoundManager
  private menu!: Menu
  private gameConfig: GameConfig
  private kapowManager: KapowManager
  private historyManager: HistoryManager
  private isGamePoint: boolean
  private scoreLeftPlayer = 0
  private scoreRightPlayer = 0
  private whoseServe = PlayerSide.Left
  private gameState = GameState.PreStart
  private currentGameTime: GameTime
  private futurePredictionList: FuturePrediction[] = []
  private lastFuturePrediction: number
  private fpsTimer: number[]
  private isContentLoadedYet = false

  public accumulatedGamePlayTime = 0 // How much the clock has run this game, in seconds, excluding pauses and between points
  public accumulatedStateTime = 0 // Time accumulated since last gamestate change
  public accumulatedPointTime = 0 // Accumulated play time this point (persists even if pausing it to go to menu)
  private whenStartedDateTime = Date.now()

  constructor(targetDiv: HTMLDivElement, contentLoadMonitor: ContentLoadMonitor) {
    this.content = new ContentLoader(contentLoadMonitor)
    this.gameConfig = new GameConfig()
    this.kapowManager = new KapowManager()
    this.historyManager = new HistoryManager()
    this.lastFuturePrediction = 0
    this.fpsTimer = []
    this.isGamePoint = false
    this.currentGameTime = this.emptyGameTime()
    this.resetScores()
    this.init(targetDiv)
  }
  private async init(targetDiv: HTMLDivElement) {
    this.sound = new SoundManager(this.content)
    this.display = new Display(this.content, targetDiv)
    this.menu = new Menu(this.display)
    this.input = new Input(this.gameConfig)
    await this.loadContent()
    this.resetScores()
    this.resetPlayers()

    this.playerLeftCfg.species = PlayerSpecies.Human
    this.playerRightCfg.species = PlayerSpecies.Human
    console.log('setting sky')
    this.display.atmosphere.changeSkyForOpponent(this.playerRightCfg, 1)
    this.setGameState(GameState.PreStart)
    this.futurePredictionList = []
    for (let i = 0; i < this.gameConfig.balls.length; i++) {
      this.futurePredictionList.push(new FuturePrediction())
    }
  }
  public get playerLeft(): Player {
    return this.gameConfig.player(PlayerSide.Left)
  }
  public get playerRight(): Player {
    return this.gameConfig.player(PlayerSide.Right)
  }
  public get playerLeftCfg(): PlayerConfiguration {
    return this.gameConfig.playerConfig(PlayerSide.Left)
  }
  public get playerRightCfg(): PlayerConfiguration {
    return this.gameConfig.playerConfig(PlayerSide.Right)
  }

  private emptyGameTime(): GameTime {
    return {
      totalGameTime: {
        totalMilliseconds: 0,
        totalSeconds: 0,
      },
      elapsedGameTime: {
        totalMilliseconds: 0,
        totalSeconds: 0,
      },
    }
  }

  private resetPlayers() {
    const pLeftConfig: NewPlayerArg = {
      maxVel: {x: 0.8, y: 1.2},
      diameter: 0.15,
      mass: 3,
      xSpringConstant: 30,
      gravityMultiplier: 1.9,
      targetXVel: 0,
    }
    const pRightConfig: NewPlayerArg = {
      maxVel: {x: 0.8, y: 1.2},
      diameter: 0.15,
      mass: 3,
      xSpringConstant: 30,
      gravityMultiplier: 1.9,
      targetXVel: 0,
    }
    this.gameConfig.setPlayer(PlayerSide.Left, new Player(pLeftConfig))
    this.gameConfig.setPlayer(PlayerSide.Right, new Player(pRightConfig))
  }
  public async run() {
    while (!this.isContentLoadedYet) {
      await timeout(100)
    }
    this.whenStartedDateTime = Date.now()
    this.display.initialDraw()
    await this.runLoop()
  }
  private updateFps() {
    this.fpsTimer.push(Date.now())
    if (this.fpsTimer.length > tweakables.fpsSampleCount) {
      this.fpsTimer.splice(0, 1)
    }
  }
  public getCurrentFps(): number {
    const len = this.fpsTimer.length
    return len <= 1 ? 0 : 1000 / ((this.fpsTimer[len - 1] - this.fpsTimer[0]) / len)
  }
  private async runLoop() {
    const startTime = Date.now()
    let lastTime = Date.now()
    while (this.gameState !== GameState.Exit) {
      this.input.updateInputStates()
      this.updateFps()
      await timeout(constants.gameLoopDelayMs)
      const currTime = Date.now()
      const dt = currTime - lastTime
      this.currentGameTime = {
        totalGameTime: {
          totalMilliseconds: currTime - startTime,
          totalSeconds: (currTime - startTime) / 1000,
        },
        elapsedGameTime: {
          totalMilliseconds: dt,
          totalSeconds: dt / 1000,
        },
      }
      this.update(this.currentGameTime)
      this.draw(this.currentGameTime)
      lastTime = currTime
    }
  }

  public setGameState(gs: GameState) {
    if (gs !== GameState.PreStart) {
      // hello world
    }
    if (gs !== this.gameState) this.accumulatedStateTime = 0.0
    this.gameState = gs
    if (gs === GameState.PreAction || gs === GameState.Intro1) this.setUpForServe()
    if (
      gs === GameState.MainMenu ||
      gs === GameState.Paused ||
      gs === GameState.PreExitMessage ||
      gs === GameState.PreExitCredits ||
      gs === GameState.Intro1 ||
      gs === GameState.Intro2 ||
      gs === GameState.Intro3 ||
      gs === GameState.VictoryForPlayer0 ||
      gs === GameState.VictoryForPlayer1
    ) {
      this.sound.playIfNotPlaying('themeSong', 1.0, 0.0, 0.0, true)
    } else if (gs !== GameState.PreStart) {
      this.sound.stopThemeMusic()
    }
    if (gs === GameState.Action && !this.isGamePoint) {
      this.sound.playIfNotPlaying('gamePlayMusic', 0.5, 0.0, 0.0, true)
    } else if (gs === GameState.Paused || gs === GameState.AutoPaused) {
      this.sound.stopPlayMusic()
    }
  }
  public async loadContent() {
    const contentStartTime = Date.now()
    console.log(`Starting to load content`)
    await Promise.all([this.sound.loadContent(), this.display.loadContent()])
    console.log(`Finished loading content ${Date.now() - contentStartTime}ms`)
    this.isContentLoadedYet = true
  }
  public getPlayerName(playerSide: PlayerSide): string {
    if (playerSide === PlayerSide.Left) return 'Red'
    const c = this.gameConfig.playerConfig(playerSide)
    if (c.species === PlayerSpecies.Human) return 'Blue'
    else if (c.ai) {
      return aiToName(c.ai)
    } else {
      return 'Unknown'
    }
  }

  public draw(gameTime: GameTime): void {
    const dt = gameTime.elapsedGameTime.totalSeconds
    this.kapowManager.step(dt)

    this.display.draw(
      gameTime,
      this.gameState,
      this.gameConfig,
      this.scoreLeftPlayer,
      this.scoreRightPlayer,
      this.futurePredictionList,
      this.kapowManager,
      this.getCurrentFps(),
      this.input.gamepadConnectSummary(),
    )

    if (this.gameState === GameState.VictoryForPlayer0 || this.gameState === GameState.VictoryForPlayer1) {
      this.isGamePoint = false
      const minutes = Math.floor(this.accumulatedGamePlayTime / 60.0)
      const seconds = Math.floor(this.accumulatedGamePlayTime - minutes * 60)
      const time = minutes > 0 ? `${minutes} min ${seconds} sec` : `${seconds} seconds`

      if (this.scoreLeftPlayer === 0 || this.scoreRightPlayer === 0)
        this.display.drawCenteredDancingMessage(gameTime, 'Shutout!', 'Victory in ' + time + '.', Colors.white)
      else if (this.gameState === GameState.VictoryForPlayer0)
        this.display.drawCenteredDancingMessage(
          gameTime,
          this.getPlayerName(PlayerSide.Left) + ' Wins!',
          ' Victory in ' + time + '.',
          Colors.white,
        )
      else if (this.gameState === GameState.VictoryForPlayer1)
        this.display.drawCenteredDancingMessage(
          gameTime,
          this.getPlayerName(PlayerSide.Right) + ' Wins!',
          ' Victory in ' + time + '.',
          Colors.white,
        )
    }
    if (this.gameState === GameState.PointForPlayer0) {
    } else if (this.gameState === GameState.PointForPlayer1) {
    } else if (this.gameState === GameState.Paused) {
      this.menu.draw(true, gameTime)
    } else if (this.gameState === GameState.MainMenu) {
      this.menu.draw(false, gameTime)
    } else if (this.gameState === GameState.PreExitCredits) this.display.drawCredits(gameTime)
  }

  private startNewGame(numBalls: number, ai: AiBase | null) {
    persistence.incGamesStarted()
    this.resetScores()
    this.resetPlayers()
    this.whoseServe = ai || Math.random() < 0.5 ? PlayerSide.Left : PlayerSide.Right
    this.setGameState(GameState.PreAction)
    this.playerLeftCfg.species = PlayerSpecies.Human
    this.playerRightCfg.species = ai ? PlayerSpecies.Ai : PlayerSpecies.Human
    this.playerRightCfg.ai = ai
    this.accumulatedGamePlayTime = 0.0
    this.gameConfig.balls[1].isAlive = numBalls === 2
    this.display.atmosphere.changeSkyForOpponent(this.playerRightCfg, 1)
  }

  private handlePreExitInputs(): void {
    let stepForward = false
    for (let i = 1; i <= 4; i++) {
      if (this.input.wasMenuSelectJustPushed(null).selected) {
        stepForward = true
      }
    }
    if (stepForward && this.gameState === GameState.PreExitCredits) this.setGameState(GameState.Exit)
    else if (stepForward) this.setGameState(GameState.PreExitCredits)
  }
  private handleIntroInputs(): void {
    let stepForward = false
    for (let i = 1; i <= 4; i++) {
      if (this.input.wasMenuSelectJustPushed(null).selected) {
        if (Date.now() - this.whenStartedDateTime > 250) {
          stepForward = true
        }
      }
    }
    if (stepForward && this.gameState === GameState.Intro1) this.setGameState(GameState.Intro2)
    else if (stepForward && this.gameState === GameState.Intro2) this.setGameState(GameState.Intro3)
    else if (stepForward) this.setGameState(GameState.MainMenu)
  }

  private handleAutoPausedInputs(): void {
    // Exit this state if controller reconnected
    if (
      this.input.doesPlayerHaveGamepad(PlayerSide.Left) &&
      (this.gameConfig.playerConfig(PlayerSide.Right).species !== PlayerSpecies.Human || this.input.doesPlayerHaveGamepad(PlayerSide.Right))
    ) {
      // Remove menu ownership
      this.menu.setWhoOwnsMenu(null)
      // Go to paused menu
      this.setGameState(GameState.Paused)
      this.menu.select(MenuAction.ReturnToGame, PlayerSide.Left)
    }
  }
  private handleMenuInputs(): void {
    const owner = this.menu.getWhoOwnsMenu()
    const menuSelectResult = this.input.wasMenuSelectJustPushed(owner)
    if (this.input.wasMenuRightJustPushed(owner)) this.menu.moveRight(owner)
    else if (this.input.wasMenuLeftJustPushed(owner)) this.menu.moveLeft(owner)
    if (menuSelectResult.selected) {
      const gamepadSide = menuSelectResult.byPlayerSide
      const entry = this.menu.selectionEntry
      const action = entry.action
      if (action === MenuAction.Play) {
        const numBalls = entry.numBalls ?? 1
        if (!entry.ai) {
          this.startNewGame(numBalls, null)
        } else {
          if (gamepadSide === PlayerSide.Right) {
            this.input.swapGamepadSides()
          }
          this.startNewGame(numBalls, new entry.ai())
        }
      } else if (action === MenuAction.Exit) this.setGameState(GameState.PreExitMessage)
      else if (action === MenuAction.ReturnToGame) this.setGameState(GameState.Action)
    }
    // Pressing B or Start from Pause returns to Game
    if (this.gameState === GameState.Paused) {
      if (this.input.wasMenuExitJustPushed(owner)) this.setGameState(GameState.Action)
    }
  }
  handleVictoryInputs(): void {
    if (this.accumulatedStateTime > 1.0 && this.input.wasPostgameProceedJustPushed()) {
      this.setGameState(GameState.MainMenu)
    }
  }
  handlePointInputs(): void {
    if (this.accumulatedStateTime > tweakables.timeAfterPointToReturnHome) {
      let allBallsReset = true
      for (const ball of this.gameConfig.balls) {
        if (ball.isAlive && ball.physics.center.y > 0.0 + ball.physics.diameter / 2) {
          allBallsReset = false
        }
      }
      if (allBallsReset) {
        this.setGameState(GameState.PreAction)
      }
    }
  }
  handlePreActionInputs(): void {
    if (this.accumulatedStateTime > 1.0) {
      this.setGameState(GameState.Action)
    }
  }
  pauseTheGame(playerSide: PlayerSide | null): void {
    this.menu.setWhoOwnsMenu(playerSide)
    this.setGameState(GameState.Paused)
    this.menu.select(MenuAction.ReturnToGame, playerSide)
  }

  handleActionInputs(dt: number): void {
    this.handleActionInputsForPlayer(dt, PlayerSide.Left)
    this.handleActionInputsForPlayer(dt, PlayerSide.Right)

    // AUTO-PAUSING
    if (this.input.wasPlayerJustDisconnectedFromGamepad(PlayerSide.Left)) {
      this.setGameState(GameState.AutoPaused)
    } else if (
      this.gameConfig.playerConfig(PlayerSide.Right).species === PlayerSpecies.Human &&
      this.input.wasPlayerJustDisconnectedFromGamepad(PlayerSide.Right)
    ) {
      this.setGameState(GameState.AutoPaused)
    }

    // REGULAR PAUSING
    if (this.input.wasKeyboardPauseHit()) {
      this.pauseTheGame(null)
    } else {
      const padCheckPlayerSide = this.input.checkGamepadPauseHit()
      if (padCheckPlayerSide !== null) {
        this.pauseTheGame(padCheckPlayerSide)
      }
    }
  }
  private handleActionInputsForPlayer(dt: number, playerSide: PlayerSide): void {
    let player: Player
    let opponent: Player
    if (playerSide === PlayerSide.Left) {
      player = this.gameConfig.player(PlayerSide.Left)
      opponent = this.gameConfig.player(PlayerSide.Right)
    } else {
      player = this.gameConfig.player(PlayerSide.Right)
      opponent = this.gameConfig.player(PlayerSide.Left)
    }

    const playerConfig = this.gameConfig.playerConfig(playerSide)

    if (playerConfig.species === PlayerSpecies.Human) {
      player.targetXVel = 0
      // the following is -1...1 and maps to 0 if near the center, as determined
      // in tweakables.thumbstickCenterTolerance
      const thumbstickPos = this.input.getLeftThumbStickX(playerSide)
      if (this.input.isLeftPressed(playerSide)) player.moveLeft()
      else if (this.input.isRightPressed(playerSide)) player.moveRight()
      else if (thumbstickPos) player.moveRationally(thumbstickPos)
      if (this.canPlayerJump(player, opponent) && this.input.isJumpPressed(playerSide)) player.jump()

      // triggers only register over some threshold as dtermined in tweakables.triggerTolerance
      const lTrigger = this.input.getTrigger(playerSide, 'left')
      const rTrigger = this.input.getTrigger(playerSide, 'right')
      const triggerDiff = rTrigger - lTrigger
      if (triggerDiff) {
        player.grow(dt, triggerDiff * tweakables.triggerGrowthMult)
        this.sound.playGrowthNoise(playerSide, triggerDiff)
      } else if (this.input.isShrinkPressed(playerSide)) {
        player.grow(dt, -tweakables.keyboardGrowthRate)
        this.sound.playGrowthNoise(playerSide, -tweakables.keyboardGrowthRate)
      } else if (this.input.isGrowPressed(playerSide)) {
        player.grow(dt, tweakables.keyboardGrowthRate)
        this.sound.playGrowthNoise(playerSide, tweakables.keyboardGrowthRate)
      } else {
        this.sound.fadeGrowthNoise(playerSide, dt)
      }
    }
  }

  private canPlayerJump(player: Player, opponent: Player): boolean {
    if (this.accumulatedStateTime < tweakables.ballPlayerLaunchTime) return false
    else if (player.physics.vel.y > player.maxVel.y / 2) return false
    else if (player.isOnHeight(0.0)) return true
    else if (player.isOnRectangle(this.gameConfig.net)) return true
    else if (player.isOnPlayer(opponent)) return true
    else return false
  }

  private aIStep(): void {
    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const config = this.gameConfig.playerConfig(playerSide)
      if (config.species === PlayerSpecies.Ai) {
        const aiThinkArg: AiThinkArg = {
          gameTime: this.currentGameTime,
          accumulatedPointTime: this.accumulatedPointTime,
          gameConfig: this.gameConfig,
          myPlayerSide: playerSide,
          balls: this.gameConfig.balls,
          ballPredictions: this.futurePredictionList,
          gameGravity: tweakables.gameGravity,
          p0Score: this.scoreLeftPlayer,
          p1Score: this.scoreRightPlayer,
          me: playerSide === PlayerSide.Left ? this.playerLeft : this.playerRight,
          opponent: playerSide === PlayerSide.Left ? this.playerRight : this.playerLeft,
        }
        config.ai?.think(aiThinkArg)
      }
    }
  }

  private setUpForServe(): void {
    this.accumulatedPointTime = 0.0
    const playerL = this.gameConfig.player(PlayerSide.Left)
    const playerR = this.gameConfig.player(PlayerSide.Right)

    playerL.physics.center = {x: 0.25, y: -playerL.physics.diameter / 2 - this.gameConfig.balls[0].physics.diameter}
    playerL.physics.vel = {x: 0, y: 0}
    playerL.physics.vel.y = this.gameConfig.balls[0].maxSpeed
    playerL.targetXVel = 0.0

    playerR.physics.center = {x: 0.75, y: -playerR.physics.diameter / 2 - this.gameConfig.balls[1].physics.diameter}
    playerR.physics.vel = {x: 0, y: 0}
    playerR.physics.vel.y = this.gameConfig.balls[0].maxSpeed
    playerR.targetXVel = 0.0
    this.gameConfig.net.center.x = 0.5

    this.gameConfig.balls[0].physics.center = {
      x: this.whoseServe === PlayerSide.Left ? 0.25 : 0.75,
      y: -this.gameConfig.balls[0].physics.diameter / 2,
    }
    this.gameConfig.balls[0].physics.vel = {x: 0, y: this.gameConfig.balls[0].maxSpeed}

    this.gameConfig.balls[1].physics.center = {
      x: this.whoseServe === PlayerSide.Left ? 0.75 : 0.25,
      y: -this.gameConfig.balls[1].physics.diameter / 2,
    }
    this.gameConfig.balls[1].physics.vel = {x: 0, y: this.gameConfig.balls[1].maxSpeed}
  }

  private resetScores(): void {
    this.scoreLeftPlayer = 0
    this.scoreRightPlayer = 0
  }

  checkForAndScorePoint(): boolean {
    let pointForPlayer0 = false
    let pointForPlayer1 = false
    const ball0: Ball = this.gameConfig.balls[0]
    const ball1: Ball = this.gameConfig.balls[1]

    if (
      ball0.isAlive &&
      this.accumulatedPointTime > tweakables.ballPlayerLaunchTime &&
      ball0.physics.center.y - ball0.physics.diameter / 2 <= 0.0 &&
      ball0.physics.center.x > this.gameConfig.net.center.x
    ) {
      pointForPlayer0 = true
      this.kapowManager.addAKapow(KapowType.Score, ball0.physics.center, Math.random() / 10, 0.4, 0.5)
      this.sound.play('pointScored', 0.8, 0.0, -1.0 + 2 * ball0.physics.center.x)
    } else if (
      ball0.isAlive &&
      this.accumulatedPointTime > tweakables.ballPlayerLaunchTime &&
      ball0.physics.center.y - ball0.physics.diameter / 2 <= 0.0 &&
      ball0.physics.center.x < this.gameConfig.net.center.x
    ) {
      pointForPlayer1 = true
      this.kapowManager.addAKapow(KapowType.Score, ball0.physics.center, Math.random() / 10, 0.4, 0.5)
      this.sound.play('pointScored', 0.8, 0.0, -1.0 + 2 * ball0.physics.center.x)
    }
    if (
      ball1.isAlive &&
      this.accumulatedPointTime > tweakables.ballPlayerLaunchTime &&
      ball1.physics.center.y - ball1.physics.diameter / 2 <= 0.0 &&
      ball1.physics.center.x > this.gameConfig.net.center.x
    ) {
      pointForPlayer0 = true
      this.kapowManager.addAKapow(KapowType.Score, ball1.physics.center, Math.random() / 10, 0.4, 0.5)
      this.sound.play('pointScored', 0.8, 0.0, -1.0 + 2 * ball1.physics.center.x)
    } else if (
      ball1.isAlive &&
      this.accumulatedPointTime > tweakables.ballPlayerLaunchTime &&
      ball1.physics.center.y - ball1.physics.diameter / 2 <= 0.0 &&
      ball1.physics.center.x < this.gameConfig.net.center.x
    ) {
      pointForPlayer1 = true
      this.kapowManager.addAKapow(KapowType.Score, ball1.physics.center, Math.random() / 10, 0.4, 0.5)
      this.sound.play('pointScored', 0.8, 0.0, -1.0 + 2 * ball1.physics.center.x)
    }

    if (pointForPlayer0) {
      this.handlePointScored(PlayerSide.Left)
    } else if (pointForPlayer1) {
      this.handlePointScored(PlayerSide.Right)
    }
    if (
      (this.gameState === GameState.PointForPlayer0 || this.gameState === GameState.PointForPlayer1) &&
      this.scoreLeftPlayer !== this.scoreRightPlayer &&
      (this.scoreLeftPlayer >= tweakables.winningScore - 1 || this.scoreRightPlayer >= tweakables.winningScore - 1)
    ) {
      this.sound.stopPlayMusic()
      this.isGamePoint = true
      this.sound.playIfNotPlaying('gamePoint', 0.6, 0.0, 0.0, false)
      this.display.atmosphere.changeSkyForOpponent(this.playerRightCfg, 0)
    } else if (pointForPlayer0 || pointForPlayer1) {
      this.display.atmosphere.changeSkyForOpponent(this.playerRightCfg, 1)
    }
    return pointForPlayer0 || pointForPlayer1
  }

  private handlePointScored(playerSide: PlayerSide): void {
    const winByTwo = tweakables.winByTwo
    const winScore = tweakables.winningScore
    this.display.bounceScoreCard(playerSide)
    const seconds = this.accumulatedGamePlayTime
    if (playerSide === PlayerSide.Left) {
      this.setGameState(GameState.PointForPlayer0)
      this.scoreLeftPlayer++
      if (
        (this.scoreLeftPlayer >= winScore && !winByTwo) ||
        (this.scoreLeftPlayer >= winScore && winByTwo && this.scoreLeftPlayer - this.scoreRightPlayer >= 2)
      ) {
        this.setGameState(GameState.VictoryForPlayer0)
        persistence.incGamesCompleted()
        if (this.playerRightCfg.ai) {
          const aiName = aiToName(this.playerRightCfg.ai)
          const wasShutout = this.scoreRightPlayer === 0
          persistence.recordResultAgainstAi(aiName, true, wasShutout, seconds, this.playerLeft.jumpCount)
        }
      }
      this.whoseServe = PlayerSide.Left
    } else {
      this.setGameState(GameState.PointForPlayer1)
      this.scoreRightPlayer++
      if (
        (this.scoreRightPlayer >= winScore && !winByTwo) ||
        (this.scoreRightPlayer >= winScore && winByTwo && this.scoreRightPlayer - this.scoreLeftPlayer >= 2)
      ) {
        this.setGameState(GameState.VictoryForPlayer1)
        persistence.incGamesCompleted()
        if (this.playerRightCfg.ai) {
          const aiName = aiToName(this.playerRightCfg.ai)
          persistence.recordResultAgainstAi(aiName, false, false, seconds, this.playerLeft.jumpCount)
        }
      }
      this.whoseServe = PlayerSide.Right
    }
  }

  //
  // Keeps players constrained by floor and walls
  //
  private constrainPlayers(): void {
    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const p = this.gameConfig.player(playerSide)
      // Constrain Player to Floor. In the first second of the game they float up from it. After that they stick above it.
      if (this.accumulatedPointTime > tweakables.ballPlayerLaunchTime && p.physics.center.y < 0.0) {
        p.physics.center.y = 0.0
        if (this.gameState === GameState.Action && p.physics.vel.y < 0) p.physics.vel.y = 0
      }

      // Don't let left player pass under the net in beginning of point
      if (
        this.accumulatedPointTime < tweakables.ballPlayerLaunchTime &&
        playerSide === PlayerSide.Left &&
        p.physics.center.x + p.physics.diameter / 2 >= this.gameConfig.net.center.x - this.gameConfig.net.width / 2
      ) {
        p.physics.center.x = this.gameConfig.net.center.x - this.gameConfig.net.width / 2 - p.physics.diameter / 2
      }
      // Don't let right player pass under the net in beginning of point
      if (
        this.accumulatedPointTime < tweakables.ballPlayerLaunchTime &&
        playerSide === PlayerSide.Right &&
        p.physics.center.x - p.physics.diameter / 2 <= this.gameConfig.net.center.x + this.gameConfig.net.width / 2
      ) {
        p.physics.center.x = this.gameConfig.net.center.x + this.gameConfig.net.width / 2 + p.physics.diameter / 2
      }

      // Left Wall
      if (p.physics.center.x < p.physics.diameter / 2) {
        p.physics.center.x = p.physics.diameter / 2
        if (p.physics.vel.x < 0) p.physics.vel.x = 0.0
      }
      // Right Wall
      if (p.physics.center.x > 1.0 - p.physics.diameter / 2) {
        p.physics.center.x = 1.0 - p.physics.diameter / 2
        if (p.physics.vel.x > 0) p.physics.vel.x = 0.0
      }
    }
  }

  private manageCollisions(isSimulation: boolean): void {
    const ball0Alive = this.gameConfig.balls[0].isAlive
    const ball1Alive = this.gameConfig.balls[1].isAlive
    const ball0 = this.gameConfig.balls[0]
    const ball1 = this.gameConfig.balls[1]
    const player0 = this.gameConfig.player(PlayerSide.Left)
    const player1 = this.gameConfig.player(PlayerSide.Right)

    // Collide ball0 with walls, net
    if (ball0Alive) {
      if (this.gameConfig.leftWall.handleBallCollision(ball0.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('thud', 0.6, 0.0, -1.0, false)
      if (this.gameConfig.rightWall.handleBallCollision(ball0.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('thud', 0.6, 0.0, 1.0, false)
      if (this.gameConfig.net.handleBallCollision(ball0.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('ding', 0.3, 0.0, 0.0, false)
    }
    // Collide ball1 with walls, net
    if (ball1Alive) {
      if (this.gameConfig.leftWall.handleBallCollision(ball1.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('thud', 1.0, 0.0, 1.0, false)
      if (this.gameConfig.rightWall.handleBallCollision(ball1.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('thud', 1.0, 0.0, -1.0, false)
      if (this.gameConfig.net.handleBallCollision(ball1.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('ding', 0.3, 0.0, 0.0, false)
    }
    // Ball-Ball collision
    if (ball0Alive && ball1Alive) {
      const collision = ball0.physics.handleHittingOtherCircle(ball1.physics, 1.0)
      if (collision.didCollide && !isSimulation) {
        const hardness = Math.min(1, vec.len(collision.c2MomentumDelta) / ball0.physics.mass / 5.0)
        const pan = collision.pointOfContact.x
        const pitch = 1.0
        this.sound.playIfNotPlaying('beep', hardness, pitch, pan, false)
      }
    }

    // Handle net collision for both players
    this.gameConfig.net.handleBallCollision(player0.physics, 0.0)
    this.gameConfig.net.handleBallCollision(player1.physics, 0.0)

    // Ball-Player collisions
    if (ball0Alive) {
      this.manageBallPlayerCollision(isSimulation, ball0, player0, PlayerSide.Left)
      this.manageBallPlayerCollision(isSimulation, ball0, player1, PlayerSide.Right)
    }
    if (ball1Alive) {
      this.manageBallPlayerCollision(isSimulation, ball1, player0, PlayerSide.Left)
      this.manageBallPlayerCollision(isSimulation, ball1, player1, PlayerSide.Right)
    }

    //

    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const i = playerSide === PlayerSide.Left ? 0 : 1
      const player = this.gameConfig.player(playerSide)
      const playerConfig = this.gameConfig.playerConfig(playerSide)
      if (this.gameConfig.net.handleBallCollision(player.physics, 0.0) && !isSimulation) {
        // do nothing; but the collision was detected and handled
      }

      if (!isSimulation || playerConfig.species === PlayerSpecies.Human) {
        for (const ball of this.gameConfig.balls) {
          if (ball.isAlive) {
            const collision = player.physics.handleHittingOtherCircle(ball.physics, 0.95)
            if (collision.didCollide && !isSimulation) {
              ball.setAngularVel(-300.0 + 600.0 * Math.random() * i)
              ball.setAngularVel(ball.physics.vel.x)
              const hardness = Math.min(1, vec.len(collision.c2MomentumDelta) / ball.physics.mass / 5.0)
              const pan = collision.pointOfContact.x - 0.5
              const pitch =
                1.0 -
                (2.0 * (player.physics.diameter - tweakables.player.minDiameter)) /
                  (tweakables.player.maxDiameter - tweakables.player.minDiameter)
              this.sound.playIfNotPlaying('beep', hardness, pitch, pan, false)
            }
          }
        }
      }
    }

    // Player-player collisions
    if (
      this.gameConfig.playerConfig(PlayerSide.Left).species !== PlayerSpecies.Off &&
      this.gameConfig.playerConfig(PlayerSide.Right).species !== PlayerSpecies.Off
    ) {
      const pLeft = this.gameConfig.player(PlayerSide.Left)
      const pRight = this.gameConfig.player(PlayerSide.Right)
      pLeft.physics.handleHittingOtherCircle(pRight.physics, 0.0)
    }
  }

  private manageBallPlayerCollision(isSimulation: boolean, ball: Ball, player: Player, playerSide: PlayerSide): void {
    const collision = player.physics.handleHittingOtherCircle(ball.physics, 0.95)

    const isLeft = playerSide === PlayerSide.Left

    if (collision.didCollide && !isSimulation) {
      ball.setAngularVel(-300.0 + 600.0 * Math.random() * (isLeft ? 0 : 1))
      ball.setAngularVel(ball.physics.vel.x)
      const hardness = Math.min(1, vec.len(collision.c2MomentumDelta) / ball.physics.mass / 5.0)
      const pan = collision.pointOfContact.x - 0.5
      const pitch =
        1.0 -
        (2.0 * (player.physics.diameter - tweakables.player.minDiameter)) / (tweakables.player.maxDiameter - tweakables.player.minDiameter)
      this.sound.playIfNotPlaying('beep', hardness, pitch, pan, false)
      // Slam
      let amINearnet = false
      if (
        player.physics.center.x > this.gameConfig.net.center.x - (3 * this.gameConfig.net.width) / 2 &&
        player.physics.center.x < this.gameConfig.net.center.x + (3 * this.gameConfig.net.width) / 2
      )
        amINearnet = true
      let amIHittingItDown = false
      if ((isLeft && ball.physics.vel.x > 0 && ball.physics.vel.y < 0) || (!isLeft && ball.physics.vel.x < 0 && ball.physics.vel.y < 0))
        amIHittingItDown = true
      let amIHighEnough = false
      if (player.physics.center.y > player.getMaxJumpHeight(tweakables.gameGravity.y) / 2) amIHighEnough = true

      if (
        amINearnet &&
        amIHittingItDown &&
        amIHighEnough &&
        !this.historyManager.hasHappenedRecently(`Kapow-Slam-Player-${isLeft ? 0 : 1}`, this.currentGameTime, 0.75)
      ) {
        this.sound.play('slam', 0.3, 0.0, pan)
        const dest: Vector2 = vec.add(collision.pointOfContact, {x: 0, y: 2 * ball.physics.diameter})
        this.kapowManager.addAKapow(KapowType.Slam, dest, 0.0, 0.3, 1.5)
        this.historyManager.recordEvent(`Kapow-Slam-Player-${isLeft ? 0 : 1}`, this.currentGameTime)
      }

      // Rejection
      else if (
        hardness > 0.1 &&
        ball.physics.vel.y > 1.0 &&
        this.historyManager.hasHappenedRecently(`Kapow-Slam-Player-${isLeft ? 1 : 0}`, this.currentGameTime, 0.5) &&
        !this.historyManager.hasHappenedRecently(`Kapow-Rejected-Player-${isLeft ? 0 : 1}`, this.currentGameTime, 0.25)
      ) {
        this.sound.playIfNotPlaying('rejected', 0.4, 0.1, 0.0, false)
        this.kapowManager.addAKapow(KapowType.Rejected, collision.pointOfContact, 0.0, 0.3, 1.5)
        this.historyManager.recordEvent(`Kapow-Rejected-Player-${isLeft ? 0 : 1}`, this.currentGameTime)
      }
    }
  }
  private postPointStep(): void {
    // For the first moments, don't move anything, but give ball & players big velocities
    if (this.accumulatedStateTime < tweakables.timeAfterPointToFreeze) {
      for (const ball of this.gameConfig.balls) {
        if (ball.isAlive) {
          ball.physics.vel = {x: 0, y: ball.maxSpeed}
        }
      }
      for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
        const config = this.gameConfig.playerConfig(playerSide)
        if (config.species !== PlayerSpecies.Off) {
          const player = this.gameConfig.player(playerSide)
          player.physics.vel.x = 0.0
          player.jump()
        }
      }
    }
    // Only move it after that
    else {
      const dt = this.currentGameTime.elapsedGameTime.totalMilliseconds / 1000
      const isTwoBallGame = this.gameConfig.balls[1].isAlive
      for (let i = 0; i < 2; i++) {
        const ball = this.gameConfig.balls[i]
        if (ball.isAlive) {
          ball.stepVelocity(dt, vec.scale(tweakables.gameGravity, 1.5), false)
          let xDestination = this.whoseServe === PlayerSide.Left ? 0.25 : 0.75
          if (isTwoBallGame) xDestination = 0.75 - 0.5 * i
          const xDistance = xDestination - ball.physics.center.x
          const timeTillStateSwitch = tweakables.timeAfterPointToReturnHome - this.accumulatedStateTime
          ball.physics.vel.x = (2 * xDistance) / timeTillStateSwitch
          ball.stepPositionAndOrientation(dt)
        }
      }
      for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
        const config = this.gameConfig.playerConfig(playerSide)
        const player = this.gameConfig.player(playerSide)
        if (config.species !== PlayerSpecies.Off) {
          player.stepVelocity(dt, tweakables.gameGravity)
          const xDestination = playerSide === PlayerSide.Left ? 0.25 : 0.75
          const xDistance = xDestination - player.physics.center.x
          const timeTillStateSwitch = tweakables.timeAfterPointToReturnHome - this.accumulatedStateTime
          player.physics.vel.x = (2 * xDistance) / timeTillStateSwitch
          player.stepPosition(dt)
        }
      }
    }
  }

  private gameStep(dt: number): boolean {
    if (!this.checkForAndScorePoint()) {
      this.accumulatedGamePlayTime += dt

      for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
        const config = this.gameConfig.playerConfig(playerSide)
        const player = this.gameConfig.player(playerSide)
        if (config.species !== PlayerSpecies.Off) {
          player.stepVelocity(dt, tweakables.gameGravity)
          player.stepPosition(dt)
        }
      }
      for (const ball of this.gameConfig.balls) {
        if (ball.isAlive) {
          ball.stepVelocity(dt, tweakables.gameGravity, true)
          ball.stepPositionAndOrientation(dt)
        }
      }
      this.manageCollisions(false)
      this.handleActionInputs(dt)
      this.constrainPlayers()

      return false
    } else {
      // Point has been scored; game state switched in checkForAndScorePoint()
      return true
    }
  }

  private simulateStep(dt: number): void {
    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const config = this.gameConfig.playerConfig(playerSide)
      const player = this.gameConfig.player(playerSide)
      if (config.species !== PlayerSpecies.Off) {
        player.stepVelocity(dt, tweakables.gameGravity)
        player.stepPosition(dt)
      }
    }
    for (const ball of this.gameConfig.balls) {
      if (ball.isAlive) {
        ball.stepVelocity(dt, tweakables.gameGravity, true)
        ball.stepPositionAndOrientation(dt)
      }
    }

    this.manageCollisions(true)
    this.constrainPlayers()
  }

  private updateFuturePrediction(): void {
    //return;
    // Copy current player/ball info to temp so we can step w/o wrecking things
    const sbTemp: Ball[] = []
    const p0Real = this.gameConfig.player(PlayerSide.Left)
    const p1Real = this.gameConfig.player(PlayerSide.Right)
    const p0Copy = p0Real.deepCopy()
    const p1Copy = p1Real.deepCopy()

    for (let i = 0; i < this.gameConfig.balls.length; i++) {
      sbTemp[i] = this.gameConfig.balls[i].deepCopy()
      const prediction = this.futurePredictionList[i]
      prediction.ballStates = []
      // Clear old important markers
      prediction.ballHittingGround.isKnown = false
      prediction.ballCrossingNet.isKnown = false
      prediction.ballEnteringJumpRange(PlayerSide.Left).isKnown = false
      prediction.ballEnteringJumpRange(PlayerSide.Right).isKnown = false
    }

    let time = 0
    const timeElapsed = this.currentGameTime.totalGameTime.totalSeconds
    const p0JumpHeight = p0Copy.getMaxJumpHeight(tweakables.gameGravity.y)
    const p1JumpHeight = p1Copy.getMaxJumpHeight(tweakables.gameGravity.y)

    while (time < tweakables.predictionLookahead) {
      this.simulateStep(tweakables.predictionPhysicsDt)
      time += tweakables.predictionPhysicsDt
      const currStep = (time + timeElapsed) / tweakables.predictionStorageDt
      const lastStep = (time - tweakables.predictionPhysicsDt + timeElapsed) / tweakables.predictionStorageDt
      for (let i = 0; i < this.gameConfig.balls.length; i++) {
        if (this.gameConfig.balls[i].isAlive) {
          const state: FutureState = unknownState()
          const ballPhysics = this.gameConfig.balls[i].physics
          const prediction = this.futurePredictionList[i]

          state.pos = ballPhysics.center
          state.time = time
          if (Math.round(currStep) !== Math.round(lastStep)) {
            prediction.ballStates.push(state)
          }
          if (!prediction.ballHittingGround.isKnown && ballPhysics.center.y - ballPhysics.diameter / 2 <= 0.0) {
            prediction.ballHittingGround = state
            prediction.ballHittingGround.isKnown = true
          } else if (
            !prediction.ballCrossingNet.isKnown &&
            Math.abs(ballPhysics.center.x - this.gameConfig.net.center.x) < ballPhysics.diameter / 4.0
          ) {
            prediction.ballCrossingNet = state
            prediction.ballCrossingNet.isKnown = true
          }
          if (
            !prediction.ballEnteringJumpRange(PlayerSide.Left).isKnown &&
            ballPhysics.center.x < this.gameConfig.net.center.x - this.gameConfig.net.width / 2 &&
            ballPhysics.center.y <= p0JumpHeight
          ) {
            state.isKnown = true
            prediction.setBallEnteringJumpRange(PlayerSide.Left, state)
          }
          if (
            !prediction.ballEnteringJumpRange(PlayerSide.Right).isKnown &&
            ballPhysics.center.x > this.gameConfig.net.center.x + this.gameConfig.net.width / 2 &&
            ballPhysics.center.y <= p1JumpHeight
          ) {
            state.isKnown = true
            prediction.setBallEnteringJumpRange(PlayerSide.Right, state)
          }
        }
      }
    }
    for (let i = 0; i < this.gameConfig.balls.length; i++) {
      if (this.gameConfig.balls[i].isAlive) {
        this.gameConfig.balls[i] = sbTemp[i]
      }
    }
    this.gameConfig.setPlayer(PlayerSide.Left, p0Copy)
    this.gameConfig.setPlayer(PlayerSide.Right, p1Copy)
  }

  runActionState(): void {
    const dt = this.currentGameTime.elapsedGameTime.totalMilliseconds / 1000

    let physicsDtCountdown = dt
    let pointScored = false
    if (this.currentGameTime.totalGameTime.totalMilliseconds > this.lastFuturePrediction + tweakables.predictFutureEvery) {
      this.updateFuturePrediction()
      this.lastFuturePrediction = this.currentGameTime.totalGameTime.totalMilliseconds
    }

    while (physicsDtCountdown > 0 && !pointScored) {
      const delta = Math.min(tweakables.physicsDt, physicsDtCountdown)
      pointScored = this.gameStep(delta)
      physicsDtCountdown -= delta
    }
    this.aIStep()
  }
  runMainMenuState() {
    this.handleMenuInputs()
  }
  runPreExitState() {
    this.handlePreExitInputs()
  }
  runIntroState() {
    this.handleIntroInputs()
  }
  runPausedState() {
    this.handleMenuInputs()
  }
  runAutoPausedState() {
    this.handleAutoPausedInputs()
  }
  runPointState() {
    this.postPointStep()
    this.handlePointInputs()
  }
  runPreActionState() {
    this.handlePreActionInputs()
  }
  runVictoryState() {
    this.handleVictoryInputs()
  }
  handleUniversalInputs() {
    if (this.input.wasDebugKeyJustPushed()) {
      this.display.inDebugView = !this.display.inDebugView
    }
  }
  public getMaxHeightOfAllBalls(): number {
    let highest = -10.0
    for (const ball of this.gameConfig.balls) {
      if (ball.isAlive) highest = Math.max(highest, ball.physics.getBallMaxHeight(tweakables.gameGravity))
    }
    return highest
  }

  public update(gameTime: GameTime): boolean {
    if (this.gameState === GameState.PreStart) {
      this.setGameState(GameState.Intro1)
    }
    this.handleUniversalInputs()

    const dt = gameTime.elapsedGameTime.totalMilliseconds / 1000
    this.accumulatedStateTime += dt
    if (this.gameState === GameState.Action) this.accumulatedPointTime += dt

    switch (this.gameState) {
      case GameState.Action:
        this.display.adjustZoomLevel(this.getMaxHeightOfAllBalls(), dt)
        this.runActionState()
        break
      case GameState.Paused:
        this.display.adjustZoomLevel(1000, dt)
        this.runPausedState()
        break
      case GameState.AutoPaused:
        this.display.adjustZoomLevel(1000, dt)
        this.runAutoPausedState()
        break
      case GameState.MainMenu:
        this.runMainMenuState()
        break
      case GameState.Intro1:
      case GameState.Intro2:
      case GameState.Intro3:
        this.runIntroState()
        break
      case GameState.PointForPlayer0:
      case GameState.PointForPlayer1:
        this.runPointState()
        break
      case GameState.PreAction:
        this.runPreActionState()
        break
      case GameState.VictoryForPlayer0:
      case GameState.VictoryForPlayer1:
        this.display.adjustZoomLevel(1000, dt)
        this.runVictoryState()
        break
      case GameState.PreExitMessage:
      case GameState.PreExitCredits:
        this.runPreExitState()
        break
      case GameState.Exit:
        return false
    }
    return true
  }
}

export {Game, GameState}
