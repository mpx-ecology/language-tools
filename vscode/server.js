try {
  // for dev
  module.exports = require('@mpxjs/language-server/bin/mpx-language-server')
} catch {
  // for prod
  module.exports = require('./dist/server')
}
