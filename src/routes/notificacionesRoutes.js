const express = require('express')
const router  = express.Router()
const notificaciones = require('../../services/notificacionesService')
const { requireAuth } = require('../middleware/auth')

// GET /notificaciones/stream — Endpoint SSE (EventSource)
router.get('/notificaciones/stream', requireAuth, (req, res) => {
  const usuarioId = req.session.usuario.id
  notificaciones.conectar(usuarioId, res)
})

module.exports = router