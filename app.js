const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const morgan = require('morgan')

const app = express()
const port = 3377

app.use(morgan('combined'))
app.enable('trust proxy')
app.use(express.static('dist'))
app.use(favicon(path.join(__dirname, 'dist', 'images', 'site', 'favicon.ico')))

const serveGame = (res) => res.sendFile(path.join(__dirname, 'dist/game.html'))
app.get('/', (_req, res) => serveGame(res))
app.get('/play', (_req, res) => serveGame(res))

app.listen(port, () => console.log(`Listening. Visit http://localhost:${port}`))
