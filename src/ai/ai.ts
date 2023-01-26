import {ValueOf} from '../types'
import {AiBase} from './base'
import {_BlackAi} from './black-ai'
import {_GreenAi} from './green-ai'
import {_PurpleAi} from './purple-ai'
import {_WhiteAi} from './white-ai'

const ais = {
  Green: _GreenAi,
  Black: _BlackAi,
  White: _WhiteAi,
  Purple: _PurpleAi,
} as const

type AiName = keyof typeof ais

const aiNames = Object.keys(ais) as AiName[]

type KnownAi = ValueOf<typeof ais>

function aiToName(ai: AiBase): AiName {
  for (const k in ais) {
    const name = k as AiName
    if (ai instanceof ais[name]) {
      return name
    }
  }
  throw new Error('Unknown Ai.')
}

export {ais, AiName, aiToName, KnownAi, aiNames}
