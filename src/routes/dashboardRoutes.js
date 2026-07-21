'use strict'

const express = require('express')
const router  = express.Router()
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { mostrarDashboard, generarReportePDF } = require('../controllers/dashboardController')

// Vista principal del dashboard
router.get('/dashboard', requireAuth, mostrarDashboard)

// Reporte PDF del período (soporta ?mes=YYYY-MM o ?dia=YYYY-MM-DD)
router.get('/estadisticas/reporte', requireAuth, requireAdmin, generarReportePDF)

module.exports = router