try {
  // for dev
  module.exports = require('./out/client')
} catch {
  // for prod
  module.exports = require('./dist/client')
}
