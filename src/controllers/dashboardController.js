'use strict'

const path    = require('path')
const fs      = require('fs')
const ejs     = require('ejs')
const htmlPdf = require('html-pdf-node')
const prisma  = require('../utils/db')
const helpers = require('../utils/helpers')

// ── Constantes ───────────────────────────────────────────────────────────────
const ESTADO_MAP = {
  Pendiente:     'PENDIENTE',
  EnProceso:     'EN_PROCESO',
  EsperandoInfo: 'ESPERANDO_INFORMACION',
  Solucionado:   'SOLUCIONADO',
  Cerrado:       'CERRADO',
}

const CATEGORIA_COLORS = {
  Administrativo: '#3498db',
  'C\u00e1maras':  '#9b59b6',
  Hardware:       '#e74c3c',
  Otro:           '#95a5a6',
  Red:            '#2ecc71',
  Software:       '#f39c12',
}

const PRIORIDAD_COLORS = {
  Critica: '#e74c3c',
  Alta:    '#f39c12',
  Media:   '#f1c40f',
  Baja:    '#3498db',
}

const ROL_ADMIN   = 'admin'
const ROL_TECNICO = 'tecnico'

// ── Helpers privados ─────────────────────────────────────────────────────────

function getRangoFecha(mes, dia) {
  let whereFecha = {}
  let tituloFecha = ''
  let modoHistorial = false

  if (mes) {
    modoHistorial = true
    const [anio, mesNum] = mes.split('-').map(Number)
    const inicio = new Date(anio, mesNum - 1, 1)
    const fin    = new Date(anio, mesNum, 0, 23, 59, 59, 999)
    whereFecha   = { fechaCreacion: { gte: inicio, lte: fin } }
    tituloFecha  = `${helpers.nombreMes(mesNum)} ${anio}`
  } else if (dia) {
    modoHistorial = true
    const [anio, mesNum, diaNum] = dia.split('-').map(Number)
    const inicio = new Date(anio, mesNum - 1, diaNum, 0, 0, 0, 0)
    const fin    = new Date(anio, mesNum - 1, diaNum, 23, 59, 59, 999)
    whereFecha   = { fechaCreacion: { gte: inicio, lte: fin } }
    tituloFecha  = `${diaNum} de ${helpers.nombreMes(mesNum)} ${anio}`
  } else {
    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const finMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59, 999)
    whereFecha      = { fechaCreacion: { gte: inicioMes, lte: finMes } }
    tituloFecha     = `${helpers.nombreMes(ahora.getMonth() + 1)} ${ahora.getFullYear()}`
  }

  return { whereFecha, tituloFecha, modoHistorial }
}

function calcularTasaResolucion(stats) {
  return stats.total > 0
    ? Math.round((stats.solucionados + stats.cerrados) * 100 / stats.total)
    : 0
}

async function obtenerDatosDashboard(whereFinal) {
  const ahora = new Date()

  // Stats b\u00e1sicos
  const [total, pendientes, enProceso, solucionados, cerrados] = await Promise.all([
    prisma.ticket.count({ where: whereFinal }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'Pendiente' } }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'EnProceso' } }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'Solucionado' } }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'Cerrado' } }),
  ])

  // Tickets creados este mes (independiente del filtro de fecha del dashboard)
  const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const estemes = await prisma.ticket.count({
    where: { fechaCreacion: { gte: inicioMesActual } },
  })

  // Por estado (doughnut)
  const porEstado = {
    PENDIENTE: 0, EN_PROCESO: 0,
    ESPERANDO_INFORMACION: 0, SOLUCIONADO: 0, CERRADO: 0,
  }
  const conteoEstados = await prisma.ticket.groupBy({
    by: ['estado'],
    where: whereFinal,
    _count: { id: true },
  })
  for (const item of conteoEstados) {
    const key = ESTADO_MAP[item.estado]
    if (key) porEstado[key] = item._count.id
  }

  // Por categor\u00eda
  const porCategoria = await prisma.categoria.findMany({
    where: { tickets: { some: whereFinal } },
    include: { _count: { select: { tickets: { where: whereFinal } } } },
    orderBy: { tickets: { _count: 'desc' } },
    take: 10,
  })

  // Por prioridad
  const porPrioridad = await prisma.ticket.groupBy({
    by: ['prioridad'],
    where: whereFinal,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  // Tendencia \u00faltimos 7 d\u00edas
  const diasLabels = []
  const porDia = [0, 0, 0, 0, 0, 0, 0]

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(ahora)
    fecha.setDate(fecha.getDate() - i)
    diasLabels.push(fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }))

    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const finDia    = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)

    porDia[6 - i] = await prisma.ticket.count({
      where: { fechaCreacion: { gte: inicioDia, lt: finDia } }
    })
  }

  return {
    stats: { total, pendientes, enProceso, solucionados, cerrados, estemes },
    porEstado,
    porCategoria,
    porPrioridad,
    porDia,
    diasLabels,
  }
}

