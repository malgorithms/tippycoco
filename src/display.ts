import {BlackAi} from './ai/black-ai'
import {GreenAi} from './ai/green-ai'
import {PurpleAi} from './ai/purple-ai'
import {WhiteAi} from './ai/white-ai'
import {Atmosphere} from './atmosphere'
import {Ball} from './ball'
import {CanvasManager} from './canvas-manager'
import {Color, Colors} from './color'
import {TextureName, textureSources} from './content-load-list'
import {ContentLoader} from './content-loader'
import {FontManager, FontName} from './font-manager'
import {FuturePrediction} from './future-prediction'
import {GameState} from './game'
import {GameConfig, PlayerConfiguration} from './game-config'
import {GamepadConnectSummary} from './gamepad-monitor'
import {KapowManager, KapowType} from './kapow-manager'
import {Player, PlayerSpecies} from './player'
import {ScoreCard} from './score-card'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {FutureState, GameTime, PlayerSide, Rectangle, Texture2D, Vector2} from './types'
import {vec} from './utils'

class Display {
  private canvasManager: CanvasManager

  // Properties
  public inDebugView: boolean

  // Members
  private p0ScoreCard: ScoreCard
  private p1ScoreCard: ScoreCard

  private content: ContentLoader
  private spriteBatch: SpriteBatch
  private textures: Map<TextureName, Texture2D>
  public atmosphere: Atmosphere
  private lastCloudDraw: number
  private _fontManager: FontManager

  public constructor(content: ContentLoader, targetDiv: HTMLDivElement) {
    this.textures = new Map()
    this.lastCloudDraw = 0
    this.inDebugView = false
    this.content = content
    this.canvasManager = new CanvasManager(targetDiv)
    this.spriteBatch = new SpriteBatch(this.canvasManager)
    this.atmosphere = new Atmosphere(this, this.canvasManager)
    this.p0ScoreCard = new ScoreCard()
    this.p1ScoreCard = new ScoreCard()
    this._fontManager = new FontManager(this.content)
  }

  private async loadTexture(path: string, name: TextureName) {
    const t = await this.content.loadTexture2d(path)
    this.textures.set(name, t)
  }
  public font(fontName: FontName) {
    return this._fontManager.getFont(fontName)
  }
  public get canvasWidth(): number {
    return this.canvasManager.width
  }
  public get canvasHeight(): number {
    return this.canvasManager.height
  }
  public get ctx(): CanvasRenderingContext2D {
    return this.canvasManager.ctx
  }
  public getSpriteBatch(): SpriteBatch {
    return this.spriteBatch
  }
  public initialDraw(): void {
    this.canvasManager.initialDraw()
  }
  public async loadContent(): Promise<void> {
    this.spriteBatch = new SpriteBatch(this.canvasManager)

    const p: Promise<any>[] = []
    Object.entries(textureSources).forEach(([name, source]) => p.push(this.loadTexture(source, name as TextureName)))
    p.push(this._fontManager.loadContent())
    await Promise.all(p)

    for (let i = 1; i <= 5; i++) {
      const tSunny = this.getTexture(`sunnyCloud${i}` as TextureName)
      const tDark = this.getTexture(`darkCloud${i}` as TextureName)
      this.atmosphere.addCloudTextures(tSunny, tDark)
    }
    this.atmosphere.fillClouds()
  }

  public getTexture(name: TextureName): Texture2D {
    const t = this.textures.get(name)
    if (!t) throw new Error(`no texture was loaded with name ${name}`)
    return t
  }

