// ═══════════════════════════════════════════════════════
//  NOTIFICACIONES SSE — FRONTEND
//  Escucha eventos del servidor y muestra toasts
// ═══════════════════════════════════════════════════════

(function () {
  "use strict"

  let eventSource = null
  let reconectarIntento = 0
  const MAX_REINTENTOS = 5
  const TIEMPO_RECONEXION = 3000

  function iniciarSSE() {
    const path = window.location.pathname
    if (!path.includes("/dashboard") &&
        !path.includes("/mis-solicitudes") &&
        !path.includes("/solicitud/")) {
      return
    }

    if (eventSource) eventSource.close()

    eventSource = new EventSource("/notificaciones/stream")

    eventSource.onopen = function () {
      console.log("🔔 SSE: Conexión abierta")
      reconectarIntento = 0
    }

    eventSource.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data)
        if (data.tipo !== "conectado") mostrarToast(data)
      } catch (err) {
        console.error("Error parseando SSE:", err)
      }
    }

    eventSource.onerror = function () {
      eventSource.close()
      if (reconectarIntento < MAX_REINTENTOS) {
        reconectarIntento++
        setTimeout(iniciarSSE, TIEMPO_RECONEXION)
      }
    }
  }

  function mostrarToast(data) {
    let contenedor = document.getElementById("toast-container")
    if (!contenedor) {
      contenedor = document.createElement("div")
      contenedor.id = "toast-container"
      contenedor.style.cssText = `
        position:fixed;top:20px;right:20px;z-index:9999;
        display:flex;flex-direction:column;gap:10px;
        max-width:380px;pointer-events:none;
      `
      document.body.appendChild(contenedor)
    }

    const colores = { estado: "#2ecc71", asignado: "#3498db", comentario: "#f39c12", alerta: "#e74c3c" }
    const iconos  = { estado: "fa-sync-alt", asignado: "fa-user-check", comentario: "fa-comment", alerta: "fa-exclamation-circle" }

    const toast = document.createElement("div")
    toast.style.cssText = `
      background:linear-gradient(135deg,#1a1f2e,#242b3d);color:white;
      padding:16px 20px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.2);
      font-family:'Inter','Segoe UI',sans-serif;font-size:0.88rem;
      display:flex;align-items:flex-start;gap:12px;
      animation:toastSlideIn 0.3s ease,toastFadeOut 0.3s ease 4.7s forwards;
      pointer-events:auto;border-left:4px solid ${colores[data.tipo] || "#2ecc71"};
      cursor:pointer;
    `

    toast.innerHTML = `
      <div style="width:36px;height:36px;border-radius:8px;background:rgba(46,204,113,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="fas ${iconos[data.tipo] || "fa-bell"}" style="color:#2ecc71;font-size:0.9rem;"></i>
      </div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:3px;">${data.titulo || "Notificación"}</div>
        <div style="color:#c5cbd3;font-size:0.82rem;line-height:1.4;">${data.mensaje}</div>
        <div style="color:#5a6275;font-size:0.7rem;margin-top:6px;">
          <i class="far fa-clock" style="margin-right:3px;"></i>
          ${new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <button style="background:none;border:none;color:#8b95a8;cursor:pointer;font-size:1rem;padding:0;width:24px;height:24px;line-height:1;"
              onclick="this.parentElement.remove()">×</button>
    `

    toast.addEventListener("click", function (e) {
      if (e.target.tagName !== "BUTTON" && data.ticketId) {
        window.location.href = `/solicitud/${data.ticketId}`
      }
    })

    contenedor.appendChild(toast)
    setTimeout(() => { if (toast.parentElement) toast.remove() }, 5000)
  }

  const style = document.createElement("style")
  style.textContent = `
    @keyframes toastSlideIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
    @keyframes toastFadeOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(30px); } }
  `
  document.head.appendChild(style)

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarSSE)
  } else {
    iniciarSSE()
  }
})()