// ── GET /dashboard ───────────────────────────────────────────────────────────
async function mostrarDashboard(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === ROL_ADMIN || user.rol === ROL_TECNICO
    const where   = esAdmin ? {} : { usuarioId: user.id }

    const { mes, dia } = req.query
    const { whereFecha, tituloFecha, modoHistorial } = getRangoFecha(mes, dia)
    const whereFinal = { ...where, ...whereFecha }

    const tickets = await prisma.ticket.findMany({
      where: whereFinal,
      orderBy: { fechaCreacion: 'desc' },
      take: 50,
      include: {
        usuario:   { select: { nombre: true, area: true } },
        categoria: { select: { nombre: true } },
        tecnico:   { select: { nombre: true } },
      },
    })

    const datosStats = await obtenerDatosDashboard(whereFinal)

    res.render('dashboard', {
      title: modoHistorial ? `Historial - ${tituloFecha}` : 'Dashboard',
      user,
      tickets,
      helpers,
      stats: {
        totalTickets: datosStats.stats.total,
        porEstado: datosStats.porEstado,
        ticketsMes: datosStats.stats.estemes,
      },
      ...datosStats,
      modoHistorial,
      tituloFecha,
      mesQuery: mes || '',
      diaQuery: dia || '',
      CATEGORIA_COLORS,
      PRIORIDAD_COLORS,
    })

  } catch (err) {
    console.error('[dashboardController] mostrarDashboard:', err)
    res.status(500).render('error', {
      codigo: 500,
      titulo: 'Error del servidor',
      mensaje: 'No se pudieron cargar los datos del dashboard.',
    })
  }
}

// ── GET /estadisticas/reporte ────────────────────────────────────────────────
async function generarReportePDF(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === ROL_ADMIN || user.rol === ROL_TECNICO
    const where   = esAdmin ? {} : { usuarioId: user.id }

    const { mes, dia } = req.query
    const { whereFecha, tituloFecha } = getRangoFecha(mes, dia)
    const whereFinal = { ...where, ...whereFecha }

    const datosStats = await obtenerDatosDashboard(whereFinal)

    const stats = {
      total:          datosStats.stats.total,
      pendientes:     datosStats.stats.pendientes,
      enProceso:      datosStats.stats.enProceso,
      solucionados:   datosStats.stats.solucionados,
      cerrados:       datosStats.stats.cerrados,
      estemes:        datosStats.stats.estemes,
      tasaResolucion: calcularTasaResolucion(datosStats.stats),
    }

    // Logo embebido en base64
    let logoBase64 = ''
    try {
      const logoPath = path.join(__dirname, '..', '..', 'public', 'img', 'logo.jpeg')
      const logoBuffer = fs.readFileSync(logoPath)
      logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`
    } catch (e) {
      console.warn('[dashboardController] Logo no cargado para PDF:', e.message)
    }

    const cssPath   = path.join(__dirname, '..', '..', 'public', 'css', 'reporte.css')
    const cssInline = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : ''

    const viewPath = path.join(__dirname, '..', '..', 'views', 'reporte-pdf.ejs')
    const html = await ejs.renderFile(viewPath, {
      cssInline,
      logoBase64,
      periodo: tituloFecha,
      fechaGeneracion: new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }),
      stats,
      porCategoria: datosStats.porCategoria,
      porPrioridad: datosStats.porPrioridad,
      porDia:       datosStats.porDia,
      diasLabels:   datosStats.diasLabels,
      CATEGORIA_COLORS,
      PRIORIDAD_COLORS,
    })

    const file = { content: html }
    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    }

    const pdfBuffer = await htmlPdf.generatePdf(file, options)

    const nombreArchivo = `reporte-tickets-${tituloFecha.replace(/\s+/g, '-')}.pdf`
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
    })
    res.send(pdfBuffer)

  } catch (err) {
    console.error('[dashboardController] generarReportePDF:', err)
    req.flash('error', 'Error al generar el reporte PDF')
    res.redirect('/dashboard')
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = { mostrarDashboard, generarReportePDF }