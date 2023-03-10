import {CanvasManager} from './canvas-manager'
import {Color} from './color'
import tweakables from './tweakables'
import {Dims, FontDef, Rectangle, TextDrawOptions, Texture2D, Vector2} from './types'

class SpriteBatch {
  private canvasManager: CanvasManager
  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager
  }
  private get ctx() {
    return this.canvasManager.ctx
  }
  public transformCtxForCenteredObject(center: Vector2, dims: Dims, rot: number, scale: number, flipY: boolean) {
    const w = dims.w
    const h = dims.h
    const rotCenterX = w / 2
    const rotCenterY = h / 2
    this.ctx.translate(center.x, center.y)
    if (flipY) this.ctx.transform(1, 0, 0, -1, 0, 0) // flip y-axis
    this.ctx.scale(scale, scale)
    if (rot) this.ctx.rotate(-rot)
    this.ctx.translate(-rotCenterX, -rotCenterY)
  }
  /**
   * draws a texture on the canvasManager, scaled appropriately. So none of the params
   * here are dealing with pixels, but actual game units
   */
  public drawTextureCentered(t: Texture2D, center: Vector2, dims: Dims, rot: number, alpha: number) {
    if (alpha <= 0) return
    this.ctx.save()
    this.transformCtxForCenteredObject(center, dims, rot, 1, true)
    this.ctx.globalAlpha = alpha
    this.ctx.drawImage(t.img, 0, 0, dims.w, dims.h)
    this.ctx.restore()
  }
  private drawStringCenteredExactly(s: string, font: FontDef, size: number, center: Vector2, color: Color, rot: number) {
    if (color.a === 0) return
    this.ctx.save()
    const pxCenter = this.canvasManager.canvasToPixelPos(center)
    this.ctx.font = this.fontDescriptor(font, size)
    const boxTm = this.ctx.measureText(s)
    const boxWidth = boxTm.width
    const boxHeight = boxTm.actualBoundingBoxAscent + boxTm.actualBoundingBoxDescent
    this.ctx.resetTransform()
    const rotCenterX2 = boxWidth / 2
    const rotCenterY2 = -boxHeight / 2
    this.ctx.translate(pxCenter.x, pxCenter.y)
    this.ctx.rotate(rot ?? 0)
    this.ctx.translate(-rotCenterX2, -rotCenterY2)
    this.ctx.fillStyle = color.toHtmlRgb()
    this.ctx.fillText(s, 0, 0)
    this.ctx.restore()
  }

  public drawStringCentered(s: string, font: FontDef, size: number, center: Vector2, color: Color, rot: number, exactMiddleVert: boolean) {
    if (exactMiddleVert) {
      this.drawStringCenteredExactly(s, font, size, center, color, rot)
    } else {
      this.drawString(s, font, size, center, color, rot, {textAlign: 'center', textBaseline: 'middle'})
    }
  }
  public drawString(s: string, font: FontDef, size: number, pos: Vector2, color: Color, rot: number, opts?: TextDrawOptions) {
    opts ??= {}
    if (color.a === 0) return
    this.ctx.save()
    const pxPos = this.canvasManager.canvasToPixelPos(pos)
    this.ctx.font = this.fontDescriptor(font, size)
    this.ctx.resetTransform()
    this.ctx.translate(pxPos.x, pxPos.y)
    if (rot) this.ctx.rotate(rot)
    if (opts.textBaseline) this.ctx.textBaseline = opts.textBaseline
    if (opts.textAlign) this.ctx.textAlign = opts.textAlign
    this.ctx.fillStyle = color.toHtmlRgb()
    this.ctx.fillText(s, 0, 0)
    this.ctx.restore()
  }

  public drawTextureInRect(t: Texture2D, rect: Rectangle, alpha: number) {
    const w = rect.x2 - rect.x1
    const h = rect.y2 - rect.y1
    const center = {x: (rect.x1 + rect.x2) / 2, y: (rect.y1 + rect.y2) / 2}
    this.drawTextureCentered(t, center, {w, h}, 0, alpha)
  }
  public drawScreenOverlay(color: Color) {
    this.ctx.save()
    this.ctx.resetTransform()
    this.ctx.fillStyle = color.toHtmlRgb()
    this.ctx.fillRect(0, 0, this.canvasManager.width, this.canvasManager.height)
    this.ctx.restore()
  }
  /**
   * returns width and height object for the given texture,
   * given a desired width passed in. basically just scales to aspectRatio.
   * @param width
   * @param texture2d
   * @returns
   */
  public autoDim(width: number, texture2d: Texture2D): Dims {
    return {
      w: width,
      h: (width * texture2d.height) / texture2d.width,
    }
  }
  /**
   * returns something like "bold 12px 'nunito sans', sans-serif"
   * @param font - font definition
   * @param size - the size in game coordinates; gets converted to pixels
   * @returns string
   */
  private fontDescriptor(font: FontDef, size: number): string {
    const pixelWidth = this.canvasManager.pixelWidth(1)
    const pxSize = size / pixelWidth
    const res = `${font.weight} ${pxSize.toFixed(4)}px "${font.family}", ${tweakables.fontFamilyFallback}`
    //console.log(`Got font descriptor "${res}"`)
    return res
  }
}
export {SpriteBatch}
