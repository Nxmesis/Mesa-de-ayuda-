'use strict'

const prisma     = require('../utils/db')
const helpers    = require('../utils/helpers')
const path       = require('path')
const fs         = require('fs')

// html-pdf-node en lugar de puppeteer
let html_to_pdf
try {
  html_to_pdf = require('html-pdf-node')
} catch (e) {
  html_to_pdf = null
}

// ── Consulta de datos ─────────────────────────────────────────────────────────

async function obtenerDatosEstadisticas() {
  const ahora     = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [
    total, pendientes, enProceso, solucionados, cerrados, estemes,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { estado: 'Pendiente' } }),
    prisma.ticket.count({ where: { estado: 'EnProceso' } }),
    prisma.ticket.count({ where: { estado: 'Solucionado' } }),
    prisma.ticket.count({ where: { estado: 'Cerrado' } }),
    prisma.ticket.count({ where: { fechaCreacion: { gte: inicioMes } } }),
  ])

  const [
    porCategoria, porPrioridad, porAreaRaw, porTecnico,
    ticketsPorDiaRaw,
  ] = await Promise.all([
    prisma.categoria.findMany({
      where:   { tickets: { some: {} } },
      include: { _count: { select: { tickets: true } } },
      orderBy: { tickets: { _count: 'desc' } },
      take: 10,
    }),
    prisma.ticket.groupBy({
      by:      ['prioridad'],
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.ticket.groupBy({
      by:      ['usuarioId'],
      _count:  { id: true },
      orderBy: { _count: { id: 'desc' } },
      take:    20,
    }),
    prisma.usuario.findMany({
      where:   { rol: { in: ['admin', 'tecnico'] } },
      include: { _count: { select: { ticketsAsignados: true } } },
      orderBy: { ticketsAsignados: { _count: 'desc' } },
      take: 10,
    }),
    prisma.ticket.findMany({
      where: {
        fechaCreacion: {
          gte: new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - 6),
        },
      },
      select: { fechaCreacion: true },
    }),
  ])

  const usuarioIds = [...new Set(porAreaRaw.map(r => r.usuarioId))]
  const usuariosArea = await prisma.usuario.findMany({
    where:  { id: { in: usuarioIds } },
    select: { id: true, area: true },
  })

  const areaMap = new Map()
  usuariosArea.forEach(u => areaMap.set(u.id, u.area || 'Sin área'))

  const areaCounts = new Map()
  porAreaRaw.forEach(r => {
    const area = areaMap.get(r.usuarioId) || 'Sin área'
    areaCounts.set(area, (areaCounts.get(area) || 0) + r._count.id)
  })

  const porArea = Array.from(areaCounts.entries())
    .map(([area, count]) => ({ area, _count: { id: count } }))
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 8)

  const porDia = [0, 0, 0, 0, 0, 0, 0]
  const diasLabels = []
  
  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(ahora)
    fecha.setDate(fecha.getDate() - i)
    diasLabels.push(fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }))
    
    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
    
    porDia[6 - i] = ticketsPorDiaRaw.filter(t => 
      t.fechaCreacion >= inicioDia && t.fechaCreacion < finDia
    ).length
  }

  return {
    ahora,
    stats: { total, pendientes, enProceso, solucionados, cerrados, estemes },
    porCategoria, porPrioridad, porArea, porTecnico, porDia, diasLabels,
  }
}

// ── GET /estadisticas ─────────────────────────────────────────────────────────

async function mostrarEstadisticas(req, res) {
  try {
    const datos = await obtenerDatosEstadisticas()
    res.render('estadisticas', {
      title:   'Estadísticas',
      user:    req.session.usuario,
      helpers,
      ...datos,
    })
  } catch (err) {
    console.error('[estadisticasController] mostrarEstadisticas:', err)
    req.flash('error', 'Error al cargar las estadísticas.')
    res.redirect('/dashboard')
  }
}

// ── GET /estadisticas/reporte ─────────────────────────────────────────────────

async function generarReportePDF(req, res) {
  try {
    const datos = await obtenerDatosEstadisticas()
    const { ahora, stats } = datos

    const tasaResolucion = stats.total > 0
      ? Math.round((stats.solucionados + stats.cerrados) * 100 / stats.total)
      : 0

    const cssPath  = path.join(__dirname, '..', '..', 'public', 'css', 'reporte.css')
    const cssInline = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : ''

    const html = await new Promise((resolve, reject) => {
      req.app.render('reporte-pdf', {
        layout:  false,
        cssInline,
        helpers,
        stats:   { ...stats, tasaResolucion },
        ...datos,
        fechaGeneracion: ahora.toLocaleDateString('es-CO', {
          weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
        periodo: ahora.toLocaleDateString('es-CO', {
          month: 'long', year: 'numeric',
        }).toUpperCase(),
      }, (err, rendered) => {
        if (err) reject(err)
        else resolve(rendered)
      })
    })

    if (!html || html.trim().length === 0) {
      throw new Error('El template renderizó HTML vacío')
    }

    // ✅ Usar html-pdf-node en lugar de Puppeteer
    if (!html_to_pdf) {
      throw new Error('La librería html-pdf-node no está instalada. Ejecuta: npm install html-pdf-node')
    }

    const options = {
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      // Ruta a wkhtmltopdf (ajusta si instalaste en otra ubicación)
      executablePath: 'C:\\Program Files\\wkhtmltopdf\\bin\\wkhtmltopdf.exe',
    }

    const file = { content: html }
    const pdfBuffer = await html_to_pdf.generatePdf(file, options)

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('El PDF generado está vacío')
    }

    const fecha         = `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}`
    const nombreArchivo = `Reporte_Tickets_${fecha}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.end(pdfBuffer)

  } catch (err) {
    console.error('[estadisticasController] generarReportePDF ERROR:', err)
    console.error('Stack:', err.stack)
    req.flash('error', 'Error al generar el reporte PDF: ' + err.message)
    res.redirect('/estadisticas')
  }
}

module.exports = { mostrarEstadisticas, generarReportePDF }