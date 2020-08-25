const http = require('http')
module.exports = requestListener => {
  let isavailable = true
  const sockets = new Map()
  const server = http.createServer(requestListener)

  const track = socket => {
    if (sockets.has(socket)) return socket
    sockets.set(socket, true)
    socket.on('close', () => sockets.delete(socket))
    return socket
  }

  server.on('connection', socket => {
    if (!isavailable) return socket.destroy()
    track(socket)
  })

  server.on('request', (req, res) => {
    if (!isavailable && !res.headersSent)
      res.setHeader('connection', 'close')
    const socket = track(req.socket)
    sockets.set(socket, false)
    res.on('finish', () => {
      sockets.set(socket, true)
      if (isavailable) return
      socket.destroy()
    })
  })

  server.terminate = (timeout = 5000) => new Promise((resolve, reject) => {
    let timeouthandle = null
    server.close(e => {
      if (timeouthandle) {
        clearTimeout(timeouthandle)
        timeouthandle = null
      }
      if (e) reject(e)
      else resolve()
    })
    if (!isavailable) return server
    isavailable = false
    for (const [socket, isidle] of sockets.entries()) {
      if (isidle) {
        socket.destroy()
        continue
      }
      const res = socket._httpMessage
      if (res && !res.headersSent)
        res.setHeader('connection', 'close')
    }
    if (sockets.size > 0)
      timeouthandle = setTimeout(() => {
        for (const socket of sockets.keys())
          socket.destroy()
      }, timeout)
  })
  return server
}