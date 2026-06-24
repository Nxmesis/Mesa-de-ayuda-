'use strict'

const express = require('express')
const router  = express.Router()
const ctrl    = require('../controllers/authController')

router.get('/',        (req, res) => res.redirect('/login'))
router.get('/login',   ctrl.mostrarLogin)
router.post('/login',  ctrl.procesarLogin)
router.post('/logout', ctrl.cerrarSesion)

module.exports = router
