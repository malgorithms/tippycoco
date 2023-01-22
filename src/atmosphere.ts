import {CanvasManager} from './canvas-manager'
import {Cloud} from './cloud'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {Texture2D} from './types'
import {vec} from './utils'

class Atmosphere {
  private numClouds

  private minCloudSpeedX = 0.01
  private maxCloudSpeedX = 0.07
  private minCloudSpeedY = -0.01
  private maxCloudSpeedY = 0.01

  private clouds: Cloud[]
  private sunnyCloudTextures: Texture2D[] // has a 1-1 relationship with DarkCloudTextures list
  private darkCloudTextures: Texture2D[] // has a 1-1 relationship with SunnyCloudTextures list
  private sunnyBackgroundTexture!: Texture2D
  private darkBackgroundTexture!: Texture2D
  private moonTexture!: Texture2D

  private sunnyness: number // 1.0 = perfectly nice day; 0.0 = dark and gloomy
  private isSunny: boolean
  private timeToChange = 0.1 // seconds
  private canvasManager: CanvasManager
  public constructor(canvasManager: CanvasManager) {
    this.numClouds = 5
    this.sunnyness = 1
    this.isSunny = true
    this.clouds = []
    this.sunnyCloudTextures = []
    this.darkCloudTextures = []
    this.canvasManager = canvasManager
  }
  public get canvasWidth(): number {
    return this.canvasManager.width
  }
  public get canvasHeight(): number {
    return this.canvasManager.height
  }

  public makeItSunny(timeToChange: number) {
    this.isSunny = true
    this.timeToChange = timeToChange
  }
  public makeItDark(timeToChange: number) {
    this.isSunny = false
    this.timeToChange = timeToChange
  }
  public addMoonTexture(moonTexture: Texture2D) {
    this.moonTexture = moonTexture
  }
  public addCloudTextures(sunnyTexture: Texture2D, darkTexture: Texture2D) {
    this.sunnyCloudTextures.push(sunnyTexture)
    this.darkCloudTextures.push(darkTexture)
  }
  public addBackgroundTextures(sunnyTexture: Texture2D, darkTexture: Texture2D) {
    this.sunnyBackgroundTexture = sunnyTexture
    this.darkBackgroundTexture = darkTexture
  }
  public draw(sb: SpriteBatch) {
    const tLC = this.canvasManager.topLeftCorner()
    const brC = this.canvasManager.bottomRightCorner()
    const bottomOfSkyRight = {x: brC.x, y: tweakables.net.center.y - tweakables.net.height / 2}
    const ctr = vec.avg(tLC, bottomOfSkyRight)
    const dims = {
      w: bottomOfSkyRight.x - tLC.x,
      h: tLC.y - bottomOfSkyRight.y,
    }
    sb.drawTextureCentered(this.sunnyBackgroundTexture, ctr, dims, 0, this.sunnyness)
    sb.drawTextureCentered(this.darkBackgroundTexture, ctr, dims, 0, 1 - this.sunnyness)

    const nightMoonHeight = tLC.y * 0.75
    const dayMoonHeight = brC.y
    const moonHeight = nightMoonHeight - Math.sqrt(this.sunnyness) * (nightMoonHeight - dayMoonHeight)
    const moonLoc = {
      x: ctr.x + (1 - this.sunnyness) * (brC.x - ctr.x) * 0.3,
      y: moonHeight,
    }
    sb.drawTextureCentered(this.moonTexture, moonLoc, sb.autoDim(0.1, this.moonTexture), 0, 1)
    for (const c of this.clouds) {
      sb.drawTextureCentered(c.sunnyTexture, c.pos, sb.autoDim(c.width, c.sunnyTexture), 0, this.sunnyness)
      sb.drawTextureCentered(c.darkTexture, c.pos, sb.autoDim(c.width, c.darkTexture), 0, 1 - this.sunnyness)
    }
  }
  public step(dt: number) {
    if (this.isSunny && this.sunnyness < 1.0) {
      this.sunnyness += dt / this.timeToChange
      this.sunnyness = Math.min(1, this.sunnyness)
    } else if (!this.isSunny && this.sunnyness > 0.0) {
      this.sunnyness -= dt / this.timeToChange
      this.sunnyness = Math.max(0, this.sunnyness)
    }
    for (const c of this.clouds) {
      c.step(dt)
    }
  }
  public fillClouds() {
    const t = tweakables
    for (let i = 0; i < this.numClouds; i++) {
      const sunny = this.sunnyCloudTextures[i % this.sunnyCloudTextures.length]
      const dark = this.darkCloudTextures[i % this.darkCloudTextures.length]
      const vx = this.minCloudSpeedX + Math.random() * (this.maxCloudSpeedX - this.minCloudSpeedX)
      const vy = this.minCloudSpeedY + Math.random() * (this.maxCloudSpeedY - this.minCloudSpeedY)
      const vel = {x: vx, y: vy}
      const width = sunny.width / 1000
      const rect = {
        x1: t.leftWall.center.x - 1.5,
        x2: t.rightWall.center.x + 1.5,
        y1: t.leftWall.center.y - t.leftWall.height / 2,
        y2: t.rightWall.center.y + t.rightWall.height / 2,
      }
      this.clouds.push(new Cloud(rect, sunny, dark, vel, {x: 0, y: 0}, width))
    }
  }
}

export {Atmosphere}
