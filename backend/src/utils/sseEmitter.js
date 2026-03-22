const EventEmitter = require('events')
const emitter = new EventEmitter()
emitter.setMaxListeners(50)
module.exports = emitter
