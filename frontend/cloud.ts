import {Rectangle, Texture2D, Vector2} from './types'

class Cloud {
  // Private members
  private _age: number
  private _sunnyTexture: Texture2D
  private _darkTexture: Texture2D
  private _vel: Vector2
  private _pos: Vector2
  private _width: number
  private _constraint: Rectangle // constraint

  // Public Methods
  public constructor(constraint: Rectangle, sunnyTexture: Texture2D, darkTexture: Texture2D, vel: Vector2, pos: Vector2, width: number) {
    this._age = 0
    this._constraint = constraint
    this._sunnyTexture = sunnyTexture
    this._darkTexture = darkTexture
    this._vel = vel
    this._pos = pos
    this._width = width
  }
  public get width() {
    return this._width
  }
  public get sunnyTexture() {
    return this._sunnyTexture
  }
  public get darkTexture() {
    return this._darkTexture
  }
  public get age() {
    return this._age
  }
  public get pos() {
    return this._pos
  }
  public step(dt: number) {
    const c = this._constraint
    this._pos.x += this._vel.x * dt
    this._pos.y += this._vel.y * dt
    if (this._vel.x < 0 && this._pos.x < c.x1) this._pos.x = c.x2
    if (this._vel.x > 0 && this._pos.x > c.x2) this._pos.x = c.x1

    if (this._vel.y < 0 && this._pos.y < c.y1) this._pos.y = c.y2
    if (this._vel.y > 0 && this._pos.y > c.y2) this._pos.y = c.y1
    if (this._pos.y > c.y2) {
      this._pos.y = c.y2
      this._vel.y = -Math.abs(this._vel.y)
    }
    if (this._pos.y < c.y1) {
      this._pos.y = c.y1
      this._vel.y = Math.abs(this._vel.y)
    }
    this._age += dt
  }
}

export {Cloud}
