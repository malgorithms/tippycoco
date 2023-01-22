class ScoreCard {
  // TODO: move these constants to tweakables
  public sizeMultiplier: number
  public sizeVelocity: number
  private readonly springConstant: number
  private readonly dampeningConstant: number
  private readonly bounceVelocity: number
  private readonly minSizeMultiplier: number
  private readonly maxSizeMultiplier: number

  public constructor() {
    this.sizeMultiplier = 1
    this.sizeVelocity = 0
    this.springConstant = 24.0
    this.dampeningConstant = 1.5
    this.bounceVelocity = 2.5
    this.minSizeMultiplier = 0.25
    this.maxSizeMultiplier = 3.0
  }
  public update(dt: number) {
    const force = (1.0 - this.sizeMultiplier) * this.springConstant - this.sizeVelocity * this.dampeningConstant
    this.sizeVelocity += force * dt
    this.sizeMultiplier += this.sizeVelocity * dt
    if (this.sizeMultiplier < this.minSizeMultiplier) this.sizeMultiplier = this.minSizeMultiplier
    else if (this.sizeMultiplier > this.maxSizeMultiplier) this.sizeMultiplier = this.maxSizeMultiplier
  }
  public bounce() {
    this.sizeVelocity = this.bounceVelocity
  }
}

export {ScoreCard}
