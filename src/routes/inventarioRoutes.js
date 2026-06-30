'use strict'

const express = require('express')
const router = express.Router()
const ctrl = require('../controllers/inventarioController')
const { requireAuth, requireAdminOnly } = require('../middleware/auth')

router.get('/inventario', requireAuth, requireAdminOnly, ctrl.mostrarInventario)

router.post('/inventario/computadoras', requireAuth, requireAdminOnly, ctrl.crearComputadora)
router.post('/inventario/computadoras/:id/editar', requireAuth, requireAdminOnly, ctrl.editarComputadora)
router.post('/inventario/computadoras/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarComputadora)

router.post('/inventario/perifericos', requireAuth, requireAdminOnly, ctrl.crearPeriferico)
router.post('/inventario/perifericos/:id/editar', requireAuth, requireAdminOnly, ctrl.editarPeriferico)
router.post('/inventario/perifericos/:id/eliminar', requireAuth, requireAdminOnly, ctrl.eliminarPeriferico)
router.post('/inventario/perifericos/:id/estado', requireAuth, requireAdminOnly, ctrl.cambiarEstadoPeriferico)

module.exports = router