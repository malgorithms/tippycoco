import {AiBase} from './ai/base'
import {CircularObject} from './circular-object'
import {RectangularObstacle} from './rectangular-obstacle'
import tweakables from './tweakables'
import {NewPlayerArg, PlayerSpecies, Vector2} from './types'
import {vec} from './utils'

class Player {
  public readonly xSpringConstant: number
  public readonly species: PlayerSpecies
  public readonly ai: AiBase | null
  public physics: CircularObject
  public maxVel: Vector2
  public targetXVel: number // desired speed, accelerates towards
  private _jumpCount: number
  private _isInJumpPosition: boolean

  constructor(o: NewPlayerArg) {
    this._isInJumpPosition = false
    this._jumpCount = 0
    this.physics = new CircularObject(vec.zero(), vec.zero(), o.diameter, o.mass, 0, 0, o.gravityMultiplier)
    this.maxVel = o.maxVel
    this.targetXVel = o.targetXVel
    this.xSpringConstant = o.xSpringConstant
    this.species = o.species
    this.ai = o.ai
  }
  public get jumpCount() {
    return this._jumpCount
  }
  public get isInJumpPosition() {
    return this._isInJumpPosition
  }
  public setIsInJumpPosition(canJump: boolean) {
    this._isInJumpPosition = canJump
  }
  public deepCopy(): Player {
    const sp = new Player({
      maxVel: vec.copy(this.maxVel),
      diameter: this.physics.diameter,
      mass: this.physics.mass,
      xSpringConstant: this.xSpringConstant,
      gravityMultiplier: this.physics.gravityMultiplier,
      targetXVel: this.targetXVel,
      species: this.species,
      ai: this.ai,
    })
    sp.physics.center = vec.copy(this.physics.center)
    sp.physics.vel = vec.copy(this.physics.vel)
    sp.physics.orientation = this.physics.orientation
    sp.physics.angularVel = this.physics.angularVel
    sp._jumpCount = this._jumpCount
    return sp
  }
  public jump(): void {
    if (this.isInJumpPosition) {
      this._jumpCount++
      this.physics.vel.y = this.maxVel.y
    }
  }
  public grow(dt: number, vel: number) {
    const oldDiameter = this.physics.diameter
    this.physics.diameter += vel * dt
    if (this.physics.diameter < tweakables.player.minDiameter) this.physics.diameter = tweakables.player.minDiameter
    if (this.physics.diameter > tweakables.player.maxDiameter) this.physics.diameter = tweakables.player.maxDiameter
    const ratio = oldDiameter / this.physics.diameter
    this.maxVel.x *= Math.sqrt(ratio)
    this.maxVel.y *= Math.sqrt(Math.sqrt(ratio))
    this.physics.mass *= (1 / ratio) * (1 / ratio)
  }
  public moveRight() {
    this.targetXVel = this.maxVel.x
  }
  public moveLeft() {
    this.targetXVel = -this.maxVel.x
  }
  public moveRationally(fractionOfMaxVelocity: number) {
    this.targetXVel = this.maxVel.x * fractionOfMaxVelocity
  }
  public stepPosition(dt: number) {
    this.physics.center = vec.add(this.physics.center, vec.scale(this.physics.vel, dt))
  }
  public stepVelocity(dt: number, gravity: Vector2) {
    const idealVx = this.targetXVel * this.maxVel.x
    const difference = idealVx - this.physics.vel.x
    this.physics.vel = vec.add(this.physics.vel, {x: difference * dt * this.xSpringConstant, y: 0})

    // gravity
    this.physics.vel = vec.add(this.physics.vel, vec.scale(gravity, dt * this.physics.gravityMultiplier))
  }
  public isOnHeight(height: number): boolean {
    return this.physics.center.y <= height + tweakables.proximityTolerance
  }
  public isOnPlayer(opponent: Player): boolean {
    // Jump off opponent! Are you serious?! Yes.
    const diff = vec.sub(this.physics.center, opponent.physics.center)
    const distance = vec.len(diff)
    if (distance < this.physics.diameter / 2 + opponent.physics.diameter / 2 + tweakables.proximityTolerance) {
      // Only if above opponent
      if (this.physics.center.y > opponent.physics.center.y) {
        return true
      }
    }
    return false
  }
  public isOnRectangle(obstacle: RectangularObstacle): boolean {
    // top-left corner
    const netTopLeftCorner: Vector2 = {x: obstacle.center.x - obstacle.width / 2, y: obstacle.center.y + obstacle.height / 2}
    const distToNetTopLeft = vec.len(vec.sub(netTopLeftCorner, this.physics.center))

    if (distToNetTopLeft <= this.physics.diameter / 2 + tweakables.proximityTolerance) {
      return true
    }

    // top-right corner
    const netTopRightCorner: Vector2 = {x: obstacle.center.x + obstacle.width / 2, y: obstacle.center.y + obstacle.height / 2}
    const distToNetTopRight = vec.len(vec.sub(netTopRightCorner, this.physics.center))
    if (distToNetTopRight <= this.physics.diameter / 2 + tweakables.proximityTolerance) {
      return true
    }

    // top of it
    if (this.physics.center.x > obstacle.center.x - obstacle.width / 2 && this.physics.center.x < obstacle.center.x + obstacle.width / 2) {
      const jumpHeight = obstacle.center.y + obstacle.height / 2 + this.physics.diameter / 2
      if (this.isOnHeight(jumpHeight)) {
        return true
      }
    }
    return false
  }
  public getMaxJumpHeight(gameGravityY: number): number {
    return (this.maxVel.y * this.maxVel.y) / (2 * Math.abs(gameGravityY * this.physics.gravityMultiplier))
  }
  public getTimeToJumpToHeight(gameGravityY: number, height: number): number {
    // y = y0 + v0t + 0.5at^2
    // y = 0 + vt + 0.5gt^2
    // 0.5gt^2 + vt - y = 0
    // (-v +- sqrt(v*v+2yg) ) / (g)
    const g = gameGravityY * this.physics.gravityMultiplier
    const v = this.maxVel.y
    if (v * v + 2 * height * g < 0) return Infinity
    else {
      const answer1 = (-v + Math.sqrt(v * v + 2 * height * g)) / g
      const answer2 = (-v - Math.sqrt(v * v + 2 * height * g)) / g
      if (answer1 > 0 && answer2 > 0 && answer1 < answer2) return answer1
      else if (answer1 > 0 && answer2 > 0 && answer2 < answer1) return answer2
      else if (answer2 > 0) return answer2
      else if (answer1 > 0) return answer1
      else return Infinity
    }
  }
}

export {PlayerSpecies, Player}