  public bounceScoreCard(playerSide: PlayerSide) {
    if (playerSide == PlayerSide.Left) this.p0ScoreCard.bounce()
    else this.p1ScoreCard.bounce()
  }
  private drawPlayer(
    gameTime: GameTime,
    playerSide: PlayerSide,
    player: Player,
    playerConfig: PlayerConfiguration,
    playerTexture: Texture2D,
    ball: Ball,
  ): void {
    const isSkarball = playerConfig.species === PlayerSpecies.Ai && playerConfig.ai instanceof WhiteAi
    const leftEyeOffset = vec.scale({x: -0.113, y: 0.14}, player.physics.diameter)
    const rightEyeOffset = vec.scale({x: 0.1195, y: 0.144}, player.physics.diameter)
    let leftEyePosition = vec.add(player.physics.center, leftEyeOffset)
    let rightEyePosition = vec.add(player.physics.center, rightEyeOffset)
    const leftEyeWidth = 0.24 * 0.67 * player.physics.diameter
    const rightEyeWidth = 0.28 * 0.67 * player.physics.diameter
    let leftEyeHeight = leftEyeWidth
    let rightEyeHeight = rightEyeWidth
    const blinkFactor = playerSide === PlayerSide.Left ? 0 : 1
    if (gameTime.totalGameTime.totalMilliseconds % (5000 + blinkFactor * 1000) < 200) {
      // blink
      leftEyeHeight *= 0.1
      rightEyeHeight *= isSkarball ? 1 : 0.1
    }
    let leftEyeBallDirection = vec.sub(ball.physics.center, leftEyePosition)
    let rightEyeBallDirection = vec.sub(ball.physics.center, rightEyePosition)
    const leftEyeRange = 0.05
    const rightEyeRange = isSkarball ? leftEyeRange / 2 : leftEyeRange
    leftEyeBallDirection = vec.normalized(leftEyeBallDirection)
    rightEyeBallDirection = vec.normalized(rightEyeBallDirection)
    leftEyePosition = vec.add(leftEyePosition, vec.scale(leftEyeBallDirection, player.physics.diameter * leftEyeRange))
    rightEyePosition = vec.add(rightEyePosition, vec.scale(rightEyeBallDirection, player.physics.diameter * rightEyeRange))

    this.spriteBatch.drawTextureCentered(
      playerTexture,
      player.physics.center,
      {w: player.physics.diameter, h: player.physics.diameter},
      0,
      1,
    )
    const pupil = this.getTexture('pupil')
    const pupilGray = this.getTexture('pupilGray')
    this.spriteBatch.drawTextureCentered(pupil, leftEyePosition, {w: leftEyeWidth, h: leftEyeHeight}, 0, 1)
    const rightPupil = isSkarball ? pupilGray : pupil
    this.spriteBatch.drawTextureCentered(rightPupil, rightEyePosition, {w: rightEyeWidth, h: rightEyeHeight}, 0, 1)
  }

  private drawPlayerShadowBehind(player: Player) {
    const shadowWidth = player.physics.diameter * 1.1
    const shadowHeight = player.physics.diameter / 5
    const shadowPosition = {x: player.physics.center.x, y: 0}
    this.spriteBatch.drawTextureCentered(this.getTexture('playerShadowBehind'), shadowPosition, {w: shadowWidth, h: shadowHeight}, 0, 1)
  }
  private drawPlayerShadowFront(player: Player) {
    const shadowWidth = player.physics.diameter * 1.1
    const shadowHeight = player.physics.diameter / 10
    const shadowPosition = {x: player.physics.center.x, y: -shadowHeight / 2}
    this.spriteBatch.drawTextureCentered(this.getTexture('playerShadowFront'), shadowPosition, {w: shadowWidth, h: shadowHeight}, 0, 1)
  }

