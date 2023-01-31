import {CircularObject} from './circular-object'
import {Vector2} from './types'
import {vec} from './utils'

type RectangularObstacleConstructor = {
  center: Vector2
  width: number
  height: number
}

class RectangularObstacle {
  public center: Vector2
  public width: number
  public height: number

  public constructor(o: RectangularObstacleConstructor) {
    this.center = vec.copy(o.center)
    this.width = o.width
    this.height = o.height
  }

  public handleBallCollision(ball: CircularObject, elasticity: number, isSimulation: boolean): boolean {
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

    didCollide ||= ball.handleHittingVerticalSegment({x: cLt, y: cDw}, {x: cLt, y: cUp}, elasticity, isSimulation)
    didCollide ||= ball.handleHittingHorizontalSegment({x: cLt, y: cUp}, {x: cRt, y: cUp}, elasticity, isSimulation)
    didCollide ||= ball.handleHittingVerticalSegment({x: cRt, y: cDw}, {x: cRt, y: cUp}, elasticity, isSimulation)
    didCollide ||= ball.handleHittingHorizontalSegment({x: cLt, y: cDw}, {x: cRt, y: cDw}, elasticity, isSimulation)

    didCollide ||= ball.handleHittingPoint({x: cLt, y: cDw}, elasticity, isSimulation)
    didCollide ||= ball.handleHittingPoint({x: cLt, y: cUp}, elasticity, isSimulation)
    didCollide ||= ball.handleHittingPoint({x: cRt, y: cUp}, elasticity, isSimulation)
    didCollide ||= ball.handleHittingPoint({x: cRt, y: cDw}, elasticity, isSimulation)

    return didCollide
  }
}

export {RectangularObstacle}
