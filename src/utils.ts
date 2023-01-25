import {Texture2D, Vector2} from './types'

function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}
function sign(n: number) {
  if (n > 0) return 1
  else if (n < 0) return -1
  else throw new Error(`0 is unsigned`)
}
const vec = {
  copy: (v: Vector2): Vector2 => ({x: v.x, y: v.y}),
  sub: (v1: Vector2, v2: Vector2): Vector2 => ({x: v1.x - v2.x, y: v1.y - v2.y}),
  add: (v1: Vector2, v2: Vector2): Vector2 => ({x: v1.x + v2.x, y: v1.y + v2.y}),
  lenSq: (v: Vector2): number => v.x * v.x + v.y * v.y,
  len: (v: Vector2): number => Math.sqrt(vec.lenSq(v)),
  scale: (v: Vector2, k: number): Vector2 => ({x: v.x * k, y: v.y * k}),
  normalized: (v: Vector2): Vector2 => {
    const len = vec.len(v)
    return {x: v.x / len, y: v.y / len}
  },
  dotProduct: (v1: Vector2, v2: Vector2): number => v1.x * v2.x + v1.y * v2.y,
  zero: (): Vector2 => ({x: 0, y: 0}),
  transform: (p: Vector2, matrix: DOMMatrix): Vector2 => {
    const x = p.x * matrix.a + p.y * matrix.c + matrix.e
    const y = p.x * matrix.b + p.y * matrix.d + matrix.f
    return {x, y}
  },
  avg: (v1: Vector2, v2: Vector2): Vector2 => {
    return {
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2,
    }
  },
}
const aspectRatio = (t: Texture2D): number => t.width / t.height

export {timeout, vec, aspectRatio, sign}
