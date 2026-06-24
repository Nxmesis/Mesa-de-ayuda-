'use strict'

const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/userController')
const { requireAuth, requireAdminOnly } = require('../middleware/auth')

router.get('/usuarios',                  requireAuth, requireAdminOnly, ctrl.listarUsuarios)
router.get('/usuarios/nuevo',            requireAuth, requireAdminOnly, ctrl.mostrarFormulario)
router.post('/usuarios',                 requireAuth, requireAdminOnly, ctrl.crearUsuario)
router.post('/usuarios/:id/desactivar',  requireAuth, requireAdminOnly, ctrl.desactivarUsuario)
router.post('/usuarios/:id/editar',      requireAuth, requireAdminOnly, ctrl.editarUsuario)
router.post('/usuarios/:id/password',    requireAuth, requireAdminOnly, ctrl.cambiarPasswordUsuario)
router.post('/usuarios/:id/eliminar',    requireAuth, requireAdminOnly, ctrl.eliminarUsuario)

module.exports = router
