import express, {Response} from 'express'
import path from 'path'
import fs from 'fs/promises'
import favicon from 'serve-favicon'
import morgan from 'morgan'

const app = express()
const port = 3377
const rootDir = path.join(__dirname, '..', '..')
app.set('view engine', 'toffee')
app.use(express.json())
app.use(morgan('combined'))
app.enable('trust proxy')
app.use(express.static('dist'))
app.use(favicon(path.join(rootDir, 'dist', 'images', 'site', 'favicon.ico')))

const viewDir = path.join(rootDir, 'site-backend', 'views')
const serveToff = (res: Response, fName: string) => res.render(path.join(viewDir, fName), {})

app.get('/', (_req, res) => serveToff(res, 'game.toffee'))
app.get('/play', (_req, res) => serveToff(res, 'game.toffee'))
app.get('/instructions', (_req, res) => serveToff(res, 'instructions.toffee'))
app.get('/about', (_req, res) => serveToff(res, 'about.toffee'))
app.get('/records', (_req, res) => serveToff(res, 'records.toffee'))

// Simple gameplay logging to see how often it is played/won/etc.
// without 3rd party cookie garbage.

const gameLog = path.join(__dirname, 'games.log')

function dateStr(d: Date) {
  const p = (n: number, dig: number) => `${n}`.padStart(dig, '0')
  const year = d.getFullYear()
  const month = p(d.getMonth() + 1, 2)
  const date = p(d.getDate(), 2)
  const hour = p(d.getHours(), 2)
  const min = p(d.getMinutes(), 2)
  const sec = p(d.getSeconds(), 2)
  const ms = p(d.getMilliseconds(), 4)
  return `${year}-${month}-${date}-${hour}:${min}:${sec}.${ms}`
}

//
// basic text logging of gameplay
//
app.post('/api/persistence', async (req, res) => {
  const o = req.body
  if (o?.action === 'log') {
    const txt = (o?.text || '-').slice(0, 120)
    const logLine = `${dateStr(new Date())} [${o?.playerId ?? 'unknown'}] ${txt}`
    await fs.appendFile(gameLog, logLine + '\n')
    console.log(logLine)
  }
  res.json({status: 0})
})

app.listen(port, () => console.log(`Listening. Visit http://localhost:${port}`))
