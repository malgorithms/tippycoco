import tweakables from './tweakables'
const {scoreCard} = tweakables

class ScoreCard {
  public sizeMultiplier: number = scoreCard.sizeMultiplier
  public sizeVelocity: number = scoreCard.sizeVelocity
  private readonly springConstant = scoreCard.springConstant
  private readonly dampeningConstant = scoreCard.dampeningConstant
  private readonly bounceVelocity = scoreCard.bounceVelocity
  private readonly minSizeMultiplier = scoreCard.minSizeMultiplier
  private readonly maxSizeMultiplier = scoreCard.maxSizeMultiplier

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
