import {ContentLoader} from './content-loader'
import {FontDef} from './types'

const fontsToLoad = {
  extraBold: {family: 'Nunito Sans', weight: 600, url: '/fonts/NunitoSans/NunitoSans-ExtraBold.ttf'} as FontDef,
  regular: {family: 'Nunito Sans', weight: 400, url: '/fonts/NunitoSans/NunitoSans-Regular.ttf'} as FontDef,
} as const

type FontName = keyof typeof fontsToLoad

class FontManager {
  private content: ContentLoader

  private fonts: Map<string, FontDef>

  public constructor(content: ContentLoader) {
    this.content = content
    this.fonts = new Map()
  }
  public getFont(name: FontName): FontDef {
    const res = this.fonts.get(name)
    if (!res) throw new Error(`Could not getFont() ${name}`)
    return res
  }
  private async loadOneFont(name: FontName, request: FontDef) {
    await this.content.loadFont(request.family, request.url, request.weight)
    this.fonts.set(name, request)
  }
  public async loadContent() {
    console.log(`Starting to load fonts`)
    const p: Promise<any>[] = []
    const start = Date.now()
    for (const k of Object.keys(fontsToLoad)) {
      const fontName = k as FontName
      const request = fontsToLoad[fontName] as FontDef
      p.push(this.loadOneFont(fontName, request))
    }
    await Promise.all(p)
    console.log(`Fonts loaded in ${Date.now() - start}ms. Now available = `)
    for (const f of document.fonts.entries()) {
      console.log('font: ', f)
    }
  }
}

export {FontManager, FontName}
