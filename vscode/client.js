try {
  // for dev
  module.exports = require('./client/out/extension')
} catch {
  // for prod
  module.exports = require('./dist/client')
}
