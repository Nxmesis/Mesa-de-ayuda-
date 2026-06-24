'use strict'

function requireAuth(req, res, next) {
  if (!req.session.usuario) {
    req.flash('error', 'Debes iniciar sesión para acceder.')
    return res.redirect('/login')
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.session.usuario) return res.redirect('/login')
  const { rol } = req.session.usuario
  if (rol !== 'admin' && rol !== 'tecnico') {
    req.flash('error', 'No tienes permisos para acceder a esa sección.')
    return res.redirect('/dashboard')
  }
  next()
}

function requireAdminOnly(req, res, next) {
  if (!req.session.usuario || req.session.usuario.rol !== 'admin') {
    req.flash('error', 'Solo el administrador puede realizar esta acción.')
    return res.redirect('/dashboard')
  }
  next()
}

module.exports = { requireAuth, requireAdmin, requireAdminOnly }
