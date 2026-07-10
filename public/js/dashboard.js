/* ============================================
   DASHBOARD - Historial, Exportar & Modales
   ============================================ */

// ── MODAL HISTORIAL ─────────────────────────────────────────────────────

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

    if (dia) {
        url += 'dia=' + encodeURIComponent(dia)
    } else if (mes) {
        url += 'mes=' + encodeURIComponent(mes)
    }

    window.location.href = url
}

// ── MODAL EXPORTAR ──────────────────────────────────────────────────────

function abrirModalExportar() {
    // Cerrar dropdown si está abierto
    const menu = document.getElementById('exportar-menu')
    if (menu) menu.classList.remove('active')

    const modal = document.getElementById('modal-exportar')
    if (!modal) return

    const ahora = new Date()
    const mesDefault = ahora.toISOString().slice(0, 7)
    const inputMes = document.getElementById('export-mes')
    const inputDia = document.getElementById('export-dia')
    
    if (inputMes) inputMes.value = mesDefault
    if (inputDia) inputDia.value = ''

    modal.classList.add('active')
    document.body.style.overflow = 'hidden'
}

function cerrarModalExportar() {
    const modal = document.getElementById('modal-exportar')
    if (!modal) return
    modal.classList.remove('active')
    document.body.style.overflow = ''
}

function exportarReporte() {
    const inputMes = document.getElementById('export-mes')
    const inputDia = document.getElementById('export-dia')
    
    const mes = inputMes ? inputMes.value : ''
    const dia = inputDia ? inputDia.value : ''

    if (!mes && !dia) {
        alert('Por favor selecciona un mes o un día para exportar')
        return
    }

    let url = '/estadisticas/reporte?'

    if (dia) {
        url += 'dia=' + encodeURIComponent(dia)
    } else if (mes) {
        url += 'mes=' + encodeURIComponent(mes)
    }

    window.location.href = url
}

// ── DROPDOWN EXPORTAR ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('btn-exportar-toggle')
    const menu = document.getElementById('exportar-menu')
    
    if (toggleBtn && menu) {
        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation()
            menu.classList.toggle('active')
        })
        
        // Cerrar al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!toggleBtn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('active')
            }
        })
    }
})

// ── CERRAR MODALES CON CLICK FUERA ────────────────────────────────────────

document.addEventListener('click', function(event) {
    const modalHist = document.getElementById('modal-historial')
    const modalExp = document.getElementById('modal-exportar')
    
    if (modalHist && event.target === modalHist) {
        cerrarModalHistorial()
    }
    if (modalExp && event.target === modalExp) {
        cerrarModalExportar()
    }
})

// ── CERRAR CON ESC ──────────────────────────────────────────────────────

document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        cerrarModalHistorial()
        cerrarModalExportar()
    }
})