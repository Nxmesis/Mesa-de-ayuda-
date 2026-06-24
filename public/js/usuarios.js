
document.addEventListener('DOMContentLoaded', function() {

  // ── Modales ──
  window.abrirModal = function(tipo, id, nombre, username, area, rol) {
    if (tipo === 'editar') {
      document.getElementById('formEditar').action = `/usuarios/${id}/editar`
      document.getElementById('editNombre').value   = nombre
      document.getElementById('editUsername').value = username
      document.getElementById('editArea').value     = area || ''
      const selRol = document.getElementById('editRol')
      selRol.value = rol
      const esGerencia = (rol === 'gerencia')
      selRol.disabled = esGerencia
      document.getElementById('grupoRol').style.opacity = esGerencia ? '0.5' : '1'
      const hint = document.getElementById('hintRol')
      if (hint) hint.style.display = esGerencia ? 'block' : 'none'
      document.getElementById('modalEditar').classList.add('open')
    } else {
      document.getElementById('formPassword').action = `/usuarios/${id}/password`
      document.getElementById('pwdNombre').textContent = nombre
      document.getElementById('modalPassword').classList.add('open')
    }
  }

  window.cerrarModal = function(id) {
    document.getElementById(id).classList.remove('open')
  }

  // Cerrar al hacer click fuera
  document.querySelectorAll('.ind-modal-overlay').forEach(function(overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.classList.remove('open')
    })
  })

  // Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.ind-modal-overlay.open').forEach(function(m) {
        m.classList.remove('open')
      })
    }
  })

  // ── Toggle password ──
  window.togglePwd = function(inputId, btn) {
    const input = document.getElementById(inputId)
    const icon = btn.querySelector('i')
    if (input.type === 'password') {
      input.type = 'text'
      icon.classList.replace('fa-eye', 'fa-eye-slash')
    } else {
      input.type = 'password'
      icon.classList.replace('fa-eye-slash', 'fa-eye')
    }
  }

  // ── Fuerza de contraseña ──
  const pwdNueva = document.getElementById('pwdNueva')
  if (pwdNueva) {
    pwdNueva.addEventListener('input', function() {
      const val = this.value
      const fill = document.querySelector('#pwdStrength .ind-strength-fill')
      if (!fill) return
      let strength = 0
      if (val.length >= 6) strength++
      if (val.length >= 8) strength++
      if (/[A-Z]/.test(val)) strength++
      if (/[0-9]/.test(val)) strength++
      if (/[^A-Za-z0-9]/.test(val)) strength++

      const map = [
        { w: '0%', c: '#e8ecf1' },
        { w: '20%', c: '#e74c3c' },
        { w: '40%', c: '#e67e22' },
        { w: '60%', c: '#f1c40f' },
        { w: '80%', c: '#2ecc71' },
        { w: '100%', c: '#27ae60' }
      ]
      fill.style.width = map[strength].w
      fill.style.background = map[strength].c
    })
  }

  // ── Búsqueda en tiempo real ──
  const buscarInput = document.getElementById('buscarUsuario')
  if (buscarInput) {
    buscarInput.addEventListener('input', function() {
      const q = this.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const rows = document.querySelectorAll('#tablaUsuarios tbody tr.ind-row')
      let visible = 0
      rows.forEach(function(row) {
        const text = row.innerText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (text.includes(q)) {
          row.style.display = ''
          visible++
        } else {
          row.style.display = 'none'
        }
      })
      const contador = document.getElementById('contadorVisible')
      if (contador) contador.textContent = visible
    })
  }

  // ── Filtros ──
  document.querySelectorAll('.ind-filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.ind-filter-btn').forEach(function(b) {
        b.classList.remove('active')
      })
      this.classList.add('active')
      const filtro = this.dataset.filter
      const rows = document.querySelectorAll('#tablaUsuarios tbody tr.ind-row')
      let visible = 0
      rows.forEach(function(row) {
        const estado = row.dataset.estado
        if (filtro === 'todos' || estado === filtro) {
          row.style.display = ''
          visible++
        } else {
          row.style.display = 'none'
        }
      })
      const contador = document.getElementById('contadorVisible')
      if (contador) contador.textContent = visible
    })
  })

  // ── Auto-cerrar alertas ──
  setTimeout(function() {
    document.querySelectorAll('.alert').forEach(function(a) {
      a.style.transition = 'opacity 0.5s, transform 0.5s'
      a.style.opacity = '0'
      a.style.transform = 'translateY(-10px)'
      setTimeout(function() { a.remove() }, 500)
    })
  }, 5000)

})