"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoreCard = void 0;
const tweakables_1 = __importDefault(require("./tweakables"));
const { scoreCard } = tweakables_1.default;
class ScoreCard {
    sizeMultiplier = scoreCard.sizeMultiplier;
    sizeVelocity = scoreCard.sizeVelocity;
    springConstant = scoreCard.springConstant;
    dampeningConstant = scoreCard.dampeningConstant;
    bounceVelocity = scoreCard.bounceVelocity;
    minSizeMultiplier = scoreCard.minSizeMultiplier;
    maxSizeMultiplier = scoreCard.maxSizeMultiplier;
    update(dt) {
        const force = (1.0 - this.sizeMultiplier) * this.springConstant - this.sizeVelocity * this.dampeningConstant;
        this.sizeVelocity += force * dt;
        this.sizeMultiplier += this.sizeVelocity * dt;
        if (this.sizeMultiplier < this.minSizeMultiplier)
            this.sizeMultiplier = this.minSizeMultiplier;
        else if (this.sizeMultiplier > this.maxSizeMultiplier)
            this.sizeMultiplier = this.maxSizeMultiplier;
    }
    bounce() {
        this.sizeVelocity = this.bounceVelocity;
    }
}
exports.ScoreCard = ScoreCard;
