'use strict'

const bcrypt = require('bcryptjs')
const prisma = require('../utils/db')

// ── Constantes ───────────────────────────────────────────────────────────────
const ROL_ADMIN = 'admin'
const ROL_TECNICO = 'tecnico'
const ROL_USUARIO = 'usuario'

// ── GET /login ───────────────────────────────────────────────────────────────
function mostrarLogin(req, res) {
  if (req.session.usuario) {
    const rol = req.session.usuario.rol
    const esAdminOTecnico = rol === ROL_ADMIN || rol === ROL_TECNICO
    return res.redirect(esAdminOTecnico ? '/dashboard' : '/tickets')
  }
  res.render('login', { titulo: 'Iniciar sesi\u00f3n' })
}

// ── POST /login ──────────────────────────────────────────────────────────────
async function procesarLogin(req, res) {
  const { username, password } = req.body

  if (!username?.trim() || !password) {
    req.flash('error', 'Completa todos los campos.')
    return res.redirect('/login')
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { username: username.trim() },
    })

    if (!usuario || !usuario.activo) {
      req.flash('error', 'Usuario o contrase\u00f1a incorrectos.')
      return res.redirect('/login')
    }

    const passwordValida = await bcrypt.compare(password, usuario.password)
    if (!passwordValida) {
      req.flash('error', 'Usuario o contrase\u00f1a incorrectos.')
      return res.redirect('/login')
    }

    req.session.usuario = {
      id:         usuario.id,
      nombre:     usuario.nombre,
      username:   usuario.username,
      area:       usuario.area,
      rol:        usuario.rol,
      fotoPerfil: usuario.fotoPerfil,
    }

    const esAdminOTecnico = usuario.rol === ROL_ADMIN || usuario.rol === ROL_TECNICO
    res.redirect(esAdminOTecnico ? '/dashboard' : '/tickets')

  } catch (err) {
    console.error('[authController] procesarLogin:', err)
    req.flash('error', 'Error interno. Intenta de nuevo.')
    res.redirect('/login')
  }
}

// ── POST /logout ─────────────────────────────────────────────────────────────
function cerrarSesion(req, res) {
  req.session.destroy(() => res.redirect('/login'))
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = { mostrarLogin, procesarLogin, cerrarSesion }