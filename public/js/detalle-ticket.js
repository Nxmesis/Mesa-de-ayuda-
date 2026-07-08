// ═══════════════════════════════════════════════════════
//  DETALLE TICKET - Funcionalidad de media de solución
//  Se carga en: /tickets/:id
// ═══════════════════════════════════════════════════════

(function() {
  'use strict'

  // Detectar tipo de archivo para solución (panel admin)
  const inputSolucion = document.getElementById('inputSolucionMedia')
  if (inputSolucion) {
    inputSolucion.addEventListener('change', function() {
      const tipoInput = document.getElementById('tipoMediaSolucion')
      if (!tipoInput) return

      const ext = this.value.split('.').pop().toLowerCase()
      const videoExts = ['mp4','webm','mov','ogg','avi','mkv']

      if (videoExts.includes(ext)) {
        tipoInput.value = 'video'
      } else {
        tipoInput.value = 'imagen'
      }
    })
  }

  // Detectar tipo de archivo para comentarios
  const inputComentario = document.getElementById('archivoComentario')
  if (inputComentario) {
    inputComentario.addEventListener('change', function() {
      const ext = this.value.split('.').pop().toLowerCase()
      const videoExts = ['mp4','webm','mov','ogg','avi','mkv']

      // Agregar preview si es imagen
      const existingPreview = document.getElementById('preview-comentario')
      if (existingPreview) existingPreview.remove()

      if (this.files && this.files[0]) {
        const file = this.files[0]
        const isVideo = videoExts.includes(ext)

        if (!isVideo && file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onload = function(e) {
            const preview = document.createElement('div')
            preview.id = 'preview-comentario'
            preview.style.cssText = 'margin-top:10px; padding:10px; background:#f7fafc; border-radius:6px; border:1px dashed #cbd5e0;'
            preview.innerHTML = '<div style="font-size:0.8rem; color:#718096; margin-bottom:6px;">Vista previa:</div><img src="' + e.target.result + '" style="max-width:200px; max-height:150px; border-radius:4px;">'

            const formGroup = inputComentario.closest('.form-group')
            if (formGroup) {
              formGroup.appendChild(preview)
            }
          }
          reader.readAsDataURL(file)
        }
      }
    })
  }
})()