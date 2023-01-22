import {SoundEffect} from './sound-effect'
import {ContentLoadMonitor, ContentLoadStats, Texture2D} from './types'
import {timeout} from './utils'

class ContentManager {
  private audioContext: AudioContext
  private loadStats: ContentLoadStats
  private loadMonitor: ContentLoadMonitor
  constructor(loadMonitor: ContentLoadMonitor) {
    this.loadStats = {total: 0, done: 0}
    this.audioContext = new AudioContext()
    this.loadMonitor = loadMonitor
  }
  private loadImage(url: string): Promise<HTMLImageElement> {
    this.loadStats.total++
    this.loadMonitor(this.getLoadStats())
    return new Promise((resolve, reject) => {
      this.loadStats.done++
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
      this.loadMonitor(this.getLoadStats())
    })
  }
  public async loadTexture2d(url: string): Promise<Texture2D> {
    this.loadStats.total++
    this.loadMonitor(this.getLoadStats())
    const img = await this.loadImage(url)
    this.loadStats.done++
    const res: Texture2D = {
      width: img.width,
      height: img.height,
      img: img,
    }
    if (isNaN(img.width) || img.width === 0) {
      throw new Error(`Could not load image asset ${url}`)
    }
    this.loadMonitor(this.getLoadStats())
    return res
  }
  public async loadSoundEffect(path: string): Promise<SoundEffect> {
    this.loadStats.total++
    this.loadMonitor(this.getLoadStats())
    const response = await window.fetch(path)
    const arrBuffer = await response.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrBuffer)
    this.loadStats.done++
    this.loadMonitor(this.getLoadStats())
    return new SoundEffect(audioBuffer, this.audioContext)
  }
  public getLoadStats(): ContentLoadStats {
    return {
      done: this.loadStats.done,
      total: this.loadStats.total,
    }
  }
}

export {ContentManager}
