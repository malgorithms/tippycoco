import tweakables from './tweakables'
import {CircleCircleCollision, Vector2} from './types'
import {vec} from './utils'

class CircularObject {
  public center: Vector2
  public vel: Vector2
  public diameter: number
  private _angularVel: number
  public orientation: number
  public mass: number
  public gravityMultiplier: number
  public canSpin: boolean
  private spinElasticityOffFrictionPoints
  private spinBumpOffFrictionPoints

  public constructor(
    center: Vector2,
    vel: Vector2,
    diameter: number,
    mass: number,
    orientation: number,
    angularVel: number,
    gravityMultiplier: number,
    canSpin: boolean,
    spinElasticityOffFrictionPoints: number,
    spinBumpOffFrictionPoints: number,
  ) {
    this.center = center
    this._angularVel = angularVel
    this.vel = vel
    this.diameter = diameter
    this.orientation = orientation
    this.mass = mass
    this.gravityMultiplier = gravityMultiplier
    this.canSpin = canSpin
    this.spinBumpOffFrictionPoints = spinBumpOffFrictionPoints
    this.spinElasticityOffFrictionPoints = spinElasticityOffFrictionPoints
  }
  public get radius() {
    return this.diameter / 2
  }
  public get angularVel() {
    if (!this.canSpin) return 0
    return this._angularVel
  }
  public set angularVel(x: number) {
    const vMax = tweakables.physics.maxAngVel
    if (!this.canSpin) this._angularVel = 0
    else this._angularVel = Math.max(-vMax, Math.min(x, vMax))
  }
  private distanceToRadians(dist: number) {
    return dist / this.radius
  }
  /**
   * if passed the center of the circle, this would just return the velocity of the ball
   * but if passed something on the surface, say the top of the ball's location in world coords,
   * it would return the velocity of the ball + adjustment for angular speed of the point
   * on the ball there.
   * @param relPoint
   */
  public getAtomVelocityAtWorldPoint(worldPoint: Vector2, isSimulation: boolean) {
    if (worldPoint.x === this.center.x && worldPoint.y === this.center.y) {
      throw new Error(`Why are we calculating getAtomVelocity at circle's center?`)
    } else {
      const dP = vec.sub(worldPoint, this.center)
      const normalTowardsPoint = vec.normalized(dP)
      // this is the direction the point we're considering is heading, dur to the spin
      const dirDueToSpin = vec.rotated90Ccw(normalTowardsPoint)
      const speedDueToSpin = this.angularVel * vec.len(dP)
      const velDueToSpin = vec.scale(dirDueToSpin, speedDueToSpin)
      const totalVel = vec.add(velDueToSpin, this.vel)
      const totalSpeedInSpinDir = vec.dotProduct(totalVel, dirDueToSpin)
      const totalAngularVel = this.distanceToRadians(totalSpeedInSpinDir)

      //if (!isSimulation) {
      //  console.log(`atom velocity:
      //            ball center: ${this.center.x.toFixed(3)},${this.center.y.toFixed(3)}
      //               ball vel: ${this.vel.x.toFixed(2)},${this.vel.y.toFixed(2)}
      //            ball angVel: ${this._angularVel}
      //            world point: ${worldPoint.x.toFixed(2)},${worldPoint.y.toFixed(2)}
      //              rel point: ${dP.x.toFixed(2)},${dP.y.toFixed(2)}
      //           velDueToSpin: ${velDueToSpin.x.toFixed(2)},${velDueToSpin.y.toFixed(2)}
      //           dirDueToSpin: ${dirDueToSpin.x.toFixed(2)},${dirDueToSpin.y.toFixed(2)}
      //               totalVel: ${totalVel.x.toFixed(2)},${totalVel.y.toFixed(2)}
      //    totalSpeedInSpinDir: ${totalSpeedInSpinDir.toFixed(2)}
      //        totalAngularVel: ${totalAngularVel.toFixed(2)}
      //  `)
      //}
      return {
        totalVel,
        totalAngularVel,
        totalSpeedInSpinDir,
        dirDueToSpin,
      }
    }
  }

