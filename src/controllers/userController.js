'use strict'

const bcrypt  = require('bcryptjs')
const prisma  = require('../utils/db')
const helpers = require('../utils/helpers')

// ── GET /usuarios ─────────────────────────────────────────────────────────────

async function listarUsuarios(req, res) {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { fechaRegistro: 'desc' },
    })

    res.render('usuarios', {
      title: 'Gestion de Usuarios',
      user: req.session.usuario,
      usuarios,
      helpers,
    })

  } catch (err) {
    console.error('[userController] listarUsuarios:', err)
    req.flash('error', 'Error al cargar los usuarios.')
    res.redirect('/dashboard')
  }
}

// ── GET /usuarios/nuevo ───────────────────────────────────────────────────────

function mostrarFormulario(req, res) {
  res.render('registro', {
    title:   'Nuevo Usuario',
    user:    req.session.usuario,
    roles:   ['usuario', 'tecnico', 'admin'],
    helpers,
  })
}

// ── POST /usuarios ────────────────────────────────────────────────────────────

async function crearUsuario(req, res) {
  const { nombre, username, password, area, rol } = req.body

  if (!nombre || !username || !password) {
    req.flash('error', 'Nombre, usuario y contraseña son obligatorios.')
    return res.redirect('/usuarios/nuevo')
  }

  try {
    const existe = await prisma.usuario.findUnique({ where: { username } })
    if (existe) {
      req.flash('error', 'Ese nombre de usuario ya está en uso.')
      return res.redirect('/usuarios/nuevo')
    }

    await prisma.usuario.create({
      data: {
        nombre:   nombre.trim(),
        username: username.trim(),
        password: await bcrypt.hash(password, 10),
        area:     area ? area.trim() : null,
        rol:      rol || 'usuario',
      },
    })

    req.flash('success', `Usuario ${username} creado exitosamente.`)
    res.redirect('/usuarios')

  } catch (err) {
    console.error('[userController] crearUsuario:', err)
    req.flash('error', 'Error al crear el usuario.')
    res.redirect('/usuarios/nuevo')
  }
}

// ── POST /usuarios/:id/desactivar ─────────────────────────────────────────────

async function desactivarUsuario(req, res) {
  const id = parseInt(req.params.id)

  if (id === req.session.usuario.id) {
    req.flash('error', 'No puedes desactivar tu propia cuenta.')
    return res.redirect('/usuarios')
  }

  try {
    const u = await prisma.usuario.findUnique({ where: { id } })
    await prisma.usuario.update({ where: { id }, data: { activo: !u.activo } })

    req.flash('success', `Usuario ${u.activo ? 'desactivado' : 'activado'} correctamente.`)
    res.redirect('/usuarios')

  } catch (err) {
    console.error('[userController] desactivarUsuario:', err)
    req.flash('error', 'Error al actualizar el usuario.')
    res.redirect('/usuarios')
  }
}

// ── POST /usuarios/:id/editar ─────────────────────────────────────────────────

async function editarUsuario(req, res) {
  const id = parseInt(req.params.id)
  const { nombre, username, area, rol } = req.body

  if (!nombre || !username) {
    req.flash('error', 'Nombre y usuario son obligatorios.')
    return res.redirect('/usuarios')
  }

  try {
    const usernameTomado = await prisma.usuario.findFirst({
      where: { username: username.trim(), NOT: { id } },
    })
    if (usernameTomado) {
      req.flash('error', 'Ese nombre de usuario ya está en uso por otra cuenta.')
      return res.redirect('/usuarios')
    }

    const actual  = await prisma.usuario.findUnique({ where: { id } })
    const rolFinal = actual.rol === 'gerencia' ? actual.rol : (rol || actual.rol)

    await prisma.usuario.update({
      where: { id },
      data: {
        nombre:   nombre.trim(),
        username: username.trim(),
        area:     area ? area.trim() : null,
        rol:      rolFinal,
      },
    })

    req.flash('success', `Usuario ${nombre} actualizado correctamente.`)
    res.redirect('/usuarios')

  } catch (err) {
    console.error('[userController] editarUsuario:', err)
    req.flash('error', 'Error al editar el usuario.')
    res.redirect('/usuarios')
  }
}

// ── POST /usuarios/:id/password ───────────────────────────────────────────────

async function cambiarPasswordUsuario(req, res) {
  const { passwordNueva, passwordConfirm } = req.body

  if (!passwordNueva || !passwordConfirm) {
    req.flash('error', 'Completa ambos campos.')
    return res.redirect('/usuarios')
  }
  if (passwordNueva !== passwordConfirm) {
    req.flash('error', 'Las contraseñas no coinciden.')
    return res.redirect('/usuarios')
  }
  if (passwordNueva.length < 6) {
    req.flash('error', 'La contraseña debe tener al menos 6 caracteres.')
    return res.redirect('/usuarios')
  }

  try {
    await prisma.usuario.update({
      where: { id: parseInt(req.params.id) },
      data:  { password: await bcrypt.hash(passwordNueva, 10) },
    })

    req.flash('success', 'Contraseña cambiada correctamente.')
    res.redirect('/usuarios')

  } catch (err) {
    console.error('[userController] cambiarPasswordUsuario:', err)
    req.flash('error', 'Error al cambiar la contraseña.')
    res.redirect('/usuarios')
  }
}

// ── POST /usuarios/:id/eliminar ───────────────────────────────────────────────

async function eliminarUsuario(req, res) {
  const id = parseInt(req.params.id)

  if (id === req.session.usuario.id) {
    req.flash('error', 'No puedes eliminar tu propia cuenta.')
    return res.redirect('/usuarios')
  }

  try {
    const u = await prisma.usuario.findUnique({ where: { id } })

    if (u.rol === 'gerencia') {
      req.flash('error', 'Las cuentas con rol Gerencia no se pueden eliminar desde aquí.')
      return res.redirect('/usuarios')
    }

    const ticketsCreados = await prisma.ticket.count({ where: { usuarioId: id } })
    if (ticketsCreados > 0) {
      req.flash('error', 'No se puede eliminar: el usuario tiene tickets registrados. Desactívalo en su lugar.')
      return res.redirect('/usuarios')
    }

    // Desvincular tickets asignados y eliminar comentarios antes de borrar
    await prisma.ticket.updateMany({ where: { tecnicoId: id }, data: { tecnicoId: null } })
    await prisma.comentario.deleteMany({ where: { usuarioId: id } })
    await prisma.usuario.delete({ where: { id } })

    req.flash('success', `Usuario ${u.nombre} eliminado correctamente.`)
    res.redirect('/usuarios')

  } catch (err) {
    console.error('[userController] eliminarUsuario:', err)
    req.flash('error', 'Error al eliminar el usuario.')
    res.redirect('/usuarios')
  }
}

module.exports = {
  listarUsuarios,
  mostrarFormulario,
  crearUsuario,
  desactivarUsuario,
  editarUsuario,
  cambiarPasswordUsuario,
  eliminarUsuario,
}
