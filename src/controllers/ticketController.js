'use strict'

const prisma          = require('../utils/db')
const helpers         = require('../utils/helpers')
const notificaciones  = require('../../services/notificacionesService')

// ── Helper interno: genera número de ticket ───────────────────────────────────

async function generarNumeroTicket() {
  const hoy       = new Date()
  const fecha     = hoy.toISOString().slice(0, 10).replace(/-/g, '')
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)

  const count = await prisma.ticket.count({
    where: { fechaCreacion: { gte: inicioDia, lt: finDia } },
  })

  return `TK-${fecha}-${String(count + 1).padStart(4, '0')}`
}

// ── Helper interno: obtener IDs de todos los admin/tecnico ───────────────────

async function obtenerIdsAdmins() {
  const admins = await prisma.usuario.findMany({
    where:  { rol: { in: ['admin', 'tecnico'] }, activo: true },
    select: { id: true },
  })
  return admins.map(a => a.id)
}

// ── GET /tickets ──────────────────────────────────────────────────────────────

async function listarTickets(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === 'admin' || user.rol === 'tecnico'
    const { estado, prioridad, buscar } = req.query

    const where = esAdmin ? {} : { usuarioId: user.id }
    if (estado)    where.estado    = estado
    if (prioridad) where.prioridad = prioridad
    if (buscar) {
      where.OR = [
        { titulo:       { contains: buscar } },
        { descripcion:  { contains: buscar } },
        { numeroTicket: { contains: buscar } },
      ]
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy: { fechaCreacion: 'desc' },
      include: {
        usuario:   { select: { nombre: true, area: true } },
        categoria: { select: { nombre: true } },
        tecnico:   { select: { nombre: true } },
      },
    })

    res.render('lista-tickets', {
      title: 'Lista de Tickets',
      user, tickets, helpers,
      filtros: { estado, prioridad, buscar },
    })

  } catch (err) {
    console.error('[ticketController] listarTickets:', err)
    req.flash('error', 'Error al cargar los tickets.')
    res.redirect('/dashboard')
  }
}

// ── GET /tickets/nuevo ────────────────────────────────────────────────────────

async function mostrarFormulario(req, res) {
  try {
    const categorias = await prisma.categoria.findMany({
      where:   { activo: true },
      orderBy: { nombre: 'asc' },
    })

    res.render('crear-ticket', {
      title:    'Crear Ticket',
      user:     req.session.usuario,
      categorias, helpers,
    })

  } catch (err) {
    console.error('[ticketController] mostrarFormulario:', err)
    req.flash('error', 'Error al cargar el formulario.')
    res.redirect('/tickets')
  }
}

// ── POST /tickets ─────────────────────────────────────────────────────────────

async function crearTicket(req, res) {
  const { titulo, descripcion, equipo, prioridad, categoriaId } = req.body
  const user = req.session.usuario

  if (!titulo || !descripcion || !prioridad) {
    req.flash('error', 'El título, la descripción y la prioridad son obligatorios.')
    return res.redirect('/tickets/nuevo')
  }

  if (!helpers.esPrioridadValida(prioridad)) {
    req.flash('error', 'Prioridad no válida.')
    return res.redirect('/tickets/nuevo')
  }

  try {
    const numeroTicket = await generarNumeroTicket()

    const ticket = await prisma.ticket.create({
      data: {
        numeroTicket,
        titulo:        titulo.trim(),
        descripcion:   descripcion.trim(),
        equipo:        equipo       ? equipo.trim()       : null,
        prioridad,
        categoriaId:   categoriaId  ? parseInt(categoriaId) : null,
        usuarioId:     user.id,
        imagenAdjunta: req.file     ? req.file.filename   : null,
      },
    })

    // ── Notificar a todos los admin/técnico ──────────────
    const idsAdmins = await obtenerIdsAdmins()
    // No notificar al creador si él mismo es admin/técnico
    const destinatarios = idsAdmins.filter(id => id !== user.id)

    notificaciones.enviarAMultiples(destinatarios, {
      tipo:     'nuevo_ticket',
      titulo:   'Nueva solicitud recibida',
      mensaje:  `${user.nombre} creó el ticket ${numeroTicket}: "${titulo.trim()}"`,
      ticketId: ticket.id,
    })

    req.flash('success', `Ticket ${numeroTicket} creado exitosamente.`)
    res.redirect('/tickets')

  } catch (err) {
    console.error('[ticketController] crearTicket:', err)
    req.flash('error', 'Error al crear el ticket.')
    res.redirect('/tickets/nuevo')
  }
}

