// ═══════════════════════════════════════════════════════
//  NOTIFICACIONES SSE + WEB NOTIFICATIONS API
//  Alertas en página (toast) y nativas del sistema (OS)
// ═══════════════════════════════════════════════════════

'use strict'

// ── Colores e iconos por tipo de evento ───────────────
const NOTIF_CONFIG = {
  nuevo_ticket: { color: '#e74c3c', icono: 'fa-ticket-alt' },
  estado:       { color: '#2ecc71', icono: 'fa-sync-alt'   },
  asignado:     { color: '#3498db', icono: 'fa-user-check' },
  comentario:   { color: '#f39c12', icono: 'fa-comment'    },
}

// ── 1. Notificación nativa del SO (global) ────────────
function mostrarNotificacionSO(data) {
  if (!('Notification' in window))       return
  if (Notification.permission !== 'granted') return

  const notif = new Notification(data.titulo || 'Mesa de Ayuda', {
    body:  data.mensaje,
    icon:  '/img/logo.jpeg',
    badge: '/img/logo.jpeg',
    tag:   'ticket-' + (data.ticketId || Date.now()),
  })

  notif.onclick = function () {
    window.focus()
    if (data.ticketId) window.location.href = '/tickets/' + data.ticketId
    notif.close()
  }

  setTimeout(function () { notif.close() }, 6000)
}

// ── 2. Toast visual dentro de la página (global) ──────
function mostrarToast(data) {
  var contenedor = document.getElementById('toast-container')
  if (!contenedor) {
    contenedor = document.createElement('div')
    contenedor.id = 'toast-container'
    contenedor.style.cssText = [
      'position:fixed', 'top:20px', 'right:20px', 'z-index:9999',
      'display:flex', 'flex-direction:column', 'gap:10px',
      'max-width:380px', 'pointer-events:none',
    ].join(';')
    document.body.appendChild(contenedor)
  }

  var cfg   = NOTIF_CONFIG[data.tipo] || { color: '#2ecc71', icono: 'fa-bell' }
  var color = cfg.color
  var icono = cfg.icono
  var hora  = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })

  var toast = document.createElement('div')
  toast.style.cssText = [
    'background:linear-gradient(135deg,#1a1f2e,#242b3d)',
    'color:white',
    'padding:16px 20px',
    'border-radius:10px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.25)',
    'font-family:Segoe UI,Arial,sans-serif',
    'font-size:0.88rem',
    'display:flex',
    'align-items:flex-start',
    'gap:12px',
    'animation:toastSlideIn 0.3s ease,toastFadeOut 0.3s ease 4.7s forwards',
    'pointer-events:auto',
    'border-left:4px solid ' + color,
    'cursor:pointer',
  ].join(';')

  toast.innerHTML =
    '<div style="width:36px;height:36px;border-radius:8px;background:rgba(255,255,255,0.08);' +
    'display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
    '<i class="fas ' + icono + '" style="color:' + color + ';font-size:0.9rem;"></i></div>' +
    '<div style="flex:1;min-width:0;">' +
    '<div style="font-weight:700;font-size:0.9rem;margin-bottom:3px;">' + (data.titulo || 'Notificación') + '</div>' +
    '<div style="color:#c5cbd3;font-size:0.82rem;line-height:1.4;">' + data.mensaje + '</div>' +
    '<div style="color:#5a6275;font-size:0.7rem;margin-top:6px;">' +
    '<i class="far fa-clock" style="margin-right:3px;"></i>' + hora + '</div></div>' +
    '<button style="background:none;border:none;color:#8b95a8;cursor:pointer;' +
    'font-size:1.1rem;padding:0;line-height:1;flex-shrink:0;" ' +
    'onclick="this.parentElement.remove()">×</button>'

  toast.addEventListener('click', function (e) {
    if (e.target.tagName !== 'BUTTON' && data.ticketId) {
      window.location.href = '/tickets/' + data.ticketId
    }
  })

  contenedor.appendChild(toast)
  setTimeout(function () { if (toast.parentElement) toast.remove() }, 5000)
}

