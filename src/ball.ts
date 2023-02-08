import {CircularObject} from './circular-object'
import {SoundName, TextureName} from './content-load-list'
import tweakables from './tweakables'
import {NewBallArg} from './types'
import {vec} from './utils'

class Ball {
  public physics: CircularObject
  public maxSpeed: number
  public bounceSoundName: SoundName
  public textureName: TextureName
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
    this.bounceSoundName = o.bounceSoundName ?? 'bounce'
    this.textureName = o.textureName
    this.maxSpeed = o.maxSpeed
  }
  public get bounceOffFlowerSoundName(): SoundName {
    if (this.bounceSoundName !== 'bounce') return this.bounceSoundName
    return 'bounceFlower'
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
      bounceSoundName: this.bounceSoundName,
      textureName: this.textureName,
    })
  }
  public trimSpeedIfNecessary(): void {
    const v = this.physics.vel
    if (vec.lenSq(v) > this.maxSpeed * this.maxSpeed) {
      this.physics.vel = vec.scale(vec.normalized(v), this.maxSpeed)
    }
  }
  public stepVelocity(dt: number, extraMult: number, trimSpeedIfNecessary: boolean) {
    this.physics.vel.y += dt * this.physics.gravityY * extraMult
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
