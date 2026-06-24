'use strict'

// ── Fechas ────────────────────────────────────────────────────────────────────

function formatearFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
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
  admin:   'Gerencia',
  tecnico: 'Admin',
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

module.exports = {
  formatearFecha,
  getPrioridadClass,
  getEstadoClass,
  textoEstado,
  nombreRol,
  badgeRolClass,
  esPrioridadValida,
  PRIORIDADES_VALIDAS,
}
