'use strict'

const prisma  = require('../utils/db')
const helpers = require('../utils/helpers')

const ESTADO_MAP = {
  Pendiente:     'PENDIENTE',
  EnProceso:     'EN_PROCESO',
  EsperandoInfo: 'ESPERANDO_INFORMACION',
  Solucionado:   'SOLUCIONADO',
  Cerrado:       'CERRADO',
}

async function mostrarDashboard(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === 'admin' || user.rol === 'tecnico'
    const where   = esAdmin ? {} : { usuarioId: user.id }

    let modoHistorial = false
    let whereFecha    = {}
    let tituloFecha   = ''

    const { mes, dia } = req.query

    if (esAdmin && mes) {
      modoHistorial = true
      const [anio, mesNum] = mes.split('-').map(Number)
      const inicio = new Date(anio, mesNum - 1, 1)
      const fin    = new Date(anio, mesNum, 0, 23, 59, 59, 999)
      whereFecha   = { fechaCreacion: { gte: inicio, lte: fin } }
      tituloFecha  = `${helpers.nombreMes(mesNum)} ${anio}`

    } else if (esAdmin && dia) {
      modoHistorial = true
      const [anio, mesNum, diaNum] = dia.split('-').map(Number)
      const inicio = new Date(anio, mesNum - 1, diaNum, 0, 0, 0, 0)
      const fin    = new Date(anio, mesNum - 1, diaNum, 23, 59, 59, 999)
      whereFecha   = { fechaCreacion: { gte: inicio, lte: fin } }
      tituloFecha  = `${diaNum} de ${helpers.nombreMes(mesNum)} ${anio}`
    }

    if (esAdmin && !modoHistorial) {
      const ahora      = new Date()
      const inicioMes  = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const finMes     = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999)
      whereFecha       = { fechaCreacion: { gte: inicioMes, lte: finMes } }
      tituloFecha      = `${helpers.nombreMes(ahora.getMonth() + 1)} ${ahora.getFullYear()}`
    }

    const whereFinal = { ...where, ...whereFecha }

    const [totalTickets, tickets] = await Promise.all([
      prisma.ticket.count({ where: whereFinal }),
      prisma.ticket.findMany({
        where: whereFinal,
        orderBy: { fechaCreacion: 'desc' },
        take: 50,
        include: {
          usuario:   { select: { nombre: true, area: true } },
          categoria: { select: { nombre: true } },
          tecnico:   { select: { nombre: true } },
        },
      }),
    ])

    const porEstado = {
      PENDIENTE: 0, EN_PROCESO: 0,
      ESPERANDO_INFORMACION: 0, SOLUCIONADO: 0, CERRADO: 0,
    }

    const conteoFiltrado = await prisma.ticket.groupBy({
      by: ['estado'],
      where: whereFinal,
      _count: { id: true },
    })

    for (const item of conteoFiltrado) {
      const key = ESTADO_MAP[item.estado]
      if (key) porEstado[key] = item._count.id
    }

    res.render('dashboard', {
      title: modoHistorial ? `Historial - ${tituloFecha}` : 'Dashboard',
      user,
      tickets,
      helpers,
      stats: { totalTickets, porEstado, ticketsMes: totalTickets },
      modoHistorial,
      tituloFecha,
      mesQuery: mes || '',
      diaQuery: dia || '',
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