// ── GET /tickets/:id ──────────────────────────────────────────────────────────

async function verTicket(req, res) {
  const user = req.session.usuario

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        usuario:     { select: { nombre: true, area: true } },
        tecnico:     { select: { nombre: true } },
        categoria:   { select: { nombre: true } },
        comentarios: {
          include: { usuario: { select: { nombre: true, rol: true } } },
          orderBy: { fechaCreacion: 'asc' },
        },
      },
    })

    if (!ticket) {
      req.flash('error', 'Ticket no encontrado.')
      return res.redirect('/tickets')
    }

    if (user.rol === 'usuario' && ticket.usuarioId !== user.id) {
      req.flash('error', 'No tienes acceso a ese ticket.')
      return res.redirect('/tickets')
    }

    let tecnicos = []
    if (user.rol === 'admin' || user.rol === 'tecnico') {
      tecnicos = await prisma.usuario.findMany({
        where:  { rol: { in: ['tecnico', 'admin'] }, activo: true },
        select: { id: true, nombre: true },
      })
    }

    res.render('detalle-ticket', {
      title: `Ticket ${ticket.numeroTicket}`,
      user, ticket, tecnicos, helpers,
    })

  } catch (err) {
    console.error('[ticketController] verTicket:', err)
    req.flash('error', 'Error al cargar el ticket.')
    res.redirect('/tickets')
  }
}

// ── POST /tickets/:id/estado ──────────────────────────────────────────────────

async function cambiarEstado(req, res) {
  const { id }                          = req.params
  const { estado, solucion, prioridad, tecnicoId } = req.body

  try {
    const ticketAntes = await prisma.ticket.findUnique({
      where:   { id: parseInt(id) },
      select:  { estado: true, usuarioId: true, tecnicoId: true, numeroTicket: true, titulo: true },
    })

    const data = { estado }

    if (prioridad && helpers.esPrioridadValida(prioridad)) data.prioridad = prioridad
    if (tecnicoId) data.tecnicoId = parseInt(tecnicoId)
    if (estado === 'Solucionado' || estado === 'Cerrado') {
      data.fechaCierre = new Date()
      if (solucion) data.solucion = solucion.trim()
    }

    await prisma.ticket.update({ where: { id: parseInt(id) }, data })

    // ── Notificaciones ───────────────────────────────────

    // 1. Avisar al creador del ticket (si no es quien hace el cambio)
    if (ticketAntes.usuarioId !== req.session.usuario.id) {
      notificaciones.enviarAUsuario(ticketAntes.usuarioId, {
        tipo:     'estado',
        titulo:   'Tu solicitud fue actualizada',
        mensaje:  `El ticket ${ticketAntes.numeroTicket} cambió a estado: ${helpers.textoEstado(estado)}`,
        ticketId: parseInt(id),
      })
    }

    // 2. Avisar al técnico asignado si cambió (y no es quien hace el cambio)
    const nuevoTecnicoId = tecnicoId ? parseInt(tecnicoId) : ticketAntes.tecnicoId
    if (nuevoTecnicoId &&
        nuevoTecnicoId !== req.session.usuario.id &&
        nuevoTecnicoId !== ticketAntes.usuarioId) {
      notificaciones.enviarAUsuario(nuevoTecnicoId, {
        tipo:     'asignado',
        titulo:   'Ticket asignado',
        mensaje:  `Se te asignó el ticket ${ticketAntes.numeroTicket}: "${ticketAntes.titulo}"`,
        ticketId: parseInt(id),
      })
    }

    req.flash('success', 'Ticket actualizado correctamente.')
    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error('[ticketController] cambiarEstado:', err)
    req.flash('error', 'Error al actualizar el ticket.')
    res.redirect(`/tickets/${id}`)
  }
}

