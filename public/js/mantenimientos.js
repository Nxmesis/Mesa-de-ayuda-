// public/js/mantenimientos.js

// ═══════════════════════════════════════════════════════════════════
//  DROPDOWNS
// ═══════════════════════════════════════════════════════════════════
function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    const isActive = dropdown.classList.contains('active');

    // Cerrar todos los dropdowns
    document.querySelectorAll('.mant-dropdown').forEach(d => d.classList.remove('active'));

    // Abrir el clickeado si no estaba activo
    if (!isActive) {
        dropdown.classList.add('active');
    }
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('.mant-dropdown')) {
        document.querySelectorAll('.mant-dropdown').forEach(d => d.classList.remove('active'));
    }
});

// ═══════════════════════════════════════════════════════════════════
//  EQUIPOS
// ═══════════════════════════════════════════════════════════════════
function cargarEquipos(tipo, equipoIdSeleccionado) {
    const select = document.getElementById('select-equipo')
    if (!tipo) {
        select.innerHTML = '<option value="">Primero selecciona categoría</option>'
        select.disabled = true
        return
    }

    select.disabled = true
    select.innerHTML = '<option value="">Cargando...</option>'

    fetch('/api/inventario/equipos/' + tipo)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return
            select.innerHTML = '<option value="">Seleccionar equipo...</option>'
            data.equipos.forEach(e => {
                const opt = document.createElement('option')
                opt.value = e.id
                let label = e.nombre || e.codigo || 'Equipo #' + e.id
                if (e.descripcion) label += ' - ' + e.descripcion
                if (e.ubicacion) label += ' (' + e.ubicacion + ')'
                if (e.equipo) label += ' - ' + e.equipo
                opt.textContent = label
                select.appendChild(opt)
                if (equipoIdSeleccionado && String(e.id) === String(equipoIdSeleccionado)) {
                    opt.selected = true
                }
            })
            select.disabled = false
        })
        .catch(err => {
            console.error(err)
            select.innerHTML = '<option value="">Error al cargar</option>'
        })
}

// ═══════════════════════════════════════════════════════════════════
//  AGRUPAR POR
// ═══════════════════════════════════════════════════════════════════
const AGRUPAR_LABELS = {
    '': 'Agrupar por',
    equipo: 'Equipo',
    tipo: 'Tipo',
    estado: 'Estado',
    responsable: 'Responsable',
    fecha: 'Fecha'
}

let filasOriginales = null // guarda el orden original de <tr> antes de agrupar

function agruparPor(campo) {
    const tbody = document.querySelector('#tabla-mantenimientos tbody')
    if (!tbody) return

    // Guardar el orden original la primera vez
    if (!filasOriginales) {
        filasOriginales = Array.from(tbody.querySelectorAll('tr[data-equipo]'))
    }

    // Quitar cualquier encabezado de grupo existente
    tbody.querySelectorAll('.mant-group-header').forEach(tr => tr.remove())

    const label = document.getElementById('btn-agrupar-label')

    if (!campo) {
        // "Sin agrupar" -> restaurar orden original
        filasOriginales.forEach(tr => tbody.appendChild(tr))
        if (label) label.textContent = 'Agrupar por'
        return
    }

    const filas = filasOriginales.slice()
    const grupos = new Map()
    filas.forEach(tr => {
        const clave = tr.dataset[campo] || 'Sin datos'
        if (!grupos.has(clave)) grupos.set(clave, [])
        grupos.get(clave).push(tr)
    })

    const clavesOrdenadas = Array.from(grupos.keys()).sort((a, b) => a.localeCompare(b, 'es'))
    const numColumnas = tbody.closest('table').querySelectorAll('thead th').length

    clavesOrdenadas.forEach(clave => {
        const filasGrupo = grupos.get(clave)
        const tr = document.createElement('tr')
        tr.className = 'mant-group-header'
        tr.innerHTML = '<td colspan="' + numColumnas + '">' + clave +
            '<span class="mant-group-count">(' + filasGrupo.length + ')</span></td>'
        tbody.appendChild(tr)
        filasGrupo.forEach(fila => tbody.appendChild(fila))
    })

    if (label) label.textContent = 'Agrupar por: ' + (AGRUPAR_LABELS[campo] || campo)
}

