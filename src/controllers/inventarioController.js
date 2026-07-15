'use strict'

const prisma = require('../utils/db')
const fs   = require('fs')
const path = require('path')

const ITEMS_PER_PAGE = 50
const PISOS = ['1', '2', '3']
const ESTADOS = ['Operativo', 'Deficiente', 'Averiado', 'Desconectado', 'Archivado', 'Pendiente revisión']

// ═══════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function esArchivado(estado) {
  return estado === 'Archivado'
}

function filtrarArchivados(lista) {
  return lista.filter(item => !esArchivado(item.estado))
}

function soloArchivados(lista) {
  return lista.filter(item => esArchivado(item.estado))
}

async function generarSiguienteCodigo(prefijo, campoBusqueda, tablaPrisma) {
  const ultimo = await tablaPrisma.findFirst({
    where: { [campoBusqueda]: { startsWith: prefijo } },
    orderBy: { [campoBusqueda]: 'desc' },
    select: { [campoBusqueda]: true },
  })
  if (ultimo?.[campoBusqueda]) {
    const match = ultimo[campoBusqueda].match(new RegExp(`${prefijo.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(\\d+)`))
    if (match) return `${prefijo}${String(parseInt(match[1]) + 1).padStart(3, '0')}`
  }
  return `${prefijo}001`
}

// ═══════════════════════════════════════════════════════════════════════════
//  GET /inventario
// ═══════════════════════════════════════════════════════════════════════════