// ── 3. Manejar evento recibido ────────────────────────
function manejarEvento(data) {
  if (data.tipo === 'conectado') return
  mostrarToast(data)
  mostrarNotificacionSO(data)
}

// ── 4. Conexión SSE ───────────────────────────────────
var _eventSource       = null
var _reconectarIntento = 0
var MAX_REINTENTOS     = 5
var TIEMPO_RECONEXION  = 3000

function iniciarSSE() {
  if (_eventSource) _eventSource.close()

  _eventSource = new EventSource('/notificaciones/stream')

  _eventSource.onopen = function () {
    _reconectarIntento = 0
  }

  _eventSource.onmessage = function (event) {
    try {
      var data = JSON.parse(event.data)
      manejarEvento(data)
    } catch (err) {
      console.error('Error parseando SSE:', err)
    }
  }

  _eventSource.onerror = function () {
    _eventSource.close()
    if (_reconectarIntento < MAX_REINTENTOS) {
      _reconectarIntento++
      setTimeout(iniciarSSE, TIEMPO_RECONEXION)
    }
  }
}

// ── 5. Banner para pedir permiso ──────────────────────
function mostrarBannerPermiso() {
  if (!('Notification' in window))          return
  if (Notification.permission !== 'default') return
  if (document.getElementById('banner-notif')) return

  var banner = document.createElement('div')
  banner.id = 'banner-notif'
  banner.style.cssText = [
    'position:fixed', 'bottom:20px', 'left:50%', 'transform:translateX(-50%)',
    'background:#1a1f2e', 'color:white', 'padding:14px 20px', 'border-radius:10px',
    'box-shadow:0 8px 24px rgba(0,0,0,0.3)', 'z-index:9998',
    'display:flex', 'align-items:center', 'gap:14px',
    'font-family:Segoe UI,Arial,sans-serif', 'font-size:0.88rem',
    'max-width:480px', 'width:90%', 'border-left:4px solid #3498db',
  ].join(';')

  banner.innerHTML =
    '<i class="fas fa-bell" style="color:#3498db;font-size:1.2rem;flex-shrink:0;"></i>' +
    '<span style="flex:1;line-height:1.4;">Activa las notificaciones para recibir alertas aunque estés en otra pestaña.</span>' +
    '<button id="btn-activar-notif" style="background:#3498db;color:white;border:none;' +
    'padding:8px 16px;border-radius:6px;cursor:pointer;font-size:0.85rem;font-weight:600;' +
    'white-space:nowrap;font-family:inherit;">Activar</button>' +
    '<button id="btn-cerrar-banner" style="background:none;border:none;color:#8b95a8;' +
    'cursor:pointer;font-size:1.1rem;padding:0 4px;line-height:1;">×</button>'

  document.body.appendChild(banner)

  document.getElementById('btn-activar-notif').addEventListener('click', function () {
    Notification.requestPermission().then(function (permiso) {
      banner.remove()
      if (permiso === 'granted') {
        new Notification('Mesa de Ayuda', {
          body: 'Notificaciones activadas correctamente.',
          icon: '/img/logo.jpeg',
        })
      }
    })
  })

  document.getElementById('btn-cerrar-banner').addEventListener('click', function () {
    banner.remove()
  })

  setTimeout(function () { if (banner.parentElement) banner.remove() }, 15000)
}

// ── 6. Estilos de animación ───────────────────────────
var _style = document.createElement('style')
_style.textContent =
  '@keyframes toastSlideIn{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}' +
  '@keyframes toastFadeOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(30px)}}'
document.head.appendChild(_style)

// ── Arranque ──────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    iniciarSSE()
    setTimeout(mostrarBannerPermiso, 1500)
  })
} else {
  iniciarSSE()
  setTimeout(mostrarBannerPermiso, 1500)
}