// ═══════════════════════════════════════════════════════════════════
//  MODALES
// ═══════════════════════════════════════════════════════════════════
function abrirModal(id) {
    const modal = document.getElementById(id)
    if (modal) modal.classList.add('active')
}

function cerrarModal(id) {
    const modal = document.getElementById(id)
    if (modal) modal.classList.remove('active')
}

function calcularTiempoInvertido() {
    const hi = document.getElementById('completar-hora-inicio')
    const hf = document.getElementById('completar-hora-fin')
    const display = document.getElementById('completar-tiempo-calculado')
    if (!hi || !hf || !display) return

    if (!hi.value || !hf.value) {
        display.textContent = '—'
        return
    }

    const [h1, m1] = hi.value.split(':').map(Number)
    const [h2, m2] = hf.value.split(':').map(Number)
    let minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (minutos < 0) minutos += 24 * 60

    if (minutos <= 0) {
        display.textContent = '0 min'
        return
    }

    const horas = Math.floor(minutos / 60)
    const resto = minutos % 60
    if (horas > 0 && resto > 0) display.textContent = horas + 'h ' + resto + 'min'
    else if (horas > 0) display.textContent = horas + 'h'
    else display.textContent = resto + ' min'
}

function abrirModalCompletar(id) {
    const form = document.getElementById('form-completar')
    form.reset()
    form.action = '/inventario/mantenimientos/' + id + '/completar'
    const display = document.getElementById('completar-tiempo-calculado')
    if (display) display.textContent = '—'
    abrirModal('modal-completar')
}

function abrirModalEditar(datos) {
    const form = document.getElementById('form-editar')
    form.action = '/inventario/mantenimientos/' + datos.id + '/editar'
    document.getElementById('editar-tipo').value = datos.tipo || ''
    document.getElementById('editar-fecha').value = datos.fecha || ''
    document.getElementById('editar-responsable').value = datos.responsable || ''
    document.getElementById('editar-frecuencia').value = datos.frecuencia || ''
    document.getElementById('editar-descripcion').value = datos.descripcion || ''
    abrirModal('modal-editar')
}

function abrirModalRevision(datos) {
    document.getElementById('rev-equipo').textContent = datos.equipo || '—'
    document.getElementById('rev-tipo').textContent = datos.tipo || '—'
    document.getElementById('rev-fecha-programada').textContent = datos.fechaProgramada || '—'
    document.getElementById('rev-fecha-realizada').textContent = datos.fechaRealizada || '—'
    document.getElementById('rev-proxima').textContent = datos.proxima || '—'
    document.getElementById('rev-responsable').textContent = datos.responsable || '—'
    document.getElementById('rev-hora-inicio').textContent = datos.horaInicio || '—'
    document.getElementById('rev-hora-fin').textContent = datos.horaFin || '—'
    document.getElementById('rev-tiempo').textContent = datos.tiempo || '—'

    document.getElementById('rev-descripcion').textContent = datos.descripcion || 'Sin descripción'
    document.getElementById('rev-repuestos').textContent = datos.repuestos || 'Sin repuestos registrados'
    document.getElementById('rev-observaciones').textContent = datos.observaciones || 'Sin observaciones'

    const fotoSection = document.getElementById('rev-seccion-foto')
    const mediaContainer = document.getElementById('rev-media-container')
    const labelEvidencia = document.getElementById('rev-label-evidencia')

    if (datos.foto && datos.foto.trim() !== '') {
        const ext = datos.foto.split('.').pop().toLowerCase()
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']
        const isVideo = videoExts.includes(ext)

        mediaContainer.innerHTML = ''

        if (isVideo) {
            labelEvidencia.textContent = '🎥 Video de Evidencia'
            const video = document.createElement('video')
            video.src = '/evidencias/' + datos.foto
            video.controls = true
            video.style.maxWidth = '100%'
            video.style.borderRadius = '8px'
            mediaContainer.appendChild(video)
        } else {
            labelEvidencia.textContent = '📷 Foto de Evidencia'
            const img = document.createElement('img')
            img.src = '/evidencias/' + datos.foto
            img.alt = 'Evidencia'
            img.style.maxWidth = '100%'
            img.style.borderRadius = '8px'
            mediaContainer.appendChild(img)
        }
        fotoSection.style.display = 'block'
    } else {
        fotoSection.style.display = 'none'
        mediaContainer.innerHTML = ''
    }

    abrirModal('modal-revision')
}

