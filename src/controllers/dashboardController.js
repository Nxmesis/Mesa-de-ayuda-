'use strict'

const prisma  = require('../utils/db')
const helpers = require('../utils/helpers')

// Mapa de estados del enum Prisma a claves del objeto stats
const ESTADO_MAP = {
  Pendiente:     'PENDIENTE',
  EnProceso:     'EN_PROCESO',
  EsperandoInfo: 'ESPERANDO_INFORMACION',
  Solucionado:   'SOLUCIONADO',
  Cerrado:       'CERRADO',
}

// GET /dashboard
async function mostrarDashboard(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === 'admin' || user.rol === 'tecnico'
    const where   = esAdmin ? {} : { usuarioId: user.id }

    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    // Conteos en paralelo
    const [conteoEstados, totalTickets, ticketsMes, tickets] = await Promise.all([
      prisma.ticket.groupBy({ by: ['estado'], _count: { id: true } }),
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...where, fechaCreacion: { gte: inicioMes } } }),
      prisma.ticket.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        take: 50,
        include: {
          usuario:   { select: { nombre: true, area: true } },
          categoria: { select: { nombre: true } },
          tecnico:   { select: { nombre: true } },
        },
      }),
    ])

    // Construir objeto porEstado
    const porEstado = {
      PENDIENTE: 0, EN_PROCESO: 0,
      ESPERANDO_INFORMACION: 0, SOLUCIONADO: 0, CERRADO: 0,
    }
    for (const item of conteoEstados) {
      const key = ESTADO_MAP[item.estado]
      if (key) porEstado[key] = item._count.id
    }

    res.render('dashboard', {
      title: 'Dashboard',
      user,
      tickets,
      helpers,
      stats: { totalTickets, porEstado, ticketsMes },
    })

  } catch (err) {
    console.error('[dashboardController] mostrarDashboard:', err)
    res.status(500).render('error', {
      codigo: 500, titulo: 'Error del servidor',
      mensaje: 'No se pudieron cargar los datos del dashboard.',
    })
  }
}

module.exports = { mostrarDashboard }
