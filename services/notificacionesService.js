// ═══════════════════════════════════════════════════════
//  SERVICIO DE NOTIFICACIONES — Server-Sent Events (SSE)
//  Singleton: mantiene conexiones activas y emite eventos
// ═══════════════════════════════════════════════════════

class NotificacionesService {
  constructor() {
    this.clientes = new Map() // usuarioId -> [res, res, ...]
  }

  conectar(usuarioId, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    })

    res.write(`data: ${JSON.stringify({ tipo: 'conectado', mensaje: 'Conexión establecida' })}\n\n`)

    if (!this.clientes.has(usuarioId)) {
      this.clientes.set(usuarioId, [])
    }
    this.clientes.get(usuarioId).push(res)

    console.log(`🔔 SSE: Usuario ${usuarioId} conectado. Total: ${this.totalConexiones()}`)

    const req = res.req
    req.on('close', () => this.desconectar(usuarioId, res))
  }

  desconectar(usuarioId, res) {
    if (!this.clientes.has(usuarioId)) return
    const conexiones = this.clientes.get(usuarioId).filter(r => r !== res)
    if (conexiones.length === 0) {
      this.clientes.delete(usuarioId)
    } else {
      this.clientes.set(usuarioId, conexiones)
    }
  }

  enviarAUsuario(usuarioId, datos) {
    if (!this.clientes.has(usuarioId)) return false
    const conexiones = this.clientes.get(usuarioId)
    const payload = JSON.stringify(datos)
    let enviados = 0
    conexiones.forEach(res => {
      try {
        res.write(`data: ${payload}\n\n`)
        enviados++
      } catch (err) { /* conexión muerta */ }
    })
    return enviados > 0
  }

  enviarAMultiples(usuarioIds, datos) {
    usuarioIds.forEach(id => this.enviarAUsuario(id, datos))
  }

  broadcast(datos) {
    const payload = JSON.stringify(datos)
    this.clientes.forEach((conexiones) => {
      conexiones.forEach(res => {
        try { res.write(`data: ${payload}\n\n`) } catch (err) {}
      })
    })
  }

  totalConexiones() {
    let total = 0
    this.clientes.forEach(arr => total += arr.length)
    return total
  }
}

module.exports = new NotificacionesService()