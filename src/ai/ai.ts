import {ValueOf} from '../types'
import {AiBase} from './base'
import {_BlackAi} from './black-ai'
import {_OrangeAi} from './orange-ai'
import {_GreenAi} from './green-ai'
import {_PurpleAi} from './purple-ai'
import {_WhiteAi} from './white-ai'
import {_YellowAi} from './yellow-ai'

const ais = {
  Green: _GreenAi,
  Black: _BlackAi,
  White: _WhiteAi,
  Purple: _PurpleAi,
  Orange: _OrangeAi,
  Yellow: _YellowAi,
} as const

type AiName = keyof typeof ais

const aiNicknames = {
  Green: 'Greenster',
  Black: 'Black Tie',
  White: 'Skarball',
  Purple: 'Pinky',
  Orange: 'The Juice',
  Yellow: 'Lemonae',
}

const aiNames = Object.keys(ais) as AiName[]

type KnownAi = ValueOf<typeof ais>

function aiToName(ai: AiBase | KnownAi): AiName {
  for (const k in ais) {
    const name = k as AiName
    if (ai instanceof ais[name] || ai === ais[name]) {
      return name
    }
  }
  console.log(ai)
  throw new Error('Unknown Ai.')
}
function aiToNickname(ai: AiBase | KnownAi | AiName) {
  if (typeof ai === 'string') return aiNicknames[ai]
  return aiNicknames[aiToName(ai)] || 'Unnamed Hero'
}

export {ais, AiName, aiToName, KnownAi, aiNames, aiToNickname}
