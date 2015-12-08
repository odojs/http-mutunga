http = require 'http'
module.exports = (requestListener) ->
  _nextId = 1
  isAcceptingNewRequests = yes
  connections = {}
  server = http.createServer requestListener

  destroy = (connection) ->
    return if isAcceptingNewRequests
    return unless connection.isIdle
    connection.destroy()

  emitIfEmpty = ->
    return if isAcceptingNewRequests
    if Object.keys(connections).length is 0
      server.emit 'empty'

  trackConnection = (connection) ->
    return connection if connection.id?
    connection.id = _nextId++
    connection.isIdle = yes
    connections[connection.id] = connection;
    connection.on 'close', ->
      delete connections[connection.id]
      emitIfEmpty()

  onRequest = (req, res) ->
    connection = trackConnection req.socket
    connection.isIdle = no
    res.on 'finish', ->
      connection.isIdle = yes
      destroy connection

  server.on 'connection', trackConnection
  server.on 'request', onRequest

  # Replace the original close method
  origClose = server.close
  server.close = (cb) ->
    res = origClose.apply server, [cb]
    if isAcceptingNewRequests
      isAcceptingNewRequests = no
      destroy connection for _, connection of connections
      emitIfEmpty()
    res
  server