  public drawCenteredDancingMessage(gameTime: GameTime, text: string, subtitle: string | null, color: Color) {
    const minHeight = 0.08
    const maxHeight = 0.25 // added or subtracted to above
    const avgHeight = (maxHeight + minHeight) / 2
    const heightDev = avgHeight - minHeight

    const seconds = gameTime.totalGameTime.totalSeconds

    const beat = Math.PI * 2.0 * seconds * (tweakables.menu.bpm / 60)
    const height = avgHeight + heightDev * (Math.sin(beat / 2) / 2 + Math.sin(beat / 8) / 2)
    const rot = -0.1 + Math.sin(beat) / 50.0

    const destination: Vector2 = {x: 0.5, y: 0.4}
    const shift = this.canvasManager.pixelWidth(2)
    const subFont = this.font('regular')
    const font = this.font('extraBold')

    // we draw subtitle first so title is on top when they overlap
    if (subtitle) {
      const subtitleRelativeSize = 0.8 // 80% as big as title
      const subtitleSize = (minHeight + (maxHeight - height)) * subtitleRelativeSize
      destination.y -= subtitleSize * 2
      this.spriteBatch.drawStringCentered(subtitle, subFont, subtitleSize, vec.add(destination, {x: shift, y: shift}), Colors.black, rot)
      this.spriteBatch.drawStringCentered(subtitle, subFont, subtitleSize, vec.add(destination, {x: shift, y: -shift}), Colors.black, rot)
      this.spriteBatch.drawStringCentered(subtitle, subFont, subtitleSize, vec.add(destination, {x: -shift, y: shift}), Colors.black, rot)
      this.spriteBatch.drawStringCentered(subtitle, subFont, subtitleSize, vec.add(destination, {x: -shift, y: -shift}), Colors.black, rot)
      this.spriteBatch.drawStringCentered(subtitle, subFont, subtitleSize, destination, color, rot)
      destination.y += subtitleSize
    }

    this.spriteBatch.drawStringCentered(text, font, height, vec.add(destination, {x: shift, y: shift}), Colors.black, rot)
    this.spriteBatch.drawStringCentered(text, font, height, vec.add(destination, {x: shift, y: -shift}), Colors.black, rot)
    this.spriteBatch.drawStringCentered(text, font, height, vec.add(destination, {x: -shift, y: shift}), Colors.black, rot)
    this.spriteBatch.drawStringCentered(text, font, height, vec.add(destination, {x: -shift, y: -shift}), Colors.black, rot)
    this.spriteBatch.drawStringCentered(text, font, height, destination, color, rot)
  }

  private getPlayerTexture(playerConfig: PlayerConfiguration, playerSide: PlayerSide): Texture2D {
    if (playerSide == PlayerSide.Left && playerConfig.species === PlayerSpecies.Human) return this.getTexture('redPlayer')
    else if (playerSide == PlayerSide.Right && playerConfig.species == PlayerSpecies.Human) return this.getTexture('bluePlayer')
    else {
      if (playerConfig.ai instanceof BlackAi) return this.getTexture('blackPlayer')
      else if (playerConfig.ai instanceof GreenAi) return this.getTexture('greenPlayer')
      else if (playerConfig.ai instanceof PurpleAi) return this.getTexture('purplePlayer')
      else return this.getTexture('whitePlayer')
    }
  }

  public drawControllerInstructions() {
    // TODO
    const c = new Color(1, 1, 1, 1)
    this.spriteBatch.drawStringCentered('Instructions soon', this.font('regular'), 0.1, {x: 0.5, y: 0.1}, c, 0)
  }

  public drawCredits(gameTime: GameTime) {
    console.log(`Todo, draw credits at ${gameTime.totalGameTime.totalSeconds}`)
  }

  public drawKapows(k: KapowManager) {
    for (const kapow of k.kapows) {
      let texture: Texture2D
      switch (kapow.kapowType) {
        case KapowType.Slam:
          texture = this.getTexture('kapowSlam')
          break
        case KapowType.Rejected:
          texture = this.getTexture('kapowRejected')
          break
        case KapowType.Score:
          texture = this.getTexture('kapowScore')
          break
        default:
          texture = this.getTexture('kapowSlam')
          break
      }
      const alpha = 1 - kapow.fractionOfWayToDeath()
      this.spriteBatch.drawTextureCentered(texture, kapow.pos, {w: kapow.size, h: kapow.size}, kapow.orientation, alpha)
    }
  }

