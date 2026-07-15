'use strict'

// ── Fechas ────────────────────────────────────────────────────────────────────

/**
 * Formatea una fecha mostrando solo DD/MM/YYYY (sin hora).
 * Usa UTC para evitar desfase por zona horaria con campos DATE de MySQL.
 */
function formatearFecha(fecha) {
  if (!fecha) return '—'
  
  // Si es string ISO (ej: "2026-07-14T00:00:00.000Z"), extraemos directamente
  // para evitar cualquier conversión de zona horaria
  if (typeof fecha === 'string') {
    const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, year, month, day] = match
      return `${day}/${month}/${year}`
    }
  }
  
  // Para Date objects, usamos métodos UTC
  const d = new Date(fecha)
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const year = d.getUTCFullYear()
  
  return `${day}/${month}/${year}`
}

// ── Prioridad ─────────────────────────────────────────────────────────────────

const PRIORIDAD_CLASES = {
  Baja:    'badge-success',
  Media:   'badge-info',
  Alta:    'badge-warning',
  Critica: 'badge-danger',
}

function getPrioridadClass(prioridad) {
  return PRIORIDAD_CLASES[prioridad] || 'badge-secondary'
}

// ── Estado ────────────────────────────────────────────────────────────────────

const ESTADO_CLASES = {
  Pendiente:     'badge-warning',
  EnProceso:     'badge-info',
  EsperandoInfo: 'badge-secondary',
  Solucionado:   'badge-success',
  Cerrado:       'badge-dark',
}

const ESTADO_TEXTOS = {
  Pendiente:     'Pendiente',
  EnProceso:     'En proceso',
  EsperandoInfo: 'Esperando información',
  Solucionado:   'Solucionado',
  Cerrado:       'Cerrado',
}

function getEstadoClass(estado) {
  return ESTADO_CLASES[estado] || 'badge-secondary'
}

function textoEstado(estado) {
  return ESTADO_TEXTOS[estado] || estado
}

// ── Roles ─────────────────────────────────────────────────────────────────────

const ROL_NOMBRES = {
  admin:   'Admin',
  tecnico: 'Supervisor',
  usuario: 'Usuario',
}

const ROL_CLASES = {
  admin:   'badge-danger',
  tecnico: 'badge-warning',
  usuario: 'badge-info',
}

function nombreRol(rol) {
  return ROL_NOMBRES[rol] || rol
}

function badgeRolClass(rol) {
  return ROL_CLASES[rol] || 'badge-secondary'
}

// ── Validación ────────────────────────────────────────────────────────────────

const PRIORIDADES_VALIDAS = ['Baja', 'Media', 'Alta', 'Critica']

function esPrioridadValida(prioridad) {
  return PRIORIDADES_VALIDAS.includes(prioridad)
}

function nombreMes(numero) {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[numero - 1] || ''
}


module.exports = {
  formatearFecha,
  nombreMes,
  getPrioridadClass,
  getEstadoClass,
  textoEstado,
  nombreRol,
  badgeRolClass,
  esPrioridadValida,
  PRIORIDADES_VALIDAS,
}