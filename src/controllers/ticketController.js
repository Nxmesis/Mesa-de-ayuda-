"use strict"

const prisma  = require("../utils/db")
const helpers = require("../utils/helpers")
const notificaciones = require("../../services/notificacionesService")

// ── Helpers internos ──────────────────────────────────────────────────────────

async function generarNumeroTicket() {
  const hoy       = new Date()
  const fecha     = hoy.toISOString().slice(0, 10).replace(/-/g, "")
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const finDia    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)

  const count = await prisma.ticket.count({
    where: { fechaCreacion: { gte: inicioDia, lt: finDia } },
  })

  return `TK-${fecha}-${String(count + 1).padStart(4, "0")}`
}

function buildViewData(extra = {}) {
  return { helpers, ...extra }
}

// ── GET /tickets ──────────────────────────────────────────────────────────────

async function listarTickets(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === "admin" || user.rol === "tecnico"
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
      orderBy: { fechaCreacion: "desc" },
      include: {
        usuario:   { select: { nombre: true, area: true } },
        categoria: { select: { nombre: true } },
        tecnico:   { select: { nombre: true } },
      },
    })

    res.render("lista-tickets", buildViewData({
      title: "Lista de Tickets",
      user, tickets,
      filtros: { estado, prioridad, buscar },
    }))

  } catch (err) {
    console.error("[ticketController] listarTickets:", err)
    req.flash("error", "Error al cargar los tickets.")
    res.redirect("/dashboard")
  }
}

// ── GET /tickets/nuevo ────────────────────────────────────────────────────────

async function mostrarFormulario(req, res) {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
    })

    res.render("crear-ticket", buildViewData({
      title: "Crear Ticket",
      user: req.session.usuario,
      categorias,
    }))

  } catch (err) {
    console.error("[ticketController] mostrarFormulario:", err)
    req.flash("error", "Error al cargar el formulario.")
    res.redirect("/tickets")
  }
}

// ── POST /tickets ─────────────────────────────────────────────────────────────

async function crearTicket(req, res) {
  const { titulo, descripcion, equipo, prioridad, categoriaId } = req.body
  const user = req.session.usuario

  if (!titulo || !descripcion || !prioridad) {
    req.flash("error", "El título, la descripción y la prioridad son obligatorios.")
    return res.redirect("/tickets/nuevo")
  }

  if (!helpers.esPrioridadValida(prioridad)) {
    req.flash("error", "Prioridad no válida.")
    return res.redirect("/tickets/nuevo")
  }

  try {
    const numeroTicket = await generarNumeroTicket()

    await prisma.ticket.create({
      data: {
        numeroTicket,
        titulo:       titulo.trim(),
        descripcion:  descripcion.trim(),
        equipo:       equipo ? equipo.trim() : null,
        prioridad,
        categoriaId:  categoriaId ? parseInt(categoriaId) : null,
        usuarioId:    user.id,
        imagenAdjunta: req.file ? req.file.filename : null,
      },
    })

    req.flash("success", `Ticket ${numeroTicket} creado exitosamente.`)
    res.redirect("/tickets")

  } catch (err) {
    console.error("[ticketController] crearTicket:", err)
    req.flash("error", "Error al crear el ticket.")
    res.redirect("/tickets/nuevo")
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
          orderBy: { fechaCreacion: "asc" },
        },
      },
    })

    if (!ticket) {
      req.flash("error", "Ticket no encontrado.")
      return res.redirect("/tickets")
    }

    if (user.rol === "usuario" && ticket.usuarioId !== user.id) {
      req.flash("error", "No tienes acceso a ese ticket.")
      return res.redirect("/tickets")
    }

    let tecnicos = []
    if (user.rol === "admin" || user.rol === "tecnico") {
      tecnicos = await prisma.usuario.findMany({
        where:  { rol: { in: ["tecnico", "admin"] }, activo: true },
        select: { id: true, nombre: true },
      })
    }

    res.render("detalle-ticket", buildViewData({
      title: `Ticket ${ticket.numeroTicket}`,
      user, ticket, tecnicos,
    }))

  } catch (err) {
    console.error("[ticketController] verTicket:", err)
    req.flash("error", "Error al cargar el ticket.")
    res.redirect("/tickets")
  }
}

// ── POST /tickets/:id/estado ──────────────────────────────────────────────────

