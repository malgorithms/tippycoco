import {CircularObject} from './circular-object'
import {Vector2} from './types'
import {vec} from './utils'

class Ball {
  public physics: CircularObject
  public maxSpeed: number
  constructor(center: Vector2, vel: Vector2, diameter: number, mass: number, maxSpeed: number, orientation: number, angularVel: number) {
    this.physics = new CircularObject(center, vel, diameter, mass, orientation, angularVel, 1.0)
    this.maxSpeed = maxSpeed
  }
  public deepCopy(): Ball {
    return new Ball(
      vec.copy(this.physics.center),
      vec.copy(this.physics.vel),
      this.physics.diameter,
      this.physics.mass,
      this.maxSpeed,
      this.physics.orientation,
      this.physics.angularVel,
    )
  }
  public trimSpeedIfNecessary(): void {
    const v = this.physics.vel
    if (vec.lenSq(v) > this.maxSpeed * this.maxSpeed) {
      this.physics.vel = vec.scale(vec.normalized(v), this.maxSpeed)
    }
  }
  public stepVelocity(dt: number, gravity: Vector2, trimSpeedIfNecessary: boolean) {
    const shift = vec.scale(gravity, dt * this.physics.gravityMultiplier)
    this.physics.vel = vec.add(this.physics.vel, shift)
    if (trimSpeedIfNecessary) this.trimSpeedIfNecessary()
  }
  public stepPositionAndOrientation(dt: number) {
    const centerShift = vec.scale(this.physics.vel, dt)
    this.physics.center = vec.add(this.physics.center, centerShift)
    this.physics.orientation += dt * this.physics.angularVel
  }
  public setAngularVel(av: number) {
    this.physics.angularVel = av
  }
}
export {Ball}