async function mostrarInventario(req, res) {
  try {
    const tab    = req.query.tab || 'computadoras'
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const search = (req.query.search || '').trim()
    const piso   = req.query.piso || '1'

    const wherePC = search ? { OR: [{ nombre: { contains: search, mode: 'insensitive' } }, { fabricante: { contains: search, mode: 'insensitive' } }, { modelo: { contains: search, mode: 'insensitive' } }] } : {}
    const wherePer = search ? { OR: [{ codigo: { contains: search, mode: 'insensitive' } }, { categoria: { contains: search, mode: 'insensitive' } }, { descripcion: { contains: search, mode: 'insensitive' } }] } : {}
    const whereCam = search ? { OR: [{ codigo: { contains: search, mode: 'insensitive' } }, { marca: { contains: search, mode: 'insensitive' } }, { ubicacion: { contains: search, mode: 'insensitive' } }] } : {}
    const whereSensor = search ? { OR: [{ codigo: { contains: search, mode: 'insensitive' } }, { equipo: { contains: search, mode: 'insensitive' } }, { nomenclatura: { contains: search, mode: 'insensitive' } }, { ubicacion: { contains: search, mode: 'insensitive' } }] } : {}
    const whereRed = search ? { OR: [{ codigo: { contains: search, mode: 'insensitive' } }, { ubicacion: { contains: search, mode: 'insensitive' } }, { tipoCable: { contains: search, mode: 'insensitive' } }] } : {}

    const [computadorasTodas, perifericosTodas, camarasTodasLista, sensoresTodas, puntosRedTodas, documentosTodos] = await Promise.all([
      prisma.computadora.findMany({ where: wherePC, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, fabricante: true, modelo: true, numeroSerie: true, procesador: true, ramGb: true, discoSsdGb: true, estado: true, observaciones: true } }),
      prisma.periferico.findMany({ where: wherePer, orderBy: { codigo: 'asc' }, select: { id: true, codigo: true, categoria: true, descripcion: true, estado: true, computadoraAsignada: true, ubicacion: true, observaciones: true } }),
      prisma.camara.findMany({ where: whereCam, orderBy: { codigo: 'asc' }, select: { id: true, codigo: true, marca: true, modelo: true, numeroSerie: true, ubicacion: true, piso: true, dvr: true, ip: true, estado: true, observaciones: true } }),
      prisma.sensor.findMany({ where: whereSensor, orderBy: { codigo: 'asc' } }),
      prisma.puntoRed.findMany({ where: whereRed, orderBy: { codigo: 'asc' } }),
      prisma.documentoInventario.findMany({ orderBy: { fechaSubida: 'desc' } }),
    ])

    // Separar archivados
    const computadorasActivas = filtrarArchivados(computadorasTodas)
    const perifericosActivos  = filtrarArchivados(perifericosTodas)
    const camarasActivas      = filtrarArchivados(camarasTodasLista)
    const sensoresActivos     = filtrarArchivados(sensoresTodas)
    const puntosRedActivos    = filtrarArchivados(puntosRedTodas)

    const computadorasArchivadas = soloArchivados(computadorasTodas)
    const perifericosArchivados  = soloArchivados(perifericosTodas)
    const camarasArchivadas      = soloArchivados(camarasTodasLista)
    const sensoresArchivados     = soloArchivados(sensoresTodas)
    const puntosRedArchivados    = soloArchivados(puntosRedTodas)

    // Construir lista unificada de archivados
    const archivados = []
    computadorasArchivadas.forEach(pc => archivados.push({ tipo: 'computadora', tipoLabel: 'Computadora', icono: 'fa-desktop', id: pc.id, codigo: pc.nombre, nombre: pc.nombre, detalle1: pc.fabricante || '—', detalle2: pc.modelo || '—', detalle3: pc.procesador ? `${pc.procesador} / ${pc.ramGb || '?'}GB` : '—', estado: pc.estado, observaciones: pc.observaciones }))
    perifericosArchivados.forEach(per => archivados.push({ tipo: 'periferico', tipoLabel: 'Periférico', icono: 'fa-keyboard', id: per.id, codigo: per.codigo, nombre: per.descripcion, detalle1: per.categoria, detalle2: per.computadoraAsignada || 'Sin asignar', detalle3: per.ubicacion || '—', estado: per.estado, observaciones: per.observaciones }))
    camarasArchivadas.forEach(cam => archivados.push({ tipo: 'camara', tipoLabel: 'Cámara', icono: 'fa-video', id: cam.id, codigo: cam.codigo, nombre: cam.marca || cam.codigo, detalle1: `DVR ${cam.dvr || '—'}`, detalle2: cam.ubicacion || '—', detalle3: `Piso ${cam.piso || '—'}`, estado: cam.estado, observaciones: cam.observaciones }))
    sensoresArchivados.forEach(s => archivados.push({ tipo: 'sensor', tipoLabel: 'Sensor', icono: 'fa-shield-alt', id: s.id, codigo: s.codigo, nombre: s.equipo, detalle1: s.nomenclatura, detalle2: s.ubicacion, detalle3: s.tecnologia, estado: s.estado, observaciones: s.observaciones }))
    puntosRedArchivados.forEach(r => archivados.push({ tipo: 'puntored', tipoLabel: 'Punto de Red', icono: 'fa-network-wired', id: r.id, codigo: r.codigo, nombre: r.ubicacion, detalle1: r.tipoCable, detalle2: r.longitud || '—', detalle3: r.tipoUso, estado: r.estado, observaciones: r.observaciones }))

    // Cámaras por piso (solo activas)
    const camarasPorPisoLista = { '1': [], '2': [], '3': [] }
    camarasActivas.forEach(c => { if (['1','2','3'].includes(c.piso)) camarasPorPisoLista[c.piso].push(c) })

    // Paginación
    let items = [], totalItems = 0
    switch(tab) {
      case 'computadoras': items = computadorasActivas; totalItems = computadorasActivas.length; break
      case 'perifericos':  items = perifericosActivos;  totalItems = perifericosActivos.length; break
      case 'camaras':      items = camarasActivas;      totalItems = camarasActivas.length; break
      case 'sensores':     items = sensoresActivos;     totalItems = sensoresActivos.length; break
      case 'puntosred':    items = puntosRedActivos;    totalItems = puntosRedActivos.length; break
      case 'documentos':   items = documentosTodos;     totalItems = documentosTodos.length; break
      case 'archivados':   items = archivados;          totalItems = archivados.length; break
      default:             items = computadorasActivas; totalItems = computadorasActivas.length
    }

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1
    const paginatedItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

    const listaComputadoras = computadorasActivas.map(pc => ({ nombre: pc.nombre }))

    const siguienteCodigoPeriferico = await generarSiguienteCodigo('PER-', 'codigo', prisma.periferico)
    const siguienteCodigoSensor = await generarSiguienteCodigo('SEG-', 'codigo', prisma.sensor)
    const siguienteCodigoRed = await generarSiguienteCodigo('Red-', 'codigo', prisma.puntoRed)

    const siguienteCodigoCamara = {}
    for (const p of PISOS) {
      const prefijo = `CAM-P${p}-`
      siguienteCodigoCamara[p] = await generarSiguienteCodigo(prefijo, 'codigo', prisma.camara)
    }

    const counts = {
      pcs: computadorasActivas.length,
      perifericos: perifericosActivos.length,
      camaras: camarasActivas.length,
      sensores: sensoresActivos.length,
      puntosred: puntosRedActivos.length,
      documentos: documentosTodos.length,
      archivados: archivados.length,
    }

    const camarasPorPiso = { '1': camarasPorPisoLista['1'].length, '2': camarasPorPisoLista['2'].length, '3': camarasPorPisoLista['3'].length }

    res.render('inventario', {
      title: 'Inventario de Equipos',
      user: req.session.usuario,
      tab, piso, pisos: PISOS, estados: ESTADOS,
      camarasPorPiso, camarasPorPisoLista, camarasArchivoCount: 0,
      computadoras: tab === 'computadoras' ? paginatedItems : computadorasActivas.slice(0, ITEMS_PER_PAGE),
      perifericos: tab === 'perifericos' ? paginatedItems : perifericosActivos.slice(0, ITEMS_PER_PAGE),
      sensores: tab === 'sensores' ? paginatedItems : sensoresActivos.slice(0, ITEMS_PER_PAGE),
      puntosRed: tab === 'puntosred' ? paginatedItems : puntosRedActivos.slice(0, ITEMS_PER_PAGE),
      documentos: tab === 'documentos' ? paginatedItems : documentosTodos.slice(0, ITEMS_PER_PAGE),
      archivados: tab === 'archivados' ? paginatedItems : archivados.slice(0, ITEMS_PER_PAGE),
      listaComputadoras, siguienteCodigoPeriferico, siguienteCodigoCamara, siguienteCodigoSensor, siguienteCodigoRed,
      pagination: { page, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      counts, search,
      helpers: require('../utils/helpers'),
    })

  } catch (err) {
    console.error('[inventarioController] mostrarInventario:', err)
    req.flash('error', 'Error al cargar el inventario.')
    res.redirect('/dashboard')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPUTADORAS
// ═══════════════════════════════════════════════════════════════════════════

async function crearComputadora(req, res) {
  const { nombre, fabricante, modelo, numeroSerie, procesador, ramGb, discoSsdGb, estado, observaciones } = req.body
  if (!nombre || !nombre.trim()) { req.flash('error', 'El nombre es obligatorio.'); return res.redirect('/inventario') }
  try {
    await prisma.computadora.create({ data: { nombre: nombre.trim(), fabricante: fabricante?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, procesador: procesador?.trim() || null, ramGb: ramGb ? parseInt(ramGb) : null, discoSsdGb: discoSsdGb ? parseInt(discoSsdGb) : null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', `Computadora ${nombre} agregada.`)
    res.redirect('/inventario?tab=computadoras')
  } catch (err) { console.error(err); req.flash('error', 'Error al crear computadora.'); res.redirect('/inventario?tab=computadoras') }
}

async function editarComputadora(req, res) {
  const id = parseInt(req.params.id)
  const { fabricante, modelo, numeroSerie, procesador, ramGb, discoSsdGb, estado, observaciones } = req.body
  try {
    const pcAntes = await prisma.computadora.findUnique({ where: { id }, select: { estado: true } })
    const eraArchivado = esArchivado(pcAntes.estado)
    const ahoraArchivado = esArchivado(estado)
    await prisma.computadora.update({ where: { id }, data: { fabricante: fabricante?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, procesador: procesador?.trim() || null, ramGb: ramGb ? parseInt(ramGb) : null, discoSsdGb: discoSsdGb ? parseInt(discoSsdGb) : null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', 'Computadora actualizada.')
    if (ahoraArchivado) res.redirect('/inventario?tab=archivados')
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=computadoras')
    else res.redirect('/inventario?tab=computadoras')
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=computadoras') }
}

async function eliminarComputadora(req, res) {
  try { await prisma.computadora.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminada.') } 
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=computadoras')
}

// ═══════════════════════════════════════════════════════════════════════════
//  PERIFÉRICOS
// ═══════════════════════════════════════════════════════════════════════════

async function crearPeriferico(req, res) {
  let { codigo, categoria, descripcion, estado, observaciones, computadoraAsignada, ubicacion } = req.body
  if (!codigo?.trim()) {
    const ultimo = await prisma.periferico.findFirst({ where: { codigo: { startsWith: 'PER-' } }, orderBy: { codigo: 'desc' }, select: { codigo: true } })
    let n = 1; if (ultimo?.codigo) { const m = ultimo.codigo.match(/PER-(\d+)/); if (m) n = parseInt(m[1]) + 1 }
    codigo = `PER-${String(n).padStart(3, '0')}`
  }
  if (!categoria?.trim() || !descripcion?.trim()) { req.flash('error', 'Categoría y descripción obligatorias.'); return res.redirect('/inventario?tab=perifericos') }
  try {
    await prisma.periferico.create({ data: { codigo: codigo.trim(), categoria: categoria.trim(), descripcion: descripcion.trim(), estado: estado || 'Operativo', observaciones: observaciones?.trim() || null, computadoraAsignada: computadoraAsignada?.trim() || null, ubicacion: ubicacion?.trim() || null } })
    req.flash('success', `Periférico ${codigo} agregado.`); res.redirect('/inventario?tab=perifericos')
  } catch (err) { console.error(err); req.flash('error', 'Error al crear periférico.'); res.redirect('/inventario?tab=perifericos') }
}

async function editarPeriferico(req, res) {
  const id = parseInt(req.params.id)
  const { categoria, descripcion, estado, observaciones, computadoraAsignada, ubicacion } = req.body
  try {
    const perAntes = await prisma.periferico.findUnique({ where: { id }, select: { estado: true } })
    const eraArchivado = esArchivado(perAntes.estado), ahoraArchivado = esArchivado(estado)
    await prisma.periferico.update({ where: { id }, data: { categoria: categoria?.trim(), descripcion: descripcion?.trim(), estado: estado || 'Operativo', observaciones: observaciones?.trim() || null, computadoraAsignada: computadoraAsignada?.trim() || null, ubicacion: ubicacion?.trim() || null } })
    req.flash('success', 'Periférico actualizado.')
    if (ahoraArchivado) res.redirect('/inventario?tab=archivados')
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=perifericos')
    else res.redirect('/inventario?tab=perifericos')
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=perifericos') }
}

async function eliminarPeriferico(req, res) {
  try { await prisma.periferico.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminado.') }
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=perifericos')
}

async function cambiarEstadoPeriferico(req, res) {
  try { await prisma.periferico.update({ where: { id: parseInt(req.params.id) }, data: { estado: req.body.estado } }); res.json({ success: true }) }
  catch (err) { res.status(500).json({ success: false, error: err.message }) }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CÁMARAS
// ═══════════════════════════════════════════════════════════════════════════

async function crearCamara(req, res) {
  let { codigo, marca, modelo, numeroSerie, ubicacion, piso, dvr, ip, estado, observaciones } = req.body
  piso = piso || '1'; dvr = dvr || '1'
  if (!codigo?.trim()) {
    const prefijo = `CAM-P${piso}-`
    const ultima = await prisma.camara.findFirst({ where: { codigo: { startsWith: prefijo }, piso }, orderBy: { codigo: 'desc' }, select: { codigo: true } })
    let n = 1; if (ultima?.codigo) { const m = ultima.codigo.match(new RegExp(`${prefijo.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}(\\d+)`)); if (m) n = parseInt(m[1]) + 1 }
    codigo = `${prefijo}${String(n).padStart(3, '0')}`
  }
  try {
    await prisma.camara.create({ data: { codigo: codigo.trim(), marca: marca?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, ubicacion: ubicacion?.trim() || null, piso, dvr, ip: ip?.trim() || null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', `Cámara ${codigo} agregada.`); res.redirect('/inventario?tab=camaras&piso=' + piso)
  } catch (err) { console.error(err); req.flash('error', 'Error al crear cámara.'); res.redirect('/inventario?tab=camaras&piso=' + piso) }
}

async function editarCamara(req, res) {
  const id = parseInt(req.params.id)
  const { marca, modelo, numeroSerie, ubicacion, piso, dvr, ip, estado, observaciones } = req.body
  try {
    const camAntes = await prisma.camara.findUnique({ where: { id }, select: { piso: true, estado: true } })
    const eraArchivado = esArchivado(camAntes.estado), ahoraArchivado = esArchivado(estado)
    await prisma.camara.update({ where: { id }, data: { marca: marca?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, ubicacion: ubicacion?.trim() || null, piso: piso || camAntes.piso, dvr: dvr || '1', ip: ip?.trim() || null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', 'Cámara actualizada.')
    if (ahoraArchivado) res.redirect('/inventario?tab=archivados')
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=camaras&piso=' + (piso || camAntes.piso))
    else res.redirect('/inventario?tab=camaras&piso=' + (piso || camAntes.piso))
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=camaras') }
}

async function eliminarCamara(req, res) {
  try { await prisma.camara.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminada.') }
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=camaras')
}

// ═══════════════════════════════════════════════════════════════════════════
//  SENSORES
// ═══════════════════════════════════════════════════════════════════════════

async function crearSensor(req, res) {
  let { codigo, equipo, nomenclatura, ubicacion, tecnologia, estado, observaciones } = req.body
  if (!codigo?.trim()) {
    const ultimo = await prisma.sensor.findFirst({ where: { codigo: { startsWith: 'SEG-' } }, orderBy: { codigo: 'desc' }, select: { codigo: true } })
    let n = 1; if (ultimo?.codigo) { const m = ultimo.codigo.match(/SEG-(\d+)/); if (m) n = parseInt(m[1]) + 1 }
    codigo = `SEG-${String(n).padStart(2, '0')}`
  }
  if (!equipo?.trim() || !ubicacion?.trim()) { req.flash('error', 'Equipo y ubicación obligatorios.'); return res.redirect('/inventario?tab=sensores') }
  try {
    await prisma.sensor.create({ data: { codigo: codigo.trim(), equipo: equipo.trim(), nomenclatura: nomenclatura?.trim() || equipo.trim(), ubicacion: ubicacion.trim(), tecnologia: tecnologia || 'Cableado', estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', `Sensor ${codigo} agregado.`); res.redirect('/inventario?tab=sensores')
  } catch (err) { console.error(err); req.flash('error', 'Error al crear sensor.'); res.redirect('/inventario?tab=sensores') }
}

async function editarSensor(req, res) {
  const id = parseInt(req.params.id)
  const { equipo, nomenclatura, ubicacion, tecnologia, estado, observaciones } = req.body
  try {
    const sensorAntes = await prisma.sensor.findUnique({ where: { id }, select: { estado: true } })
    const eraArchivado = esArchivado(sensorAntes.estado), ahoraArchivado = esArchivado(estado)
    await prisma.sensor.update({ where: { id }, data: { equipo: equipo?.trim(), nomenclatura: nomenclatura?.trim(), ubicacion: ubicacion?.trim(), tecnologia: tecnologia || 'Cableado', estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', 'Sensor actualizado.')
    if (ahoraArchivado) res.redirect('/inventario?tab=archivados')
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=sensores')
    else res.redirect('/inventario?tab=sensores')
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=sensores') }
}

async function eliminarSensor(req, res) {
  try { await prisma.sensor.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminado.') }
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=sensores')
}

// ═══════════════════════════════════════════════════════════════════════════
//  PUNTOS DE RED
// ═══════════════════════════════════════════════════════════════════════════

async function crearPuntoRed(req, res) {
  let { codigo, ubicacion, tipoCable, longitud, tipoUso, estado, observaciones } = req.body
  if (!codigo?.trim()) {
    const ultimo = await prisma.puntoRed.findFirst({ where: { codigo: { startsWith: 'Red-' } }, orderBy: { codigo: 'desc' }, select: { codigo: true } })
    let n = 1, sufijo = 'S1'; if (ultimo?.codigo) { const m = ultimo.codigo.match(/Red-(\d+)-(S\d+)/); if (m) { n = parseInt(m[1]) + 1; sufijo = m[2] } }
    codigo = `Red-${String(n).padStart(2, '0')}-${sufijo}`
  }
  if (!ubicacion?.trim()) { req.flash('error', 'Ubicación obligatoria.'); return res.redirect('/inventario?tab=puntosred') }
  try {
    await prisma.puntoRed.create({ data: { codigo: codigo.trim(), ubicacion: ubicacion.trim(), tipoCable: tipoCable || 'Cat 5e', longitud: longitud?.trim() || null, tipoUso: tipoUso || 'Datos', estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', `Punto de red ${codigo} agregado.`); res.redirect('/inventario?tab=puntosred')
  } catch (err) { console.error(err); req.flash('error', 'Error al crear punto de red.'); res.redirect('/inventario?tab=puntosred') }
}

async function editarPuntoRed(req, res) {
  const id = parseInt(req.params.id)
  const { ubicacion, tipoCable, longitud, tipoUso, estado, observaciones } = req.body
  try {
    const redAntes = await prisma.puntoRed.findUnique({ where: { id }, select: { estado: true } })
    const eraArchivado = esArchivado(redAntes.estado), ahoraArchivado = esArchivado(estado)
    await prisma.puntoRed.update({ where: { id }, data: { ubicacion: ubicacion?.trim(), tipoCable: tipoCable || 'Cat 5e', longitud: longitud?.trim() || null, tipoUso: tipoUso || 'Datos', estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', 'Punto de red actualizado.')
    if (ahoraArchivado) res.redirect('/inventario?tab=archivados')
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=puntosred')
    else res.redirect('/inventario?tab=puntosred')
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=puntosred') }
}

async function eliminarPuntoRed(req, res) {
  try { await prisma.puntoRed.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminado.') }
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=puntosred')
}

// ═══════════════════════════════════════════════════════════════════════════
//  DOCUMENTOS
// ═══════════════════════════════════════════════════════════════════════════

async function subirDocumento(req, res) {
  const { titulo, empresa, tipoDocumento, categoria, fechaDocumento, observaciones } = req.body
  if (!titulo?.trim() || !empresa?.trim()) { 
    req.flash('error', 'Título y empresa obligatorios.'); 
    return res.redirect('/inventario?tab=documentos') 
  }
  if (!req.file) { 
    req.flash('error', 'Adjunta un archivo.'); 
    return res.redirect('/inventario?tab=documentos') 
  }
  
  try {
    // FIX: Guardar fecha como string YYYY-MM-DD para evitar problemas de zona horaria
    // El campo en Prisma es @db.Date, pero pasamos un Date object creado en UTC
    let fechaDoc = null
    if (fechaDocumento) {
      const [year, month, day] = fechaDocumento.split('-').map(Number)
      fechaDoc = new Date(Date.UTC(year, month - 1, day))
    }
    
    await prisma.documentoInventario.create({ 
      data: { 
        titulo: titulo.trim(), 
        empresa: empresa.trim(), 
        tipoDocumento: tipoDocumento || 'Acta', 
        categoria: categoria || 'General', 
        archivo: req.file.filename, 
        fechaDocumento: fechaDoc, 
        observaciones: observaciones?.trim() || null 
      } 
    })
    req.flash('success', 'Documento subido.'); 
    res.redirect('/inventario?tab=documentos')
  } catch (err) { 
    console.error(err); 
    req.flash('error', 'Error al subir documento.'); 
    res.redirect('/inventario?tab=documentos') 
  }
}

async function eliminarDocumento(req, res) {
  try {
    const doc = await prisma.documentoInventario.findUnique({ where: { id: parseInt(req.params.id) }, select: { archivo: true } })
    await prisma.documentoInventario.delete({ where: { id: parseInt(req.params.id) } })
    if (doc?.archivo) fs.unlink(path.join(__dirname, '..', '..', 'uploads', 'documentos', doc.archivo), () => {})
    req.flash('success', 'Documento eliminado.')
  } catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=documentos')
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESTAURAR ARCHIVADO
// ═══════════════════════════════════════════════════════════════════════════

async function restaurarArchivado(req, res) {
  const { tipo, id } = req.params
  const { estado, ...datos } = req.body
  const nuevoEstado = estado || 'Operativo'
  const itemId = parseInt(id)
  try {
    switch(tipo) {
      case 'computadora': await prisma.computadora.update({ where: { id: itemId }, data: { estado: nuevoEstado, ...datos } }); break
      case 'periferico': await prisma.periferico.update({ where: { id: itemId }, data: { estado: nuevoEstado, ...datos } }); break
      case 'camara': await prisma.camara.update({ where: { id: itemId }, data: { estado: nuevoEstado, ...datos } }); break
      case 'sensor': await prisma.sensor.update({ where: { id: itemId }, data: { estado: nuevoEstado, ...datos } }); break
      case 'puntored': await prisma.puntoRed.update({ where: { id: itemId }, data: { estado: nuevoEstado, ...datos } }); break
      default: return res.status(400).json({ success: false, error: 'Tipo no válido' })
    }
    req.flash('success', 'Equipo restaurado correctamente.')
    res.redirect('/inventario?tab=' + tipo.replace('puntored', 'puntosred'))
  } catch (err) { console.error(err); req.flash('error', 'Error al restaurar.'); res.redirect('/inventario?tab=archivados') }
}

module.exports = {
  mostrarInventario,
  crearComputadora,
  editarComputadora, 
  eliminarComputadora,
  crearPeriferico,
  editarPeriferico,
  eliminarPeriferico,
  cambiarEstadoPeriferico,
  crearCamara,
  editarCamara,
  eliminarCamara,
  crearSensor, 
  editarSensor, eliminarSensor,
  crearPuntoRed,
  editarPuntoRed,
  eliminarPuntoRed,
  subirDocumento,
  eliminarDocumento, 
  restaurarArchivado,
}