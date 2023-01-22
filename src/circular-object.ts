import {CircleCircleCollision, Vector2} from './types'
import {vec} from './utils'

class CircularObject {
  public center: Vector2
  public vel: Vector2
  public diameter: number
  public angularVel: number
  public orientation: number
  public mass: number
  public gravityMultiplier: number

  public constructor(
    center: Vector2,
    vel: Vector2,
    diameter: number,
    mass: number,
    orientation: number,
    angularVel: number,
    gravityMultiplier: number,
  ) {
    this.center = center
    this.angularVel = angularVel
    this.vel = vel
    this.diameter = diameter
    this.orientation = orientation
    this.mass = mass
    this.gravityMultiplier = gravityMultiplier
  }
  public getBallMaxHeight(gravity: Vector2): number {
    const vy = this.vel.y
    const py = this.center.y
    const energyPermass = py * -gravity.y + (vy * vy) / 2
    const maxHeight = energyPermass / -gravity.y
    return maxHeight
  }
  public handleHittingOtherCircle(other: CircularObject, elasticity: number): CircleCircleCollision {
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
    const thisRadius = this.diameter / 2
    const otherRadius = other.diameter / 2
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
    if (distance < this.diameter / 2 + other.diameter / 2) {
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

      this.vel.x = vaP1 * a.x - vb1 * a.y
      this.vel.y = vaP1 * a.y + vb1 * a.x
      other.vel.x = vaP2 * a.x - vb2 * a.y
      other.vel.y = vaP2 * a.y + vb2 * a.x

      const thisNewEnergy = 0.5 * this.mass * vec.lenSq(this.vel)
      const otherNewEnergy = 0.5 * other.mass * vec.lenSq(other.vel)
      const thisNewMomentum = vec.scale(this.vel, this.mass)
      const otherNewMomentum = vec.scale(other.vel, other.mass)

      // Finally, make sure displacement is at least radii.
      const appropriateSeparation = 1.0 * (this.diameter / 2 + other.diameter / 2)
      if (distance < appropriateSeparation && this.mass > other.mass) {
        const toSub = vec.scale(a, appropriateSeparation - distance)
        other.center = vec.sub(other.center, toSub)
      } else if (distance < appropriateSeparation && this.mass <= other.mass) {
        const toAdd = vec.scale(a, appropriateSeparation - distance)
        this.center = vec.add(this.center, toAdd)
      }

      result.pointOfContact = vec.add(other.center, vec.scale(a, other.diameter / 2))
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

  public handleHittingPoint(point: Vector2, elasticity: number): boolean {
    const displacement = vec.sub(point, this.center)
    const distance = vec.len(displacement)
    if (distance < this.diameter / 2) {
      const displacementNormal = vec.normalized(displacement)
      const velTowardCollision = vec.scale(displacementNormal, vec.dotProduct(this.vel, displacementNormal))
      const velPerpendicularToCollision = vec.sub(this.vel, velTowardCollision)
      this.vel = vec.add(velPerpendicularToCollision, vec.scale(velTowardCollision, -1 * elasticity))
      this.center = vec.sub(point, vec.scale(displacementNormal, this.diameter / 2))
      // For now, cut rotational speed in half
      this.angularVel /= 2
      return true
    }
    return false
  }

  public handleHittingVerticalSegment(lowerPoint: Vector2, upperPoint: Vector2, elasticity: number): boolean {
    if (this.center.y >= lowerPoint.y && this.center.y <= upperPoint.y) {
      const displacementFromCenter = lowerPoint.x - this.center.x
      // if ball hitting, coming from the left
      if (displacementFromCenter > 0 && displacementFromCenter < this.diameter / 2 && this.vel.x > 0) {
        this.vel.x *= -elasticity
        this.center.x = lowerPoint.x - this.diameter / 2
        // For now, cut rotational speed arbitrarily
        this.angularVel /= 2
        return true
      }
      // ball hitting, coming from the right
      else if (displacementFromCenter < 0 && displacementFromCenter > -this.diameter / 2 && this.vel.x < 0) {
        this.vel.x *= -elasticity
        this.center.x = lowerPoint.x + this.diameter / 2
        // For now, cut rotational speed arbitrarily
        this.angularVel /= 2
        return true
      }
    }
    return false
  }

  public handleHittingHorizontalSegment(leftPoint: Vector2, rightPoint: Vector2, elasticity: number): boolean {
    if (this.center.x >= leftPoint.x && this.center.x <= rightPoint.x) {
      const displacementFromCenter = leftPoint.y - this.center.y
      // if ball hitting, coming from the bottom
      if (displacementFromCenter > 0 && displacementFromCenter < this.diameter / 2 && this.vel.y > 0) {
        this.vel.y *= -elasticity
        this.center.y = leftPoint.y - this.diameter / 2
        // For now, cut rotational speed arbitrarily
        this.angularVel /= 2
        return true
      }
      // ball hitting, coming from the top
      else if (displacementFromCenter < 0 && displacementFromCenter > -this.diameter / 2 && this.vel.y < 0) {
        this.vel.y *= -elasticity
        this.center.y = leftPoint.y + this.diameter / 2
        // For now, cut rotational speed arbitrarily
        this.angularVel /= 2
        return true
      }
    }
    return false
  }
}

export {CircularObject}
