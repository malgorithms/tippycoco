import {Vector2} from './types'

enum KapowType {
  Slam = 'slam',
  Rejected = 'rejected',
  Score = 'score',
}

class Kapow {
  public age = 0
  public maxAge: number
  public kapowType: KapowType
  public pos: Vector2
  public orientation: number
  public size: number

  public constructor(kapowType: KapowType, pos: Vector2, orientation: number, size: number, maxAge: number) {
    this.kapowType = kapowType
    this.pos = pos
    this.orientation = orientation
    this.maxAge = maxAge
    this.size = size
  }
  public stepAndTestForDeath(dt: number): boolean {
    this.age += dt
    this.size += dt / 40
    return this.age >= this.maxAge
  }
  public fractionOfWayToDeath(): number {
    return this.age / this.maxAge
  }
}
class KapowManager {
  public kapows = new Array<Kapow>()
  public addAKapow(kapowType: KapowType, pos: Vector2, orientation: number, size: number, maxAge: number): void {
    this.kapows.push(new Kapow(kapowType, pos, orientation, size, maxAge))
  }
  public step(dt: number): void {
    for (let i = this.kapows.length - 1; i >= 0; i--) {
      if (this.kapows[i].stepAndTestForDeath(dt)) this.kapows.splice(i, 1)
    }
  }
}

export {Kapow, KapowManager, KapowType}
