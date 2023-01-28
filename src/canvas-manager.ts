import constants from './constants'
import tweakables from './tweakables'
import {Rectangle, Vector2} from './types'
import {vec} from './utils'

class CanvasManager {
  private parentEl: HTMLElement
  private canvas!: HTMLCanvasElement
  private _ctx!: CanvasRenderingContext2D

  private readonly center: Vector2

  private _currViewRegion: Rectangle
  private _currOnePixel: number
  private _currInverseTransform: DOMMatrix
  public _zoomScale: number

  constructor(parentEl: HTMLElement) {
    this.center = tweakables.display.zoomCenter
    this._zoomScale = tweakables.display.zoomScale.start
    this.parentEl = parentEl
    this._currViewRegion = {x1: -Infinity, x2: Infinity, y1: -Infinity, y2: Infinity}
    this._currOnePixel = 1
    this._currInverseTransform = new DOMMatrix()
  }
  public initialDraw() {
    this.generateCanvas()
    this.recalcCtxTransform()
  }
  private recalcCtxTransform() {
    const cw = this.canvas.width
    const ch = this.canvas.height
    const unitScale = Math.min(ch / 2, cw / 2)
    this.ctx.resetTransform()
    this.ctx.transform(1, 0, 0, -1, 0, ch) // flip y-axis
    this.ctx.translate(cw / 2, ch / 2) // re-center to middle
    this.ctx.scale(unitScale, unitScale) // scale to unit
    this.ctx.translate(-this.center.x / this.zoomScale, -this.center.y / this.zoomScale) // now shift to desired center
    this.ctx.scale(1 / this.zoomScale, 1 / this.zoomScale) // scale from there
    const topLeft = this.pixelToCanvasPos({x: 0, y: 0})
    const bottomRight = this.pixelToCanvasPos({x: this.width, y: this.height})
    this._currViewRegion = {x1: topLeft.x, x2: bottomRight.x, y1: bottomRight.y, y2: topLeft.y}
    this._currOnePixel = this.pixelToCanvasPos({x: 1, y: 1}).x - this.pixelToCanvasPos({x: 0, y: 0}).x
    this._currInverseTransform = this.ctx.getTransform().inverse()
  }
  public get viewableRegion(): Rectangle {
    return this._currViewRegion
  }
  public get onePixel(): number {
    return this._currOnePixel
  }
  public get zoomScale(): number {
    return this._zoomScale
  }
  public get ctx(): CanvasRenderingContext2D {
    return this._ctx
  }
  public get width(): number {
    return this.canvas.width
  }
  public get height(): number {
    return this.canvas.height
  }
  public clearCanvas(): void {
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.restore()
  }
  private generateCanvas() {
    this.parentEl.innerHTML = ''
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'game-canvas'
    this.parentEl.append(this.canvas)
    this._ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    this.canvas.style.opacity = '1.0'
    this.setCanvasDims()
    window.addEventListener('resize', (): void => this.onWindowResize())
  }
  private setCanvasDims() {
    const c = this.canvas
    const w = this.parentEl.offsetWidth
    const h = this.parentEl.offsetHeight
    c.width = w * constants.dpr
    c.height = h * constants.dpr
    c.style.width = `${w}px`
    c.style.height = `${h}px`
    this.recalcCtxTransform()
  }
  private onWindowResize(): void {
    this.setCanvasDims()
    this.recalcCtxTransform()
  }
  public pixelToCanvasPos(p: Vector2): Vector2 {
    return vec.transform(p, this._currInverseTransform)
  }
  public canvasToPixelPos(p: Vector2): Vector2 {
    return vec.transform(p, this.ctx.getTransform())
  }
  public pixelWidth(pixels: number): number {
    return this._currOnePixel * pixels
  }
  public adjustZoomLevel(maxBallHeight: number, dt: number) {
    const cfg = tweakables.display.zoomScale
    let idealZoomLevel = cfg.ballHeightMult * maxBallHeight
    if (idealZoomLevel > cfg.max) idealZoomLevel = cfg.max
    else if (idealZoomLevel < cfg.min) idealZoomLevel = cfg.min
    this._zoomScale += (idealZoomLevel - this.zoomScale) * dt * cfg.springConstant
    this.recalcCtxTransform()
  }
}
export {CanvasManager}
