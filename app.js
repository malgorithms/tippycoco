const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const morgan = require('morgan')
const fs = require('fs/promises')

const app = express()
const port = 3377

app.use(express.json())
app.use(morgan('combined'))
app.enable('trust proxy')
app.use(express.static('dist'))
app.use(favicon(path.join(__dirname, 'dist', 'images', 'site', 'favicon.ico')))

const serveGame = (res) => res.sendFile(path.join(__dirname, 'dist/game.html'))
app.get('/', (_req, res) => serveGame(res))
app.get('/play', (_req, res) => serveGame(res))

// Simple gameplay logging to see how often it is played/won/etc.
// without 3rd party cookie garbage.

const gameLog = path.join(__dirname, 'games.log')

function dateStr(d) {
  const p = (n, dig) => `${n}`.padStart(dig, '0')
  const year = d.getFullYear()
  const month = p(d.getMonth() + 1, 2)
  const date = p(d.getDate(), 2)
  const hour = p(d.getHours(), 2)
  const min = p(d.getMinutes(), 2)
  const sec = p(d.getSeconds(), 2)
  const ms = p(d.getMilliseconds(), 4)
  return `${year}-${month}-${date}-${hour}:${min}:${sec}.${ms}`
}

app.post('/api/persistence', async (req, res) => {
  const d = new Date()
  const o = req.body
  if (o?.action === 'log') {
    const txt = (req.body?.text || '-').slice(0, 120)
    const logLine = `${dateStr(new Date())} [${req.body?.playerId ?? 'unknown'}] ${txt}`
    await fs.appendFile(gameLog, logLine + '\n')
    console.log(logLine)
  }
  res.json({status: 0})
})

app.listen(port, () => console.log(`Listening. Visit http://localhost:${port}`))
