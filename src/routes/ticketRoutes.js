'use strict'

const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const path    = require('path')
const ctrl    = require('../controllers/ticketController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// Configuración de subida de imágenes adjuntas a tickets
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads'),
  filename:    (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname))
  },
})

// Upload para imágenes del ticket (máx 16MB)
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 16_777_216 },
  fileFilter: (req, file, cb) => {
    const permitidos = /jpeg|jpg|png|gif|webp/
    cb(null, permitidos.test(path.extname(file.originalname).toLowerCase()))
  },
})

// Upload para videos de solución (máx 100MB)
const uploadVideo = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = /mp4|webm|ogg|mov|avi|mkv/
    cb(null, permitidos.test(path.extname(file.originalname).toLowerCase()))
  },
})

// Upload para comentarios (imagen + video, máx 50MB)
const uploadComentario = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = /jpeg|jpg|png|gif|webp|mp4|webm|mov|ogg/
    cb(null, permitidos.test(path.extname(file.originalname).toLowerCase()))
  },
})

router.get('/tickets',                 requireAuth,               upload.none(), ctrl.listarTickets)
router.get('/tickets/nuevo',           requireAuth,               ctrl.mostrarFormulario)
router.post('/tickets',                requireAuth,               upload.single('imagen'), ctrl.crearTicket)
router.get('/tickets/:id',             requireAuth,               ctrl.verTicket)
router.post('/tickets/:id/estado',     requireAuth, requireAdmin, ctrl.cambiarEstado)
router.post('/tickets/:id/asignar',    requireAuth, requireAdmin, ctrl.asignarTecnico)
router.post('/tickets/:id/comentario', requireAuth,               uploadComentario.single('archivoComentario'), ctrl.agregarComentario)
router.post('/tickets/:id/solucion-media', requireAuth, requireAdmin, uploadVideo.single('videoSolucion'), ctrl.subirSolucionMedia)

module.exports = router