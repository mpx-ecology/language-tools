const wxConfig = { component: true, usingComponents: {} }
const aliConfig = { component: true, usingComponents: {} }
let finalConfig = null
if (__mpx_mode__ === 'ali') {
  finalConfig = aliConfig1
} else {
  finalConfig = wxConfig
}
module.exports = finalConfig