  public draw(
    gameTime: GameTime,
    gameState: GameState,
    gameConfig: GameConfig,
    p0Score: number,
    p1Score: number,
    futurePrediction: FuturePrediction[],
    kapowManager: KapowManager,
    currentFps: number,
    gamepadConnectSummary: GamepadConnectSummary,
  ) {
    this.canvasManager.clearCanvas()
    const playerTextures: Map<PlayerSide, Texture2D> = new Map()
    playerTextures.set(PlayerSide.Left, this.getPlayerTexture(gameConfig.playerConfig(PlayerSide.Left), PlayerSide.Left))
    playerTextures.set(PlayerSide.Right, this.getPlayerTexture(gameConfig.playerConfig(PlayerSide.Right), PlayerSide.Right))

    const dt = (gameTime.totalGameTime.totalMilliseconds - this.lastCloudDraw) / 1000.0
    this.p0ScoreCard.update(dt)
    this.p1ScoreCard.update(dt)
    this.atmosphere.step(dt)
    this.lastCloudDraw = gameTime.totalGameTime.totalMilliseconds

    this.atmosphere.draw(this.spriteBatch)

    //const topLeftCorner = this.canvasManager.topLeftCorner()
    //const bottomRightCorner = this.canvasManager.bottomRightCorner()
    const viewableRegion = this.canvasManager.viewableRegion
    //const floorBackDim = this.spriteBatch.autoDim(gameConfig.floorBack.width, this.floorBackTexture)

    this.spriteBatch.drawTextureInRect(
      this.getTexture('floorBack'),
      {
        x1: viewableRegion.x1,
        x2: viewableRegion.x2,
        y1: tweakables.floorBack.yMin,
        y2: tweakables.floorBack.yMax,
      },
      1,
    )

    if (
      gameState != GameState.PreExitMessage &&
      gameState != GameState.Intro1 &&
      gameState != GameState.Intro2 &&
      gameState != GameState.Intro3 &&
      gameState != GameState.MainMenu
    ) {
      this.drawPlayerShadowBehind(gameConfig.player(PlayerSide.Left))
      this.drawPlayerShadowBehind(gameConfig.player(PlayerSide.Right))

      this.drawKapows(kapowManager)

      for (const side of [PlayerSide.Left, PlayerSide.Right]) {
        const player = gameConfig.player(side)
        const playerConfig = gameConfig.playerConfig(side)
        let closestBall = gameConfig.balls[0]
        let closestDistance = Infinity
        for (const ball of gameConfig.balls) {
          if (ball.isAlive) {
            const distance = vec.lenSq(vec.sub(ball.physics.center, player.physics.center))
            if (distance < closestDistance) {
              closestDistance = distance
              closestBall = ball
            }
          }
        }
        const texture = playerTextures.get(side) ?? this.getTexture('redPlayer')
        this.drawPlayer(gameTime, side, player, playerConfig, texture, closestBall)
      }
      for (let i = 0; i < gameConfig.balls.length; i++) {
        this.drawBall(gameConfig.balls[i], i)
      }
    }
    this.spriteBatch.drawTextureInRect(
      this.getTexture('floorFront'),
      {
        x1: viewableRegion.x1,
        x2: viewableRegion.x2,
        y1: viewableRegion.y1,
        y2: tweakables.floorFront.yMax,
      },
      1,
    )

    if (
      gameState != GameState.PreExitMessage &&
      gameState != GameState.Intro1 &&
      gameState != GameState.Intro2 &&
      gameState != GameState.Intro3 &&
      gameState != GameState.MainMenu
    ) {
      this.drawPlayerShadowFront(gameConfig.player(PlayerSide.Left))
      this.drawPlayerShadowFront(gameConfig.player(PlayerSide.Right))
    }

    const leftTreeTopWidth = gameConfig.leftWall.width * 2.5
    const leftFlowerTop = this.getTexture('leftFlowerTop')
    const rightFlowerTop = this.getTexture('rightFlowerTop')
    const leftTreeTopHeight = (leftTreeTopWidth * leftFlowerTop.height) / leftFlowerTop.width
    const rightTreeTopWidth = gameConfig.rightWall.width * 2.5
    const rightTreeTopHeight = (rightTreeTopWidth * rightFlowerTop.height) / rightFlowerTop.width

    this.spriteBatch.drawTextureCentered(
      this.getTexture('net'),
      gameConfig.net.center,
      {w: gameConfig.net.width, h: gameConfig.net.height},
      0,
      1,
    )

    this.drawFlowers(gameConfig, leftTreeTopWidth, leftTreeTopHeight, rightTreeTopWidth, rightTreeTopHeight)

    if (
      gameState != GameState.MainMenu &&
      gameState != GameState.PreStart &&
      gameState != GameState.PreExitMessage &&
      gameState != GameState.PreExitCredits &&
      gameState != GameState.Intro1 &&
      gameState != GameState.Intro2 &&
      gameState != GameState.Intro3
    ) {
      this.drawScores(p0Score, p1Score, gameTime)
    }

    this.drawDebugView(gameConfig, futurePrediction, currentFps)
    this.drawGamepadConnections(gameConfig, gameState, gamepadConnectSummary)

    if (gameState == GameState.PreExitMessage) {
      this.drawCenteredDancingMessage(gameTime, 'They went back to the ground.', null, Colors.white)
    } else if (gameState == GameState.Intro1) {
      this.drawCenteredDancingMessage(gameTime, 'They came from the ground.', null, Colors.white)
    } else if (gameState == GameState.Intro2) {
      this.drawCenteredDancingMessage(gameTime, 'They brought a bouncy ball -', null, Colors.white)
    } else if (gameState == GameState.Intro3) {
      this.drawCenteredDancingMessage(gameTime, '- and they bounced it around.', null, Colors.white)
    } else if (gameState == GameState.AutoPaused) {
      this.drawCenteredDancingMessage(gameTime, 'Please reconnect your controller.', null, Colors.white)
    } else if (gameState == GameState.PreExitCredits) {
      this.drawCenteredDancingMessage(gameTime, 'Every day is an adventure', 'tcftg.com', Colors.white)
    }
  }
  private drawFlowers(
    gameConfig: GameConfig,
    leftTreeTopWidth: number,
    leftTreeTopHeight: number,
    rightTreeTopWidth: number,
    rightTreeTopHeight: number,
  ) {
    this.spriteBatch.drawTextureCentered(
      this.getTexture('leftFlower'),
      gameConfig.leftWall.center,
      {w: gameConfig.leftWall.width, h: gameConfig.leftWall.height},
      0,
      1,
    )

    this.spriteBatch.drawTextureCentered(
      this.getTexture('leftFlowerTop'),
      {x: gameConfig.leftWall.center.x + gameConfig.leftWall.width / 3, y: gameConfig.leftWall.center.y + gameConfig.leftWall.height / 2},
      {w: leftTreeTopWidth, h: leftTreeTopHeight},
      0,
      1,
    )

    this.spriteBatch.drawTextureCentered(
      this.getTexture('rightFlower'),
      gameConfig.rightWall.center,
      {w: gameConfig.rightWall.width, h: gameConfig.rightWall.height},
      0,
      1,
    )

    this.spriteBatch.drawTextureCentered(
      this.getTexture('rightFlowerTop'),
      {
        x: gameConfig.rightWall.center.x - gameConfig.rightWall.width / 3,
        y: gameConfig.rightWall.center.y + gameConfig.rightWall.height / 2,
      },
      {w: rightTreeTopWidth, h: rightTreeTopHeight},
      0,
      1,
    )
  }

