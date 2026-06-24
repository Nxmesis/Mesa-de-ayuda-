'use strict'

const express = require('express')
const router  = express.Router()
const { mostrarDashboard } = require('../controllers/dashboardController')
const { requireAuth }      = require('../middleware/auth')

router.get('/dashboard', requireAuth, mostrarDashboard)

module.exports = router
