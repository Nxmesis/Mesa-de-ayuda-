'use strict'

const prisma          = require('../utils/db')
const helpers         = require('../utils/helpers')
const notificaciones  = require('../../services/notificacionesService')

// ── GET /ordenes ──────────────────────────────────────────────────────────────
// Bandeja: muestra las órdenes donde el usuario es remitente o destinatario.
// La privacidad queda garantizada porque el where siempre filtra por el id
// del usuario en sesión, nunca por parámetros de URL.

async function listarOrdenes(req, res) {
  try {
    const user = req.session.usuario

    const ordenes = await prisma.orden.findMany({
      where: {
        OR: [
          { destinatarioId: user.id },
          { remitenteId: user.id },
        ],
      },
      orderBy: { fechaCreacion: 'desc' },
      include: {
        remitente:    { select: { id: true, nombre: true } },
        destinatario: { select: { id: true, nombre: true } },
      },
    })

    res.render('ordenes', {
      title: 'Ordenes',
      user, ordenes, helpers,
    })

  } catch (err) {
    console.error('[ordenController] listarOrdenes:', err)
    req.flash('error', 'Error al cargar las órdenes.')
    res.redirect('/tickets')
  }
}

// ── GET /ordenes/nueva ─────────────────────────────────────────────────────────
// Solo admin/tecnico (ya filtrado por requireAdmin en la ruta).

async function mostrarFormulario(req, res) {
  try {
    const usuarios = await prisma.usuario.findMany({
      where:   { activo: true, id: { not: req.session.usuario.id } },
      orderBy: { nombre: 'asc' },
      select:  { id: true, nombre: true, area: true },
    })

    res.render('orden-nueva', {
      title: 'Nueva Orden',
      user:  req.session.usuario,
      usuarios, helpers,
    })

  } catch (err) {
    console.error('[ordenController] mostrarFormulario:', err)
    req.flash('error', 'Error al cargar el formulario.')
    res.redirect('/ordenes')
  }
}

// ── POST /ordenes ──────────────────────────────────────────────────────────────

async function crearOrden(req, res) {
  const { destinatarioId, asunto, contenido } = req.body
  const user = req.session.usuario

  if (!destinatarioId || !asunto || !contenido) {
    req.flash('error', 'Destinatario, asunto y mensaje son obligatorios.')
    return res.redirect('/ordenes/nueva')
  }

  try {
    const destino = await prisma.usuario.findUnique({
      where:  { id: parseInt(destinatarioId) },
      select: { id: true, activo: true },
    })

    if (!destino || !destino.activo) {
      req.flash('error', 'El usuario destinatario no es válido.')
      return res.redirect('/ordenes/nueva')
    }

    const orden = await prisma.orden.create({
      data: {
        asunto:         asunto.trim(),
        contenido:      contenido.trim(),
        remitenteId:    user.id,
        destinatarioId: destino.id,
      },
    })

    notificaciones.enviarAUsuario(destino.id, {
      tipo:    'orden',
      titulo:  'Nueva solicitud de tu administrador',
      mensaje: `${user.nombre}: "${asunto.trim()}"`,
      ordenId: orden.id,
    })

    req.flash('success', 'Orden enviada correctamente.')
    res.redirect('/ordenes')

  } catch (err) {
    console.error('[ordenController] crearOrden:', err)
    req.flash('error', 'Error al enviar la orden.')
    res.redirect('/ordenes/nueva')
  }
}

// ── GET /ordenes/:id ───────────────────────────────────────────────────────────
// Solo el remitente o el destinatario pueden verla. Al abrirla, si el que
// entra es el destinatario y aún no la había leído, se marca como leída.

async function verOrden(req, res) {
  const id   = parseInt(req.params.id)
  const user = req.session.usuario

  try {
    const orden = await prisma.orden.findUnique({
      where: { id },
      include: {
        remitente:    { select: { id: true, nombre: true, rol: true } },
        destinatario: { select: { id: true, nombre: true, rol: true } },
      },
    })

    if (!orden) {
      req.flash('error', 'Orden no encontrada.')
      return res.redirect('/ordenes')
    }

    const esParte = orden.remitenteId === user.id || orden.destinatarioId === user.id
    if (!esParte) {
      req.flash('error', 'No tienes acceso a esa orden.')
      return res.redirect('/ordenes')
    }

    if (orden.destinatarioId === user.id && !orden.leido) {
      await prisma.orden.update({
        where: { id },
        data:  { leido: true, fechaLectura: new Date() },
      })
      orden.leido = true
    }

    res.render('detalle-orden', {
      title: 'Orden',
      user, orden, helpers,
    })

  } catch (err) {
    console.error('[ordenController] verOrden:', err)
    req.flash('error', 'Error al cargar la orden.')
    res.redirect('/ordenes')
  }
}

module.exports = {
  listarOrdenes,
  mostrarFormulario,
  crearOrden,
  verOrden,
}