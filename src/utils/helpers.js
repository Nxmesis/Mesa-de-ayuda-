'use strict'

// ── Fechas ────────────────────────────────────────────────────────────────────

function formatearFecha(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  // CORRECCIÓN: Ajustar para zona horaria local (evita el desfase de 7pm)
  const offset = d.getTimezoneOffset()
  const localDate = new Date(d.getTime() + offset * 60 * 1000)
  
  return localDate.toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota'
  })
}

function formatearFechaSolo(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  // CORRECCIÓN: Ajustar para zona horaria local (evita el desfase de 7pm)
  const offset = d.getTimezoneOffset()
  const localDate = new Date(d.getTime() + offset * 60 * 1000)

  return localDate.toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Bogota'
  })
}

// ── Duración ──────────────────────────────────────────────────────────────────

function formatearDuracion(minutos) {
  if (minutos === null || minutos === undefined || isNaN(minutos)) return '—'
  if (minutos <= 0) return '0 min'
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`
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
  formatearFechaSolo,
  formatearDuracion,
  nombreMes,
  getPrioridadClass,
  getEstadoClass,
  textoEstado,
  nombreRol,
  badgeRolClass,
  esPrioridadValida,
  PRIORIDADES_VALIDAS,
}