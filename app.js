const express = require('express')
const path = require('path')
const favicon = require('serve-favicon')
const morgan = require('morgan')

const app = express()
const port = 3377

app.use(morgan('combined'))
app.use(express.static('dist'))
app.use(favicon(path.join(__dirname, 'dist', 'images', 'favicon.ico')))

app.listen(port, () => console.log(`Listening. Visit http://localhost:${port}`))
