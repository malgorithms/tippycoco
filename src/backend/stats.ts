import stathat from 'stathat'

const StatHatAccount: string | null = null
const Prefix = 'TippyCoco'

const notSet = (): boolean => StatHatAccount === null

if (notSet()) {
  console.error('Note StahtHat account is not set, so no game stats saved.')
}

function shCb(...v: any[]) {
  console.log('SH CB', v)
}

async function count(statName: string, count: number): Promise<void> {
  console.log('[SH] ', statName, count)
  if (notSet()) return
  stathat.trackEZCount(StatHatAccount, `${Prefix} - ${statName}`, count, shCb)
}

async function value(statName: string, value: number): Promise<void> {
  console.log('[SH] ', statName, value)
  if (notSet()) return
  stathat.trackEZValue(StatHatAccount, `${Prefix} - ${statName}`, value, shCb)
}

export {count, value}
