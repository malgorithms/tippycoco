import {CircularObject} from './circular-object'
import {Vector2} from './types'
import {vec} from './utils'

class RectangularObstacle {
  public center: Vector2
  public width: number
  public height: number

  public constructor(center: Vector2, width: number, height: number) {
    this.center = vec.copy(center)
    this.width = width
    this.height = height
  }

  public handleBallCollision(ball: CircularObject, elasticity: number): boolean {
    let didCollide = false
    const ballRad: number = ball.diameter / 2
    const cx: number = this.center.x
    const cy: number = this.center.y
    const bx: number = ball.center.x
    const by: number = ball.center.y
    const cLt = cx - this.width / 2
    const cRt = cx + this.width / 2
    const cUp = cy + this.height / 2
    const cDw = cy - this.height / 2
    if (bx + ballRad < cLt) return false
    if (bx - ballRad > cRt) return false
    if (by - ballRad > cUp) return false
    if (by + ballRad < cDw) return false

    didCollide ||= ball.handleHittingVerticalSegment({x: cLt, y: cDw}, {x: cLt, y: cUp}, elasticity)
    didCollide ||= ball.handleHittingHorizontalSegment({x: cLt, y: cUp}, {x: cRt, y: cUp}, elasticity)
    didCollide ||= ball.handleHittingVerticalSegment({x: cRt, y: cDw}, {x: cRt, y: cUp}, elasticity)
    didCollide ||= ball.handleHittingHorizontalSegment({x: cLt, y: cDw}, {x: cRt, y: cDw}, elasticity)

    didCollide ||= ball.handleHittingPoint({x: cLt, y: cDw}, elasticity)
    didCollide ||= ball.handleHittingPoint({x: cLt, y: cUp}, elasticity)
    didCollide ||= ball.handleHittingPoint({x: cRt, y: cUp}, elasticity)
    didCollide ||= ball.handleHittingPoint({x: cRt, y: cDw}, elasticity)

    return didCollide
  }
}

export {RectangularObstacle}
