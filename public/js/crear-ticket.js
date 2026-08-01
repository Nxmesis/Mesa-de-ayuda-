 // ═══════════════════════════════════════════════════════
//  CREAR TICKET - Funcionalidad de "Solicitar llamada"
//  Se carga en: /tickets/nuevo
// ═══════════════════════════════════════════════════════

(function() {
  'use strict'

  const chkLlamada = document.getElementById('chkLlamada')
  const txtDesc = document.getElementById('txtDescripcion')
  const reqDesc = document.getElementById('reqDesc')
  const grupoDesc = document.getElementById('grupoDescripcion')
  const llamadaBox = document.getElementById('llamadaBox')

  if (!chkLlamada || !txtDesc || !reqDesc || !grupoDesc || !llamadaBox) {
    console.log('[Crear Ticket] Elementos no encontrados, omitiendo inicialización')
    return
  }

  function actualizarEstado() {
    if (chkLlamada.checked) {
      txtDesc.required = false
      txtDesc.placeholder = 'Opcional: puedes agregar detalles adicionales si lo deseas...'
      reqDesc.textContent = '(opcional)'
      reqDesc.style.color = '#718096'
      reqDesc.style.fontWeight = '400'
      grupoDesc.style.opacity = '0.75'
      llamadaBox.style.background = '#f0fff4'
      llamadaBox.style.borderColor = '#48bb78'
    } else {
      txtDesc.required = true
      txtDesc.placeholder = 'Describe el problema con el mayor detalle posible: ¿cuándo comenzó?, ¿qué sucedió?, ¿qué estabas haciendo cuando ocurrió?'
      reqDesc.textContent = '*'
      reqDesc.style.color = '#e53e3e'
      reqDesc.style.fontWeight = '600'
      grupoDesc.style.opacity = '1'
      llamadaBox.style.background = '#fffbeb'
      llamadaBox.style.borderColor = '#f6e05e'
    }
  }

  chkLlamada.addEventListener('change', actualizarEstado)

  // Estado inicial
  actualizarEstado()
})()