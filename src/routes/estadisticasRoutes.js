'use strict'

const express = require('express')
const router  = express.Router()
const { mostrarEstadisticas, generarReportePDF } = require('../controllers/estadisticasController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

router.get('/estadisticas',         requireAuth, requireAdmin, mostrarEstadisticas)
router.get('/estadisticas/reporte', requireAuth, requireAdmin, generarReportePDF)

module.exports = router
