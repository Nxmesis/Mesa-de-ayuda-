// public/js/inventario.js - Adaptado al nuevo diseño

let currentPisoCamara = window.PISO_CAMARA_INICIAL || '1';

// ── Mostrar tab ──────────────────────────────────────────────────────────
function mostrarTab(tab, btn) {
    document.querySelectorAll('.inv-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.inv-nav-item').forEach(t => t.classList.remove('active'));

    const panel = document.getElementById('tab-' + tab);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');

    // Actualizar URL sin recargar
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
}

// ── Editar fila genérica ─────────────────────────────────────────────────
function editarFila(id) {
    const fila = document.getElementById(id);
    if (fila) {
        // Cerrar otras filas de edición del mismo tipo
        const prefix = id.split('-')[0] + '-' + id.split('-')[1];
        document.querySelectorAll('[id^="' + prefix + '-"]').forEach(el => {
            if (el.id !== id) el.style.display = 'none';
        });
        fila.style.display = fila.style.display === 'none' ? 'table-row' : 'none';
        if (fila.style.display !== 'none') {
            fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// ── Editar computadora ──────────────────────────────────────────────────
function editarComputadora(id) {
    document.querySelectorAll('[id^="edit-pc-"]').forEach(el => {
        if (el.id !== 'edit-pc-' + id) el.style.display = 'none';
    });
    const filaEdicion = document.getElementById('edit-pc-' + id);
    if (filaEdicion) {
        filaEdicion.style.display = 'table-row';
        filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ── Editar periférico ───────────────────────────────────────────────────
function editarPeriferico(id) {
    document.querySelectorAll('[id^="edit-per-"]').forEach(el => {
        if (el.id !== 'edit-per-' + id) el.style.display = 'none';
    });
    const filaEdicion = document.getElementById('edit-per-' + id);
    if (filaEdicion) {
        filaEdicion.style.display = 'table-row';
        filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ── Editar cámara ───────────────────────────────────────────────────────
function editarCamara(id) {
    document.querySelectorAll('[id^="edit-cam-"]').forEach(el => {
        if (el.id !== 'edit-cam-' + id) el.style.display = 'none';
    });
    const filaEdicion = document.getElementById('edit-cam-' + id);
    if (filaEdicion) {
        filaEdicion.style.display = filaEdicion.style.display === 'none' ? 'table-row' : 'none';
        if (filaEdicion.style.display !== 'none') {
            filaEdicion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// ── Cancelar edición ──────────────────────────────────────────────────────
function cancelarEdicion(id) {
    const fila = document.getElementById(id);
    if (fila) fila.style.display = 'none';
}

// ── Validar archivado ─────────────────────────────────────────────────────
function validarArchivado(select, tipo, id) {
    if (select.value === 'Archivado') {
        if (!confirm('¿Estás seguro de archivar este equipo? Se moverá a la sección de Archivados.')) {
            select.value = select.dataset.estadoAnterior || 'Operativo';
            return false;
        }
        select.dataset.estadoAnterior = select.value;
        // Enviar el formulario automáticamente para archivar
        const form = select.closest('form');
        if (form) {
            // Crear un input hidden para indicar que es archivado
            let archivadoInput = form.querySelector('input[name="archivado"]');
            if (!archivadoInput) {
                archivadoInput = document.createElement('input');
                archivadoInput.type = 'hidden';
                archivadoInput.name = 'archivado';
                form.appendChild(archivadoInput);
            }
            archivadoInput.value = 'true';
            form.submit();
        }
        return true;
    }
    select.dataset.estadoAnterior = select.value;
    return true;
}

// ── Preseleccionar "Archivado" en modales ───────────────────────────────
function preseleccionarArchivado(modalId) {
    setTimeout(() => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const selectEstado = modal.querySelector('select[name="estado"]');
            if (selectEstado) selectEstado.value = 'Archivado';
        }
    }, 100);
}

// ── Modal restaurar archivado ─────────────────────────────────────────────
function abrirModalRestaurar(tipo, id, codigo, tipoLabel) {
    const modal = document.getElementById('modal-restaurar');
    const form = document.getElementById('form-restaurar');
    const nombreSpan = document.getElementById('restaurar-nombre');
    const tipoSpan = document.getElementById('restaurar-tipo');

    form.action = `/inventario/archivados/${tipo}/${id}/restaurar`;
    if (nombreSpan) nombreSpan.textContent = codigo;
    if (tipoSpan) tipoSpan.textContent = tipoLabel;

    abrirModal('modal-restaurar');
}

// ── Cámaras por piso ────────────────────────────────────────────────────
function mostrarPisoCamara(piso, btn) {
    document.querySelectorAll('.inv-camara-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.inv-piso-tab').forEach(b => {
        b.classList.remove('active');
    });

    const panel = document.getElementById('camaras-piso-' + piso);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');

    currentPisoCamara = piso;
    const btnNueva = document.getElementById('btn-nueva-camara');
    if (btnNueva) btnNueva.innerHTML = '<i class="fas fa-plus"></i> Nueva Cámara (Piso ' + piso + ')';

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

// ── Filtrar tabla ───────────────────────────────────────────────────────
function filtrarTabla(tablaId, texto) {
    const tabla = document.getElementById(tablaId);
    if (!tabla) return;
    const filas = tabla.querySelectorAll('tbody tr');
    const filtro = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u030f]/g, '');

    filas.forEach(fila => {
        // Saltar filas de edición
        if (fila.id && fila.id.startsWith('edit-')) return;

        const celdas = fila.querySelectorAll('td');
        let coincide = false;
        celdas.forEach(celda => {
            const textoCelda = celda.textContent.toLowerCase().normalize('NFD').replace(/[\u0300-\u030f]/g, '');
            if (textoCelda.includes(filtro)) coincide = true;
        });
        fila.style.display = coincide ? '' : 'none';
    });
}

// ── Modales ─────────────────────────────────────────────────────────────
function abrirModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
    // Solo restaurar scroll si no hay otros modales abiertos
    const abiertos = document.querySelectorAll('.inv-modal-overlay.active');
    if (abiertos.length === 0) {
        document.body.style.overflow = '';
    }
}

// ── Confirmar eliminar ──────────────────────────────────────────────────
function confirmarEliminar(url) {
    if (confirm('¿Eliminar este registro? No se puede deshacer.')) {
        const form = document.getElementById('form-eliminar');
        if (form) { 
            form.action = url; 
            form.submit(); 
        }
    }
}

// ── Verificar documento (evita 404) ─────────────────────────────────────
function verificarDocumento(enlace, url) {
    // Hacer una petición HEAD para verificar si el archivo existe
    fetch(url, { method: 'HEAD', cache: 'no-cache' })
        .then(response => {
            if (response.ok) {
                // El archivo existe, abrir en nueva pestaña
                window.open(url, '_blank');
            } else {
                // El archivo no existe
                alert('El documento no se encuentra disponible. Es posible que haya sido movido o eliminado.');
            }
        })
        .catch(error => {
            console.error('Error al verificar documento:', error);
            // Intentar abrir de todos modos (fallback)
            window.open(url, '_blank');
        });
    return false; // Prevenir navegación por defecto del enlace
}

// ── Inicialización ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    // Cerrar modal al hacer click fuera
    document.querySelectorAll('.inv-modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) { 
            if (e.target === this) {
                this.classList.remove('active');
                const abiertos = document.querySelectorAll('.inv-modal-overlay.active');
                if (abiertos.length === 0) {
                    document.body.style.overflow = '';
                }
            }
        });
    });

    // Cerrar modal con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.inv-modal-overlay.active').forEach(m => {
                m.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });

    // Evitar doble envío de formularios (doble clic, o reintento antes de
    // que la página recargue) — deshabilita el botón de submit al enviar.
    document.querySelectorAll('.inv-modal form, .inv-modal-body form').forEach(form => {
        form.addEventListener('submit', function() {
            const btn = form.querySelector('button[type="submit"]')
            if (btn && !btn.disabled) {
                btn.disabled = true
                btn.dataset.textoOriginal = btn.innerHTML
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'
            }
        })
    })

    // Guardar estado inicial de los selects para validación de archivado
    document.querySelectorAll('select[name="estado"]').forEach(select => {
        if (!select.dataset.estadoAnterior) {
            select.dataset.estadoAnterior = select.value;
        }
    });

    // Inicializar tabs según URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl) {
        const btn = document.querySelector('.inv-nav-item[data-tab="' + tabFromUrl + '"]');
        if (btn) {
            document.querySelectorAll('.inv-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.inv-nav-item').forEach(t => t.classList.remove('active'));
            const panel = document.getElementById('tab-' + tabFromUrl);
            if (panel) panel.classList.add('active');
            btn.classList.add('active');
        }
    }
});

// ── Sub-tabs de Red ──────────────────────────────────────────────────────
function mostrarSubtabRed(subtab, btn) {
    document.querySelectorAll('.inv-red-subpanel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('[data-subtab]').forEach(b => b.classList.remove('active'));

    const panel = document.getElementById('subtab-' + subtab);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');

    // Actualizar URL sin recargar
    const url = new URL(window.location);
    url.searchParams.set('subtabRed', subtab);
    window.history.pushState({}, '', url);
}

// ── Inicializar sub-tabs de Red según URL ──────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    // ... código existente ...

    // Inicializar sub-tabs de Red si estamos en el tab red
    const urlParams = new URLSearchParams(window.location.search);
    const subtabRed = urlParams.get('subtabRed');
    if (subtabRed && document.getElementById('tab-red')?.classList.contains('active')) {
        const btn = document.querySelector('[data-subtab="' + subtabRed + '"]');
        if (btn) {
            document.querySelectorAll('.inv-red-subpanel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('[data-subtab]').forEach(b => b.classList.remove('active'));
            const panel = document.getElementById('subtab-' + subtabRed);
            if (panel) panel.classList.add('active');
            btn.classList.add('active');
        }
    }
});