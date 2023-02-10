import {AiName} from '../ai/ai'

type RecordHolder = {
  name: string
  profileLink?: string
}
type RecordEntry = {
  sec: number
  who: RecordHolder
  videoLink?: string
  comment?: string
}
type RecordList = RecordEntry[]
type RecordListForAi = {
  fastest: RecordList
  withoutJumping: RecordList
}
type RecordListMap = {
  [k in AiName]: RecordListForAi
}
const emptyList = () => ({fastest: [], withoutJumping: []})

/**
 * for now let's hard code some
 */
const chris: RecordHolder = {name: 'Chris Coyne', profileLink: 'https://chriscoyne.com'}

const reportedScores: RecordListMap = {
  Green: {
    fastest: [
      {
        who: chris,
        sec: 58.891,
        videoLink: 'https://youtu.be/uILO4XVZPmM',
        comment: 'Oh cool, it is easy to record a window on the mac with Quicktime.',
      },
    ],
    withoutJumping: [
      {
        who: chris,
        sec: 161.0,
        videoLink: 'https://youtu.be/Ru9u7XBldJQ',
        comment: 'I have since added millisecond displays to the times...so for now rounding up. ',
      },
    ],
  },
  Orange: emptyList(),
  Purple: emptyList(),
  Gray: emptyList(),
  Yellow: emptyList(),
  Black: emptyList(),
  White: emptyList(),
}

export {reportedScores}
