"use strict"

require("dotenv").config()

const express = require("express")
const session = require("express-session")
const flash   = require("connect-flash")
const path    = require("path")
const fs      = require("fs")

const app  = express()
const PORT = process.env.PORT || 5000

// ── Crear carpetas necesarias al arrancar ────────────────────────────────────
;["./uploads", "./uploads/perfiles"].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// ── Motor de vistas ──────────────────────────────────────────────────────────
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// ── Archivos estáticos ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")))
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// ── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

// ── Sesiones ─────────────────────────────────────────────────────────────────
app.use(
  session({
    secret:            process.env.SESSION_SECRET,
    resave:            false,
    saveUninitialized: false,
    cookie: {
      secure:   process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge:   1000 * 60 * 60 * 8, // 8 horas
    },
  })
)

// ── Flash messages ───────────────────────────────────────────────────────────
app.use(flash())

// ── Variables locales disponibles en todas las vistas ────────────────────────
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null
  res.locals.success = req.flash("success")
  res.locals.error   = req.flash("error")
  res.locals.info    = req.flash("info")
  next()
})

// ═══════════════════════════════════════════════════════════════════════════
//  RUTAS
// ═══════════════════════════════════════════════════════════════════════════
app.use("/", require("./src/routes/authRoutes"))
app.use("/", require("./src/routes/dashboardRoutes"))
app.use("/", require("./src/routes/ticketRoutes"))
app.use("/", require("./src/routes/userRoutes"))
app.use("/", require("./src/routes/perfilRoutes"))
app.use("/", require("./src/routes/estadisticasRoutes"))
app.use("/", require("./src/routes/notificacionesRoutes")) // ← NUEVO: SSE

// ── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render("error", {
    title:   "Página no encontrada",
    user:    req.session.usuario || null,
    codigo:  404,
    mensaje: "La página que buscas no existe.",
  })
})

// ── Manejador de errores globales ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err)
  res.status(500).render("error", {
    title:   "Error del servidor",
    user:    req.session.usuario || null,
    codigo:  500,
    mensaje: "Ocurrió un error inesperado. Intenta de nuevo.",
  })
})

// ── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅  Servidor corriendo en http://localhost:${PORT}`)
  console.log(`    Entorno: ${process.env.NODE_ENV || "development"}`)
})