// ── POST /tickets/:id/asignar ─────────────────────────────────────────────────

async function asignarTecnico(req, res) {
  const { id }       = req.params
  const { tecnicoId } = req.body

  try {
    const ticket = await prisma.ticket.findUnique({
      where:  { id: parseInt(id) },
      select: { usuarioId: true, numeroTicket: true, titulo: true },
    })

    await prisma.ticket.update({
      where: { id: parseInt(id) },
      data:  { tecnicoId: parseInt(tecnicoId), estado: 'EnProceso' },
    })

    // Avisar al técnico asignado
    if (parseInt(tecnicoId) !== req.session.usuario.id) {
      notificaciones.enviarAUsuario(parseInt(tecnicoId), {
        tipo:     'asignado',
        titulo:   'Ticket asignado',
        mensaje:  `Se te asignó el ticket ${ticket.numeroTicket}: "${ticket.titulo}"`,
        ticketId: parseInt(id),
      })
    }

    // Avisar al creador
    if (ticket.usuarioId !== req.session.usuario.id) {
      notificaciones.enviarAUsuario(ticket.usuarioId, {
        tipo:     'estado',
        titulo:   'Tu solicitud está en proceso',
        mensaje:  `El ticket ${ticket.numeroTicket} fue asignado a un técnico`,
        ticketId: parseInt(id),
      })
    }

    req.flash('success', 'Técnico asignado.')
    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error('[ticketController] asignarTecnico:', err)
    req.flash('error', 'Error al asignar técnico.')
    res.redirect(`/tickets/${id}`)
  }
}

// ── POST /tickets/:id/comentario ──────────────────────────────────────────────

async function agregarComentario(req, res) {
  const { id }                = req.params
  const { contenido, esInterno } = req.body
  const user                  = req.session.usuario

  if (!contenido || !contenido.trim()) {
    req.flash('error', 'El comentario no puede estar vacío.')
    return res.redirect(`/tickets/${id}`)
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where:  { id: parseInt(id) },
      select: { usuarioId: true, tecnicoId: true, numeroTicket: true },
    })

    await prisma.comentario.create({
      data: {
        contenido:  contenido.trim(),
        esInterno:  esInterno === 'on',
        ticketId:   parseInt(id),
        usuarioId:  user.id,
      },
    })

    // Solo notificar si el comentario es público
    if (esInterno !== 'on') {
      // Si escribe el técnico/admin → avisar al creador
      if ((user.rol === 'admin' || user.rol === 'tecnico') &&
           user.id !== ticket.usuarioId) {
        notificaciones.enviarAUsuario(ticket.usuarioId, {
          tipo:     'comentario',
          titulo:   'Nuevo comentario en tu solicitud',
          mensaje:  `El técnico respondió en el ticket ${ticket.numeroTicket}`,
          ticketId: parseInt(id),
        })
      }

      // Si escribe el usuario → avisar al técnico asignado
      if (user.rol === 'usuario' && ticket.tecnicoId &&
          ticket.tecnicoId !== user.id) {
        notificaciones.enviarAUsuario(ticket.tecnicoId, {
          tipo:     'comentario',
          titulo:   'Nuevo comentario de usuario',
          mensaje:  `El usuario comentó en el ticket ${ticket.numeroTicket}`,
          ticketId: parseInt(id),
        })
      }
    }

    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error('[ticketController] agregarComentario:', err)
    req.flash('error', 'Error al agregar el comentario.')
    res.redirect(`/tickets/${id}`)
  }
}

module.exports = {
  listarTickets,
  mostrarFormulario,
  crearTicket,
  verTicket,
  cambiarEstado,
  asignarTecnico,
  agregarComentario,
}
