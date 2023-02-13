import {timeout} from './utils'

class SoundEffectInstance {
  private defaultPlaybackRate: number
  private effect: SoundEffect
  private source: AudioBufferSourceNode
  private gainNode: GainNode
  private pannerNode: StereoPannerNode
  private _isFading: boolean
  constructor(effect: SoundEffect, volume: number, pitch: number, pan: number, loop: boolean) {
    this.effect = effect
    this._isFading = false
    this.source = this.audioContext.createBufferSource()
    this.defaultPlaybackRate = this.source.playbackRate.value
    this.source.buffer = this.audioBuffer
    this.gainNode = this.audioContext.createGain()
    this.pannerNode = this.audioContext.createStereoPanner()
    this.connectNodes()

    // These are changed via setters that use the nodes.
    // They can also be called after the fact, once the sound
    // is playing.
    this.pan = pan
    this.pitch = pitch
    this.volume = volume

    // start playing
    this.source.loop = loop
    this.source.start(0, 0)
    this.source.onended = () => this.effect._notifyOfInstanceDone(this)
  }
  private connectNodes() {
    this.source.connect(this.gainNode)
    this.gainNode.connect(this.pannerNode)
    this.pannerNode.connect(this.audioContext.destination)
  }
  public stop() {
    this.source.stop()
    this.effect._notifyOfInstanceDone(this)
  }
  public get audioContext() {
    return this.effect.audioContext
  }
  public get audioBuffer() {
    return this.effect.audioBuffer
  }
  public get currTime() {
    return this.audioContext.currentTime
  }
  public set pan(pan: number) {
    if (pan < -1 || pan > 1) throw new Error(`bad pan ${pan}`)
    this.pannerNode.pan.setValueAtTime(pan, this.currTime)
  }
  public set volume(volume: number) {
    if (volume < 0 || volume > 1) throw new Error(`bad volume ${volume}`)
    this.gainNode.gain.linearRampToValueAtTime(volume, this.currTime)
  }
  public set pitch(pitch: number) {
    pitch = Math.max(-0.99, pitch)
    const rate = this.defaultPlaybackRate * (1 + pitch)
    this.source.playbackRate.setValueAtTime(rate, this.currTime)
  }
  public async fadeOut(seconds: number) {
    if (!this._isFading) {
      this._isFading = true
      this.gainNode.gain.linearRampToValueAtTime(0, this.currTime + seconds)
      await timeout(seconds * 1000)
      this.stop()
    }
  }
}

class SoundEffect {
  private _audioBuffer: AudioBuffer
  private _audioContext: AudioContext
  private playingInstances = new Array<SoundEffectInstance>()
  constructor(audioBuffer: AudioBuffer, audioContext: AudioContext) {
    this._audioBuffer = audioBuffer
    this._audioContext = audioContext
  }
  public get numPlaying() {
    return this.playingInstances.length
  }
  public get audioContext() {
    return this._audioContext
  }
  public get audioBuffer() {
    return this._audioBuffer
  }
  public get isPlaying(): boolean {
    return this.playingInstances.length > 0
  }
  public getInstanceIfPlaying(): SoundEffectInstance | null {
    return this.playingInstances[0] || null
  }
  public play(volume: number, pitch: number, pan: number, loop: boolean): SoundEffectInstance {
    const instance = new SoundEffectInstance(this, volume, pitch, pan, loop)
    this.playingInstances.push(instance)
    return instance
  }
  public stopIfPlaying() {
    this.playingInstances.forEach((s) => s.stop())
  }
  public _notifyOfInstanceDone(instance: SoundEffectInstance) {
    this.playingInstances.splice(this.playingInstances.indexOf(instance), 1)
  }
  public async fadeOutIfPlaying(seconds: number) {
    this.getInstanceIfPlaying()?.fadeOut(seconds)
  }
}

export {SoundEffect, SoundEffectInstance}
