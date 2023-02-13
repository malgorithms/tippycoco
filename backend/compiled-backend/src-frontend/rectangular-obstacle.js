"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RectangularObstacle = void 0;
const utils_1 = require("./utils");
class RectangularObstacle {
    center;
    width;
    height;
    constructor(o) {
        this.center = utils_1.vec.copy(o.center);
        this.width = o.width;
        this.height = o.height;
    }
    get x1() {
        return this.center.x - this.width / 2;
    }
    get x2() {
        return this.center.x + this.width / 2;
    }
    get y1() {
        return this.center.y - this.height / 2;
    }
    get y2() {
        return this.center.y + this.height / 2;
    }
    handleBallCollision(ball, elasticity, isSimulation) {
        let didCollide = false;
        const ballRad = ball.diameter / 2;
        const cx = this.center.x;
        const cy = this.center.y;
        const bx = ball.center.x;
        const by = ball.center.y;
        const cLt = cx - this.width / 2;
        const cRt = cx + this.width / 2;
        const cUp = cy + this.height / 2;
        const cDw = cy - this.height / 2;
        if (bx + ballRad < cLt)
            return false;
        if (bx - ballRad > cRt)
            return false;
        if (by - ballRad > cUp)
            return false;
        if (by + ballRad < cDw)
            return false;
        didCollide ||= ball.handleHittingVerticalSegment({ x: cLt, y: cDw }, { x: cLt, y: cUp }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingHorizontalSegment({ x: cLt, y: cUp }, { x: cRt, y: cUp }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingVerticalSegment({ x: cRt, y: cDw }, { x: cRt, y: cUp }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingHorizontalSegment({ x: cLt, y: cDw }, { x: cRt, y: cDw }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingPoint({ x: cLt, y: cDw }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingPoint({ x: cLt, y: cUp }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingPoint({ x: cRt, y: cUp }, elasticity, isSimulation);
        didCollide ||= ball.handleHittingPoint({ x: cRt, y: cDw }, elasticity, isSimulation);
        return didCollide;
    }
}
exports.RectangularObstacle = RectangularObstacle;
