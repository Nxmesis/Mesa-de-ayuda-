// ═══════════════════════════════════════════════════════
//  SISTEMA DE NOTIFICACIONES EN NAVBAR
//  Almacena notificaciones SSE y muestra dropdown
// ═══════════════════════════════════════════════════════

(function() {
  'use strict'

  // ── Configuración ───────────────────────────────────
  const NOTIF_CONFIG = {
    nuevo_ticket: { color: '#e74c3c', icono: 'fa-ticket-alt', label: 'Nuevo ticket' },
    estado:       { color: '#2ecc71', icono: 'fa-sync-alt',   label: 'Estado' },
    asignado:     { color: '#3498db', icono: 'fa-user-check', label: 'Asignación' },
    comentario:   { color: '#f39c12', icono: 'fa-comment',    label: 'Comentario' },
  }

  const MAX_NOTIFICACIONES = 50
  const STORAGE_KEY = 'notificaciones_' + (window.USER_ID || 'anon')

  // ── Estado ────────────────────────────────────────────
  let notificaciones = []
  let dropdownVisible = false
  let initialized = false

  // ── Referencias DOM ───────────────────────────────────
  let $btn = null
  let $badge = null
  let $dropdown = null
  let $lista = null
  let $marcarLeidas = null

  // ═══════════════════════════════════════════════════════
  //  INICIALIZACIÓN
  // ═══════════════════════════════════════════════════════

  function init() {
    if (initialized) return

    $btn = document.getElementById('notificaciones-btn')
    $badge = document.getElementById('notificaciones-badge')
    $dropdown = document.getElementById('notificaciones-dropdown')
    $lista = document.getElementById('notificaciones-lista')
    $marcarLeidas = document.getElementById('notificaciones-marcar-leidas')

    // Si no existe el botón, no estamos en una página con navbar
    if (!$btn) {
      console.log('[Notificaciones Navbar] No se encontró el botón de notificaciones')
      return
    }

    console.log('[Notificaciones Navbar] Inicializando...')

    cargarNotificaciones()
    renderizar()
    bindEventos()

    initialized = true
    console.log('[Notificaciones Navbar] Inicializado correctamente. Notificaciones cargadas:', notificaciones.length)
  }

  // ═══════════════════════════════════════════════════════
  //  EVENTOS
  // ═══════════════════════════════════════════════════════

  function bindEventos() {
    // Click en el botón de la campana
    $btn.addEventListener('click', function(e) {
      e.preventDefault()
      e.stopPropagation()
      console.log('[Notificaciones Navbar] Click en campana')
      toggleDropdown()
    })

    // Marcar todas como leídas
    if ($marcarLeidas) {
      $marcarLeidas.addEventListener('click', function(e) {
        e.preventDefault()
        e.stopPropagation()
        marcarTodasLeidas()
      })
    }

    // Cerrar dropdown al hacer click fuera
    document.addEventListener('click', function(e) {
      if (dropdownVisible && $dropdown && !$dropdown.contains(e.target) && e.target !== $btn && !$btn.contains(e.target)) {
        cerrarDropdown()
      }
    })

    // Escuchar eventos SSE globales
    window.addEventListener('notificacion-sse', function(e) {
      console.log('[Notificaciones Navbar] Evento SSE recibido:', e.detail)
      agregarNotificacion(e.detail)
    })
  }

  // ═══════════════════════════════════════════════════════
  //  DROPDOWN
  // ═══════════════════════════════════════════════════════

  function toggleDropdown() {
    dropdownVisible = !dropdownVisible

    if ($dropdown) {
      $dropdown.classList.toggle('visible', dropdownVisible)
    }
    if ($btn) {
      $btn.classList.toggle('active', dropdownVisible)
    }

    if (dropdownVisible) {
      marcarVisiblesLeidas()
    }

    console.log('[Notificaciones Navbar] Dropdown:', dropdownVisible ? 'abierto' : 'cerrado')
  }

  function cerrarDropdown() {
    dropdownVisible = false
    if ($dropdown) $dropdown.classList.remove('visible')
    if ($btn) $btn.classList.remove('active')
  }

  // ═══════════════════════════════════════════════════════
  //  GESTIÓN DE NOTIFICACIONES
  // ═══════════════════════════════════════════════════════

  function agregarNotificacion(data) {
    if (!data || data.tipo === 'conectado') return

    console.log('[Notificaciones Navbar] Agregando notificación:', data)

    const notif = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      tipo: data.tipo || 'general',
      titulo: data.titulo || 'Notificación',
      mensaje: data.mensaje || '',
      ticketId: data.ticketId || null,
      timestamp: Date.now(),
      leida: false,
    }

    notificaciones.unshift(notif)

    // Limitar cantidad
    if (notificaciones.length > MAX_NOTIFICACIONES) {
      notificaciones = notificaciones.slice(0, MAX_NOTIFICACIONES)
    }

    guardarNotificaciones()
    renderizar()
    animarBadge()
  }

  function animarBadge() {
    if (!$badge) return
    $badge.style.animation = 'none'
    // Force reflow
    void $badge.offsetWidth
    $badge.style.animation = 'badgePulse 0.5s ease'
  }

  function marcarLeida(id) {
    const notif = notificaciones.find(function(n) { return n.id === id })
    if (notif) {
      notif.leida = true
      guardarNotificaciones()
      renderizar()
    }
  }

  function marcarTodasLeidas() {
    notificaciones.forEach(function(n) { n.leida = true })
    guardarNotificaciones()
    renderizar()
  }

  function marcarVisiblesLeidas() {
    notificaciones.forEach(function(n) { n.leida = true })
    guardarNotificaciones()
    renderizar()
  }

  function eliminarNotificacion(id, e) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    notificaciones = notificaciones.filter(function(n) { return n.id !== id })
    guardarNotificaciones()
    renderizar()
  }

  // ═══════════════════════════════════════════════════════
  //  PERSISTENCIA
  // ═══════════════════════════════════════════════════════

  function guardarNotificaciones() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notificaciones))
    } catch (err) {
      console.warn('[Notificaciones Navbar] No se pudieron guardar:', err)
    }
  }

  function cargarNotificaciones() {
    try {
      const guardadas = localStorage.getItem(STORAGE_KEY)
      if (guardadas) {
        notificaciones = JSON.parse(guardadas)
        // Asegurar que sea array
        if (!Array.isArray(notificaciones)) notificaciones = []
      }
    } catch (err) {
      console.warn('[Notificaciones Navbar] No se pudieron cargar:', err)
      notificaciones = []
    }
  }

  // ═══════════════════════════════════════════════════════
  //  RENDERIZADO
  // ═══════════════════════════════════════════════════════

  function renderizar() {
    if (!$badge || !$lista) {
      console.log('[Notificaciones Navbar] Elementos DOM no encontrados para renderizar')
      return
    }

    const noLeidas = notificaciones.filter(function(n) { return !n.leida }).length

    // Badge
    if (noLeidas > 0) {
      $badge.textContent = noLeidas > 99 ? '99+' : noLeidas
      $badge.style.display = 'flex'
    } else {
      $badge.style.display = 'none'
    }

    // Lista
    if (notificaciones.length === 0) {
      $lista.innerHTML = '<div class="notificaciones-vacio"><i class="far fa-bell-slash" style="font-size:2rem; display:block; margin-bottom:10px; color:#4a5568;"></i>No hay notificaciones</div>'
      return
    }

    $lista.innerHTML = notificaciones.map(function(n) {
      const cfg = NOTIF_CONFIG[n.tipo] || { color: '#2ecc71', icono: 'fa-bell', label: 'Notificación' }
      const fecha = new Date(n.timestamp)
      const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      const fechaStr = fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
      const tiempo = esHoy(fecha) ? hora : fechaStr + ' ' + hora

      const href = n.ticketId ? '/tickets/' + n.ticketId : '#'

      return '<a href="' + href + '" class="notificacion-item ' + (n.leida ? '' : 'no-leida') + '" data-id="' + n.id + '">' +
        '<div class="notificacion-icono ' + n.tipo + '">' +
          '<i class="fas ' + cfg.icono + '"></i>' +
        '</div>' +
        '<div class="notificacion-contenido">' +
          '<div class="notificacion-titulo">' + escapeHtml(n.titulo) + '</div>' +
          '<div class="notificacion-mensaje">' + escapeHtml(n.mensaje) + '</div>' +
          '<div class="notificacion-hora"><i class="far fa-clock"></i>' + tiempo + '</div>' +
        '</div>' +
        '<button class="notificacion-eliminar" data-id="' + n.id + '" title="Eliminar">' +
          '<i class="fas fa-times"></i>' +
        '</button>' +
      '</a>'
    }).join('')

    // Bind clicks de eliminar
    $lista.querySelectorAll('.notificacion-eliminar').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        eliminarNotificacion(this.dataset.id, e)
      })
    })

    // Bind clicks de items (marcar leída antes de navegar)
    $lista.querySelectorAll('.notificacion-item').forEach(function(item) {
      item.addEventListener('click', function() {
        marcarLeida(this.dataset.id)
      })
    })
  }

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════

  function esHoy(fecha) {
    const hoy = new Date()
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear()
  }

  function escapeHtml(text) {
    if (!text) return ''
    var div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }


  // ═══════════════════════════════════════════════════════
  //  ARRANQUE
  // ═══════════════════════════════════════════════════════

  // Intentar inicializar inmediatamente
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Backup: intentar de nuevo después de un delay (por si el DOM aún no está listo)
  setTimeout(function() {
    if (!initialized) {
      console.log('[Notificaciones Navbar] Reintento de inicialización...')
      init()
    }
  }, 500)

  // Exponer función global para debug
  window.debugNotificaciones = function() {
    console.log('Notificaciones:', notificaciones)
    console.log('Elementos DOM:', { $btn, $badge, $dropdown, $lista })
    console.log('Initialized:', initialized)
  }

})()