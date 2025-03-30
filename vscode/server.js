try {
  // for dev
  module.exports = require('./server/out/server')
} catch {
  // for prod
  module.exports = require('./dist/server')
}
