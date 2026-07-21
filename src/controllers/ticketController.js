'use strict'

const prisma         = require('../utils/db')
const helpers        = require('../utils/helpers')
const notificaciones = require('../../services/notificacionesService')

// ── Constantes ───────────────────────────────────────────────────────────────
const PRIORIDADES_VALIDAS = ['Baja', 'Media', 'Alta', 'Critica']
const ROLES_ADMIN = ['admin', 'tecnico']

// ── Helpers privados ─────────────────────────────────────────────────────────

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

async function obtenerIdsAdmins() {
  const admins = await prisma.usuario.findMany({
    where:  { rol: { in: ROLES_ADMIN }, activo: true },
    select: { id: true },
  })
  return admins.map(a => a.id)
}

function esPrioridadValida(prioridad) {
  return PRIORIDADES_VALIDAS.includes(prioridad)
}

// ── GET /tickets ─────────────────────────────────────────────────────────────
async function listarTickets(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = ROLES_ADMIN.includes(user.rol)
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

// ── GET /tickets/nuevo ───────────────────────────────────────────────────────
async function mostrarFormulario(req, res) {
  try {
    const categorias = await prisma.categoria.findMany({
      where:   { activo: true },
      orderBy: { nombre: 'asc' },
    })

    res.render('crear-ticket', {
      title: 'Crear Ticket',
      user:  req.session.usuario,
      categorias, helpers,
    })

  } catch (err) {
    console.error('[ticketController] mostrarFormulario:', err)
    req.flash('error', 'Error al cargar el formulario.')
    res.redirect('/tickets')
  }
}

// ── POST /tickets ────────────────────────────────────────────────────────────
async function crearTicket(req, res) {
  const { titulo, descripcion, equipo, prioridad, categoriaId, solicitarLlamada } = req.body
  const user = req.session.usuario
  const esLlamada = solicitarLlamada === 'on'

  if (!titulo?.trim() || !prioridad) {
    req.flash('error', 'El t\u00edtulo y la prioridad son obligatorios.')
    return res.redirect('/tickets/nuevo')
  }

  if (!esLlamada && !descripcion?.trim()) {
    req.flash('error', 'La descripci\u00f3n es obligatoria a menos que solicites una llamada.')
    return res.redirect('/tickets/nuevo')
  }

  if (!esPrioridadValida(prioridad)) {
    req.flash('error', 'Prioridad no v\u00e1lida.')
    return res.redirect('/tickets/nuevo')
  }

  try {
    const numeroTicket = await generarNumeroTicket()

    const ticket = await prisma.ticket.create({
      data: {
        numeroTicket,
        titulo:           titulo.trim(),
        descripcion:      esLlamada ? 'Solicitud de llamada telef\u00f3nica.' : descripcion.trim(),
        equipo:           equipo?.trim() || null,
        prioridad,
        categoriaId:      categoriaId ? parseInt(categoriaId) : null,
        usuarioId:        user.id,
        imagenAdjunta:    req.file ? req.file.filename : null,
        solicitarLlamada: esLlamada,
      },
    })

    const idsAdmins = await obtenerIdsAdmins()
    const destinatarios = idsAdmins.filter(id => id !== user.id)

    notificaciones.enviarAMultiples(destinatarios, {
      tipo:     'nuevo_ticket',
      titulo:   esLlamada ? 'Nueva solicitud de llamada' : 'Nueva solicitud recibida',
      mensaje:  `${user.nombre} cre\u00f3 el ticket ${numeroTicket}: "${titulo.trim()}"${esLlamada ? ' (Solicita llamada)' : ''}`,
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

// ── GET /tickets/:id ─────────────────────────────────────────────────────────
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
    if (ROLES_ADMIN.includes(user.rol)) {
      tecnicos = await prisma.usuario.findMany({
        where:  { rol: { in: ROLES_ADMIN }, activo: true },
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

// ── POST /tickets/:id/estado ─────────────────────────────────────────────────
async function cambiarEstado(req, res) {
  const { id } = req.params
  const { estado, solucion, prioridad, tecnicoId } = req.body

  try {
    const ticketAntes = await prisma.ticket.findUnique({
      where:   { id: parseInt(id) },
      select:  { estado: true, usuarioId: true, tecnicoId: true, numeroTicket: true, titulo: true },
    })

    const data = { estado }

    if (prioridad && esPrioridadValida(prioridad)) data.prioridad = prioridad
    if (tecnicoId) data.tecnicoId = parseInt(tecnicoId)
    if (estado === 'Solucionado' || estado === 'Cerrado') {
      data.fechaCierre = new Date()
      if (solucion?.trim()) data.solucion = solucion.trim()
    }

    await prisma.ticket.update({ where: { id: parseInt(id) }, data })

    // Notificar al creador si no fue \u00e9l quien actualiz\u00f3
    if (ticketAntes.usuarioId !== req.session.usuario.id) {
      notificaciones.enviarAUsuario(ticketAntes.usuarioId, {
        tipo:     'estado',
        titulo:   'Tu solicitud fue actualizada',
        mensaje:  `El ticket ${ticketAntes.numeroTicket} cambi\u00f3 a estado: ${helpers.textoEstado(estado)}`,
        ticketId: parseInt(id),
      })
    }

    const nuevoTecnicoId = tecnicoId ? parseInt(tecnicoId) : ticketAntes.tecnicoId
    if (nuevoTecnicoId &&
        nuevoTecnicoId !== req.session.usuario.id &&
        nuevoTecnicoId !== ticketAntes.usuarioId) {
      notificaciones.enviarAUsuario(nuevoTecnicoId, {
        tipo:     'asignado',
        titulo:   'Ticket asignado',
        mensaje:  `Se te asign\u00f3 el ticket ${ticketAntes.numeroTicket}: "${ticketAntes.titulo}"`,
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

// ── POST /tickets/:id/asignar ────────────────────────────────────────────────
async function asignarTecnico(req, res) {
  const { id } = req.params
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

    if (parseInt(tecnicoId) !== req.session.usuario.id) {
      notificaciones.enviarAUsuario(parseInt(tecnicoId), {
        tipo:     'asignado',
        titulo:   'Ticket asignado',
        mensaje:  `Se te asign\u00f3 el ticket ${ticket.numeroTicket}: "${ticket.titulo}"`,
        ticketId: parseInt(id),
      })
    }

    if (ticket.usuarioId !== req.session.usuario.id) {
      notificaciones.enviarAUsuario(ticket.usuarioId, {
        tipo:     'estado',
        titulo:   'Tu solicitud est\u00e1 en proceso',
        mensaje:  `El ticket ${ticket.numeroTicket} fue asignado a un t\u00e9cnico`,
        ticketId: parseInt(id),
      })
    }

    req.flash('success', 'T\u00e9cnico asignado.')
    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error('[ticketController] asignarTecnico:', err)
    req.flash('error', 'Error al asignar t\u00e9cnico.')
    res.redirect(`/tickets/${id}`)
  }
}

// ── POST /tickets/:id/comentario ─────────────────────────────────────────────
async function agregarComentario(req, res) {
  const { id } = req.params
  const { contenido, esInterno } = req.body
  const user   = req.session.usuario

  if (!contenido?.trim() && !req.file) {
    req.flash('error', 'El comentario no puede estar vac\u00edo si no adjuntas un archivo.')
    return res.redirect(`/tickets/${id}`)
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where:  { id: parseInt(id) },
      select: { usuarioId: true, tecnicoId: true, numeroTicket: true },
    })

    await prisma.comentario.create({
      data: {
        contenido:      contenido?.trim() || 'Archivo adjunto',
        esInterno:      esInterno === 'on',
        ticketId:       parseInt(id),
        usuarioId:      user.id,
        archivoAdjunto: req.file ? req.file.filename : null,
      },
    })

    if (esInterno !== 'on') {
      if (ROLES_ADMIN.includes(user.rol) && user.id !== ticket.usuarioId) {
        notificaciones.enviarAUsuario(ticket.usuarioId, {
          tipo:     'comentario',
          titulo:   'Nuevo comentario en tu solicitud',
          mensaje:  `El t\u00e9cnico respondi\u00f3 en el ticket ${ticket.numeroTicket}`,
          ticketId: parseInt(id),
        })
      }

      if (user.rol === 'usuario' && ticket.tecnicoId && ticket.tecnicoId !== user.id) {
        notificaciones.enviarAUsuario(ticket.tecnicoId, {
          tipo:     'comentario',
          titulo:   'Nuevo comentario de usuario',
          mensaje:  `El usuario coment\u00f3 en el ticket ${ticket.numeroTicket}`,
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

// ── POST /tickets/:id/solucion-media ─────────────────────────────────────────
async function subirSolucionMedia(req, res) {
  const { id } = req.params
  const { tipo } = req.body

  if (!req.file) {
    req.flash('error', 'No se seleccion\u00f3 ning\u00fan archivo.')
    return res.redirect(`/tickets/${id}`)
  }

  try {
    const data = tipo === 'video'
      ? { videoSolucion: req.file.filename }
      : { imagenSolucion: req.file.filename }

    await prisma.ticket.update({ where: { id: parseInt(id) }, data })

    req.flash('success', `${tipo === 'video' ? 'Video' : 'Imagen'} de soluci\u00f3n subido correctamente.`)
    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error('[ticketController] subirSolucionMedia:', err)
    req.flash('error', 'Error al subir el archivo.')
    res.redirect(`/tickets/${id}`)
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  listarTickets,
  mostrarFormulario,
  crearTicket,
  verTicket,
  cambiarEstado,
  asignarTecnico,
  agregarComentario,
  subirSolucionMedia,
}