const express = require('express')
const jwt = require('jsonwebtoken')
const sseEmitter = require('../utils/sseEmitter')
const { logger } = require('../utils/logger')

const router = express.Router()

router.get('/lecturas', (req, res) => {
  const token = req.query.token
  if (!token) return res.status(401).json({ error: 'Token requerido' })

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  res.flushHeaders()

  logger(`📡 SSE: cliente conectado (usuario ${decoded.correo || decoded.id})`)

  const onLectura = (data) => {
    if (data.empresaId !== decoded.empresaId) return
    res.write(`event: lectura\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const onStatus = (data) => {
    res.write(`event: status\ndata: ${JSON.stringify(data)}\n\n`)
  }

  sseEmitter.on('lectura', onLectura)
  sseEmitter.on('status', onStatus)

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n')
  }, 30000)

  req.on('close', () => {
    clearInterval(heartbeat)
    sseEmitter.off('lectura', onLectura)
    sseEmitter.off('status', onStatus)
    logger(`📡 SSE: cliente desconectado (usuario ${decoded.correo || decoded.id})`)
  })
})

module.exports = router