  public getBallMaxHeight(gravity: Vector2): number {
    const vy = this.vel.y
    const py = this.center.y
    const energyPermass = py * -gravity.y + (vy * vy) / 2
    const maxHeight = energyPermass / -gravity.y
    return maxHeight
  }
  public handleHittingOtherCircle(other: CircularObject, elasticity: number, isSimulation: boolean): CircleCircleCollision {
    const result: CircleCircleCollision = {
      didCollide: false,
      angle: 0,
      pointOfContact: {x: Infinity, y: Infinity},
      c1MomentumDelta: {x: Infinity, y: Infinity},
      c2MomentumDelta: {x: Infinity, y: Infinity},
      c1EnergyDelta: Infinity,
      c2EnergyDelta: Infinity,
    }

    // Exit early if their rectangles don't overlap
    const thisRadius = this.radius
    const otherRadius = other.radius
    if (
      this.center.x + thisRadius < other.center.x - otherRadius ||
      this.center.x - thisRadius > other.center.x + otherRadius ||
      this.center.y + thisRadius < other.center.y - otherRadius ||
      this.center.y - thisRadius > other.center.y + otherRadius
    )
      return result

    const ed = elasticity // elasticity
    const displacement = vec.sub(this.center, other.center)
    const distance = vec.len(displacement)
    if (distance < this.radius + other.radius) {
      const a: Vector2 = vec.scale(displacement, 1 / distance)
      const va1 = this.vel.x * a.x + this.vel.y * a.y
      const vb1 = -this.vel.x * a.y + this.vel.y * a.x
      const va2 = other.vel.x * a.x + other.vel.y * a.y
      const vb2 = -other.vel.x * a.y + other.vel.y * a.x
      const vaP1 = va1 + ((1 + ed) * (va2 - va1)) / (1 + this.mass / other.mass)
      const vaP2 = va2 + ((1 + ed) * (va1 - va2)) / (1 + other.mass / this.mass)

      const thisOldEnergy = 0.5 * this.mass * vec.lenSq(this.vel)
      const otherOldEnergy = 0.5 * other.mass * vec.lenSq(other.vel)
      const thisOldMomentum = vec.scale(this.vel, this.mass)
      const otherOldMomentum = vec.scale(other.vel, other.mass)

      const pointOfContact = {x: this.center.x - a.x * this.radius, y: this.center.y - a.y * this.radius}
      const thisSpinInfo = this.getAtomVelocityAtWorldPoint(pointOfContact, isSimulation)
      const otherSpinInfo = other.getAtomVelocityAtWorldPoint(pointOfContact, isSimulation)

      // we'll let them add spin to each other, but only if they're not really resting
      // on each other (rel speeds would be very low in that case)
      const relSpeed = vec.len(vec.sub(this.vel, other.vel))

      //if (!isSimulation) console.log(relSpeed)
      let thisSpinBounceLoss = {x: 0, y: 0}
      let otherSpinBounceLoss = {x: 0, y: 0}
      if (relSpeed > tweakables.physics.minRelSpeedToAllowBallSpins) {
        if (this.canSpin) {
          const thisAngularVelDelta = tweakables.physics.ballOnBallFrictionSpin * thisSpinInfo.totalAngularVel
          this.angularVel -= thisAngularVelDelta
          const bounceScale = thisSpinInfo.totalSpeedInSpinDir * this.spinBumpOffFrictionPoints
          thisSpinBounceLoss = vec.scale(thisSpinInfo.dirDueToSpin, bounceScale)
        }
        if (other.canSpin) {
          const otherAngularVelDelta = tweakables.physics.ballOnBallFrictionSpin * otherSpinInfo.totalAngularVel
          other.angularVel -= otherAngularVelDelta
          const bounceScale = otherSpinInfo.totalSpeedInSpinDir * other.spinBumpOffFrictionPoints
          //if (!isSimulation) console.log('yo', otherSpinInfo.totalSpeedInSpinDir, other.spinBumpOffFrictionPoints, bounceScale)
          otherSpinBounceLoss = vec.scale(otherSpinInfo.dirDueToSpin, bounceScale)
        }
      }

      //if (!isSimulation) {
      //  console.log(this.canSpin, other.canSpin)
      //  console.log(JSON.stringify({relSpeed, thisSpinBounceLoss, otherSpinBounceLoss, thisVel: this.vel, otherVel: other.vel}, null, 2))
      //}
      //if (!isSimulation) {
      //  console.log(thisAngSpeed, otherAngSpeed, this.orientation, other.orientation)
      //  //if (thisAngSpeed === 0) console.log({thisAngSpeed, otherAngSpeed, thisAngVel: this.angularVel, otherAngVel: other.angularVel})
      //}

      // ok, update their velocities
      this.vel.x = vaP1 * a.x - vb1 * a.y
      this.vel.y = vaP1 * a.y + vb1 * a.x
      other.vel.x = vaP2 * a.x - vb2 * a.y
      other.vel.y = vaP2 * a.y + vb2 * a.x

      // any spinBounceLoss
      this.vel.x -= thisSpinBounceLoss.x
      this.vel.y -= thisSpinBounceLoss.y
      other.vel.x -= otherSpinBounceLoss.x
      other.vel.y -= otherSpinBounceLoss.y

      const thisNewEnergy = 0.5 * this.mass * vec.lenSq(this.vel)
      const otherNewEnergy = 0.5 * other.mass * vec.lenSq(other.vel)
      const thisNewMomentum = vec.scale(this.vel, this.mass)
      const otherNewMomentum = vec.scale(other.vel, other.mass)

      // Finally, make sure displacement is at least radii.
      const appropriateSeparation = 1.0 * (this.radius + other.radius)
      if (distance < appropriateSeparation && this.mass > other.mass) {
        const toSub = vec.scale(a, appropriateSeparation - distance)
        other.center = vec.sub(other.center, toSub)
      } else if (distance < appropriateSeparation && this.mass <= other.mass) {
        const toAdd = vec.scale(a, appropriateSeparation - distance)
        this.center = vec.add(this.center, toAdd)
      }

      result.pointOfContact = vec.add(other.center, vec.scale(a, other.radius))
      result.angle = Math.atan2(a.y, a.x)
      result.c1EnergyDelta = thisNewEnergy - thisOldEnergy
      result.c2EnergyDelta = otherNewEnergy - otherOldEnergy
      result.c1MomentumDelta = vec.sub(thisNewMomentum, thisOldMomentum)
      result.c2MomentumDelta = vec.sub(otherNewMomentum, otherOldMomentum)
      result.didCollide = true
      return result
    } else {
      result.didCollide = false
      return result
    }
  }

