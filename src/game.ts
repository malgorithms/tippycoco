import {AiBase, AiThinkArg} from './ai/base'
import {Ball} from './ball'
import {Colors} from './color'
import constants from './constants'
import {ContentLoader} from './content-loader'
import {Display} from './display'
import {FuturePrediction, unknownState} from './future-prediction'
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
import {RectangularObstacle} from './rectangular-obstacle'

class Game {
  private content: ContentLoader
  private display!: Display
  private input!: Input
  private sound!: SoundManager
  private menu!: Menu
  private kapow: KapowManager
  private history: HistoryManager
  private isGamePoint: boolean
  private scoreLeftPlayer = 0
  private scoreRightPlayer = 0
  private whoseServe = PlayerSide.Left
  private gameState = GameState.PreStart
  private currentGameTime: GameTime
  private futurePredictionList: FuturePrediction[] = []
  private lastFuturePrediction: number
  private fpsTimer: number[]
  private players: Map<PlayerSide, Player> = new Map()
  public balls: Ball[] = []
  public net: RectangularObstacle
  public leftWall: RectangularObstacle
  public rightWall: RectangularObstacle

  public accumulatedGamePlayTime = 0 // How much the clock has run this game, in seconds, excluding pauses and between points
  public accumulatedStateSeconds = 0 // Time accumulated since last gamestate change
  public accumulatedPointSeconds = 0 // Accumulated play time this point (persists even if pausing it to go to menu)
  private whenStartedDateTime = Date.now()

