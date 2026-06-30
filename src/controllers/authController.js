'use strict'

const bcrypt = require('bcryptjs')
const prisma = require('../utils/db')

// GET /login
function mostrarLogin(req, res) {
  if (req.session.usuario) {
    const rol = req.session.usuario.rol
    return res.redirect(rol === 'admin' || rol === 'tecnico' ? '/dashboard' : '/tickets')
  }
  res.render('login', { titulo: 'Iniciar sesión' })
}

// POST /login
async function procesarLogin(req, res) {
  const { username, password } = req.body

  if (!username || !password) {
    req.flash('error', 'Completa todos los campos.')
    return res.redirect('/login')
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { username: username.trim() },
    })

    if (!usuario || !usuario.activo) {
      req.flash('error', 'Usuario o contraseña incorrectos.')
      return res.redirect('/login')
    }

    const passwordValida = await bcrypt.compare(password, usuario.password)
    if (!passwordValida) {
      req.flash('error', 'Usuario o contraseña incorrectos.')
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

    // Redirección según rol
    if (usuario.rol === 'admin' || usuario.rol === 'tecnico') {
      res.redirect('/dashboard')
    } else {
      res.redirect('/tickets')
    }

  } catch (err) {
    console.error('[authController] procesarLogin:', err)
    req.flash('error', 'Error interno. Intenta de nuevo.')
    res.redirect('/login')
  }
}

// POST /logout
function cerrarSesion(req, res) {
  req.session.destroy(() => res.redirect('/login'))
}

module.exports = { mostrarLogin, procesarLogin, cerrarSesion }