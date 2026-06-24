'use strict'

const express = require('express')
const router  = express.Router()
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const ctrl    = require('../controllers/perfilController')
const { requireAuth } = require('../middleware/auth')

// Carpeta de fotos de perfil
const DIR_PERFILES = './uploads/perfiles'
if (!fs.existsSync(DIR_PERFILES)) fs.mkdirSync(DIR_PERFILES, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIR_PERFILES),
  filename:    (req, file, cb) => {
    const nombre = `${req.session.usuario.id}-${Date.now()}${path.extname(file.originalname)}`
    cb(null, nombre)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = /jpeg|jpg|png|webp/
    cb(null, permitidos.test(path.extname(file.originalname).toLowerCase()))
  },
})

router.get('/perfil',                requireAuth, ctrl.mostrarPerfil)
router.post('/perfil/datos',         requireAuth, ctrl.actualizarDatos)
router.post('/perfil/foto',          requireAuth, upload.single('fotoPerfil'), ctrl.actualizarFoto)
router.post('/perfil/foto/eliminar', requireAuth, ctrl.eliminarFoto)
router.post('/perfil/password',      requireAuth, ctrl.cambiarPassword)

module.exports = router
