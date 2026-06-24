'use strict'

const prisma     = require('../utils/db')
const helpers    = require('../utils/helpers')
const puppeteer  = require('puppeteer')
const path       = require('path')
const fs         = require('fs')

// ── Consulta de datos compartida entre vistas y PDF ───────────────────────────

async function obtenerDatosEstadisticas() {
  const ahora     = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

  const [
    total, pendientes, enProceso, solucionados, cerrados, estemes,
    porCategoria, porPrioridad, porAreaRaw, porTecnico,
  ] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticket.count({ where: { estado: 'Pendiente' } }),
    prisma.ticket.count({ where: { estado: 'EnProceso' } }),
    prisma.ticket.count({ where: { estado: 'Solucionado' } }),
    prisma.ticket.count({ where: { estado: 'Cerrado' } }),
    prisma.ticket.count({ where: { fechaCreacion: { gte: inicioMes } } }),
    prisma.categoria.findMany({
      where:   { tickets: { some: {} } },
      include: { _count: { select: { tickets: true } } },
      orderBy: { tickets: { _count: 'desc' } },
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
      take:    8,
    }),
    prisma.usuario.findMany({
      where:   { rol: { in: ['admin', 'tecnico'] } },
      include: { _count: { select: { ticketsAsignados: true } } },
      orderBy: { ticketsAsignados: { _count: 'desc' } },
    }),
  ])

  // Resolver áreas a partir de usuarioIds
  const usuariosArea = await prisma.usuario.findMany({
    where:  { id: { in: porAreaRaw.map(r => r.usuarioId) } },
    select: { id: true, area: true },
  })

  const porArea = porAreaRaw
    .map(r => {
      const u = usuariosArea.find(x => x.id === r.usuarioId)
      return { area: u?.area || 'Sin área', _count: r._count }
    })
    .reduce((acc, cur) => {
      const existing = acc.find(x => x.area === cur.area)
      if (existing) existing._count.id += cur._count.id
      else acc.push({ area: cur.area, _count: { id: cur._count.id } })
      return acc
    }, [])
    .sort((a, b) => b._count.id - a._count.id)

  // Tickets por día (últimos 7 días)
  const porDia      = []
  const diasLabels  = []
  for (let i = 6; i >= 0; i--) {
    const fecha     = new Date(ahora)
    fecha.setDate(fecha.getDate() - i)
    const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
    const finDia    = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
    const count     = await prisma.ticket.count({
      where: { fechaCreacion: { gte: inicioDia, lt: finDia } },
    })
    porDia.push(count)
    diasLabels.push(fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }))
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

    // Leer CSS externo para embeberlo en el HTML del PDF
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

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format:              'A4',
      printBackground:     true,
      margin:              { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
      displayHeaderFooter: true,
      headerTemplate:      '<div></div>',
      footerTemplate: `
        <div style="font-size:9px; color:#8b95a8; width:100%; text-align:center; padding:0 20px;">
          Mesa de Ayuda Interna — Almacén El Melao
          — Página <span class="pageNumber"></span> de <span class="totalPages"></span>
        </div>`,
    })

    await browser.close()

    const fecha         = `${ahora.getFullYear()}${String(ahora.getMonth() + 1).padStart(2, '0')}${String(ahora.getDate()).padStart(2, '0')}`
    const nombreArchivo = `Reporte_Tickets_${fecha}.pdf`

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`)
    res.setHeader('Content-Length', pdfBuffer.length)
    res.end(pdfBuffer)

  } catch (err) {
    console.error('[estadisticasController] generarReportePDF:', err)
    req.flash('error', 'Error al generar el reporte PDF.')
    res.redirect('/estadisticas')
  }
}

module.exports = { mostrarEstadisticas, generarReportePDF }