  private drawBall(ball: Ball, i: number) {
    if (ball.isAlive) {
      if (i % 2 == 0)
        this.spriteBatch.drawTextureCentered(
          this.getTexture('ball1'),
          ball.physics.center,
          {w: ball.physics.diameter, h: ball.physics.diameter},
          ball.physics.orientation,
          1,
        )
      else
        this.spriteBatch.drawTextureCentered(
          this.getTexture('ball2'),
          ball.physics.center,
          {w: ball.physics.diameter, h: ball.physics.diameter},
          ball.physics.orientation,
          1,
        )

      this.spriteBatch.drawTextureCentered(
        this.getTexture('ballShadow'),
        ball.physics.center,
        {w: ball.physics.diameter, h: ball.physics.diameter},
        0,
        1,
      )
    }
  }

  private drawGamepadConnections(gameConfig: GameConfig, gameState: GameState, gCS: GamepadConnectSummary) {
    const ignore = [GameState.Action, GameState.PreAction, GameState.PointForPlayer0, GameState.PointForPlayer1]
    if (ignore.includes(gameState)) {
      return
    }
    // draw FPS in bottom rigth corner
    const view = this.canvasManager.viewableRegion
    //const tlC = this.canvasManager.topLeftCorner()
    //const bRC = this.canvasManager.bottomRightCorner()
    const onePixel = this.canvasManager.onePixel
    const height = 100
    const width = 100
    const kbLeftOpacity = gCS.left ? 0.1 : 1
    const gpLeftOpacity = gCS.left ? 1 : 0.1
    const kbRightOpacity = gCS.right ? 0.1 : 1
    const gpRightOpacity = gCS.right ? 1 : 0.1

    const kbLeftRect = {
      x1: view.x1 + 70 * onePixel,
      x2: view.x1 + 70 * onePixel + onePixel * width,
      y1: view.y1 + onePixel * height,
      y2: view.y1 + onePixel * height * 2,
    }
    const gpLeftRect = {
      x1: kbLeftRect.x2 + onePixel * 10,
      x2: kbLeftRect.x2 + onePixel * (10 + width),
      y1: view.y1 + onePixel * height,
      y2: view.y1 + onePixel * height * 2,
    }
    this.spriteBatch.drawTextureInRect(this.getTexture('keyboard'), kbLeftRect, kbLeftOpacity)
    this.spriteBatch.drawTextureInRect(this.getTexture('gamepad'), gpLeftRect, gpLeftOpacity)

    // now player 2
    const kbRightRect = {
      x1: view.x2 - onePixel * width * 3.8 + onePixel * width,
      x2: view.x2 - onePixel * width * 3.8 + onePixel * width * 2,
      y1: view.y1 + onePixel * height,
      y2: view.y1 + onePixel * height * 2,
    }
    const gpRightRect = {
      x1: kbRightRect.x2 + onePixel * 10,
      x2: kbRightRect.x2 + onePixel * (10 + width),
      y1: view.y1 + onePixel * height,
      y2: view.y1 + onePixel * height * 2,
    }
    this.spriteBatch.drawTextureInRect(this.getTexture('keyboard'), kbRightRect, kbRightOpacity)
    this.spriteBatch.drawTextureInRect(this.getTexture('gamepad'), gpRightRect, gpRightOpacity)

    //console.log(kbLeftRect)
  }

