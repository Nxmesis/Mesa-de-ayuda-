'use strict'

const prisma  = require('../utils/db')
const fs      = require('fs')
const path    = require('path')
const helpers = require('../utils/helpers')

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
    const subtabRed = req.query.subtabRed || 'equipos'

    const wherePC = search ? { OR: [{ nombre: { contains: search } }, { fabricante: { contains: search } }, { modelo: { contains: search } }] } : {}
    const wherePer = search ? { OR: [{ codigo: { contains: search } }, { categoria: { contains: search } }, { descripcion: { contains: search } }] } : {}
    const whereCam = search ? { OR: [{ codigo: { contains: search } }, { marca: { contains: search } }, { ubicacion: { contains: search } }] } : {}
    const whereSensor = search ? { OR: [{ codigo: { contains: search } }, { equipo: { contains: search } }, { nomenclatura: { contains: search } }, { ubicacion: { contains: search } }] } : {}
    const whereRed = search ? { OR: [{ codigo: { contains: search } }, { ubicacion: { contains: search } }, { tipoCable: { contains: search } }] } : {}
    const whereEquipoRed = search ? { OR: [{ codigo: { contains: search } }, { tipoEquipo: { contains: search } }, { marca: { contains: search } }, { modelo: { contains: search } }, { ubicacion: { contains: search } }, { ip: { contains: search } }] } : {}

    const [computadorasTodas, perifericosTodas, camarasTodasLista, sensoresTodas, puntosRedTodas, equiposRedTodas, documentosTodos] = await Promise.all([
      prisma.computadora.findMany({ where: wherePC, orderBy: { nombre: 'asc' }, select: { id: true, nombre: true, fabricante: true, modelo: true, numeroSerie: true, procesador: true, ramGb: true, discoSsdGb: true, estado: true, observaciones: true } }),
      prisma.periferico.findMany({ where: wherePer, orderBy: { codigo: 'asc' }, select: { id: true, codigo: true, categoria: true, descripcion: true, estado: true, computadoraAsignada: true, ubicacion: true, observaciones: true } }),
      prisma.camara.findMany({ where: whereCam, orderBy: { codigo: 'asc' }, select: { id: true, codigo: true, marca: true, modelo: true, numeroSerie: true, ubicacion: true, piso: true, dvr: true, ip: true, estado: true, observaciones: true } }),
      prisma.sensor.findMany({ where: whereSensor, orderBy: { codigo: 'asc' } }),
      prisma.puntoRed.findMany({ where: whereRed, orderBy: { codigo: 'asc' } }),
      prisma.equipoRed.findMany({ where: whereEquipoRed, orderBy: { codigo: 'asc' } }),
      prisma.documentoInventario.findMany({ orderBy: { fechaSubida: 'desc' } }),
    ])

    const computadorasActivas = filtrarArchivados(computadorasTodas)
    const perifericosActivos  = filtrarArchivados(perifericosTodas)
    const camarasActivas      = filtrarArchivados(camarasTodasLista)
    const sensoresActivos     = filtrarArchivados(sensoresTodas)
    const puntosRedActivos    = filtrarArchivados(puntosRedTodas)
    const equiposRedActivos   = filtrarArchivados(equiposRedTodas)

    const computadorasArchivadas = soloArchivados(computadorasTodas)
    const perifericosArchivados  = soloArchivados(perifericosTodas)
    const camarasArchivadas      = soloArchivados(camarasTodasLista)
    const sensoresArchivados     = soloArchivados(sensoresTodas)
    const puntosRedArchivados    = soloArchivados(puntosRedTodas)
    const equiposRedArchivados   = soloArchivados(equiposRedTodas)

    const archivados = []
    computadorasArchivadas.forEach(pc => archivados.push({ tipo: 'computadora', tipoLabel: 'Computadora', icono: 'fa-desktop', id: pc.id, codigo: pc.nombre, nombre: pc.nombre, detalle1: pc.fabricante || '—', detalle2: pc.modelo || '—', detalle3: pc.procesador ? `${pc.procesador} / ${pc.ramGb || '?'}GB` : '—', estado: pc.estado, observaciones: pc.observaciones }))
    perifericosArchivados.forEach(per => archivados.push({ tipo: 'periferico', tipoLabel: 'Periférico', icono: 'fa-keyboard', id: per.id, codigo: per.codigo, nombre: per.descripcion, detalle1: per.categoria, detalle2: per.computadoraAsignada || 'Sin asignar', detalle3: per.ubicacion || '—', estado: per.estado, observaciones: per.observaciones }))
    camarasArchivadas.forEach(cam => archivados.push({ tipo: 'camara', tipoLabel: 'Cámara', icono: 'fa-video', id: cam.id, codigo: cam.codigo, nombre: cam.marca || cam.codigo, detalle1: `DVR ${cam.dvr || '—'}`, detalle2: cam.ubicacion || '—', detalle3: `Piso ${cam.piso || '—'}`, estado: cam.estado, observaciones: cam.observaciones }))
    sensoresArchivados.forEach(s => archivados.push({ tipo: 'sensor', tipoLabel: 'Sensor', icono: 'fa-shield-alt', id: s.id, codigo: s.codigo, nombre: s.equipo, detalle1: s.nomenclatura, detalle2: s.ubicacion, detalle3: s.tecnologia, estado: s.estado, observaciones: s.observaciones }))
    puntosRedArchivados.forEach(r => archivados.push({ tipo: 'puntored', tipoLabel: 'Punto de Red', icono: 'fa-network-wired', id: r.id, codigo: r.codigo, nombre: r.ubicacion, detalle1: r.tipoCable, detalle2: r.longitud || '—', detalle3: r.tipoUso, estado: r.estado, observaciones: r.observaciones }))
    equiposRedArchivados.forEach(eq => archivados.push({ tipo: 'equipored', tipoLabel: 'Equipo de Red', icono: 'fa-server', id: eq.id, codigo: eq.codigo, nombre: eq.tipoEquipo, detalle1: eq.marca || '—', detalle2: eq.modelo || '—', detalle3: eq.ip || '—', estado: eq.estado, observaciones: eq.observaciones }))

    const camarasPorPisoLista = { '1': [], '2': [], '3': [] }
    camarasActivas.forEach(c => { if (['1','2','3'].includes(c.piso)) camarasPorPisoLista[c.piso].push(c) })

    let items = [], totalItems = 0
    switch(tab) {
      case 'computadoras': items = computadorasActivas; totalItems = computadorasActivas.length; break
      case 'perifericos':  items = perifericosActivos;  totalItems = perifericosActivos.length; break
      case 'camaras':      items = camarasActivas;      totalItems = camarasActivas.length; break
      case 'sensores':     items = sensoresActivos;     totalItems = sensoresActivos.length; break
      case 'red':
        if (subtabRed === 'equipos') {
          items = equiposRedActivos; totalItems = equiposRedActivos.length;
        } else {
          items = puntosRedActivos; totalItems = puntosRedActivos.length;
        }
        break
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
    const siguienteCodigoEquipoRed = await generarSiguienteCodigo('NET-', 'codigo', prisma.equipoRed)

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
      equiposRed: equiposRedActivos.length,
      documentos: documentosTodos.length,
      archivados: archivados.length,
    }

    const camarasPorPiso = { '1': camarasPorPisoLista['1'].length, '2': camarasPorPisoLista['2'].length, '3': camarasPorPisoLista['3'].length }

    // Para el tab 'red', paginar según el subtab activo
    let equiposRedPaginados = equiposRedActivos.slice(0, ITEMS_PER_PAGE)
    let puntosRedPaginados = puntosRedActivos.slice(0, ITEMS_PER_PAGE)

    if (tab === 'red') {
      if (subtabRed === 'equipos') {
        equiposRedPaginados = paginatedItems
      } else {
        puntosRedPaginados = paginatedItems
      }
    }

    res.render('inventario', {
      title: 'Inventario de Equipos',
      user: req.session.usuario,
      tab, piso, pisos: PISOS, estados: ESTADOS, subtabRed,
      camarasPorPiso, camarasPorPisoLista, camarasArchivoCount: 0,
      computadoras: tab === 'computadoras' ? paginatedItems : computadorasActivas.slice(0, ITEMS_PER_PAGE),
      perifericos: tab === 'perifericos' ? paginatedItems : perifericosActivos.slice(0, ITEMS_PER_PAGE),
      sensores: tab === 'sensores' ? paginatedItems : sensoresActivos.slice(0, ITEMS_PER_PAGE),
      equiposRed: equiposRedPaginados,
      puntosRed: puntosRedPaginados,
      documentos: tab === 'documentos' ? paginatedItems : documentosTodos.slice(0, ITEMS_PER_PAGE),
      archivados: tab === 'archivados' ? paginatedItems : archivados.slice(0, ITEMS_PER_PAGE),
      listaComputadoras, siguienteCodigoPeriferico, siguienteCodigoCamara, siguienteCodigoSensor, siguienteCodigoRed, siguienteCodigoEquipoRed,
      pagination: { page, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      counts, search,
      helpers,
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
  const codigoManual = !!codigo?.trim()
  const prefijo = `CAM-P${piso}-`

  if (codigoManual) codigo = codigo.trim()
  else codigo = await generarSiguienteCodigo(prefijo, 'codigo', prisma.camara)

  const maxIntentos = codigoManual ? 1 : 5
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      await prisma.camara.create({ data: { codigo: codigo.trim(), marca: marca?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, ubicacion: ubicacion?.trim() || null, piso, dvr, ip: ip?.trim() || null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
      req.flash('success', `Cámara ${codigo} agregada.`); return res.redirect('/inventario?tab=camaras&piso=' + piso)
    } catch (err) {
      const esCodigoDuplicado = err.code === 'P2002' && err.meta?.target?.includes('codigo')
      if (esCodigoDuplicado && !codigoManual && intento < maxIntentos) {
        codigo = await generarSiguienteCodigo(prefijo, 'codigo', prisma.camara)
        continue
      }
      console.error(err)
      req.flash('error', esCodigoDuplicado ? `El código ${codigo} ya existe.` : 'Error al crear cámara.')
      return res.redirect('/inventario?tab=camaras&piso=' + piso)
    }
  }
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
//  EQUIPOS DE RED (NUEVO)
// ═══════════════════════════════════════════════════════════════════════════

async function crearEquipoRed(req, res) {
  let { codigo, tipoEquipo, marca, modelo, numeroSerie, ubicacion, ip, estado, observaciones } = req.body
  if (!codigo?.trim()) {
    const ultimo = await prisma.equipoRed.findFirst({ where: { codigo: { startsWith: 'NET-' } }, orderBy: { codigo: 'desc' }, select: { codigo: true } })
    let n = 1; if (ultimo?.codigo) { const m = ultimo.codigo.match(/NET-(\d+)/); if (m) n = parseInt(m[1]) + 1 }
    codigo = `NET-${String(n).padStart(3, '0')}`
  }
  if (!tipoEquipo?.trim()) { req.flash('error', 'El tipo de equipo es obligatorio.'); return res.redirect('/inventario?tab=red&subtabRed=equipos') }
  try {
    await prisma.equipoRed.create({ data: { codigo: codigo.trim(), tipoEquipo: tipoEquipo.trim(), marca: marca?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, ubicacion: ubicacion?.trim() || null, ip: ip?.trim() || null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', `Equipo de red ${codigo} agregado.`); res.redirect('/inventario?tab=red&subtabRed=equipos')
  } catch (err) { console.error(err); req.flash('error', 'Error al crear equipo de red.'); res.redirect('/inventario?tab=red&subtabRed=equipos') }
}

async function editarEquipoRed(req, res) {
  const id = parseInt(req.params.id)
  const { tipoEquipo, marca, modelo, numeroSerie, ubicacion, ip, estado, observaciones } = req.body
  try {
    const eqAntes = await prisma.equipoRed.findUnique({ where: { id }, select: { estado: true } })
    const eraArchivado = esArchivado(eqAntes.estado), ahoraArchivado = esArchivado(estado)
    await prisma.equipoRed.update({ where: { id }, data: { tipoEquipo: tipoEquipo?.trim(), marca: marca?.trim() || null, modelo: modelo?.trim() || null, numeroSerie: numeroSerie?.trim() || null, ubicacion: ubicacion?.trim() || null, ip: ip?.trim() || null, estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', 'Equipo de red actualizado.')
    if (ahoraArchivado) res.redirect('/inventario?tab=archivados')
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=red&subtabRed=equipos')
    else res.redirect('/inventario?tab=red&subtabRed=equipos')
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=red&subtabRed=equipos') }
}

async function eliminarEquipoRed(req, res) {
  try { await prisma.equipoRed.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminado.') }
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=red&subtabRed=equipos')
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
  if (!ubicacion?.trim()) { req.flash('error', 'Ubicación obligatoria.'); return res.redirect('/inventario?tab=red&subtabRed=puntos') }
  try {
    await prisma.puntoRed.create({ data: { codigo: codigo.trim(), ubicacion: ubicacion.trim(), tipoCable: tipoCable || 'Cat 5e', longitud: longitud?.trim() || null, tipoUso: tipoUso || 'Datos', estado: estado || 'Operativo', observaciones: observaciones?.trim() || null } })
    req.flash('success', `Punto de red ${codigo} agregado.`); res.redirect('/inventario?tab=red&subtabRed=puntos')
  } catch (err) { console.error(err); req.flash('error', 'Error al crear punto de red.'); res.redirect('/inventario?tab=red&subtabRed=puntos') }
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
    else if (eraArchivado && !ahoraArchivado) res.redirect('/inventario?tab=red&subtabRed=puntos')
    else res.redirect('/inventario?tab=red&subtabRed=puntos')
  } catch (err) { console.error(err); req.flash('error', 'Error al actualizar.'); res.redirect('/inventario?tab=red&subtabRed=puntos') }
}

async function eliminarPuntoRed(req, res) {
  try { await prisma.puntoRed.delete({ where: { id: parseInt(req.params.id) } }); req.flash('success', 'Eliminado.') }
  catch (err) { console.error(err); req.flash('error', 'Error al eliminar.') }
  res.redirect('/inventario?tab=red&subtabRed=puntos')
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
      case 'equipored': await prisma.equipoRed.update({ where: { id: itemId }, data: { estado: nuevoEstado, ...datos } }); break
      default: return res.status(400).json({ success: false, error: 'Tipo no válido' })
    }
    req.flash('success', 'Equipo restaurado correctamente.')
    res.redirect('/inventario?tab=' + (tipo === 'puntored' ? 'red&subtabRed=puntos' : tipo === 'equipored' ? 'red&subtabRed=equipos' : tipo + 's'))
  } catch (err) { console.error(err); req.flash('error', 'Error al restaurar.'); res.redirect('/inventario?tab=archivados') }
}

const FRECUENCIAS = ['15dias', 'Mensual', '3meses', '6meses', 'Anual']
const TIPOS_MANTENIMIENTO = ['Preventivo', 'Correctivo']
const ESTADOS_MANTENIMIENTO = ['Pendiente', 'Realizado', 'Vencido']

// ═══════════════════════════════════════════════════════════════════
//  CORRECCIÓN: Funciones de fecha normalizadas a UTC medianoche
//  Esto soluciona el bug de los KPIs cuando @db.Date se compara con Date de JS
// ═══════════════════════════════════════════════════════════════════

function calcularProximaFecha(fechaBase, frecuencia) {
  const fecha = new Date(fechaBase)
  switch (frecuencia) {
    case '15dias':    fecha.setUTCDate(fecha.getUTCDate() + 15); break
    case 'Mensual':   fecha.setUTCMonth(fecha.getUTCMonth() + 1); break
    case '3meses':    fecha.setUTCMonth(fecha.getUTCMonth() + 3); break
    case '6meses':    fecha.setUTCMonth(fecha.getUTCMonth() + 6); break
    case 'Anual':     fecha.setUTCFullYear(fecha.getUTCFullYear() + 1); break
    default:          fecha.setUTCMonth(fecha.getUTCMonth() + 1)
  }
  return fecha
}

function getInicioMes() {
  const hoy = new Date()
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), 1))
}

function getFinMes() {
  const hoy = new Date()
  return new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59))
}

// Helper para detectar si una tabla existe en Prisma
async function tablaExiste(nombreTabla) {
  try {
    const result = await prisma.$queryRawUnsafe(`SHOW TABLES LIKE '${nombreTabla}'`)
    return result && result.length > 0
  } catch (e) {
    return false
  }
}

// ═══════════════════════════════════════════════════════════════════
//  GET /inventario/mantenimientos
// ═══════════════════════════════════════════════════════════════════

async function mostrarMantenimientos(req, res) {
  try {
    const existe = await tablaExiste('mantenimientos')
    if (!existe) {
      return res.render('mantenimientos', {
        title: 'Mantenimientos',
        user: req.session.usuario,
        filtro: 'todos',
        mantenimientos: [],
        counts: { pendientes: 0, realizados: 0, vencidos: 0, proximos: 0 },
        pagination: { page: 1, totalPages: 1, hasNext: false, hasPrev: false },
        search: '',
        estados: ESTADOS_MANTENIMIENTO,
        tipos: TIPOS_MANTENIMIENTO,
        frecuencias: FRECUENCIAS,
        helpers,
        tablaPendiente: true,
      })
    }

    const filtro = req.query.filtro || 'todos'
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const search = (req.query.search || '').trim()

    let where = {}
    if (search) {
      where.OR = [
        { responsable: { contains: search } },
        { descripcion: { contains: search } },
        { observaciones: { contains: search } },
      ]
    }

    switch (filtro) {
      case 'pendientes':   where.estado = 'Pendiente'; break
      case 'realizados':   where.estado = 'Realizado'; break
      case 'vencidos':
        where.estado = 'Pendiente'
        where.fechaProgramada = { lt: new Date() }
        break
      case 'preventivos':  where.tipo = 'Preventivo'; break
      case 'correctivos':  where.tipo = 'Correctivo'; break
      default: break
    }

    const [mantenimientos, totalItems] = await Promise.all([
      prisma.mantenimiento.findMany({
        where,
        orderBy: { fechaProgramada: 'asc' },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
      prisma.mantenimiento.count({ where }),
    ])

    const mantenimientosConEquipo = await Promise.all(
      mantenimientos.map(async (m) => {
        let equipoNombre = '—'
        try {
          switch (m.equipoTipo) {
            case 'computadora':
              const pc = await prisma.computadora.findUnique({ where: { id: m.equipoId }, select: { nombre: true } })
              equipoNombre = pc?.nombre || '—'
              break
            case 'periferico':
              const per = await prisma.periferico.findUnique({ where: { id: m.equipoId }, select: { codigo: true, descripcion: true } })
              equipoNombre = per ? `${per.codigo} - ${per.descripcion}` : '—'
              break
            case 'camara':
              const cam = await prisma.camara.findUnique({ where: { id: m.equipoId }, select: { codigo: true, ubicacion: true } })
              equipoNombre = cam ? `${cam.codigo} (${cam.ubicacion || '—'})` : '—'
              break
            case 'sensor':
              const sen = await prisma.sensor.findUnique({ where: { id: m.equipoId }, select: { codigo: true, equipo: true } })
              equipoNombre = sen ? `${sen.codigo} - ${sen.equipo}` : '—'
              break
            case 'puntored':
              const red = await prisma.puntoRed.findUnique({ where: { id: m.equipoId }, select: { codigo: true, ubicacion: true } })
              equipoNombre = red ? `${red.codigo} (${red.ubicacion || '—'})` : '—'
              break
            case 'equipored':
              const eq = await prisma.equipoRed.findUnique({ where: { id: m.equipoId }, select: { codigo: true, tipoEquipo: true } })
              equipoNombre = eq ? `${eq.codigo} (${eq.tipoEquipo})` : '—'
              break
          }
        } catch (e) { equipoNombre = 'Error' }
        return { ...m, equipoNombre }
      })
    )

    const [totalPendientes, totalRealizados, totalVencidos, totalProximos] = await Promise.all([
      prisma.mantenimiento.count({ where: { estado: 'Pendiente' } }),
      prisma.mantenimiento.count({ where: { estado: 'Realizado', fechaRealizada: { gte: getInicioMes(), lte: getFinMes() } } }),
      prisma.mantenimiento.count({ where: { estado: 'Pendiente', fechaProgramada: { lt: new Date() } } }),
      prisma.mantenimiento.count({
        where: {
          estado: 'Pendiente',
          fechaProgramada: { gte: new Date(), lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
        }
      }),
    ])

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1

    res.render('mantenimientos', {
      title: 'Mantenimientos',
      user: req.session.usuario,
      filtro,
      mantenimientos: mantenimientosConEquipo,
      counts: { pendientes: totalPendientes, realizados: totalRealizados, vencidos: totalVencidos, proximos: totalProximos },
      pagination: { page, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
      search,
      estados: ESTADOS_MANTENIMIENTO,
      tipos: TIPOS_MANTENIMIENTO,
      frecuencias: FRECUENCIAS,
      helpers,
      tablaPendiente: false,
    })
  } catch (err) {
    console.error('[mantenimientos] mostrarMantenimientos:', err)
    req.flash('error', 'Error al cargar mantenimientos: ' + err.message)
    res.redirect('/inventario')
  }
}

// ═══════════════════════════════════════════════════════════════════
//  GET /inventario/mantenimientos/dashboard
// ═══════════════════════════════════════════════════════════════════

async function dashboardMantenimientos(req, res) {
  try {
    const existe = await tablaExiste('mantenimientos')
    if (!existe) {
      return res.render('dashboard-mantenimientos', {
        title: 'Dashboard de Mantenimientos',
        user: req.session.usuario,
        kpis: { pendientes: 0, realizadosMes: 0, vencidos: 0, proximos7: 0 },
        chartPorMes: [],
        chartTipo: { preventivos: 0, correctivos: 0 },
        chartEquipos: [],
        helpers,
        tablaPendiente: true,
      })
    }

    const hoy = new Date()
    const inicioMes = getInicioMes()
    const finMes = getFinMes()

    const [pendientes, realizadosMes, vencidos, proximos7] = await Promise.all([
      prisma.mantenimiento.count({ where: { estado: 'Pendiente' } }),
      prisma.mantenimiento.count({ where: { estado: 'Realizado', fechaRealizada: { gte: inicioMes, lte: finMes } } }),
      prisma.mantenimiento.count({ where: { estado: 'Pendiente', fechaProgramada: { lt: hoy } } }),
      prisma.mantenimiento.count({
        where: {
          estado: 'Pendiente',
          fechaProgramada: { gte: hoy, lte: new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000) }
        }
      }),
    ])

    const porMes = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
      const count = await prisma.mantenimiento.count({
        where: { fechaRealizada: { gte: d, lte: fin } }
      })
      porMes.push({ mes: d.toLocaleString('es-ES', { month: 'short' }), count })
    }

    const [preventivos, correctivos] = await Promise.all([
      prisma.mantenimiento.count({ where: { tipo: 'Preventivo' } }),
      prisma.mantenimiento.count({ where: { tipo: 'Correctivo' } }),
    ])

    const equiposTop = await prisma.mantenimiento.groupBy({
      by: ['equipoId', 'equipoTipo'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    })

    const equiposTopConNombre = await Promise.all(
      equiposTop.map(async (e) => {
        let nombre = '—'
        try {
          switch (e.equipoTipo) {
            case 'computadora':
              const pc = await prisma.computadora.findUnique({ where: { id: e.equipoId }, select: { nombre: true } })
              nombre = pc?.nombre || '—'
              break
            case 'periferico':
              const per = await prisma.periferico.findUnique({ where: { id: e.equipoId }, select: { codigo: true } })
              nombre = per?.codigo || '—'
              break
            case 'camara':
              const cam = await prisma.camara.findUnique({ where: { id: e.equipoId }, select: { codigo: true } })
              nombre = cam?.codigo || '—'
              break
            case 'sensor':
              const sen = await prisma.sensor.findUnique({ where: { id: e.equipoId }, select: { codigo: true } })
              nombre = sen?.codigo || '—'
              break
            case 'puntored':
              const red = await prisma.puntoRed.findUnique({ where: { id: e.equipoId }, select: { codigo: true } })
              nombre = red?.codigo || '—'
              break
            case 'equipored':
              const eq = await prisma.equipoRed.findUnique({ where: { id: e.equipoId }, select: { codigo: true } })
              nombre = eq?.codigo || '—'
              break
          }
        } catch (err) { nombre = 'Error' }
        return { nombre, count: e._count.id }
      })
    )

    res.render('dashboard-mantenimientos', {
      title: 'Dashboard de Mantenimientos',
      user: req.session.usuario,
      counts: {
        pendientes: pendientes,
        realizados: realizadosMes,
        vencidos: vencidos,
        proximos: proximos7
      },
      chartData: {
        porMes: porMes,
        tipo: { preventivos, correctivos },
        equipos: equiposTopConNombre
      },
      kpis: { pendientes, realizadosMes, vencidos, proximos7 },
      chartPorMes: porMes,
      chartTipo: { preventivos, correctivos },
      chartEquipos: equiposTopConNombre,
      helpers,
      tablaPendiente: false,
    })
  } catch (err) {
    console.error('[mantenimientos] dashboard:', err)
    req.flash('error', 'Error al cargar el dashboard: ' + err.message)
    res.redirect('/inventario/mantenimientos')
  }
}

// ═══════════════════════════════════════════════════════════════════
//  POST /inventario/mantenimientos
// ═══════════════════════════════════════════════════════════════════

async function crearMantenimiento(req, res) {
  const { equipoId, equipoTipo, tipo, fechaProgramada, responsable, descripcion, frecuencia } = req.body
  if (!equipoId || !equipoTipo || !fechaProgramada) {
    req.flash('error', 'Equipo, tipo y fecha programada son obligatorios.')
    return res.redirect('/inventario/mantenimientos')
  }
  try {
    const [year, month, day] = fechaProgramada.split('-').map(Number)
    const fechaProgUTC = new Date(Date.UTC(year, month - 1, day))

    await prisma.mantenimiento.create({
      data: {
        equipoId: parseInt(equipoId),
        equipoTipo,
        tipo: tipo || 'Preventivo',
        estado: 'Pendiente',
        responsable: responsable?.trim() || null,
        fechaProgramada: fechaProgUTC,
        descripcion: descripcion?.trim() || null,
        frecuencia: frecuencia || 'Mensual',
      }
    })
    req.flash('success', 'Mantenimiento programado correctamente.')
    res.redirect('/inventario/mantenimientos')
  } catch (err) {
    console.error(err)
    req.flash('error', 'Error al crear mantenimiento: ' + err.message)
    res.redirect('/inventario/mantenimientos')
  }
}

// ═══════════════════════════════════════════════════════════════════
//  POST /inventario/mantenimientos/:id/completar
// ═══════════════════════════════════════════════════════════════════

async function completarMantenimiento(req, res) {
  const id = parseInt(req.params.id)
  const { fechaRealizada, horaInicio, horaFin, repuestos, observaciones } = req.body
  try {
    const mant = await prisma.mantenimiento.findUnique({ where: { id } })
    if (!mant) { req.flash('error', 'Mantenimiento no encontrado.'); return res.redirect('/inventario/mantenimientos') }

    const frecuencia = mant.frecuencia || 'Mensual'

    let fechaReal
    if (fechaRealizada) {
      const [year, month, day] = fechaRealizada.split('-').map(Number)
      fechaReal = new Date(Date.UTC(year, month - 1, day))
    } else {
      const hoy = new Date()
      fechaReal = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()))
    }

    const proxima = calcularProximaFecha(fechaReal, frecuencia)

    let tiempoInvertido = null
    if (horaInicio && horaFin) {
      const [h1, m1] = horaInicio.split(':').map(Number)
      const [h2, m2] = horaFin.split(':').map(Number)
      const minutosInicio = h1 * 60 + m1
      const minutosFin = h2 * 60 + m2
      tiempoInvertido = minutosFin - minutosInicio
      if (tiempoInvertido < 0) tiempoInvertido += 24 * 60
    }

    let fotoEvidencia = null
    if (req.file) {
      fotoEvidencia = req.file.filename
    }

    await prisma.mantenimiento.update({
      where: { id },
      data: {
        estado: 'Realizado',
        fechaRealizada: fechaReal,
        proximaFecha: proxima,
        horaInicio: horaInicio || null,
        horaFin: horaFin || null,
        tiempoInvertido: tiempoInvertido,
        repuestos: repuestos?.trim() || null,
        observaciones: observaciones?.trim() || null,
        fotoEvidencia: fotoEvidencia,
      }
    })

    await prisma.equipoMantenimiento.upsert({
      where: { equipoId_equipoTipo: { equipoId: mant.equipoId, equipoTipo: mant.equipoTipo } },
      update: { ultimoMantenimiento: fechaReal, proximoMantenimiento: proxima },
      create: {
        equipoId: mant.equipoId,
        equipoTipo: mant.equipoTipo,
        frecuencia,
        ultimoMantenimiento: fechaReal,
        proximoMantenimiento: proxima,
      }
    })

    req.flash('success', 'Mantenimiento completado. Próxima fecha: ' + proxima.toLocaleDateString('es-ES'))
    res.redirect('/inventario/mantenimientos')
  } catch (err) {
    console.error(err)
    req.flash('error', 'Error al completar mantenimiento: ' + err.message)
    res.redirect('/inventario/mantenimientos')
  }
}

// ═══════════════════════════════════════════════════════════════════
//  POST /inventario/mantenimientos/:id/editar
// ═══════════════════════════════════════════════════════════════════

async function editarMantenimiento(req, res) {
  const id = parseInt(req.params.id)
  const { tipo, fechaProgramada, responsable, descripcion, frecuencia } = req.body
  try {
    const mant = await prisma.mantenimiento.findUnique({ where: { id }, select: { estado: true } })
    if (mant && mant.estado === 'Realizado') {
      req.flash('error', 'No se puede editar un mantenimiento ya completado.')
      return res.redirect('/inventario/mantenimientos')
    }

    let fechaProg = undefined
    if (fechaProgramada) {
      const [year, month, day] = fechaProgramada.split('-').map(Number)
      fechaProg = new Date(Date.UTC(year, month - 1, day))
    }

    await prisma.mantenimiento.update({
      where: { id },
      data: {
        tipo: tipo || undefined,
        fechaProgramada: fechaProg,
        responsable: responsable?.trim() || null,
        descripcion: descripcion?.trim() || null,
        frecuencia: frecuencia || undefined,
      }
    })
    req.flash('success', 'Mantenimiento actualizado.')
    res.redirect('/inventario/mantenimientos')
  } catch (err) {
    console.error(err)
    req.flash('error', 'Error al actualizar: ' + err.message)
    res.redirect('/inventario/mantenimientos')
  }
}

// ═══════════════════════════════════════════════════════════════════
//  POST /inventario/mantenimientos/:id/eliminar
// ═══════════════════════════════════════════════════════════════════

async function eliminarMantenimiento(req, res) {
  try {
    await prisma.mantenimiento.delete({ where: { id: parseInt(req.params.id) } })
    req.flash('success', 'Mantenimiento eliminado.')
  } catch (err) {
    console.error(err)
    req.flash('error', 'Error al eliminar: ' + err.message)
  }
  res.redirect('/inventario/mantenimientos')
}

// ═══════════════════════════════════════════════════════════════════
//  POST /inventario/equipos/:tipo/:id/frecuencia
// ═══════════════════════════════════════════════════════════════════

async function configurarFrecuencia(req, res) {
  const { tipo, id } = req.params
  const { frecuencia } = req.body
  const equipoId = parseInt(id)
  try {
    await prisma.equipoMantenimiento.upsert({
      where: { equipoId_equipoTipo: { equipoId, equipoTipo: tipo } },
      update: { frecuencia: frecuencia || 'Mensual' },
      create: {
        equipoId,
        equipoTipo: tipo,
        frecuencia: frecuencia || 'Mensual',
      }
    })
    req.flash('success', 'Frecuencia de mantenimiento actualizada.')
    res.redirect('/inventario/mantenimientos')
  } catch (err) {
    console.error(err)
    req.flash('error', 'Error al configurar frecuencia: ' + err.message)
    res.redirect('/inventario/mantenimientos')
  }
}

// ═══════════════════════════════════════════════════════════════════
//  GET /api/inventario/equipos/:tipo
// ═══════════════════════════════════════════════════════════════════

async function listarEquiposPorTipo(req, res) {
  const { tipo } = req.params
  try {
    let equipos = []
    switch (tipo) {
      case 'computadora':
        equipos = await prisma.computadora.findMany({ where: { estado: { not: 'Archivado' } }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } })
        break
      case 'periferico':
        equipos = await prisma.periferico.findMany({ where: { estado: { not: 'Archivado' } }, select: { id: true, codigo: true, descripcion: true }, orderBy: { codigo: 'asc' } })
        break
      case 'camara':
        equipos = await prisma.camara.findMany({ where: { estado: { not: 'Archivado' } }, select: { id: true, codigo: true, ubicacion: true }, orderBy: { codigo: 'asc' } })
        break
      case 'sensor':
        equipos = await prisma.sensor.findMany({ where: { estado: { not: 'Archivado' } }, select: { id: true, codigo: true, equipo: true }, orderBy: { codigo: 'asc' } })
        break
      case 'puntored':
        equipos = await prisma.puntoRed.findMany({ where: { estado: { not: 'Archivado' } }, select: { id: true, codigo: true, ubicacion: true }, orderBy: { codigo: 'asc' } })
        break
      case 'equipored':
        equipos = await prisma.equipoRed.findMany({ where: { estado: { not: 'Archivado' } }, select: { id: true, codigo: true, tipoEquipo: true }, orderBy: { codigo: 'asc' } })
        break
    }
    res.json({ success: true, equipos })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: err.message })
  }
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
  editarSensor,
  eliminarSensor,
  crearEquipoRed,
  editarEquipoRed,
  eliminarEquipoRed,
  crearPuntoRed,
  editarPuntoRed,
  eliminarPuntoRed,
  subirDocumento,
  eliminarDocumento,
  restaurarArchivado,
  mostrarMantenimientos,
  dashboardMantenimientos,
  crearMantenimiento,
  completarMantenimiento,
  editarMantenimiento,
  eliminarMantenimiento,
  configurarFrecuencia,
  listarEquiposPorTipo,
}