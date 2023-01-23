import {CanvasManager} from './canvas-manager'
import {Cloud} from './cloud'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {Texture2D} from './types'
import {vec} from './utils'

class Atmosphere {
  private numClouds = tweakables.cloud.num

  private clouds: Cloud[]
  private sunnyCloudTextures: Texture2D[] // has a 1-1 relationship with DarkCloudTextures list
  private darkCloudTextures: Texture2D[] // has a 1-1 relationship with SunnyCloudTextures list
  private sunnyBackgroundTexture!: Texture2D
  private darkBackgroundTexture!: Texture2D
  private moonTexture!: Texture2D

  private sunnyness = 1 // 1.0 = perfectly nice day; 0.0 = dark and gloomy
  private isSunny = true
  private timeToChange: number // seconds
  private canvasManager: CanvasManager
  public constructor(canvasManager: CanvasManager) {
    this.timeToChange = tweakables.atmosphere.timeToTurnSunny
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

  public makeItSunny() {
    this.isSunny = true
    this.timeToChange = tweakables.atmosphere.timeToTurnSunny
  }
  public makeItDark() {
    this.isSunny = false
    this.timeToChange = tweakables.atmosphere.timeToTurnDark
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
    const view = this.canvasManager.viewableRegion
    const bottomOfSkyRight = {x: view.x2, y: tweakables.net.center.y - tweakables.net.height / 2}
    const ctr = vec.avg({x: view.x1, y: view.y2}, bottomOfSkyRight)
    const dims = {
      w: bottomOfSkyRight.x - view.x1,
      h: view.y2 - bottomOfSkyRight.y,
    }
    sb.drawTextureCentered(this.sunnyBackgroundTexture, ctr, dims, 0, this.sunnyness)
    sb.drawTextureCentered(this.darkBackgroundTexture, ctr, dims, 0, 1 - this.sunnyness)

    const nightMoonHeight = view.y2 * tweakables.moon.nightHeightFrac
    const dayMoonHeight = view.y1
    const moonHeight = nightMoonHeight - Math.sqrt(this.sunnyness) * (nightMoonHeight - dayMoonHeight)
    const moonLoc = {
      x: ctr.x + (1 - this.sunnyness) * (view.x2 - ctr.x) * tweakables.moon.widthFrac,
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
    const vMin = t.cloud.minVel
    const vMax = t.cloud.maxVel
    for (let i = 0; i < this.numClouds; i++) {
      const sunny = this.sunnyCloudTextures[i % this.sunnyCloudTextures.length]
      const dark = this.darkCloudTextures[i % this.darkCloudTextures.length]
      const vx = vMax.x + Math.random() * (vMax.x - vMin.x)
      const vy = vMin.y + Math.random() * (vMax.y - vMin.y)
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
