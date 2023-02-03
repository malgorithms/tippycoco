import {aiToName} from './ai/ai'
import {CanvasManager} from './canvas-manager'
import {Cloud} from './cloud'
import {Display} from './display'
import {Player, PlayerSpecies} from './player'
import {SpriteBatch} from './sprite-batch'
import tweakables from './tweakables'
import {Texture2D} from './types'
import {vec} from './utils'

// the way we handle sky transitions is to have a collection of
// them (typically 1 when sky has settled) and there is a timer
// on each one saying how long it has been set. for any that isn't on top,
// it fades out and then disappears after a second or so.

interface ActiveSky {
  texture: Texture2D
  whenSpawned: number
  sunniness: 0 | 1
}
interface SkyAssignment {
  dark: Texture2D
  sunny: Texture2D
}

class Atmosphere {
  private numClouds = tweakables.cloud.num

  private display: Display
  private clouds = new Array<Cloud>()
  private activeSkies = new Array<ActiveSky>()
  private sunnyCloudTextures = new Array<Texture2D>() // has a 1-1 relationship with DarkCloudTextures list
  private darkCloudTextures = new Array<Texture2D>() // has a 1-1 relationship with SunnyCloudTextures list
  private canvasManager: CanvasManager

  public constructor(display: Display, canvasManager: CanvasManager) {
    this.display = display
    this.canvasManager = canvasManager
  }
  public get canvasWidth(): number {
    return this.canvasManager.width
  }
  public get canvasHeight(): number {
    return this.canvasManager.height
  }
  private getFractionTransitioned(i: number) {
    const now = Date.now()
    if (this.activeSkies.length <= 1) return 1
    const currSky = this.activeSkies[i]
    const elapsed = now - currSky.whenSpawned
    if (elapsed >= tweakables.atmosphere.skyTransitionMs) return 1
    return elapsed / tweakables.atmosphere.skyTransitionMs
  }
  public get sunniness(): number {
    if (this.activeSkies.length === 0) return 1
    if (this.activeSkies.length === 1) {
      return this.activeSkies[0].sunniness
    }
    const f = this.getFractionTransitioned(this.activeSkies.length - 1)
    const currSky = this.activeSkies[this.activeSkies.length - 1]
    const prevSky = this.activeSkies[this.activeSkies.length - 2]
    return currSky.sunniness * f + prevSky.sunniness * (1 - f)
  }

  private skyForOpponent(opp: Player): SkyAssignment {
    const ai = opp.ai
    if (opp.species === PlayerSpecies.Human || !ai) {
      return {
        sunny: this.display.getTexture('sunnyBackgroundBlue'),
        dark: this.display.getTexture('darkBackground'),
      }
    }

    const sunnyAiTextures = {
      Green: 'sunnyBackgroundGreen',
      Black: 'sunnyBackgroundBlack',
      White: 'sunnyBackgroundFire',
      Purple: 'sunnyBackgroundPurplish',
      Orange: 'sunnyBackgroundGreen',
      Yellow: 'sunnyBackgroundBlue',
    } as const
    const darkAiTextures = {
      Green: 'darkBackground',
      Black: 'darkBackground',
      White: 'darkBackground',
      Purple: 'darkBackground',
      Orange: 'darkBackground',
      Yellow: 'darkBackground',
    } as const

    const aiName = aiToName(ai)
    return {
      sunny: this.display.getTexture(sunnyAiTextures[aiName]),
      dark: this.display.getTexture(darkAiTextures[aiName]),
    }
  }

  public changeSkyForOpponent(opp: Player, sunniness: 0 | 1) {
    const textures = this.skyForOpponent(opp)
    if (sunniness === 1) this.changeSky(textures.sunny, 1)
    else this.changeSky(textures.dark, 0)
  }

  private changeSky(texture: Texture2D, sunniess: 0 | 1) {
    this.activeSkies.push({
      texture,
      whenSpawned: Date.now(),
      sunniness: sunniess,
    })
    if (this.activeSkies.length > tweakables.atmosphere.maxSkies) {
      throw new Error('too many skies!')
    }
  }
  private pruneAncientSkies() {
    const freshest = this.activeSkies[this.activeSkies.length - 1]
    const deleteOldAfter = freshest.whenSpawned + tweakables.atmosphere.skyTransitionMs
    if (Date.now() > deleteOldAfter) {
      this.activeSkies = [freshest]
    }
  }
  public addCloudTextures(sunnyTexture: Texture2D, darkTexture: Texture2D) {
    this.sunnyCloudTextures.push(sunnyTexture)
    this.darkCloudTextures.push(darkTexture)
  }
  public draw(sb: SpriteBatch) {
    this.pruneAncientSkies()
    const view = this.canvasManager.viewableRegion
    const bottomOfSkyRight = {x: view.x2, y: tweakables.net.center.y - tweakables.net.height / 2}
    const ctr = vec.avg({x: view.x1, y: view.y2}, bottomOfSkyRight)
    const dims = {
      w: bottomOfSkyRight.x - view.x1 + 0.1,
      h: view.y2 - bottomOfSkyRight.y + 0.1,
    }
    const numSkies = this.activeSkies.length
    for (let i = 0; i < numSkies; i++) {
      const frac = this.getFractionTransitioned(i)
      const sky = this.activeSkies[i]
      const alpha = frac
      sb.drawTextureCentered(sky.texture, ctr, dims, 0, alpha)
    }

    const nightMoonHeight = view.y2 * tweakables.moon.nightHeightFrac
    const dayMoonHeight = view.y1
    const moonHeight = nightMoonHeight - Math.sqrt(this.sunniness) * (nightMoonHeight - dayMoonHeight)
    const moonLoc = {
      x: ctr.x + (1 - this.sunniness) * (view.x2 - ctr.x) * tweakables.moon.widthFrac,
      y: moonHeight,
    }
    const moonTexture = this.display.getTexture('moon')
    const moonDims = sb.autoDim(0.1, moonTexture)
    sb.drawTextureCentered(moonTexture, moonLoc, moonDims, 0, 1)
    for (const c of this.clouds) {
      sb.drawTextureCentered(c.sunnyTexture, c.pos, sb.autoDim(c.width, c.sunnyTexture), 0, this.sunniness)
      sb.drawTextureCentered(c.darkTexture, c.pos, sb.autoDim(c.width, c.darkTexture), 0, 1 - this.sunniness)
    }
  }
  public step(dt: number) {
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
