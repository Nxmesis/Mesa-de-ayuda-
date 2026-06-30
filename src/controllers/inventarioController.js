'use strict'

const prisma = require('../utils/db')

// ═══════════════════════════════════════════════════════════════════════════
//  GET /inventario — Mostrar vista principal
// ═══════════════════════════════════════════════════════════════════════════

async function mostrarInventario(req, res) {
  try {
    const [computadoras, perifericos] = await Promise.all([
      prisma.computadora.findMany({
        orderBy: { nombre: 'asc' },
        include: { perifericos: true },
      }),
      prisma.periferico.findMany({
        orderBy: { codigo: 'asc' },
        include: { computadora: true },
      }),
    ])

    // Calcular siguiente código sugerido para periféricos
    let siguienteCodigoPeriferico = 'PER-001'
    const ultimoPeriferico = await prisma.periferico.findFirst({
      orderBy: { codigo: 'desc' },
      where: { codigo: { startsWith: 'PER-' } },
    })

    if (ultimoPeriferico && ultimoPeriferico.codigo) {
      const match = ultimoPeriferico.codigo.match(/PER-(\d+)/)
      if (match) {
        const siguienteNumero = parseInt(match[1]) + 1
        siguienteCodigoPeriferico = `PER-${String(siguienteNumero).padStart(3, '0')}`
      }
    }

    res.render('inventario', {
      title: 'Inventario de Equipos',
      user: req.session.usuario,
      computadoras,
      perifericos,
      siguienteCodigoPeriferico,
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
    res.redirect('/inventario')

  } catch (err) {
    console.error('[inventarioController] crearComputadora:', err)
    req.flash('error', 'Error al crear la computadora. ¿El nombre ya existe?')
    res.redirect('/inventario')
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
    res.redirect('/inventario')

  } catch (err) {
    console.error('[inventarioController] editarComputadora:', err)
    req.flash('error', 'Error al actualizar la computadora.')
    res.redirect('/inventario')
  }
}

async function eliminarComputadora(req, res) {
  const id = parseInt(req.params.id)

  try {
    // Desvincular periféricos primero
    const pc = await prisma.computadora.findUnique({ where: { id } })
    if (pc) {
      await prisma.periferico.updateMany({
        where: { computadoraAsignada: pc.nombre },
        data: { computadoraAsignada: null },
      })
    }

    await prisma.computadora.delete({ where: { id } })

    req.flash('success', 'Computadora eliminada correctamente.')
    res.redirect('/inventario')

  } catch (err) {
    console.error('[inventarioController] eliminarComputadora:', err)
    req.flash('error', 'Error al eliminar la computadora.')
    res.redirect('/inventario')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PERIFÉRICOS
// ═══════════════════════════════════════════════════════════════════════════

async function crearPeriferico(req, res) {
  let { codigo, categoria, descripcion, estado, observaciones, computadoraAsignada, ubicacion } = req.body

  // Si no se proporcionó código, generar uno automáticamente
  if (!codigo || !codigo.trim()) {
    try {
      const ultimoPeriferico = await prisma.periferico.findFirst({
        orderBy: { codigo: 'desc' },
        where: { codigo: { startsWith: 'PER-' } },
      })

      let siguienteNumero = 1
      if (ultimoPeriferico && ultimoPeriferico.codigo) {
        const match = ultimoPeriferico.codigo.match(/PER-(\d+)/)
        if (match) {
          siguienteNumero = parseInt(match[1]) + 1
        }
      }

      codigo = `PER-${String(siguienteNumero).padStart(3, '0')}`
    } catch (err) {
      console.error('[inventarioController] Error generando código:', err)
      req.flash('error', 'Error al generar el código automático.')
      return res.redirect('/inventario')
    }
  }

  // Validar campos obligatorios
  if (!categoria || !categoria.trim() || !descripcion || !descripcion.trim()) {
    req.flash('error', 'Categoría y descripción son obligatorios.')
    return res.redirect('/inventario')
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
    res.redirect('/inventario')

  } catch (err) {
    console.error('[inventarioController] crearPeriferico:', err)
    req.flash('error', 'Error al crear el periférico. ¿El código ya existe?')
    res.redirect('/inventario')
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
    res.redirect('/inventario')

  } catch (err) {
    console.error('[inventarioController] editarPeriferico:', err)
    req.flash('error', 'Error al actualizar el periférico.')
    res.redirect('/inventario')
  }
}

async function eliminarPeriferico(req, res) {
  const id = parseInt(req.params.id)

  try {
    await prisma.periferico.delete({ where: { id } })

    req.flash('success', 'Periférico eliminado correctamente.')
    res.redirect('/inventario')

  } catch (err) {
    console.error('[inventarioController] eliminarPeriferico:', err)
    req.flash('error', 'Error al eliminar el periférico.')
    res.redirect('/inventario')
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
}