  private drawDebugView(gameConfig: GameConfig, futurePrediction: FuturePrediction[], currentFps: number) {
    // draw FPS in bottom rigth corner
    const view = this.canvasManager.viewableRegion
    const onePixel = this.canvasManager.onePixel
    const height = onePixel * 36
    const xPos = view.x1 + height * 2
    const yPos = view.y1 + height * 2
    const color = new Color(0, 0, 0, 0.25)
    const font = this.font('regular')
    this.spriteBatch.drawStringUncentered(`${~~currentFps} fps`, font, height, {x: xPos, y: yPos}, color, 0)
    const suggAt = 90
    if (currentFps && currentFps < suggAt) {
      const opacity = 0.5 * (1 - currentFps / suggAt)
      this.spriteBatch.drawStringUncentered(
        `lmk if a smaller window improves smoothness/fps`,
        font,
        height * 0.75,
        {x: xPos, y: yPos - height * 1.1},
        new Color(0, 0, 0, opacity),
        0,
      )
    }
    currentFps

    if (this.inDebugView) {
      const alpha = (s: FutureState) => 1 - Math.sqrt(s.time / tweakables.predictionLookahead)
      for (let i = 0; i < gameConfig.balls.length; i++) {
        const prediction = futurePrediction[i]
        for (const state of prediction.ballStates ?? []) {
          this.spriteBatch.drawTextureCentered(this.getTexture('predictionDot'), state.pos, {w: 0.01, h: 0.01}, 0, alpha(state))
        }

        for (const s of [PlayerSide.Left, PlayerSide.Right]) {
          const entrance = prediction.ballEnteringJumpRange(s)
          if (entrance?.isKnown)
            this.spriteBatch.drawTextureCentered(
              this.getTexture('kapowScore'),
              entrance.pos,
              {w: gameConfig.balls[i].physics.diameter, h: gameConfig.balls[i].physics.diameter},
              0,
              alpha(entrance),
            )
        }
        const groundHit = prediction.ballHittingGround
        if (groundHit?.isKnown)
          this.spriteBatch.drawTextureCentered(
            this.getTexture('kapowScore'),
            prediction.ballHittingGround.pos,
            {w: gameConfig.balls[i].physics.diameter, h: gameConfig.balls[i].physics.diameter},
            0,
            alpha(groundHit),
          )
      }
    }
  }

