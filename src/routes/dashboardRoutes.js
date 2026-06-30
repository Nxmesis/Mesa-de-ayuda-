'use strict'

const express = require('express')
const router  = express.Router()
const { mostrarDashboard } = require('../controllers/dashboardController')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// Dashboard SOLO para admin/técnico
router.get('/dashboard', requireAuth, requireAdmin, mostrarDashboard)

module.exports = router