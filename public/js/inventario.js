// public/js/inventario.js

let currentPisoCamara = window.PISO_CAMARA_INICIAL || '1';

function mostrarTab(tab, btn) {
    document.querySelectorAll('.inventario-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.inventario-nav-item').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    btn.classList.add('active');
    // Actualizar URL sin recargar
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
}

function editarFila(id) {
    const fila = document.getElementById(id);
    if (fila) fila.style.display = fila.style.display === 'none' ? 'table-row' : 'none';
}

// ── Validar archivado ──────────────────────────────────────────────────────
function validarArchivado(select, tipo, id) {
    if (select.value === 'Archivado') {
        if (!confirm('¿Estás seguro de archivar este equipo? Se moverá a la sección de Archivados.')) {
            select.value = select.dataset.estadoAnterior || 'Operativo';
            return false;
        }
        // Guardar estado anterior por si cancela
        select.dataset.estadoAnterior = select.value;
        // El form se enviará normalmente y el servidor redirige a archivados
        return true;
    }
    select.dataset.estadoAnterior = select.value;
    return true;
}

// ── Preseleccionar "Archivado" en modales ─────────────────────────────────
function preseleccionarArchivado(modalId) {
    setTimeout(() => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const selectEstado = modal.querySelector('select[name="estado"]');
            if (selectEstado) selectEstado.value = 'Archivado';
        }
    }, 100);
}

// ── Modal restaurar ───────────────────────────────────────────────────────
function abrirModalRestaurar(tipo, id, codigo, tipoLabel) {
    const modal = document.getElementById('modal-restaurar');
    const form = document.getElementById('form-restaurar');
    const nombreSpan = document.getElementById('restaurar-nombre');
    const tipoSpan = document.getElementById('restaurar-tipo');
    
    form.action = `/inventario/archivados/${tipo}/${id}/restaurar`;
    nombreSpan.textContent = codigo;
    tipoSpan.textContent = tipoLabel;
    
    abrirModal('modal-restaurar');
}

// ── Cámaras por piso ───────────────────────────────────────────────────────
function mostrarPisoCamara(piso, btn) {
    document.querySelectorAll('.camara-piso-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.piso-tab').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#f8fafc';
        b.style.color = '#64748b';
        b.style.boxShadow = 'none';
        const count = b.querySelector('.piso-tab-count');
        if (count) { count.style.background = '#e2e8f0'; count.style.color = '#64748b'; }
    });

    const panel = document.getElementById('camaras-piso-' + piso);
    if (panel) panel.classList.add('active');

    if (btn) {
        btn.classList.add('active');
        btn.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        btn.style.boxShadow = '0 2px 8px rgba(46,204,113,0.3)';
        btn.style.color = 'white';
        const count = btn.querySelector('.piso-tab-count');
        if (count) { count.style.background = 'rgba(255,255,255,0.25)'; count.style.color = 'white'; }
    }

    currentPisoCamara = piso;
    const btnNueva = document.getElementById('btn-nueva-camara');
    if (btnNueva) btnNueva.textContent = '+ Nueva Cámara (Piso ' + piso + ')';
    
    const buscador = document.getElementById('buscar-camaras');
    if (buscador) buscador.value = '';
    filtrarTablaCamaras('');
}

function filtrarTablaCamaras(texto) {
    filtrarTabla('tabla-camaras-' + currentPisoCamara, texto);
}

function abrirModalCamara(piso) {
    const input = document.getElementById('input-codigo-camara');
    const hint = document.getElementById('codigo-camara-hint');
    const hiddenPiso = document.getElementById('input-piso-camara');
    const titulo = document.getElementById('modal-camara-titulo');
    const codigo = (window.CODIGOS_CAMARA && window.CODIGOS_CAMARA[piso]) || '';

    if (input) { input.value = ''; input.placeholder = codigo; }
    if (hint) hint.textContent = codigo;
    if (hiddenPiso) hiddenPiso.value = piso;
    if (titulo) titulo.textContent = 'Nueva Cámara (Piso ' + piso + ')';

    abrirModal('modal-camara');
}

function filtrarTabla(tablaId, texto) {
    const tabla = document.getElementById(tablaId);
    if (!tabla) return;
    const filas = tabla.querySelectorAll('tbody tr');
    const filtro = texto.toLowerCase();

    filas.forEach(fila => {
        if (fila.id && fila.id.startsWith('edit-')) return;
        const celdas = fila.querySelectorAll('td');
        let coincide = false;
        celdas.forEach(celda => { if (celda.textContent.toLowerCase().includes(filtro)) coincide = true; });
        fila.style.display = coincide ? '' : 'none';
    });
}

function editarComputadora(id) {
    document.querySelectorAll('[id^="edit-pc-"]').forEach(el => el.style.display = 'none');
    const filaEdicion = document.getElementById('edit-pc-' + id);
    if (filaEdicion) { filaEdicion.style.display = 'table-row'; filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function editarPeriferico(id) {
    document.querySelectorAll('[id^="edit-per-"]').forEach(el => el.style.display = 'none');
    const filaEdicion = document.getElementById('edit-per-' + id);
    if (filaEdicion) { filaEdicion.style.display = 'table-row'; filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
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
    if (confirm('¿Eliminar este registro? No se puede deshacer.')) {
        const form = document.getElementById('form-eliminar');
        if (form) { form.action = url; form.submit(); }
    }
}

function editarCamara(id) {
    const filaEdicion = document.getElementById('edit-cam-' + id);
    if (filaEdicion) {
        document.querySelectorAll('[id^="edit-cam-"]').forEach(el => { if (el.id !== 'edit-cam-' + id) el.style.display = 'none'; });
        filaEdicion.style.display = filaEdicion.style.display === 'none' ? 'table-row' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); });
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    });
    
    // Guardar estado inicial de los selects para validación de archivado
    document.querySelectorAll('select[name="estado"]').forEach(select => {
        select.dataset.estadoAnterior = select.value;
    });
});