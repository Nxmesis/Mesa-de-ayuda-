const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de base de datos...')

  // ── Categorías ────────────────────────────────────────────────────────────
  const categorias = [
    { nombre: 'Hardware',       descripcion: 'Problemas con equipos físicos, periféricos o componentes' },
    { nombre: 'Software',       descripcion: 'Instalación, errores o fallas en aplicaciones' },
    { nombre: 'Red',            descripcion: 'Problemas de conectividad, internet o red local' },
    { nombre: 'Otro',           descripcion: 'Incidentes que no corresponden a las categorías anteriores' },
    { nombre: 'Administrativo', descripcion: 'Solicitud a personal administrativo' },
    { nombre: 'Cámaras',        descripcion: 'Revisión de factura con cámaras' },
  ]

  // Eliminar categorías obsoletas
  const eliminadas = ['Acceso / Cuenta', 'Impresoras', 'Correo']
  for (const nombre of eliminadas) {
    const cat = await prisma.categoria.findUnique({ where: { nombre } })
    if (cat) {
      await prisma.comentario.deleteMany({
        where: { ticket: { categoriaId: cat.id } }
      })
      const { count: ticketsCount } = await prisma.ticket.deleteMany({
        where: { categoriaId: cat.id }
      })
      await prisma.categoria.delete({ where: { id: cat.id } })
      console.log(`🗑️  Categoría "${nombre}" eliminada (${ticketsCount} ticket(s) borrado(s))`)
    }
  }

  for (const cat of categorias) {
    await prisma.categoria.upsert({
      where:  { nombre: cat.nombre },
      update: { descripcion: cat.descripcion },
      create: cat,
    })
  }
  console.log(`✅ ${categorias.length} categorías configuradas`)

  // ── ELIMINAR cuentas de prueba ──────────────────────────────────────────
  const cuentasPrueba = ['tecnico1', 'jruiz']
  for (const username of cuentasPrueba) {
    const usuario = await prisma.usuario.findUnique({ where: { username } })
    if (usuario) {
      await prisma.comentario.deleteMany({ where: { usuarioId: usuario.id } })
      await prisma.ticket.deleteMany({ where: { usuarioId: usuario.id } })
      await prisma.ticket.updateMany({
        where: { tecnicoId: usuario.id },
        data: { tecnicoId: null }
      })
      await prisma.usuario.delete({ where: { id: usuario.id } })
      console.log(`🗑️  Cuenta de prueba "${username}" eliminada`)
    }
  }

  // ── CREAR/ACTUALIZAR cuentas administrativas ────────────────────────────

  // Jefes - Gerencia
  const jefes = [
    { nombre: 'Ketherine Armesto', username: 'karmesto', password: 'Ketherine2026!', area: 'Gerencial' },
    { nombre: 'Gonzaga Aguirre',   username: 'gaguirre', password: 'Gonzaga2026!',   area: 'Gerencial' },
  ]

  for (const jefe of jefes) {
    const hashedPassword = await bcrypt.hash(jefe.password, 10)
    await prisma.usuario.upsert({
      where:  { username: jefe.username },
      update: { area: jefe.area },
      create: {
        nombre:   jefe.nombre,
        username: jefe.username,
        password: hashedPassword,
        area:     jefe.area,
        rol:      'admin',
        activo:   true,
      },
    })
    console.log(`✅ ${jefe.username} (${jefe.nombre}) → [GERENCIA - ${jefe.area}]`)
  }

  // Administradoras - Admin
  const administradoras = [
    { nombre: 'Diana Dias',   username: 'ddias',  password: 'Diana2026!',   area: 'Administración' },
    { nombre: 'Glenis Lopez', username: 'glopez', password: 'Glenis2026!',  area: 'Administración' },
  ]

  for (const admin of administradoras) {
    const hashedPassword = await bcrypt.hash(admin.password, 10)
    await prisma.usuario.upsert({
      where:  { username: admin.username },
      update: { area: admin.area },
      create: {
        nombre:   admin.nombre,
        username: admin.username,
        password: hashedPassword,
        area:     admin.area,
        rol:      'tecnico',
        activo:   true,
      },
    })
    console.log(`✅ ${admin.username} (${admin.nombre}) → [ADMIN - ${admin.area}]`)
  }

  // ── Actualizar cuenta admin existente ────────────────────────────────────
  const adminExistente = await prisma.usuario.findUnique({ where: { username: 'admin' } })
  if (adminExistente) {
    await prisma.usuario.update({
      where: { id: adminExistente.id },
      data: { 
        rol: 'admin',
        area: 'Tecnología',
        activo: true,
      }
    })
    console.log(`✅ admin (Administrador TI) → rol: GERENCIA, área: Tecnología`)
  }

  // ── LIMPIAR tickets y comentarios residuales ────────────────────────────
  const comentariosCount = await prisma.comentario.count()
  const ticketsCount = await prisma.ticket.count()

  if (comentariosCount > 0 || ticketsCount > 0) {
    await prisma.comentario.deleteMany({})
    await prisma.ticket.deleteMany({})
    console.log(`🗑️  Datos residuales eliminados: ${ticketsCount} tickets, ${comentariosCount} comentarios`)
  }

  console.log('\n🎉 Seed completado — Sistema listo para producción')
  console.log('   Base de datos limpia. Solo usuarios y categorías configurados.')
}

main()
  .catch(e => { console.error('❌ Error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })