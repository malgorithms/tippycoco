import {TextureName} from './content-load-list'
import {Vector2} from './types'

class Kapow {
  public age = 0
  public maxAgeSec: number
  public kapowName: TextureName
  public pos: Vector2
  public orientation: number
  public size: number

  public constructor(kapowName: TextureName, pos: Vector2, orientation: number, size: number, maxAgeSec: number) {
    this.kapowName = kapowName
    this.pos = pos
    this.orientation = orientation
    this.maxAgeSec = maxAgeSec
    this.size = size
  }
  public stepAndTestForDeath(dt: number): boolean {
    this.age += dt
    this.size += dt / 40
    return this.age >= this.maxAgeSec
  }
  public fractionOfWayToDeath(): number {
    return this.age / this.maxAgeSec
  }
}
class KapowManager {
  public kapows = new Array<Kapow>()
  public addAKapow(kapowName: TextureName, pos: Vector2, orientation: number, size: number, maxAgeSec: number): void {
    this.kapows.push(new Kapow(kapowName, pos, orientation, size, maxAgeSec))
  }
  public step(dt: number): void {
    for (let i = this.kapows.length - 1; i >= 0; i--) {
      if (this.kapows[i].stepAndTestForDeath(dt)) this.kapows.splice(i, 1)
    }
  }
}

export {Kapow, KapowManager}
