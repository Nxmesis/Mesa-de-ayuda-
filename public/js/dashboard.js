/* ============================================
   DASHBOARD - HISTORIAL & MODAL
   ============================================ */

function abrirModalHistorial() {
    const modal = document.getElementById('modal-historial')
    if (!modal) return

    const ahora = new Date()
    const mesDefault = ahora.toISOString().slice(0, 7)
    const inputMes = document.getElementById('select-mes')
    const inputDia = document.getElementById('select-dia')
    
    if (inputMes) inputMes.value = mesDefault
    if (inputDia) inputDia.value = ''

    modal.classList.add('active')
    document.body.style.overflow = 'hidden'
}

function cerrarModalHistorial() {
    const modal = document.getElementById('modal-historial')
    if (!modal) return
    modal.classList.remove('active')
    document.body.style.overflow = ''
}

function consultarHistorial() {
    const inputMes = document.getElementById('select-mes')
    const inputDia = document.getElementById('select-dia')
    
    const mes = inputMes ? inputMes.value : ''
    const dia = inputDia ? inputDia.value : ''

    if (!mes && !dia) {
        alert('Por favor selecciona un mes o un día')
        return
    }

    let url = '/dashboard?'

    // Si hay día específico, solo usamos el día (ignoramos el mes)
    if (dia) {
        url += 'dia=' + encodeURIComponent(dia)
    } else if (mes) {
        url += 'mes=' + encodeURIComponent(mes)
    }

    window.location.href = url
}

// Cerrar al hacer clic fuera
document.addEventListener('click', function(event) {
    const modal = document.getElementById('modal-historial')
    if (modal && event.target === modal) {
        cerrarModalHistorial()
    }
})

// Cerrar con ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModalHistorial()
    }
})