async function cambiarEstado(req, res) {
  const { id } = req.params
  const { estado, solucion, prioridad, tecnicoId } = req.body

  try {
    const data = { estado }

    if (prioridad && helpers.esPrioridadValida(prioridad)) {
      data.prioridad = prioridad
    }
    if (tecnicoId) {
      data.tecnicoId = parseInt(tecnicoId)
    }
    if (estado === "Solucionado" || estado === "Cerrado") {
      data.fechaCierre = new Date()
      if (solucion) data.solucion = solucion.trim()
    }

    // Actualizar ticket Y obtener datos del creador para notificar
    const ticket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data,
      include: {
        usuario: { select: { id: true, nombre: true } },
        tecnico: { select: { id: true, nombre: true } },
      },
    })

    // ═══════════════════════════════════════════════════════
    //  NOTIFICAR AL CREADOR DEL TICKET
    // ═══════════════════════════════════════════════════════
    notificaciones.enviarAUsuario(ticket.usuarioId, {
      tipo: "estado",
      titulo: "Ticket actualizado",
      mensaje: `Tu ticket ${ticket.numeroTicket} ahora está: ${estado}`,
      ticketId: parseInt(id),
      nuevoEstado: estado,
    })

    // Si se asignó un técnico nuevo, notificar al técnico
    if (tecnicoId && ticket.tecnicoId) {
      notificaciones.enviarAUsuario(parseInt(tecnicoId), {
        tipo: "asignado",
        titulo: "Nuevo ticket asignado",
        mensaje: `Se te ha asignado el ticket ${ticket.numeroTicket}`,
        ticketId: parseInt(id),
      })
    }

    req.flash("success", "Ticket actualizado correctamente.")
    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error("[ticketController] cambiarEstado:", err)
    req.flash("error", "Error al actualizar el ticket.")
    res.redirect(`/tickets/${id}`)
  }
}

// ── POST /tickets/:id/asignar ─────────────────────────────────────────────────

async function asignarTecnico(req, res) {
  const { id } = req.params
  const nuevoTecnicoId = parseInt(req.body.tecnicoId)

  try {
    const ticket = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data:  { tecnicoId: nuevoTecnicoId, estado: "EnProceso" },
      include: {
        usuario: { select: { id: true, nombre: true } },
        tecnico: { select: { id: true, nombre: true } },
      },
    })

    // ═══════════════════════════════════════════════════════
    //  NOTIFICAR AL TÉCNICO ASIGNADO
    // ═══════════════════════════════════════════════════════
    notificaciones.enviarAUsuario(nuevoTecnicoId, {
      tipo: "asignado",
      titulo: "Nuevo ticket asignado",
      mensaje: `Se te ha asignado el ticket ${ticket.numeroTicket}: ${ticket.titulo}`,
      ticketId: parseInt(id),
    })

    // Notificar al creador que su ticket está en proceso
    notificaciones.enviarAUsuario(ticket.usuarioId, {
      tipo: "estado",
      titulo: "Tu ticket está en proceso",
      mensaje: `Tu ticket ${ticket.numeroTicket} ha sido asignado a ${ticket.tecnico?.nombre || "un técnico"} y está en proceso de solución.`,
      ticketId: parseInt(id),
      nuevoEstado: "EnProceso",
    })

    req.flash("success", "Técnico asignado.")
    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error("[ticketController] asignarTecnico:", err)
    req.flash("error", "Error al asignar técnico.")
    res.redirect(`/tickets/${id}`)
  }
}

// ── POST /tickets/:id/comentario ──────────────────────────────────────────────

async function agregarComentario(req, res) {
  const { id } = req.params
  const { contenido, esInterno } = req.body
  const user = req.session.usuario

  if (!contenido || !contenido.trim()) {
    req.flash("error", "El comentario no puede estar vacío.")
    return res.redirect(`/tickets/${id}`)
  }

  try {
    const comentario = await prisma.comentario.create({
      data: {
        contenido:  contenido.trim(),
        esInterno:  esInterno === "on",
        ticketId:   parseInt(id),
        usuarioId:  user.id,
      },
      include: {
        ticket: {
          include: {
            usuario: { select: { id: true, nombre: true } },
            tecnico: { select: { id: true, nombre: true } },
          },
        },
      },
    })

    // ═══════════════════════════════════════════════════════
    //  NOTIFICAR SOLO SI NO ES COMENTARIO INTERNO
    // ═══════════════════════════════════════════════════════
    if (!comentario.esInterno) {
      const ticket = comentario.ticket
      const comentarista = user.nombre

      // Notificar al creador del ticket (si no es quien comenta)
      if (ticket.usuarioId !== user.id) {
        notificaciones.enviarAUsuario(ticket.usuarioId, {
          tipo: "comentario",
          titulo: "Nuevo comentario en tu ticket",
          mensaje: `${comentarista} comentó en tu ticket ${ticket.numeroTicket}.`,
          ticketId: parseInt(id),
        })
      }

      // Notificar al técnico asignado (si no es quien comenta)
      if (ticket.tecnicoId && ticket.tecnicoId !== user.id) {
        notificaciones.enviarAUsuario(ticket.tecnicoId, {
          tipo: "comentario",
          titulo: "Nuevo comentario",
          mensaje: `${comentarista} comentó en el ticket ${ticket.numeroTicket} que tienes asignado.`,
          ticketId: parseInt(id),
        })
      }
    }

    res.redirect(`/tickets/${id}`)

  } catch (err) {
    console.error("[ticketController] agregarComentario:", err)
    req.flash("error", "Error al agregar el comentario.")
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

