class Color {
  public r: number
  public g: number
  public b: number
  public a: number
  constructor(r: number, g: number, b: number, a: number) {
    if (typeof a !== 'number' || isNaN(a)) throw new Error(`I demand alpha.`)
    this.r = r
    this.g = g
    this.b = b
    this.a = a
  }
  public toHtmlRgb(): string {
    if (this.a === 1) return `rgb(${this.r * 255},${this.g * 255},${this.b * 255})`
    else return `rgba(${this.r * 255},${this.g * 255},${this.b * 255},${this.a})`
  }
}
const Colors = {
  white: new Color(1, 1, 1, 1),
  black: new Color(0, 0, 0, 1),
}
export {Color, Colors}
