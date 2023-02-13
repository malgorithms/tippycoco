import {Vector2} from './types'
import {vec} from './utils'

class Spring1D {
  private _x: number
  private _vel: number
  private _damp: number
  private _k: number
  public targetX: number
  constructor(x: number, vel: number, targetX: number, k: number, damp: number) {
    this._x = x
    this._vel = vel
    this._k = k
    this._damp = damp
    this.targetX = targetX
  }
  public get x() {
    return this._x
  }
  public step(dtSec: number) {
    this._x += this._vel * dtSec
    const fSpring = (this.targetX - this._x) * this._k
    const fDamp = this._damp * this._vel
    const acc = fSpring + fDamp
    this._vel += acc * dtSec
  }
}
class Spring2D {
  private _pos: Vector2
  private _vel: Vector2
  private _damp: number
  private _k: number
  public targetPos: Vector2
  constructor(pos: Vector2, vel: Vector2, targetPos: Vector2, k: number, damp: number) {
    this._pos = vec.copy(pos)
    this._vel = vec.copy(vel)
    this._k = k
    this._damp = damp
    this.targetPos = vec.copy(targetPos)
  }
  public get pos() {
    return vec.copy(this._pos)
  }
  public step(dtSec: number) {
    this._pos.x += this._vel.x * dtSec
    this._pos.y += this._vel.y * dtSec
    const fSpring: Vector2 = {x: 0, y: 0}
    const springDiff = vec.sub(this.targetPos, this.pos)
    if (springDiff.x || springDiff.y) {
      const springDir = vec.normalized(springDiff)
      const dist = vec.len(springDiff)
      fSpring.x = springDir.x * this._k * dist
      fSpring.y = springDir.y * this._k * dist
    }
    const fDamp = vec.scale(this._vel, this._damp)
    const acc = vec.add(fDamp, fSpring)
    this._vel.x += acc.x * dtSec
    this._vel.y += acc.y * dtSec
  }
}

/**
 * a card that has a size that can spring around (a 1d spring) and a position (a 2d spring)
 * we'll use it for menus
 */
class SpringCard {
  private posSpring: Spring2D
  private sizeSpring: Spring1D
  constructor(pos: Vector2, size: number, velSpringK: number, sizeSpringK: number, velDamp: number, sizeDamp: number) {
    this.posSpring = new Spring2D(pos, {x: 0, y: 0}, pos, velSpringK, velDamp)
    this.sizeSpring = new Spring1D(size, 0, size, sizeSpringK, sizeDamp)
  }
  public step(dtSec: number) {
    this.posSpring.step(dtSec)
    this.sizeSpring.step(dtSec)
  }
  public set targetSize(targetSize: number) {
    this.sizeSpring.targetX = targetSize
  }
  public set targetPos(targetPos: Vector2) {
    this.posSpring.targetPos = targetPos
  }
  public get size() {
    return this.sizeSpring.x
  }
  public get pos() {
    return this.posSpring.pos
  }
}

export {SpringCard}
