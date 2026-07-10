'use strict'

const express = require('express')
const router  = express.Router()
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { mostrarDashboard, generarReportePDF } = require('../controllers/dashboardController')

// Vista principal del dashboard (admin/tecnico ven métricas, usuario normal ve sus tickets)
router.get('/dashboard', requireAuth, mostrarDashboard)

// Redireccionar /estadisticas al dashboard fusionado
router.get('/estadisticas', requireAuth, requireAdmin, (req, res) => {
  res.redirect('/dashboard')
})

// Reporte PDF: soporta ?mes=YYYY-MM o ?dia=YYYY-MM-DD; sin parámetros usa el mes actual
router.get('/estadisticas/reporte', requireAuth, requireAdmin, generarReportePDF)

module.exports = router