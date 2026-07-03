'use strict'

const prisma = require('../utils/db')

const ITEMS_PER_PAGE = 50
const PISOS = ['1', '2', '3']

// ═══════════════════════════════════════════════════════════════════════════
//  GET /inventario — Mostrar vista principal
// ═══════════════════════════════════════════════════════════════════════════

async function mostrarInventario(req, res) {
  try {
    const tab = req.query.tab || 'computadoras'
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const search = (req.query.search || '').trim()
    const piso = req.query.piso || '1'

    const wherePC = search ? {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { fabricante: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
      ]
    } : {}

    const wherePer = search ? {
      OR: [
        { codigo: { contains: search, mode: 'insensitive' } },
        { categoria: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
      ]
    } : {}

    const whereCam = search ? {
      AND: [
        { piso: piso },
        {
          OR: [
            { codigo: { contains: search, mode: 'insensitive' } },
            { marca: { contains: search, mode: 'insensitive' } },
            { ubicacion: { contains: search, mode: 'insensitive' } },
          ]
        }
      ]
    } : { piso: piso }

    const [computadorasPaginadas, computadorasTodas] = await Promise.all([
      tab === 'computadoras' ? prisma.computadora.findMany({
        where: wherePC,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        select: {
          id: true, nombre: true, fabricante: true, modelo: true,
          procesador: true, ramGb: true, discoSsdGb: true,
          estado: true, observaciones: true,
        },
      }) : Promise.resolve([]),

      prisma.computadora.findMany({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true },
      }),
    ])

    const [perifericosPaginados, perifericosTodos] = await Promise.all([
      tab === 'perifericos' ? prisma.periferico.findMany({
        where: wherePer,
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        select: {
          id: true, codigo: true, categoria: true, descripcion: true,
          estado: true, computadoraAsignada: true, ubicacion: true, observaciones: true,
        },
      }) : Promise.resolve([]),

      tab !== 'perifericos' ? prisma.periferico.findMany({
        orderBy: { codigo: 'asc' },
        select: {
          id: true, codigo: true, categoria: true, descripcion: true,
          estado: true, computadoraAsignada: true, ubicacion: true, observaciones: true,
        },
      }) : Promise.resolve([]),
    ])

    const [camarasPaginadas, camarasTodos] = await Promise.all([
      tab === 'camaras' ? prisma.camara.findMany({
        where: whereCam,
        orderBy: { codigo: 'asc' },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        select: {
          id: true, codigo: true, marca: true, ubicacion: true,
          piso: true, dvr: true, estado: true, observaciones: true,
        },
      }) : Promise.resolve([]),

      tab !== 'camaras' ? prisma.camara.findMany({
        where: { piso: piso },
        orderBy: { codigo: 'asc' },
        select: {
          id: true, codigo: true, marca: true, ubicacion: true,
          piso: true, dvr: true, estado: true, observaciones: true,
        },
      }) : Promise.resolve([]),
    ])

    const computadoras = tab === 'computadoras' ? computadorasPaginadas : computadorasTodas
    const perifericos  = tab === 'perifericos'  ? perifericosPaginados  : perifericosTodos
    const camaras      = tab === 'camaras'      ? camarasPaginadas      : camarasTodos

    const [totalPCs, totalPer, totalCam] = await Promise.all([
      prisma.computadora.count({ where: wherePC }),
      prisma.periferico.count({ where: wherePer }),
      prisma.camara.count({ where: whereCam }),
    ])

    const camarasPorPiso = await Promise.all(
      PISOS.map(p => prisma.camara.count({ where: { piso: p } }))
    )

    let siguienteCodigoPeriferico = 'PER-001'

    if (totalPer < 10000) {
      const ultimoPeriferico = await prisma.periferico.findFirst({
        where: { codigo: { startsWith: 'PER-' } },
        orderBy: { codigo: 'desc' },
        select: { codigo: true },
      })
      if (ultimoPeriferico?.codigo) {
        const match = ultimoPeriferico.codigo.match(/PER-(\d+)/)
        if (match) siguienteCodigoPeriferico = `PER-${String(parseInt(match[1]) + 1).padStart(3, '0')}`
      }
    }

    const siguienteCodigoCamara = {}
    for (const p of PISOS) {
      const ultimaCamara = await prisma.camara.findFirst({
        where: { 
          codigo: { startsWith: `CAM-P${p}-` },
          piso: p
        },
        orderBy: { codigo: 'desc' },
        select: { codigo: true },
      })

      if (ultimaCamara?.codigo) {
        const match = ultimaCamara.codigo.match(/CAM-P\d+-(\d+)/)
        if (match) {
          siguienteCodigoCamara[p] = `CAM-P${p}-${String(parseInt(match[1]) + 1).padStart(3, '0')}`
        } else {
          siguienteCodigoCamara[p] = `CAM-P${p}-001`
        }
      } else {
        siguienteCodigoCamara[p] = `CAM-P${p}-001`
      }
    }

    const listaComputadoras = computadorasTodas.map(pc => ({ nombre: pc.nombre }))

    res.render('inventario', {
      title: 'Inventario de Equipos',
      user: req.session.usuario,
      tab,
      piso,
      pisos: PISOS,
      camarasPorPiso: Object.fromEntries(PISOS.map((p, i) => [p, camarasPorPiso[i]])),
      computadoras,
      perifericos,
      camaras,
      listaComputadoras,
      siguienteCodigoPeriferico,
      siguienteCodigoCamara,
      pagination: {
        page,
        totalPages: Math.ceil(
          (tab === 'computadoras' ? totalPCs : tab === 'perifericos' ? totalPer : totalCam) / ITEMS_PER_PAGE
        ),
        hasNext: page < Math.ceil(
          (tab === 'computadoras' ? totalPCs : tab === 'perifericos' ? totalPer : totalCam) / ITEMS_PER_PAGE
        ),
        hasPrev: page > 1,
      },
      counts: { pcs: totalPCs, perifericos: totalPer, camaras: totalCam },
      search,
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

  if (!nombre || !nombre.trim()) {
    req.flash('error', 'El nombre de la computadora es obligatorio.')
    return res.redirect('/inventario')
  }

  try {
    await prisma.computadora.create({
      data: {
        nombre: nombre.trim(),
        fabricante: fabricante ? fabricante.trim() : null,
        modelo: modelo ? modelo.trim() : null,
        numeroSerie: numeroSerie ? numeroSerie.trim() : null,
        procesador: procesador ? procesador.trim() : null,
        ramGb: ramGb ? parseInt(ramGb) : null,
        discoSsdGb: discoSsdGb ? parseInt(discoSsdGb) : null,
        estado: estado || 'Operativo',
        observaciones: observaciones ? observaciones.trim() : null,
      },
    })

    req.flash('success', `Computadora ${nombre} agregada correctamente.`)
    res.redirect('/inventario?tab=computadoras')

  } catch (err) {
    console.error('[inventarioController] crearComputadora:', err)
    req.flash('error', 'Error al crear la computadora. ¿El nombre ya existe?')
    res.redirect('/inventario?tab=computadoras')
  }
}

async function editarComputadora(req, res) {
  const id = parseInt(req.params.id)
  const { fabricante, modelo, numeroSerie, procesador, ramGb, discoSsdGb, estado, observaciones } = req.body

  try {
    await prisma.computadora.update({
      where: { id },
      data: {
        fabricante: fabricante ? fabricante.trim() : null,
        modelo: modelo ? modelo.trim() : null,
        numeroSerie: numeroSerie ? numeroSerie.trim() : null,
        procesador: procesador ? procesador.trim() : null,
        ramGb: ramGb ? parseInt(ramGb) : null,
        discoSsdGb: discoSsdGb ? parseInt(discoSsdGb) : null,
        estado: estado || 'Operativo',
        observaciones: observaciones ? observaciones.trim() : null,
      },
    })

    req.flash('success', 'Computadora actualizada correctamente.')
    res.redirect('/inventario?tab=computadoras')

  } catch (err) {
    console.error('[inventarioController] editarComputadora:', err)
    req.flash('error', 'Error al actualizar la computadora.')
    res.redirect('/inventario?tab=computadoras')
  }
}

async function eliminarComputadora(req, res) {
  const id = parseInt(req.params.id)

  try {
    const pc = await prisma.computadora.findUnique({ 
      where: { id },
      select: { nombre: true }
    })
    if (pc) {
      await prisma.periferico.updateMany({
        where: { computadoraAsignada: pc.nombre },
        data: { computadoraAsignada: null },
      })
    }

    await prisma.computadora.delete({ where: { id } })

    req.flash('success', 'Computadora eliminada correctamente.')
    res.redirect('/inventario?tab=computadoras')

  } catch (err) {
    console.error('[inventarioController] eliminarComputadora:', err)
    req.flash('error', 'Error al eliminar la computadora.')
    res.redirect('/inventario?tab=computadoras')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PERIFÉRICOS
// ═══════════════════════════════════════════════════════════════════════════

async function crearPeriferico(req, res) {
  let { codigo, categoria, descripcion, estado, observaciones, computadoraAsignada, ubicacion } = req.body

  if (!codigo || !codigo.trim()) {
    try {
      const ultimoPeriferico = await prisma.periferico.findFirst({
        where: { codigo: { startsWith: 'PER-' } },
        orderBy: { codigo: 'desc' },
        select: { codigo: true },
      })

      let siguienteNumero = 1
      if (ultimoPeriferico?.codigo) {
        const match = ultimoPeriferico.codigo.match(/PER-(\d+)/)
        if (match) siguienteNumero = parseInt(match[1]) + 1
      }

      codigo = `PER-${String(siguienteNumero).padStart(3, '0')}`
    } catch (err) {
      console.error('[inventarioController] Error generando código:', err)
      req.flash('error', 'Error al generar el código automático.')
      return res.redirect('/inventario?tab=perifericos')
    }
  }

  if (!categoria || !categoria.trim() || !descripcion || !descripcion.trim()) {
    req.flash('error', 'Categoría y descripción son obligatorios.')
    return res.redirect('/inventario?tab=perifericos')
  }

  try {
    await prisma.periferico.create({
      data: {
        codigo: codigo.trim(),
        categoria: categoria.trim(),
        descripcion: descripcion.trim(),
        estado: estado || 'Operativo',
        observaciones: observaciones ? observaciones.trim() : null,
        computadoraAsignada: computadoraAsignada ? computadoraAsignada.trim() : null,
        ubicacion: ubicacion ? ubicacion.trim() : null,
      },
    })

    req.flash('success', `Periférico ${codigo} agregado correctamente.`)
    res.redirect('/inventario?tab=perifericos')

  } catch (err) {
    console.error('[inventarioController] crearPeriferico:', err)
    req.flash('error', 'Error al crear el periférico. ¿El código ya existe?')
    res.redirect('/inventario?tab=perifericos')
  }
}

async function editarPeriferico(req, res) {
  const id = parseInt(req.params.id)
  const { categoria, descripcion, estado, observaciones, computadoraAsignada, ubicacion } = req.body

  try {
    await prisma.periferico.update({
      where: { id },
      data: {
        categoria: categoria ? categoria.trim() : undefined,
        descripcion: descripcion ? descripcion.trim() : undefined,
        estado: estado || 'Operativo',
        observaciones: observaciones ? observaciones.trim() : null,
        computadoraAsignada: computadoraAsignada ? computadoraAsignada.trim() : null,
        ubicacion: ubicacion ? ubicacion.trim() : null,
      },
    })

    req.flash('success', 'Periférico actualizado correctamente.')
    res.redirect('/inventario?tab=perifericos')

  } catch (err) {
    console.error('[inventarioController] editarPeriferico:', err)
    req.flash('error', 'Error al actualizar el periférico.')
    res.redirect('/inventario?tab=perifericos')
  }
}

async function eliminarPeriferico(req, res) {
  const id = parseInt(req.params.id)

  try {
    await prisma.periferico.delete({ where: { id } })

    req.flash('success', 'Periférico eliminado correctamente.')
    res.redirect('/inventario?tab=perifericos')

  } catch (err) {
    console.error('[inventarioController] eliminarPeriferico:', err)
    req.flash('error', 'Error al eliminar el periférico.')
    res.redirect('/inventario?tab=perifericos')
  }
}

async function cambiarEstadoPeriferico(req, res) {
  const id = parseInt(req.params.id)
  const { estado } = req.body

  try {
    await prisma.periferico.update({
      where: { id },
      data: { estado },
    })

    res.json({ success: true, estado })

  } catch (err) {
    console.error('[inventarioController] cambiarEstadoPeriferico:', err)
    res.status(500).json({ success: false, error: 'Error al cambiar estado' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CÁMARAS
// ═══════════════════════════════════════════════════════════════════════════

async function crearCamara(req, res) {
  let { codigo, marca, modelo, numeroSerie, ubicacion, piso, dvr, ip, estado, observaciones } = req.body
  piso = piso || '1'
  dvr = dvr || '1'

  if (!codigo || !codigo.trim()) {
    try {
      const ultimaCamara = await prisma.camara.findFirst({
        where: { 
          codigo: { startsWith: `CAM-P${piso}-` },
          piso: piso
        },
        orderBy: { codigo: 'desc' },
        select: { codigo: true },
      })

      let siguienteNumero = 1
      if (ultimaCamara?.codigo) {
        const match = ultimaCamara.codigo.match(/CAM-P\d+-(\d+)/)
        if (match) siguienteNumero = parseInt(match[1]) + 1
      }

      codigo = `CAM-P${piso}-${String(siguienteNumero).padStart(3, '0')}`
    } catch (err) {
      console.error('[inventarioController] Error generando código cámara:', err)
      req.flash('error', 'Error al generar el código automático.')
      return res.redirect('/inventario?tab=camaras&piso=' + piso)
    }
  }

  try {
    await prisma.camara.create({
      data: {
        codigo: codigo.trim(),
        marca: marca ? marca.trim() : null,
        modelo: modelo ? modelo.trim() : null,
        numeroSerie: numeroSerie ? numeroSerie.trim() : null,
        ubicacion: ubicacion ? ubicacion.trim() : null,
        piso: piso,
        dvr: dvr,
        ip: ip ? ip.trim() : null,
        estado: estado || 'Operativo',
        observaciones: observaciones ? observaciones.trim() : null,
      },
    })

    req.flash('success', `Cámara ${codigo} agregada correctamente.`)
    res.redirect('/inventario?tab=camaras&piso=' + piso)

  } catch (err) {
    console.error('[inventarioController] crearCamara:', err)
    req.flash('error', 'Error al crear la cámara. ¿El código ya existe?')
    res.redirect('/inventario?tab=camaras&piso=' + piso)
  }
}

async function editarCamara(req, res) {
  const id = parseInt(req.params.id)
  const { marca, modelo, numeroSerie, ubicacion, piso, dvr, ip, estado, observaciones } = req.body

  try {
    await prisma.camara.update({
      where: { id },
      data: {
        marca: marca ? marca.trim() : null,
        modelo: modelo ? modelo.trim() : null,
        numeroSerie: numeroSerie ? numeroSerie.trim() : null,
        ubicacion: ubicacion ? ubicacion.trim() : null,
        piso: piso || '1',
        dvr: dvr || '1',
        ip: ip ? ip.trim() : null,
        estado: estado || 'Operativo',
        observaciones: observaciones ? observaciones.trim() : null,
      },
    })

    req.flash('success', 'Cámara actualizada correctamente.')
    res.redirect('/inventario?tab=camaras&piso=' + (piso || '1'))

  } catch (err) {
    console.error('[inventarioController] editarCamara:', err)
    req.flash('error', 'Error al actualizar la cámara.')
    res.redirect('/inventario?tab=camaras')
  }
}

async function eliminarCamara(req, res) {
  const id = parseInt(req.params.id)

  try {
    await prisma.camara.delete({ where: { id } })

    req.flash('success', 'Cámara eliminada correctamente.')
    res.redirect('/inventario?tab=camaras')

  } catch (err) {
    console.error('[inventarioController] eliminarCamara:', err)
    req.flash('error', 'Error al eliminar la cámara.')
    res.redirect('/inventario?tab=camaras')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

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
}