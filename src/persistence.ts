/**
 *  This class is for maintaining state across multiple plays of the game
 *  in the same browser.
 *
 *  One thing we want to be careful of is the player having 2 tabs open at once with the
 *  game. If they unlock something in one, we wouldn't want them to lose it in the other by
 *  the second overwriting local storage. So we should try to increment values
 *  in the local store and then always use that as a source of truth, not what's in memory
 */

import {AiName, aiNames} from './ai/ai'
import constants from './constants'
import {PlayerSpecies} from './player'
import {randomByteHexString} from './utils'

type AiRecord = {
  wins: number
  losses: number
  shutoutWins: number
  noJumpWins: number
  fastestWin: number | null // seconds
}
type AiRecordDict = {
  [k in AiName]: AiRecord
}

type PersistentGameData = {
  gameVersion: string
  firstPlayed: number
  lastPlayed: number
  games: {
    started: number
    completed: number
  }
  aiRecord: AiRecordDict
  playerId: string
}
type PartialGameData = Partial<PersistentGameData>

class Persistence {
  constructor() {
    console.log(`Initializing persistence engine.`)
    console.log(`Writing cleansed data.`)
    this.writeData(this.data)
    const hoursAgo = (Date.now() - this.data.firstPlayed) / 3600000
    const d = this.data
    console.log(`You have played T.C.F.T.G. ${d.games.completed} time(s) in the last ${hoursAgo.toFixed(1)} hours`)
    console.log(this.data)
    this.log('ready to play.')
  }
  public get data(): PersistentGameData {
    let o: PartialGameData = {}
    try {
      const str = window.localStorage.getItem('gameData')
      o = JSON.parse(str ?? '{}')
    } catch (err) {
      console.error(err)
    }
    const data: PersistentGameData = {
      gameVersion: o.gameVersion ?? constants.version,
      firstPlayed: o.firstPlayed ?? Date.now(),
      lastPlayed: o.lastPlayed ?? Date.now(),
      games: {
        started: o.games?.started ?? 0,
        completed: o.games?.completed ?? 0,
      },
      aiRecord: this.emptyAiRecord(),
      playerId: o.playerId ?? this.randomPlayerId(),
    }
    const prevRecord = o.aiRecord || ({} as AiRecordDict)
    for (const aiName of aiNames) {
      data.aiRecord[aiName] = {
        wins: prevRecord[aiName]?.wins ?? 0,
        losses: prevRecord[aiName]?.losses ?? 0,
        shutoutWins: prevRecord[aiName]?.shutoutWins ?? 0,
        noJumpWins: prevRecord[aiName]?.noJumpWins ?? 0,
        fastestWin: prevRecord[aiName]?.fastestWin ?? null,
      }
    }
    return data
  }
  private writeData(d: PersistentGameData) {
    window.localStorage.setItem('gameData', JSON.stringify(d))
  }
  public incGamesStarted(numBalls: number, species: PlayerSpecies, aiName?: AiName) {
    this.log(`game started. numBalls=${numBalls}, species=${species}, ai=${aiName || ''}`)
    const d = this.data
    const now = Date.now()
    d.lastPlayed = now
    d.games.started++
    this.writeData(d)
  }
  public incGamesCompleted() {
    this.log('game complete.')
    const d = this.data
    d.lastPlayed = Date.now()
    d.games.completed++
    this.writeData(d)
  }
  public recordResultAgainstAi(aiName: AiName, win: boolean, shutoutWin: boolean, seconds: number, jumpCount: number) {
    this.log(`ai result. against=${aiName} win=${win} shutout=${shutoutWin} seconds=${seconds} jumps=${jumpCount}`)
    const d = this.data
    const record = d.aiRecord[aiName]
    console.log({aiName, win, shutoutWin, seconds, jumpCount})
    if (win) {
      record.wins++
      if (shutoutWin) record.shutoutWins++
      if (!jumpCount) record.noJumpWins++
      if (!record.fastestWin || seconds < record.fastestWin) record.fastestWin = seconds
    } else {
      record.losses++
    }
    console.log(`About to write`, JSON.stringify(d, null, 2))
    console.log(`Before write:`, JSON.stringify(this.data, null, 2))
    this.writeData(d)
    console.log(`After write:`, JSON.stringify(this.data, null, 2))
  }
  private emptyAiRecord(): AiRecordDict {
    const res: Partial<AiRecordDict> = {}
    for (const aiName of aiNames) {
      res[aiName] = {wins: 0, losses: 0, shutoutWins: 0, noJumpWins: 0, fastestWin: null}
    }
    return res as AiRecordDict
  }
  private randomPlayerId(): string {
    return randomByteHexString(16)
  }
  private log(text: string) {
    const msg = {action: 'log', playerId: this.data.playerId, text}
    const post = JSON.stringify(msg)
    const url = '/api/persistence'
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Content-type', 'application/json; charset=UTF-8')
    xhr.send(post)
    xhr.onload = () => {
      if (xhr.status === 201) console.log(`log: ${text}`)
    }
  }
}
const persistence = new Persistence()
export {persistence}
