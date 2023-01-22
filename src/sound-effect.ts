import {timeout} from './utils'

interface SoundEffectInstance {
  effect: SoundEffect
  source: AudioBufferSourceNode
  gainNode: GainNode
  stop: () => void
  fadeOut: (seconds: number) => void
}

class SoundEffect {
  private audioBuffer: AudioBuffer
  private audioContext: AudioContext
  private playingSources: AudioBufferSourceNode[]
  constructor(audioBuffer: AudioBuffer, audioContext: AudioContext) {
    this.audioBuffer = audioBuffer
    this.audioContext = audioContext
    this.playingSources = []
  }
  public get isPlaying(): boolean {
    return this.playingSources.length > 0
  }
  public play(volume: number, pitch: number, pan: number, loop: boolean): SoundEffectInstance {
    const source = this.audioContext.createBufferSource()
    const currTime = this.audioContext.currentTime
    source.buffer = this.audioBuffer
    // connect buffer -> gain node -> panner node -> pitch node -> destination
    const gainNode = this.audioContext.createGain()
    const pannerNode = this.audioContext.createStereoPanner()
    if (volume < 0 || volume > 1) throw new Error(`bad volume ${volume}`)
    if (pan < -1 || pan > 1) throw new Error(`bad pan ${pan}`)
    gainNode.gain.linearRampToValueAtTime(volume, currTime)
    pannerNode.pan.setValueAtTime(pan, 0)
    // connections
    source.connect(gainNode)
    gainNode.connect(pannerNode)
    pannerNode.connect(this.audioContext.destination)
    source.loop = loop
    this.playingSources.push(source)
    source.start(0, 0)
    source.onended = (_ev) => {
      this.playingSources.splice(this.playingSources.indexOf(source), 1)
    }
    return {
      source: source,
      stop: () => this.stopSource(source),
      gainNode: gainNode,
      effect: this,
      fadeOut: (seconds: number) => this.fadeOutSource(seconds, gainNode, source),
    }
  }
  public stopIfPlaying() {
    for (const s of this.playingSources) {
      s.stop()
    }
    this.playingSources = []
  }
  private async fadeOutSource(seconds: number, gainNode: GainNode, source: AudioBufferSourceNode) {
    const currTime = this.audioContext.currentTime
    gainNode.gain.linearRampToValueAtTime(0, currTime + seconds)
    await timeout(seconds)
    source.stop()
  }
  private stopSource(source: AudioBufferSourceNode) {
    source.stop()
    this.playingSources = this.playingSources.filter((s) => s !== source)
  }
}

export {SoundEffect, SoundEffectInstance}
