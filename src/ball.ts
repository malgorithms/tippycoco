import {CircularObject} from './circular-object'
import tweakables from './tweakables'
import {NewBallArg, Vector2} from './types'
import {vec} from './utils'

class Ball {
  public physics: CircularObject
  public maxSpeed: number
  constructor(o: NewBallArg) {
    this.physics = new CircularObject({
      center: o.center,
      vel: o.vel,
      diameter: o.diameter,
      density: o.density,
      orientation: o.orientation,
      angularVel: o.angularVel,
      gravityMultiplier: 1,
      canSpin: true,
      bumpOffFrictionPoints: tweakables.physics.ballBumpOffFrictionPoints,
      spinElasticityOffFrictionPoints: tweakables.physics.ballSpinElasticityOffFrictionPoints,
    })
    this.maxSpeed = o.maxSpeed
  }
  public deepCopy(): Ball {
    return new Ball({
      center: this.physics.center,
      vel: this.physics.vel,
      diameter: this.physics.diameter,
      density: this.physics.density,
      maxSpeed: this.maxSpeed,
      orientation: this.physics.orientation,
      angularVel: this.physics.angularVel,
    })
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
    this.physics.angularVel -= this.physics.angularVel * dt * tweakables.physics.ballAngularFriction
  }
  public stepPositionAndOrientation(dt: number) {
    const centerShift = vec.scale(this.physics.vel, dt)
    this.physics.center = vec.add(this.physics.center, centerShift)
    this.physics.orientation += dt * this.physics.angularVel
  }
}
export {Ball}