  public drawMenuBanner(bannerTexture: Texture2D, gameTime: GameTime, center: Vector2) {
    const seconds = gameTime.totalGameTime.totalSeconds
    const beat = 2.0 * Math.PI * seconds * (tweakables.menu.bpm / 60) // 87bmp

    const destination = center
    const sizeMultiplier = 0.05 + Math.sin(beat / 2) / 40 + Math.sin(beat / 8) / 40
    const scale: Vector2 = {x: sizeMultiplier, y: sizeMultiplier}

    const rect: Rectangle = {
      x1: destination.x,
      y1: destination.y,
      x2: destination.x + scale.x,
      y2: destination.y + scale.y,
    }

    this.spriteBatch.drawTextureInRect(bannerTexture, rect, 1)
  }

  private drawScores(p0Score: number, p1Score: number, gameTime: GameTime) {
    const seconds = gameTime.totalGameTime.totalSeconds
    const rotMax = 0.02
    const rotation = rotMax + 2 * rotMax * Math.sin(gameTime.totalGameTime.totalSeconds)
    const scaleMax = 0.1
    const beat = 2.0 * Math.PI * seconds * (tweakables.menu.bpm / 60) // 87bmp
    const extraScale = 1 - scaleMax * Math.sin(beat / 4) - scaleMax * Math.sin(beat / 8)

    const view = this.canvasManager.viewableRegion
    const scoreCardHeight = ((view.y2 - view.y1) / 10) * extraScale
    const y = (9 * view.y2 + view.y1) / 10 // most of the way towards tL.y
    const x1 = (9 * view.x1 + view.x2) / 10 // most of the way to the left side
    const x2 = (9 * view.x2 + view.x1) / 10 //  most of the way to the right side

    const box1Center: Vector2 = {x: x1, y}
    const box2Center: Vector2 = {x: x2, y}

    const text1 = `${p0Score}`

    const p0h = this.p0ScoreCard.sizeMultiplier * scoreCardHeight
    this.spriteBatch.drawTextureCentered(this.getTexture('scoreCard'), box1Center, {w: p0h, h: p0h}, rotation, 1)
    const font = this.font('extraBold')
    this.spriteBatch.drawStringCentered(text1, font, p0h * 0.9 * this.p0ScoreCard.sizeMultiplier, box1Center, Colors.black, rotation)

    const text2 = `${p1Score}`

    const p1h = this.p1ScoreCard.sizeMultiplier * scoreCardHeight
    this.spriteBatch.drawTextureCentered(this.getTexture('scoreCard'), box2Center, {w: p1h, h: p1h}, rotation, 1)
    this.spriteBatch.drawStringCentered(text2, font, p1h * 0.9 * this.p1ScoreCard.sizeMultiplier, box2Center, Colors.black, rotation)
  }

  public adjustZoomLevel(maxBallHeight: number, dt: number) {
    this.canvasManager.adjustZoomLevel(maxBallHeight, dt)
  }
}

export {Display, TextureName}