  constructor(targetDiv: HTMLDivElement, contentLoadMonitor: ContentLoadMonitor) {
    this.content = new ContentLoader(contentLoadMonitor)
    this.kapow = new KapowManager()
    this.history = new HistoryManager()
    this.lastFuturePrediction = 0
    this.fpsTimer = []
    this.isGamePoint = false
    this.currentGameTime = this.emptyGameTime()
    this.generatePlayers(null)
    this.setUpBalls(2)
    this.net = new RectangularObstacle(tweakables.net.center, tweakables.net.width, tweakables.net.height)
    this.leftWall = new RectangularObstacle(tweakables.leftWall.center, tweakables.leftWall.width, tweakables.leftWall.height)
    this.rightWall = new RectangularObstacle(tweakables.rightWall.center, tweakables.rightWall.width, tweakables.rightWall.height)
    this.resetScores()
    this.init(targetDiv)
  }
  private async init(targetDiv: HTMLDivElement) {
    this.sound = new SoundManager(this.content)
    this.display = new Display(this, this.content, targetDiv)
    this.menu = new Menu(this.display)
    this.input = new Input(this)
    await this.loadContent()
    this.resetScores()
    this.display.atmosphere.changeSkyForOpponent(this.playerRight, 1)
    this.setGameState(GameState.PreStart)
    this.futurePredictionList = []
    for (let i = 0; i < this.balls.length; i++) {
      this.futurePredictionList.push(new FuturePrediction())
    }
  }
  public player(playerSide: PlayerSide) {
    const p = this.players.get(playerSide)
    if (!p) throw new Error(`Pfff, player could not load`)
    return p
  }
  public get playerLeft(): Player {
    return this.player(PlayerSide.Left)
  }
  public get playerRight(): Player {
    return this.player(PlayerSide.Right)
  }
  public get isTwoPlayerGame(): boolean {
    return this.playerRight.species === PlayerSpecies.Human
  }
  private setUpBalls(numBalls: number) {
    this.balls = []
    for (let i = 0; i < numBalls; i++) {
      const xPos = i ? 0.75 : 0.25
      const yPos = -tweakables.ball.defaultSettings.diameter / 2
      const b = new Ball(
        {x: xPos, y: yPos}, // Position
        {x: 0.0, y: 0.4}, // Velocity
        tweakables.ball.defaultSettings.diameter,
        tweakables.ball.defaultSettings.mass,
        tweakables.ball.defaultSettings.maxSpeed,
        0.0, // Orientation
        0.0, // Rotation Speed
      )
      this.balls.push(b)
    }
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

  private generatePlayers(rightPlayerAi: AiBase | null) {
    const pLeftConfig: NewPlayerArg = tweakables.player.defaultSettings()
    const pRightConfig: NewPlayerArg = tweakables.player.defaultSettings()
    if (rightPlayerAi) {
      pRightConfig.species = PlayerSpecies.Ai
      pRightConfig.ai = rightPlayerAi
    }
    this.players.set(PlayerSide.Left, new Player(pLeftConfig))
    this.players.set(PlayerSide.Right, new Player(pRightConfig))
  }
  public async run() {
    while (!this.content.isLoaded) {
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
    let lastDraw = Date.now()
    let lastTime = Date.now()
    while (this.gameState !== GameState.Exit) {
      this.input.updateInputStates()
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
      if (Date.now() - lastDraw > tweakables.redrawTargetMs) {
        this.updateFps()
        this.draw(this.currentGameTime)
        lastDraw = Date.now()
      }
      lastTime = currTime
    }
  }

  public setGameState(gs: GameState) {
    if (gs !== GameState.PreStart) {
      // hello world
    }
    if (gs !== this.gameState) this.accumulatedStateSeconds = 0.0
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
      gs === GameState.Victory
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
  }
  public getPlayerName(playerSide: PlayerSide): string {
    if (playerSide === PlayerSide.Left) return 'Red'
    if (this.playerRight.species === PlayerSpecies.Human) return 'Blue'
    else if (this.playerRight.ai) {
      return aiToName(this.playerRight.ai)
    } else {
      return 'Unknown'
    }
  }

  public draw(gameTime: GameTime): void {
    const dt = gameTime.elapsedGameTime.totalSeconds
    this.kapow.step(dt)

    this.display.draw(
      gameTime,
      this.gameState,
      this.scoreLeftPlayer,
      this.scoreRightPlayer,
      this.futurePredictionList,
      this.kapow,
      this.getCurrentFps(),
      this.input.gamepadConnectSummary(),
    )

    if (this.gameState === GameState.Victory) {
      this.isGamePoint = false
      const seconds = this.accumulatedGamePlayTime
      const minutesInt = Math.floor(seconds / 60.0)
      const secondsInt = Math.floor(seconds - minutesInt * 60)
      const time = minutesInt > 0 ? `${minutesInt} min ${secondsInt} sec` : `${seconds.toFixed(3)} seconds`
      const winner = this.scoreLeftPlayer > this.scoreRightPlayer ? PlayerSide.Left : PlayerSide.Right
      const summ = winner === PlayerSide.Right && this.playerRight.ai ? `Defeat in ${time}.` : `Victory in ${time}.`
      const wPlayer = winner === PlayerSide.Right ? this.playerRight : this.playerLeft
      if (wPlayer.jumpCount === 0) {
        this.display.drawCenteredDancingMessage(gameTime, 'Without Jumping!!!', summ, Colors.white)
      } else if (this.scoreLeftPlayer === 0 || this.scoreRightPlayer === 0) {
        this.display.drawCenteredDancingMessage(gameTime, 'Shutout!', summ, Colors.white)
      } else {
        this.display.drawCenteredDancingMessage(gameTime, this.getPlayerName(winner) + ' Wins!', summ, Colors.white)
      }
    }
    if (this.gameState === GameState.PointScored) {
    } else if (this.gameState === GameState.Paused) {
      this.menu.draw(true, gameTime)
    } else if (this.gameState === GameState.MainMenu) {
      this.menu.draw(false, gameTime)
    } else if (this.gameState === GameState.PreExitCredits) this.display.drawCredits(gameTime)
  }

  private startNewGame(numBalls: number, ai: AiBase | null) {
    this.resetScores()
    this.generatePlayers(ai)
    this.whoseServe = ai || Math.random() < 0.5 ? PlayerSide.Left : PlayerSide.Right
    this.setGameState(GameState.PreAction)
    const aiName = ai ? aiToName(ai) : undefined
    persistence.incGamesStarted(numBalls, this.playerRight.species, aiName)
    this.accumulatedGamePlayTime = 0.0
    this.setUpBalls(numBalls)
    this.display.atmosphere.changeSkyForOpponent(this.playerRight, 1)
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
      (this.playerRight.species !== PlayerSpecies.Human || this.input.doesPlayerHaveGamepad(PlayerSide.Right))
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
    if (menuSelectResult.selected && !this.menu.isOnLockedSelection()) {
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
    if (this.accumulatedStateSeconds > 1.0 && this.input.wasPostgameProceedJustPushed()) {
      this.setGameState(GameState.MainMenu)
    }
  }
  handlePointInputs(): void {
    if (this.accumulatedStateSeconds > tweakables.timeAfterPointToReturnHome) {
      let allBallsReset = true
      for (const ball of this.balls) {
        if (ball.physics.center.y > 0.0 + ball.physics.diameter / 2) {
          allBallsReset = false
        }
      }
      if (allBallsReset) {
        this.setGameState(GameState.PreAction)
      }
    }
  }
  handlePreActionInputs(): void {
    if (this.accumulatedStateSeconds > 1.0) {
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
    } else if (this.playerRight.species === PlayerSpecies.Human && this.input.wasPlayerJustDisconnectedFromGamepad(PlayerSide.Right)) {
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
    const player = this.player(playerSide)

    if (player.species === PlayerSpecies.Human) {
      player.targetXVel = 0
      // the following is -1...1 and maps to 0 if near the center, as determined
      // in tweakables.thumbstickCenterTolerance
      const thumbstickPos = this.input.getLeftThumbStickX(playerSide)
      if (this.input.isLeftPressed(playerSide)) player.moveLeft()
      else if (this.input.isRightPressed(playerSide)) player.moveRight()
      else if (thumbstickPos) player.moveRationally(thumbstickPos)
      if (player.isInJumpPosition && this.input.isJumpPressed(playerSide)) player.jump()

      // triggers only register over some threshold as dtermined in tweakables.triggerTolerance
      const lTrigger = this.input.getTrigger(playerSide, 'left')
      const rTrigger = this.input.getTrigger(playerSide, 'right')
      const triggerDiff = rTrigger - lTrigger
      if (triggerDiff) {
        player.grow(dt, triggerDiff * tweakables.input.triggerGrowthMult)
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
    if (this.accumulatedStateSeconds < tweakables.ballPlayerLaunchTime) return false
    else if (player.physics.vel.y > player.maxVel.y / 2) return false
    else if (player.isOnHeight(0.0)) return true
    else if (player.isOnRectangle(this.net)) return true
    else if (player.isOnPlayer(opponent)) return true
    else return false
  }

  private aIStep(): void {
    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const p = this.player(playerSide)
      if (p.species === PlayerSpecies.Ai) {
        const aiThinkArg: AiThinkArg = {
          gameTime: this.currentGameTime,
          accumulatedPointSeconds: this.accumulatedPointSeconds,
          myPlayerSide: playerSide,
          balls: this.balls,
          ballPredictions: this.futurePredictionList,
          gameGravity: tweakables.gameGravity,
          p0Score: this.scoreLeftPlayer,
          p1Score: this.scoreRightPlayer,
          me: playerSide === PlayerSide.Left ? this.playerLeft : this.playerRight,
          opponent: playerSide === PlayerSide.Left ? this.playerRight : this.playerLeft,
          net: this.net,
        }
        p.ai?.think(aiThinkArg)
      }
    }
  }

  private setUpForServe(): void {
    this.accumulatedPointSeconds = 0.0
    const playerL = this.playerLeft
    const playerR = this.playerRight

    playerL.physics.center = {x: 0.25, y: -playerL.physics.diameter / 2 - this.balls[0].physics.diameter}
    playerL.physics.vel = {x: 0, y: 0}
    playerL.physics.vel.y = this.balls[0].maxSpeed
    playerL.targetXVel = 0.0

    playerR.physics.center = {x: 0.75, y: -playerR.physics.diameter / 2 - this.balls[0].physics.diameter}
    playerR.physics.vel = {x: 0, y: 0}
    playerR.physics.vel.y = this.balls[0].maxSpeed
    playerR.targetXVel = 0.0
    this.net.center.x = 0.5

    this.balls[0].physics.center = {
      x: this.whoseServe === PlayerSide.Left ? 0.25 : 0.75,
      y: -this.balls[0].physics.diameter / 2,
    }
    this.balls[0].physics.vel = {x: 0, y: this.balls[0].maxSpeed}
    if (this.balls[1]) {
      this.balls[1].physics.center = {
        x: this.whoseServe === PlayerSide.Left ? 0.75 : 0.25,
        y: -this.balls[1].physics.diameter / 2,
      }
      this.balls[1].physics.vel = {x: 0, y: this.balls[1].maxSpeed}
    }
  }

  private resetScores(): void {
    this.scoreLeftPlayer = 0
    this.scoreRightPlayer = 0
  }

  checkForAndScorePoint(): boolean {
    let pointForPlayer: PlayerSide | null = null
    const enoughTime = this.accumulatedPointSeconds > tweakables.ballPlayerLaunchTime
    for (const b of this.balls) {
      const isLowEnough = b.physics.center.y - b.physics.diameter / 2 <= 0.0
      if (enoughTime && isLowEnough) {
        pointForPlayer = b.physics.center.x > this.net.center.x ? PlayerSide.Left : PlayerSide.Right
        this.kapow.addAKapow(KapowType.Score, b.physics.center, Math.random() / 10, 0.4, 0.5)
        this.sound.play('pointScored', 0.8, 0.0, -1.0 + 2 * b.physics.center.x)
      }
    }
    if (pointForPlayer) this.handlePointScored(pointForPlayer)
    if (
      this.gameState === GameState.PointScored &&
      this.scoreLeftPlayer !== this.scoreRightPlayer &&
      (this.scoreLeftPlayer >= tweakables.winningScore - 1 || this.scoreRightPlayer >= tweakables.winningScore - 1)
    ) {
      this.sound.stopPlayMusic()
      this.isGamePoint = true
      this.sound.playIfNotPlaying('gamePoint', 0.6, 0.0, 0.0, false)
      this.display.atmosphere.changeSkyForOpponent(this.playerRight, 0)
    } else if (pointForPlayer) {
      this.display.atmosphere.changeSkyForOpponent(this.playerRight, 1)
    }
    return !!pointForPlayer
  }

  private handlePointScored(playerSide: PlayerSide): void {
    const winScore = tweakables.winningScore
    this.display.bounceScoreCard(playerSide)
    const sec = this.accumulatedGamePlayTime
    const jumps = this.playerLeft.jumpCount
    this.setGameState(GameState.PointScored)
    if (playerSide === PlayerSide.Left) {
      this.scoreLeftPlayer++
      if (this.scoreLeftPlayer >= winScore && this.scoreLeftPlayer - this.scoreRightPlayer >= 2) {
        persistence.incGamesCompleted()
        if (this.playerRight.ai) {
          const aiName = aiToName(this.playerRight.ai)
          const wasShutout = this.scoreRightPlayer === 0
          persistence.recordResultAgainstAi(aiName, true, wasShutout, sec, jumps)
        }
        this.setGameState(GameState.Victory)
      }
      this.whoseServe = PlayerSide.Left
    } else {
      this.scoreRightPlayer++
      if (this.scoreRightPlayer >= winScore && this.scoreRightPlayer - this.scoreLeftPlayer >= 2) {
        persistence.incGamesCompleted()
        if (this.playerRight.ai) {
          const aiName = aiToName(this.playerRight.ai)
          persistence.recordResultAgainstAi(aiName, false, false, sec, jumps)
        }
        this.setGameState(GameState.Victory)
      }
      this.whoseServe = PlayerSide.Right
    }
  }

  //
  // Keeps players constrained by floor and walls
  //
  private constrainPlayers(): void {
    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const p = this.player(playerSide)
      // Constrain Player to Floor. In the first second of the game they float up from it. After that they stick above it.
      if (this.accumulatedPointSeconds > tweakables.ballPlayerLaunchTime && p.physics.center.y < 0.0) {
        p.physics.center.y = 0.0
        if (this.gameState === GameState.Action && p.physics.vel.y < 0) p.physics.vel.y = 0
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
    const ball0 = this.balls[0]
    const ball1 = this.balls[1]
    const playerL = this.playerLeft
    const playerR = this.playerRight

    // Balls with net, walls
    for (const b of this.balls) {
      if (this.leftWall.handleBallCollision(b.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('flowerBounce', 0.6, 0.0, -0.5, false)
      if (this.rightWall.handleBallCollision(b.physics, 1.0) && !isSimulation)
        this.sound.playIfNotPlaying('flowerBounce', 0.6, 0.0, 0.5, false)
      if (this.net.handleBallCollision(b.physics, 1.0) && !isSimulation) this.sound.playIfNotPlaying('thud', 0.3, 0.0, 0.0, false)
    }
    // Balls with other balls
    if (ball0 && ball1) {
      const collision = ball0.physics.handleHittingOtherCircle(ball1.physics, 1.0)
      if (collision.didCollide && !isSimulation) {
        const hardness = Math.min(1, vec.len(collision.c2MomentumDelta) / ball0.physics.mass / 5.0)
        const pan = collision.pointOfContact.x
        const pitch = 1.0
        this.sound.playIfNotPlaying('thud', hardness, pitch, pan, false)
      }
    }

    // Players with net
    this.net.handleBallCollision(playerL.physics, 0.0)
    this.net.handleBallCollision(playerR.physics, 0.0)

    // Players with balls
    for (const b of this.balls) {
      this.manageBallPlayerCollision(isSimulation, b, playerL, PlayerSide.Left)
      this.manageBallPlayerCollision(isSimulation, b, playerR, PlayerSide.Right)
    }

    for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
      const i = playerSide === PlayerSide.Left ? 0 : 1
      const player = this.player(playerSide)
      if (this.net.handleBallCollision(player.physics, 0.0) && !isSimulation) {
        // do nothing; but the collision was detected and handled
      }

      if (!isSimulation || player.species === PlayerSpecies.Human) {
        for (const ball of this.balls) {
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
            this.sound.playIfNotPlaying('thud', hardness, pitch, pan, false)
          }
        }
      }
    }

    // Player-player collisions
    playerL.physics.handleHittingOtherCircle(playerR.physics, 0.0)
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
      this.sound.playIfNotPlaying('thud', hardness, pitch, pan, false)
      // Slam
      let amINearnet = false
      if (
        player.physics.center.x > this.net.center.x - (3 * this.net.width) / 2 &&
        player.physics.center.x < this.net.center.x + (3 * this.net.width) / 2
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
        !this.history.hasHappenedRecently(`Kapow-Slam-Player-${isLeft ? 0 : 1}`, this.currentGameTime, 0.75)
      ) {
        this.sound.play('slam', 0.3, 0.0, pan)
        const dest: Vector2 = vec.add(collision.pointOfContact, {x: 0, y: 2 * ball.physics.diameter})
        this.kapow.addAKapow(KapowType.Slam, dest, 0.0, 0.3, 1.5)
        this.history.recordEvent(`Kapow-Slam-Player-${isLeft ? 0 : 1}`, this.currentGameTime)
      }

      // Rejection
      else if (
        hardness > 0.1 &&
        ball.physics.vel.y > 1.0 &&
        this.history.hasHappenedRecently(`Kapow-Slam-Player-${isLeft ? 1 : 0}`, this.currentGameTime, 0.5) &&
        !this.history.hasHappenedRecently(`Kapow-Rejected-Player-${isLeft ? 0 : 1}`, this.currentGameTime, 0.25)
      ) {
        this.sound.playIfNotPlaying('rejected', 0.4, 0.1, 0.0, false)
        this.kapow.addAKapow(KapowType.Rejected, collision.pointOfContact, 0.0, 0.3, 1.5)
        this.history.recordEvent(`Kapow-Rejected-Player-${isLeft ? 0 : 1}`, this.currentGameTime)
      }
    }
  }
  private postPointStep(): void {
    // For the first moments, don't move anything, but give ball & players big velocities
    if (this.accumulatedStateSeconds < tweakables.timeAfterPointToFreeze) {
      for (const ball of this.balls) {
        ball.physics.vel = {x: 0, y: ball.maxSpeed}
      }
      for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
        const player = this.player(playerSide)
        player.physics.vel.x = 0.0
        player.physics.vel.y = tweakables.player.jumpSpeedAfterPoint
      }
    }
    // Only move it after that
    else {
      const dt = this.currentGameTime.elapsedGameTime.totalMilliseconds / 1000
      const isTwoBallGame = !!this.balls[1]
      for (let i = 0; i < 2; i++) {
        const ball = this.balls[i]
        if (ball) {
          ball.stepVelocity(dt, vec.scale(tweakables.gameGravity, 1.5), false)
          let xDestination = this.whoseServe === PlayerSide.Left ? 0.25 : 0.75
          if (isTwoBallGame) xDestination = 0.75 - 0.5 * i
          const xDistance = xDestination - ball.physics.center.x
          const timeTillStateSwitch = tweakables.timeAfterPointToReturnHome - this.accumulatedStateSeconds
          ball.physics.vel.x = (2 * xDistance) / timeTillStateSwitch
          ball.stepPositionAndOrientation(dt)
        }
      }
      for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
        const player = this.player(playerSide)
        player.stepVelocity(dt, tweakables.gameGravity)
        const xDestination = playerSide === PlayerSide.Left ? 0.25 : 0.75
        const xDistance = xDestination - player.physics.center.x
        const timeTillStateSwitch = tweakables.timeAfterPointToReturnHome - this.accumulatedStateSeconds
        player.physics.vel.x = (2 * xDistance) / timeTillStateSwitch
        player.stepPosition(dt)
      }
    }
  }

  private gameStep(dt: number): boolean {
    if (!this.checkForAndScorePoint()) {
      this.accumulatedGamePlayTime += dt

      for (const playerSide of [PlayerSide.Left, PlayerSide.Right]) {
        const player = this.player(playerSide)
        const opponent = player === this.playerLeft ? this.playerRight : this.playerLeft
        player.stepVelocity(dt, tweakables.gameGravity)
        player.stepPosition(dt)
        player.setIsInJumpPosition(this.canPlayerJump(player, opponent))
      }
      for (const ball of this.balls) {
        ball.stepVelocity(dt, tweakables.gameGravity, true)
        ball.stepPositionAndOrientation(dt)
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
      const player = this.player(playerSide)
      player.stepVelocity(dt, tweakables.gameGravity)
      player.stepPosition(dt)
    }
    for (const ball of this.balls) {
      ball.stepVelocity(dt, tweakables.gameGravity, true)
      ball.stepPositionAndOrientation(dt)
    }

    this.manageCollisions(true)
    this.constrainPlayers()
  }

  private updateFuturePrediction(): void {
    //return;
    // Copy current player/ball info to temp so we can step w/o wrecking things
    const sbTemp: Ball[] = []
    const p0Real = this.player(PlayerSide.Left)
    const p1Real = this.player(PlayerSide.Right)
    const p0Copy = p0Real.deepCopy()
    const p1Copy = p1Real.deepCopy()

    for (let i = 0; i < this.balls.length; i++) {
      sbTemp[i] = this.balls[i].deepCopy()
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
      for (let i = 0; i < this.balls.length; i++) {
        const state: FutureState = unknownState()
        const ballPhysics = this.balls[i].physics
        const prediction = this.futurePredictionList[i]

        state.pos = ballPhysics.center
        state.time = time
        if (Math.round(currStep) !== Math.round(lastStep)) {
          prediction.ballStates.push(state)
        }
        if (!prediction.ballHittingGround.isKnown && ballPhysics.center.y - ballPhysics.diameter / 2 <= 0.0) {
          prediction.ballHittingGround = state
          prediction.ballHittingGround.isKnown = true
        } else if (!prediction.ballCrossingNet.isKnown && Math.abs(ballPhysics.center.x - this.net.center.x) < ballPhysics.diameter / 4.0) {
          prediction.ballCrossingNet = state
          prediction.ballCrossingNet.isKnown = true
        }
        if (
          !prediction.ballEnteringJumpRange(PlayerSide.Left).isKnown &&
          ballPhysics.center.x < this.net.center.x - this.net.width / 2 &&
          ballPhysics.center.y <= p0JumpHeight
        ) {
          state.isKnown = true
          prediction.setBallEnteringJumpRange(PlayerSide.Left, state)
        }
        if (
          !prediction.ballEnteringJumpRange(PlayerSide.Right).isKnown &&
          ballPhysics.center.x > this.net.center.x + this.net.width / 2 &&
          ballPhysics.center.y <= p1JumpHeight
        ) {
          state.isKnown = true
          prediction.setBallEnteringJumpRange(PlayerSide.Right, state)
        }
      }
    }
    for (let i = 0; i < this.balls.length; i++) {
      this.balls[i] = sbTemp[i]
    }
    this.players.set(PlayerSide.Left, p0Copy)
    this.players.set(PlayerSide.Right, p1Copy)
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
    let highest = -Infinity
    for (const ball of this.balls) {
      highest = Math.max(highest, ball.physics.getBallMaxHeight(tweakables.gameGravity))
    }
    return highest
  }

  public update(gameTime: GameTime): boolean {
    if (this.gameState === GameState.PreStart) {
      this.setGameState(GameState.Intro1)
    }
    this.handleUniversalInputs()

    const dt = gameTime.elapsedGameTime.totalMilliseconds / 1000
    this.accumulatedStateSeconds += dt
    if (this.gameState === GameState.Action) this.accumulatedPointSeconds += dt

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
      case GameState.PointScored:
        this.runPointState()
        break
      case GameState.PreAction:
        this.runPreActionState()
        break
      case GameState.Victory:
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
