import constants from './constants'
import {Vector2} from './types'
import {vec} from './utils'

class CanvasManager {
  private parentEl: HTMLElement
  private canvas!: HTMLCanvasElement
  private _ctx!: CanvasRenderingContext2D

  // TODO move to tweakables
  private minZoomLevel = 0.45
  private maxZoomLevel = 0.8
  private zoomSpringConstant = 1
  private startZoomScale = this.maxZoomLevel // higher number = can see more
  private center: Vector2

  public _zoomScale: number

  constructor(parentEl: HTMLElement) {
    this.center = {x: 0.5, y: 0.3}
    this._zoomScale = this.startZoomScale
    this.parentEl = parentEl
  }
  public initialDraw() {
    this.generateCanvas()
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
  }

  public pixelToCanvasPos(p: Vector2): Vector2 {
    // TODO perf: can avoid recalculating this inverse
    return vec.transform(p, this.ctx.getTransform().inverse())
  }
  public canvasToPixelPos(p: Vector2): Vector2 {
    return vec.transform(p, this.ctx.getTransform())
  }
  public pixelWidth(pixels: number): number {
    // TODO perf: can avoid recalculating this
    return pixels * (this.pixelToCanvasPos({x: 1, y: 1}).x - this.pixelToCanvasPos({x: 0, y: 0}).x)
  }
  public onePixel(): number {
    return this.pixelWidth(1)
  }
  /**
   * returns the top left corner in game coordinates
   */
  public topLeftCorner(): Vector2 {
    return this.pixelToCanvasPos({x: 0, y: 0})
  }
  /**
   * returns the bottom right corner in game coordinates
   */
  public bottomRightCorner(): Vector2 {
    return this.pixelToCanvasPos({x: this.width, y: this.height})
  }
  public adjustZoomLevel(maxBallHeight: number, dt: number) {
    let idealZoomLevel = 1.05 * maxBallHeight
    if (idealZoomLevel > this.maxZoomLevel) idealZoomLevel = this.maxZoomLevel
    else if (idealZoomLevel < this.minZoomLevel) idealZoomLevel = this.minZoomLevel
    this._zoomScale += (idealZoomLevel - this.zoomScale) * dt * this.zoomSpringConstant
    this.recalcCtxTransform()
  }
}
export {CanvasManager}
