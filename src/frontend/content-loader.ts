import {SoundEffect} from './sound-effect'
import {ContentLoadMonitor, ContentLoadStats, Texture2D} from './types'
import {timeout} from './utils'

class ContentLoader {
  private audioContext = new AudioContext()
  private loadStats: ContentLoadStats = {total: 0, done: 0}
  private loadMonitor: ContentLoadMonitor
  constructor(loadMonitor: ContentLoadMonitor) {
    this.loadMonitor = loadMonitor
  }
  public get isLoaded() {
    return this.loadStats.total === this.loadStats.done
  }
  public async loadFont(familyName: string, url: string, weight: number) {
    this.loadStats.total++
    const ffd = {weight: `${weight}`}
    const ff = new FontFace(`${familyName}`, `url(${url})`, ffd)
    document.fonts.add(ff)
    await ff.load()
    this.loadStats.done++
    return ff
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
    //await timeout(Math.random() * 5000)
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

export {ContentLoader}
