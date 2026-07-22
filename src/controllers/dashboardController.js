'use strict'

const path    = require('path')
const fs      = require('fs')
const ejs     = require('ejs')
const htmlPdf = require('html-pdf-node')
const prisma  = require('../utils/db')
const helpers = require('../utils/helpers')

const ESTADO_MAP = {
  Pendiente:     'PENDIENTE',
  EnProceso:     'EN_PROCESO',
  EsperandoInfo: 'ESPERANDO_INFORMACION',
  Solucionado:   'SOLUCIONADO',
  Cerrado:       'CERRADO',
}

// ── Colores por categoría ──────────────────────────────────────────────────
const CATEGORIA_COLORS = {
  'Administrativo': '#3498db',
  'Cámaras':        '#9b59b6',
  'Hardware':       '#e74c3c',
  'Otro':           '#95a5a6',
  'Red':            '#2ecc71',
  'Software':       '#f39c12',
}

// ── Colores por prioridad ──────────────────────────────────────────────────
const PRIORIDAD_COLORS = {
  'Critica': '#e74c3c',   // rojo
  'Alta':    '#f39c12',   // naranja
  'Media':   '#f1c40f',   // amarilla
  'Baja':    '#3498db',   // azul
}

// ── Helpers de fecha ───────────────────────────────────────────────────────
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
    // Período actual (mes en curso)
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

async function obtenerDatosDashboard(whereFinal, esAdmin) {
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  // ── Stats básicos ────────────────────────────────────────────────────────
  const [total, pendientes, enProceso, solucionados, cerrados, estemes] = await Promise.all([
    prisma.ticket.count({ where: whereFinal }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'Pendiente' } }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'EnProceso' } }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'Solucionado' } }),
    prisma.ticket.count({ where: { ...whereFinal, estado: 'Cerrado' } }),
    prisma.ticket.count({ where: { fechaCreacion: { gte: inicioMes } } }),
  ])

  // ── Por estado (para doughnut) ───────────────────────────────────────────
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

  // ── Por categoría ────────────────────────────────────────────────────────
  const porCategoria = await prisma.categoria.findMany({
    where: { tickets: { some: whereFinal } },
    include: { _count: { select: { tickets: { where: whereFinal } } } },
    orderBy: { tickets: { _count: 'desc' } },
    take: 10,
  })

  // ── Por prioridad ────────────────────────────────────────────────────────
  const porPrioridad = await prisma.ticket.groupBy({
    by: ['prioridad'],
    where: whereFinal,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  })

  // ── Tendencia últimos 7 días ─────────────────────────────────────────────
  const diasLabels = []
  const porDia = [0, 0, 0, 0, 0, 0, 0]

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(ahora)
    fecha.setDate(fecha.getDate() - i)
    diasLabels.push(fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }))

    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)

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

// ── GET /dashboard ──────────────────────────────────────────────────────────
async function mostrarDashboard(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === 'admin' || user.rol === 'tecnico'
    const where   = esAdmin ? {} : { usuarioId: user.id }

    const { mes, dia } = req.query
    const { whereFecha, tituloFecha, modoHistorial } = getRangoFecha(mes, dia)
    const whereFinal = { ...where, ...whereFecha }

    // Tickets recientes (para la tabla)
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

    // Datos para gráficos
    const datosStats = await obtenerDatosDashboard(whereFinal, esAdmin)

    res.render('dashboard', {
      title: modoHistorial ? `Historial - ${tituloFecha}` : 'Dashboard',
      user,
      tickets,
      helpers,
      stats: { 
        totalTickets: datosStats.stats.total, 
        porEstado: datosStats.porEstado, 
        ticketsMes: datosStats.stats.estemes 
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
      codigo: 500, titulo: 'Error del servidor',
      mensaje: 'No se pudieron cargar los datos del dashboard.',
    })
  }
}

// ── GET /estadisticas/reporte ────────────────────────────────────────────────
// Genera el PDF del período solicitado (mes actual por defecto, o mes/dia específico)
async function generarReportePDF(req, res) {
  try {
    const user    = req.session.usuario
    const esAdmin = user.rol === 'admin' || user.rol === 'tecnico'
    const where   = esAdmin ? {} : { usuarioId: user.id }

    const { mes, dia } = req.query
    const { whereFecha, tituloFecha } = getRangoFecha(mes, dia)
    const whereFinal = { ...where, ...whereFecha }

    const datosStats = await obtenerDatosDashboard(whereFinal, esAdmin)

    // Listado completo de tickets del período, con su solución.
    // A propósito NO se incluyen imagenAdjunta, imagenSolucion, videoSolucion
    // ni comentarios: el reporte es solo información + solución de cada ticket.
    const tickets = await prisma.ticket.findMany({
      where: whereFinal,
      orderBy: { fechaCreacion: 'asc' },
      select: {
        numeroTicket: true,
        titulo: true,
        descripcion: true,
        solucion: true,
        estado: true,
        prioridad: true,
        fechaCreacion: true,
        fechaCierre: true,
        usuario:   { select: { nombre: true, area: true } },
        tecnico:   { select: { nombre: true } },
        categoria: { select: { nombre: true } },
      },
    })

    const stats = {
      total:          datosStats.stats.total,
      pendientes:     datosStats.stats.pendientes,
      enProceso:      datosStats.stats.enProceso,
      solucionados:   datosStats.stats.solucionados,
      cerrados:       datosStats.stats.cerrados,
      estemes:        datosStats.stats.estemes,
      tasaResolucion: calcularTasaResolucion(datosStats.stats),
    }

    // Logo embebido en base64: evita depender de una petición HTTP al propio
    // servidor mientras se genera el PDF (el servidor ya no expone el puerto
    // 5000 usado antes por BASE_URL, así que esto es más robusto y funciona
    // 100% offline).
    let logoBase64 = ''
    try {
      const logoPath = path.join(__dirname, '..', '..', 'public', 'img', 'logo.jpeg')
      const logoBuffer = fs.readFileSync(logoPath)
      logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`
    } catch (e) {
      console.warn('[dashboardController] No se pudo cargar el logo para el PDF:', e.message)
    }

    const cssPath  = path.join(__dirname, '..', '..', 'public', 'css', 'reporte.css')
    const cssInline = fs.readFileSync(cssPath, 'utf8')

    const viewPath = path.join(__dirname, '..', '..', 'views', 'reporte-pdf.ejs')
    const html = await ejs.renderFile(viewPath, {
      cssInline,
      logoBase64,
      periodo: tituloFecha,
      fechaGeneracion: new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }),
      stats,
      tickets,
      helpers,
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

module.exports = { mostrarDashboard, generarReportePDF }