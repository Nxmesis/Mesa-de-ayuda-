'use strict'

const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/ordenController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.get('/ordenes',       requireAuth,               ctrl.listarOrdenes)
router.get('/ordenes/nueva', requireAuth, requireAdmin, ctrl.mostrarFormulario)
router.post('/ordenes',      requireAuth, requireAdmin, ctrl.crearOrden)
router.get('/ordenes/:id',   requireAuth,               ctrl.verOrden)

module.exports = router