'use strict'

const bcrypt  = require('bcryptjs')
const prisma  = require('../utils/db')
const helpers = require('../utils/helpers')
const path    = require('path')
const fs      = require('fs')

// ── GET /perfil ───────────────────────────────────────────────────────────────

async function mostrarPerfil(req, res) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.session.usuario.id },
    })

    // Mantener sesión sincronizada con la BD
    req.session.usuario = {
      id:         usuario.id,
      nombre:     usuario.nombre,
      username:   usuario.username,
      area:       usuario.area,
      rol:        usuario.rol,
      fotoPerfil: usuario.fotoPerfil,
    }

    res.render('perfil', {
      title:   'Mi Perfil',
      user:    req.session.usuario,
      helpers,
    })

  } catch (err) {
    console.error('[perfilController] mostrarPerfil:', err)
    req.flash('error', 'Error al cargar el perfil.')
    res.redirect('/dashboard')
  }
}

// ── POST /perfil/datos ────────────────────────────────────────────────────────

async function actualizarDatos(req, res) {
  const { nombre, area } = req.body

  if (!nombre || !nombre.trim()) {
    req.flash('error', 'El nombre no puede estar vacío.')
    return res.redirect('/perfil')
  }

  try {
    const u = await prisma.usuario.update({
      where: { id: req.session.usuario.id },
      data:  { nombre: nombre.trim(), area: area ? area.trim() : null },
    })

    req.session.usuario.nombre = u.nombre
    req.session.usuario.area   = u.area

    req.flash('success', 'Datos actualizados correctamente.')
    res.redirect('/perfil')

  } catch (err) {
    console.error('[perfilController] actualizarDatos:', err)
    req.flash('error', 'Error al actualizar los datos.')
    res.redirect('/perfil')
  }
}

// ── POST /perfil/foto ─────────────────────────────────────────────────────────

async function actualizarFoto(req, res) {
  if (!req.file) {
    req.flash('error', 'Selecciona una imagen.')
    return res.redirect('/perfil')
  }

  try {
    const u = await prisma.usuario.findUnique({ where: { id: req.session.usuario.id } })

    // Eliminar foto anterior si existe
    if (u.fotoPerfil) {
      const rutaAnterior = path.join('./uploads/perfiles', u.fotoPerfil)
      if (fs.existsSync(rutaAnterior)) fs.unlinkSync(rutaAnterior)
    }

    await prisma.usuario.update({
      where: { id: req.session.usuario.id },
      data:  { fotoPerfil: req.file.filename },
    })

    req.session.usuario.fotoPerfil = req.file.filename

    req.flash('success', 'Foto de perfil actualizada.')
    res.redirect('/perfil')

  } catch (err) {
    console.error('[perfilController] actualizarFoto:', err)
    req.flash('error', 'Error al actualizar la foto.')
    res.redirect('/perfil')
  }
}

// ── POST /perfil/foto/eliminar ────────────────────────────────────────────────

async function eliminarFoto(req, res) {
  try {
    const u = await prisma.usuario.findUnique({ where: { id: req.session.usuario.id } })

    if (u.fotoPerfil) {
      const rutaFoto = path.join('./uploads/perfiles', u.fotoPerfil)
      if (fs.existsSync(rutaFoto)) fs.unlinkSync(rutaFoto)
    }

    await prisma.usuario.update({
      where: { id: req.session.usuario.id },
      data:  { fotoPerfil: null },
    })

    req.session.usuario.fotoPerfil = null

    req.flash('success', 'Foto eliminada.')
    res.redirect('/perfil')

  } catch (err) {
    console.error('[perfilController] eliminarFoto:', err)
    req.flash('error', 'Error al eliminar la foto.')
    res.redirect('/perfil')
  }
}

// ── POST /perfil/password ─────────────────────────────────────────────────────

async function cambiarPassword(req, res) {
  const { passwordActual, passwordNueva, passwordConfirm } = req.body

  if (!passwordActual || !passwordNueva || !passwordConfirm) {
    req.flash('error', 'Completa todos los campos.')
    return res.redirect('/perfil')
  }
  if (passwordNueva !== passwordConfirm) {
    req.flash('error', 'Las contraseñas nuevas no coinciden.')
    return res.redirect('/perfil')
  }
  if (passwordNueva.length < 6) {
    req.flash('error', 'La nueva contraseña debe tener al menos 6 caracteres.')
    return res.redirect('/perfil')
  }

  try {
    const u = await prisma.usuario.findUnique({ where: { id: req.session.usuario.id } })

    const valida = await bcrypt.compare(passwordActual, u.password)
    if (!valida) {
      req.flash('error', 'La contraseña actual no es correcta.')
      return res.redirect('/perfil')
    }

    await prisma.usuario.update({
      where: { id: req.session.usuario.id },
      data:  { password: await bcrypt.hash(passwordNueva, 10) },
    })

    req.flash('success', 'Contraseña cambiada correctamente.')
    res.redirect('/perfil')

  } catch (err) {
    console.error('[perfilController] cambiarPassword:', err)
    req.flash('error', 'Error al cambiar la contraseña.')
    res.redirect('/perfil')
  }
}

module.exports = { mostrarPerfil, actualizarDatos, actualizarFoto, eliminarFoto, cambiarPassword }
