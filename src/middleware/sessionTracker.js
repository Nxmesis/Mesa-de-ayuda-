'use strict'

// Mapa en memoria de usuarios conectados: userId -> { lastActivity, nombre }
const usuariosConectados = new Map()

/**
 * Middleware Express: marca al usuario como "en línea" en cada request
 */
function trackSession(req, res, next) {
  if (req.session && req.session.usuario) {
    const userId = req.session.usuario.id
    usuariosConectados.set(userId, {
      lastActivity: Date.now(),
      nombre: req.session.usuario.nombre
    })
  }
  next()
}

/**
 * Limpia usuarios inactivos después de X minutos
 */
function limpiarInactivos(minutos = 5) {
  const ahora = Date.now()
  const limite = minutos * 60 * 1000
  for (const [userId, data] of usuariosConectados) {
    if (ahora - data.lastActivity > limite) {
      usuariosConectados.delete(userId)
    }
  }
}

/**
 * Verifica si un usuario está en línea
 */
function estaConectado(userId) {
  limpiarInactivos()
  return usuariosConectados.has(userId)
}

module.exports = {
  trackSession,
  estaConectado,
  usuariosConectados
}