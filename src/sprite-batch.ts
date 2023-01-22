import {CanvasManager} from './canvas-manager'
import {Color} from './color'
import {Dim, Rectangle, Texture2D, Vector2} from './types'

class SpriteBatch {
  private canvasManager: CanvasManager
  constructor(canvasManager: CanvasManager) {
    this.canvasManager = canvasManager
  }
  private get ctx() {
    return this.canvasManager.ctx
  }
  /**
   * draws a texture on the canvasManager, scaled appropriately. So none of the params
   * here are dealing with pixels, but actual game units
   */
  public drawTextureCentered(t: Texture2D, center: Vector2, dim: Dim, rot: number, alpha: number) {
    this.ctx.save()
    // we need to rotate about center, so let's translater to center, rotate, translate back
    const w = dim.w
    const h = dim.h
    const rotCenterX = w / 2
    const rotCenterY = h / 2
    this.ctx.translate(center.x, center.y)
    this.ctx.transform(1, 0, 0, -1, 0, 0) // flip y-axis
    this.ctx.rotate(rot ?? 0)
    this.ctx.translate(-rotCenterX, -rotCenterY)
    this.ctx.globalAlpha = alpha ?? 1
    this.ctx.drawImage(t.img, 0, 0, w, h)
    this.ctx.restore()
  }
  public drawStringCentered(s: string, center: Vector2, height: number, color: Color, rot: number) {
    this.ctx.save()
    const pxCenter = this.canvasManager.canvasToPixelPos(center)
    const pixelWidth = this.canvasManager.pixelWidth(1)
    this.ctx.font = `${height / pixelWidth}px sans-serif`
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
  public drawStringUncentered(s: string, pos: Vector2, height: number, color: Color, rot: number) {
    this.ctx.save()
    const pxPos = this.canvasManager.canvasToPixelPos(pos)
    const pixelWidth = this.canvasManager.pixelWidth(1)
    this.ctx.font = `${height / pixelWidth}px sans-serif`
    this.ctx.resetTransform()
    this.ctx.translate(pxPos.x, pxPos.y)
    this.ctx.rotate(rot ?? 0)
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
  /**
   * returns width and height object for the given texture,
   * given a desired width passed in. basically just scales to aspectRatio.
   * @param width
   * @param texture2d
   * @returns
   */
  public autoDim(width: number, texture2d: Texture2D): Dim {
    return {
      w: width,
      h: (width * texture2d.height) / texture2d.width,
    }
  }
}
export {SpriteBatch}
