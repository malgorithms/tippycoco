import {SoundName, soundSources} from './content-load-list'
import {ContentLoader} from './content-loader'
import {SoundEffect} from './sound-effect'
import {PlayerSide} from './types'

class SoundManager {
  private content: ContentLoader
  private sounds = new Map<SoundName, SoundEffect>()

  public constructor(content: ContentLoader) {
    this.content = content
  }
  private async loadSound(path: string, name: SoundName) {
    const eff = await this.content.loadSoundEffect(path)
    this.sounds.set(name, eff)
  }
  public async loadContent(): Promise<void> {
    const promises: Promise<any>[] = []
    Object.entries(soundSources).forEach(([name, source]) => promises.push(this.loadSound(source, name as SoundName)))
    await Promise.all(promises)
  }
  private getSound(name: SoundName): SoundEffect {
    const effect = this.sounds.get(name)
    if (!effect) throw new Error(`no sound was loaded with name ${name}`)
    return effect
  }
  public play(name: SoundName, volume: number, pitch: number, pan: number, loop: boolean) {
    this.getSound(name).play(volume, pitch, pan, loop)
  }
  public playIfNotPlaying(name: SoundName, volume: number, pitch: number, pan: number, loop: boolean) {
    const instance = this.getSound(name).getInstanceIfPlaying()
    if (instance) {
      instance.volume = volume
      instance.pan = pan
      instance.pitch = pitch
    } else {
      this.play(name, volume, pitch, pan, loop)
    }
  }
  public stopIfPlaying(name: SoundName) {
    this.getSound(name).stopIfPlaying()
  }
  public playGrowthNoise(playerSide: PlayerSide, vel: number): void {
    const isLeft = playerSide === PlayerSide.Left
    if (vel < 0.0 && isLeft) this.playIfNotPlaying('p1Shrinkage', 0.5, -vel, 0.0, false)
    else if (vel > 0.0 && isLeft) this.playIfNotPlaying('p1Growth', 0.5, vel, 0.0, false)
    else if (vel < 0.0 && !isLeft) this.playIfNotPlaying('p2Shrinkage', 0.5, -vel, 0.0, false)
    else if (vel > 0.0 && !isLeft) this.playIfNotPlaying('p2Growth', 0.5, vel, 0.0, false)
  }
  public fadeGrowthNoise(playerSide: PlayerSide): void {
    if (playerSide === PlayerSide.Left) {
      this.getSound('p1Shrinkage').fadeOutIfPlaying(0.25)
      this.getSound('p1Growth').fadeOutIfPlaying(0.25)
    } else {
      this.getSound('p2Shrinkage').fadeOutIfPlaying(0.25)
      this.getSound('p2Growth').fadeOutIfPlaying(0.25)
    }
  }
}

export {SoundManager}