  public handleHittingPoint(point: Vector2, elasticity: number, isSimulation: boolean): boolean {
    const displacement = vec.sub(point, this.center)
    const distance = vec.len(displacement)
    if (distance < this.radius) {
      const displacementNormal = vec.normalized(displacement)
      const velTowardCollision = vec.scale(displacementNormal, vec.dotProduct(this.vel, displacementNormal))
      const velPerpendicularToCollision = vec.sub(this.vel, velTowardCollision)
      this.vel = vec.add(velPerpendicularToCollision, vec.scale(velTowardCollision, -1 * elasticity))
      this.center = vec.sub(point, vec.scale(displacementNormal, this.radius))
      this.adjSpinOffFrictionPoint(point, isSimulation)
      return true
    }
    return false
  }

  public handleHittingVerticalSegment(lowerPoint: Vector2, upperPoint: Vector2, elasticity: number, isSimulation: boolean): boolean {
    if (this.center.y >= lowerPoint.y && this.center.y <= upperPoint.y) {
      const displacementFromCenter = lowerPoint.x - this.center.x
      // if ball hitting, coming from the left
      if (displacementFromCenter > 0 && displacementFromCenter < this.radius && this.vel.x > 0) {
        this.adjSpinOffFrictionPoint({x: this.center.x + this.radius, y: this.center.y}, isSimulation)
        this.vel.x *= -elasticity
        this.center.x = lowerPoint.x - this.radius
        return true
      }
      // ball hitting, coming from the right
      else if (displacementFromCenter < 0 && displacementFromCenter > -this.radius && this.vel.x < 0) {
        this.adjSpinOffFrictionPoint({x: this.center.x - this.radius, y: this.center.y}, isSimulation)
        this.vel.x *= -elasticity
        this.center.x = lowerPoint.x + this.radius
        return true
      }
    }
    return false
  }

  public handleHittingHorizontalSegment(leftPoint: Vector2, rightPoint: Vector2, elasticity: number, isSimulation: boolean): boolean {
    if (this.center.x >= leftPoint.x && this.center.x <= rightPoint.x) {
      const displacementFromCenter = leftPoint.y - this.center.y
      // if ball hitting, coming from the bottom
      if (displacementFromCenter > 0 && displacementFromCenter < this.radius && this.vel.y > 0) {
        this.adjSpinOffFrictionPoint({x: this.center.x, y: this.center.y + this.radius}, isSimulation)
        this.vel.y *= -elasticity
        this.center.y = leftPoint.y - this.radius
        return true
      }
      // ball hitting, coming from the top
      else if (displacementFromCenter < 0 && displacementFromCenter > -this.radius && this.vel.y < 0) {
        this.adjSpinOffFrictionPoint({x: this.center.x, y: this.center.y - this.radius}, isSimulation)
        this.vel.y *= -elasticity
        this.center.y = leftPoint.y + this.radius
        return true
      }
    }
    return false
  }
  /**
   * when the ball hits a net or wall, it loses some spin (or gains). That energy has to be adjusted from
   * movement energy though.
   * @param worldPoint
   * @param isSimulation
   */
  private adjSpinOffFrictionPoint(worldPoint: Vector2, isSimulation: boolean) {
    const spinInfo = this.getAtomVelocityAtWorldPoint(worldPoint, isSimulation)
    const spinLoss = spinInfo.totalAngularVel * this.spinElasticityOffFrictionPoints
    const bounceScale = spinInfo.totalSpeedInSpinDir * this.spinBumpOffFrictionPoints
    this.vel = vec.sub(this.vel, vec.scale(spinInfo.dirDueToSpin, bounceScale))
    this.angularVel -= spinLoss
    //if (!isSimulation) {
    //  console.log(`Off point, adj=${spinInfo.totalSpeedInSpinDir}. angularVel=${this.angularVel}`)
    //}
  }
}

export {CircularObject}
