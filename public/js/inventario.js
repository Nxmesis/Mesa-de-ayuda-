// public/js/inventario.js
// JavaScript para la vista de Inventario de Equipos

function mostrarTab(tab, btn) {
    document.querySelectorAll('.inventario-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.inventario-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    btn.classList.add('active');
}

function filtrarTabla(tablaId, texto) {
    const tabla = document.getElementById(tablaId);
    if (!tabla) return;
    const filas = tabla.querySelectorAll('tbody tr');
    const filtro = texto.toLowerCase();

    filas.forEach(fila => {
        // No filtrar filas de edición
        if (fila.id && fila.id.startsWith('edit-')) return;
        // Si la fila ya está oculta por filtro anterior, saltar
        if (fila.style.display === 'none' && !texto) {
            fila.style.display = '';
            return;
        }
        
        const celdas = fila.querySelectorAll('td');
        let coincide = false;
        celdas.forEach(celda => {
            if (celda.textContent.toLowerCase().includes(filtro)) coincide = true;
        });
        fila.style.display = coincide ? '' : 'none';
    });
}

function editarComputadora(id) {
    // Ocultar todas las filas de edición de computadoras
    document.querySelectorAll('[id^="edit-pc-"]').forEach(el => el.style.display = 'none');
    // Mostrar la fila de edición seleccionada
    const filaEdicion = document.getElementById('edit-pc-' + id);
    if (filaEdicion) {
        filaEdicion.style.display = 'table-row';
        filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function editarPeriferico(id) {
    // Ocultar todas las filas de edición de periféricos
    document.querySelectorAll('[id^="edit-per-"]').forEach(el => el.style.display = 'none');
    // Mostrar la fila de edición seleccionada
    const filaEdicion = document.getElementById('edit-per-' + id);
    if (filaEdicion) {
        filaEdicion.style.display = 'table-row';
        filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function cancelarEdicion(id) {
    const fila = document.getElementById(id);
    if (fila) fila.style.display = 'none';
}

function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

function confirmarEliminar(url) {
    if (confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
        const form = document.getElementById('form-eliminar');
        if (form) {
            form.action = url;
            form.submit();
        }
    }
}

// Cerrar modal al hacer clic fuera del contenido
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.classList.remove('active');
        });
    });

    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
});