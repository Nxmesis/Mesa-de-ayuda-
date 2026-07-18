'use strict'

const express = require('express')
const router = express.Router()
const { requireAuth, requireAdminOnly } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

// Asegura que una carpeta exista antes de que multer intente escribir en ella
function asegurarCarpeta(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// Configuración de multer para documentos
const storageDocs = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, asegurarCarpeta(path.join(__dirname, '..', '..', 'uploads', 'documentos')))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const uploadDocs = multer({
  storage: storageDocs,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Solo se permiten PDF e imágenes'))
  }
})

// Configuración de multer para fotos de evidencia de mantenimientos
const storageEvidencias = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, asegurarCarpeta(path.join(__dirname, '..', '..', 'uploads', 'evidencias')))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'evid-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const uploadEvidencias = multer({
  storage: storageEvidencias,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) cb(null, true)
    else cb(new Error('Solo se permiten imágenes (JPG, PNG, WEBP)'))
  }
})

// ═══════════════════════════════════════════════════════════════════════════
//  CARGA DINÁMICA DEL CONTROLADOR (evita ERR_REQUIRE_ASYNC_MODULE)
// ═══════════════════════════════════════════════════════════════════════════

let ctrl = null

async function getCtrl() {
  if (!ctrl) {
    ctrl = await import('../controllers/inventarioController.js')
  }
  return ctrl
}

// Wrapper para handlers async que necesitan el controlador
function withCtrl(handlerName) {
  return async (req, res, next) => {
    try {
      const controller = await getCtrl()
      await controller[handlerName](req, res, next)
    } catch (err) {
      next(err)
    }
  }
}

// GET
router.get('/inventario', requireAuth, requireAdminOnly, withCtrl('mostrarInventario'))

// COMPUTADORAS
router.post('/inventario/computadoras', requireAuth, requireAdminOnly, withCtrl('crearComputadora'))
router.post('/inventario/computadoras/:id/editar', requireAuth, requireAdminOnly, withCtrl('editarComputadora'))
router.post('/inventario/computadoras/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarComputadora'))

// PERIFÉRICOS
router.post('/inventario/perifericos', requireAuth, requireAdminOnly, withCtrl('crearPeriferico'))
router.post('/inventario/perifericos/:id/editar', requireAuth, requireAdminOnly, withCtrl('editarPeriferico'))
router.post('/inventario/perifericos/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarPeriferico'))
router.post('/inventario/perifericos/:id/estado', requireAuth, requireAdminOnly, withCtrl('cambiarEstadoPeriferico'))

// CÁMARAS
router.post('/inventario/camaras', requireAuth, requireAdminOnly, withCtrl('crearCamara'))
router.post('/inventario/camaras/:id/editar', requireAuth, requireAdminOnly, withCtrl('editarCamara'))
router.post('/inventario/camaras/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarCamara'))

// SENSORES
router.post('/inventario/sensores', requireAuth, requireAdminOnly, withCtrl('crearSensor'))
router.post('/inventario/sensores/:id/editar', requireAuth, requireAdminOnly, withCtrl('editarSensor'))
router.post('/inventario/sensores/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarSensor'))

// PUNTOS DE RED
router.post('/inventario/puntosred', requireAuth, requireAdminOnly, withCtrl('crearPuntoRed'))
router.post('/inventario/puntosred/:id/editar', requireAuth, requireAdminOnly, withCtrl('editarPuntoRed'))
router.post('/inventario/puntosred/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarPuntoRed'))

// DOCUMENTOS
router.post('/inventario/documentos', requireAuth, requireAdminOnly, uploadDocs.single('archivo'), withCtrl('subirDocumento'))
router.post('/inventario/documentos/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarDocumento'))

// ARCHIVADOS (RESTAURAR)
router.post('/inventario/archivados/:tipo/:id/restaurar', requireAuth, requireAdminOnly, withCtrl('restaurarArchivado'))

// Vista lista
router.get('/inventario/mantenimientos', requireAuth, requireAdminOnly, withCtrl('mostrarMantenimientos'))

// Dashboard
router.get('/inventario/mantenimientos/dashboard', requireAuth, requireAdminOnly, withCtrl('dashboardMantenimientos'))

// CRUD mantenimientos
router.post('/inventario/mantenimientos', requireAuth, requireAdminOnly, withCtrl('crearMantenimiento'))
router.post('/inventario/mantenimientos/:id/completar', requireAuth, requireAdminOnly, uploadEvidencias.single('fotoEvidencia'), withCtrl('completarMantenimiento'))
router.post('/inventario/mantenimientos/:id/editar', requireAuth, requireAdminOnly, withCtrl('editarMantenimiento'))
router.post('/inventario/mantenimientos/:id/eliminar', requireAuth, requireAdminOnly, withCtrl('eliminarMantenimiento'))

// Configurar frecuencia de equipo
router.post('/inventario/equipos/:tipo/:id/frecuencia', requireAuth, requireAdminOnly, withCtrl('configurarFrecuencia'))

// API para cargar equipos en select (AJAX)
router.get('/api/inventario/equipos/:tipo', requireAuth, requireAdminOnly, withCtrl('listarEquiposPorTipo'))

module.exports = router