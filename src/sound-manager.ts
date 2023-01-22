import {ContentManager} from './content-manager'
import {SoundEffect, SoundEffectInstance} from './sound-effect'
import {PlayerSide} from './types'

const soundSources = {
  themeSong: 'sounds/ThemeSong.mp3',
  beep: 'sounds/Beep1.mp3',
  slam: 'sounds/Slam01.mp3',
  rejected: 'sounds/Rejected.mp3',
  pointScored: 'sounds/PointScored.mp3',
  gamePlayMusic: 'sounds/GamePlay02.mp3',
  p1Growth: 'sounds/SizeChange2.mp3',
  p2Growth: 'sounds/SizeChange1.mp3',
  p1Shrinkage: 'sounds/SizeChange2.mp3',
  p2Shrinkage: 'sounds/SizeChange1.mp3',
  thud: 'sounds/Hit1.mp3',
  ding: 'sounds/Hit1.mp3',
  gamePoint: 'sounds/GamePoint.mp3',
} as const

type SoundName = keyof typeof soundSources

class SoundManager {
  private content: ContentManager
  public instances: Map<SoundEffect, SoundEffectInstance>
  private sounds: Map<SoundName, SoundEffect>

  public constructor(content: ContentManager) {
    this.content = content
    this.sounds = new Map()
    this.instances = new Map()
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
  public play(name: SoundName, volume: number, pitch: number, pan: number, loop?: boolean) {
    const soundEffect = this.getSound(name)
    loop ??= false
    const inst = soundEffect.play(volume, pitch, pan, loop)
    this.instances.set(soundEffect, inst)
  }

  public playIfNotPlaying(name: SoundName, volume: number, pitch: number, pan: number, loop: boolean) {
    const soundEffect = this.getSound(name)
    loop ??= false
    if (soundEffect.isPlaying) {
      // Nope
    } else {
      this.play(name, volume, pitch, pan, loop)
    }
  }
  public stopIfPlaying(name: SoundName) {
    const soundEffect = this.getSound(name)
    soundEffect.stopIfPlaying()
    if (this.instances.has(soundEffect)) this.instances.delete(soundEffect)
  }

  public stopThemeMusic(): void {
    this.stopIfPlaying('themeSong')
  }

  public stopPlayMusic(): void {
    this.stopIfPlaying('gamePlayMusic')
  }

  public playGrowthNoise(playerSide: PlayerSide, vel: number): void {
    const isLeft = playerSide === PlayerSide.Left
    if (vel < 0.0 && isLeft) this.playIfNotPlaying('p1Shrinkage', 0.2, -vel, 0.0, true)
    else if (vel > 0.0 && isLeft) this.playIfNotPlaying('p1Growth', 0.2, -vel, 0.0, true)
    else if (vel < 0.0 && !isLeft) this.playIfNotPlaying('p2Shrinkage', 0.2, -vel, 0.0, true)
    else if (vel > 0.0 && !isLeft) this.playIfNotPlaying('p2Growth', 0.2, -vel, 0.0, true)
  }
  public fadeOutSound(instance: SoundEffectInstance, dt: number, fadeOutSeconds: number): void {
    instance.fadeOut(fadeOutSeconds)
  }
  public fadeGrowthNoise(playerSide: PlayerSide, dt: number): void {
    if (playerSide === PlayerSide.Left) {
      const sInstance = this.instances.get(this.getSound('p1Shrinkage'))
      const gInstance = this.instances.get(this.getSound('p1Growth'))
      if (sInstance?.effect.isPlaying) this.fadeOutSound(sInstance, dt, 1.0)
      if (gInstance?.effect.isPlaying) this.fadeOutSound(gInstance, dt, 1.0)
    } else {
      const sInstance = this.instances.get(this.getSound('p2Shrinkage'))
      const gInstance = this.instances.get(this.getSound('p2Growth'))
      if (sInstance?.effect.isPlaying) this.fadeOutSound(sInstance, dt, 1.0)
      if (gInstance?.effect.isPlaying) this.fadeOutSound(gInstance, dt, 1.0)
    }
  }
}

export {SoundManager}