function confirmarEliminar(id) {
    if (confirm('¿Eliminar este mantenimiento? No se puede deshacer.')) {
        const form = document.getElementById('form-eliminar')
        if (form) {
            form.action = '/inventario/mantenimientos/' + id + '/eliminar'
            form.submit()
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
//  DOMContentLoaded
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    // Cálculo en vivo de tiempo invertido
    const horaInicio = document.getElementById('completar-hora-inicio')
    const horaFin = document.getElementById('completar-hora-fin')
    if (horaInicio && horaFin) {
        horaInicio.addEventListener('input', calcularTiempoInvertido)
        horaFin.addEventListener('input', calcularTiempoInvertido)
    }

    // Agrupar por
    document.querySelectorAll('[data-agrupar]').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault()
            agruparPor(this.dataset.agrupar)
            document.querySelectorAll('.mant-dropdown').forEach(d => d.classList.remove('active'))
        })
    })

    // Categoría -> equipo
    const selectCategoria = document.getElementById('nuevo-equipo-tipo')
    if (selectCategoria) {
        selectCategoria.addEventListener('change', function () {
            cargarEquipos(this.value)
        })
    }

    // Botón "+ Nuevo Mantenimiento"
    const btnNuevo = document.getElementById('btn-nuevo-mantenimiento')
    if (btnNuevo) {
        btnNuevo.addEventListener('click', function () {
            abrirModal('modal-nuevo-mantenimiento')
        })
    }

    // Buscador (Enter para buscar)
    const inputBuscar = document.getElementById('buscar-mantenimientos')
    if (inputBuscar) {
        inputBuscar.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') {
                const filtro = this.dataset.filtro || 'todos'
                location.href = '/inventario/mantenimientos?filtro=' + encodeURIComponent(filtro) + '&search=' + encodeURIComponent(this.value)
            }
        })
    }

    // Cerrar modales con botones [data-cerrar-modal]
    document.querySelectorAll('[data-cerrar-modal]').forEach(btn => {
        btn.addEventListener('click', function () {
            cerrarModal(this.dataset.cerrarModal)
        })
    })

    // Cerrar modal al hacer clic fuera
    document.querySelectorAll('.mant-modal-overlay').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) this.classList.remove('active')
        })
    })

    // Escape cierra modales y dropdowns
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.mant-modal-overlay.active').forEach(m => m.classList.remove('active'))
            document.querySelectorAll('.mant-dropdown').forEach(d => d.classList.remove('active'))
        }
    })

    // Delegación de eventos tabla
    const tabla = document.getElementById('tabla-mantenimientos')
    if (tabla) {
        tabla.addEventListener('click', function (e) {
            const btnCompletar = e.target.closest('.btn-completar-mant')
            if (btnCompletar) {
                abrirModalCompletar(btnCompletar.dataset.id)
                return
            }

            const btnEditar = e.target.closest('.btn-editar-mant')
            if (btnEditar) {
                abrirModalEditar(btnEditar.dataset)
                return
            }

            const btnRevision = e.target.closest('.btn-revision-mant')
            if (btnRevision) {
                abrirModalRevision(btnRevision.dataset)
                return
            }

            const btnEliminar = e.target.closest('.btn-eliminar-mant')
            if (btnEliminar) {
                confirmarEliminar(btnEliminar.dataset.id)
                return
            }
        })
    }
})