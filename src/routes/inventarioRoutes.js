'use strict'

const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/inventarioController')
const { requireAuth, requireAdminOnly } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')

// Configuración de multer para documentos
const storageDocs = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', '..', 'uploads', 'documentos'))
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

// GET
router.get('/inventario', requireAuth, requireAdminOnly, ctrl.mostrarInventario)

// COMPUTADORAS
router.post('/inventario/computadoras', requireAuth, requireAdminOnly, ctrl.crearComputadora)
router.post('/inventario/computadoras/:id/editar', requireAuth, requireAdminOnly, ctrl.editarComputadora)
router.post('/inventario/computadoras/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarComputadora)

// PERIFÉRICOS
router.post('/inventario/perifericos', requireAuth, requireAdminOnly, ctrl.crearPeriferico)
router.post('/inventario/perifericos/:id/editar', requireAuth, requireAdminOnly, ctrl.editarPeriferico)
router.post('/inventario/perifericos/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarPeriferico)
router.post('/inventario/perifericos/:id/estado', requireAuth, requireAdminOnly, ctrl.cambiarEstadoPeriferico)

// CÁMARAS
router.post('/inventario/camaras', requireAuth, requireAdminOnly, ctrl.crearCamara)
router.post('/inventario/camaras/:id/editar', requireAuth, requireAdminOnly, ctrl.editarCamara)
router.post('/inventario/camaras/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarCamara)

// SENSORES
router.post('/inventario/sensores', requireAuth, requireAdminOnly, ctrl.crearSensor)
router.post('/inventario/sensores/:id/editar', requireAuth, requireAdminOnly, ctrl.editarSensor)
router.post('/inventario/sensores/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarSensor)

// PUNTOS DE RED
router.post('/inventario/puntosred', requireAuth, requireAdminOnly, ctrl.crearPuntoRed)
router.post('/inventario/puntosred/:id/editar', requireAuth, requireAdminOnly, ctrl.editarPuntoRed)
router.post('/inventario/puntosred/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarPuntoRed)

// DOCUMENTOS
router.post('/inventario/documentos', requireAuth, requireAdminOnly, uploadDocs.single('archivo'), ctrl.subirDocumento)
router.post('/inventario/documentos/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarDocumento)

// ARCHIVADOS (RESTAURAR)
router.post('/inventario/archivados/:tipo/:id/restaurar', requireAuth, requireAdminOnly, ctrl.restaurarArchivado)

module.exports = router