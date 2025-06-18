const { defineConfig } = require('unocss')
const presetMpx = require('@mpxjs/unocss-base')

module.exports = defineConfig({
  include: [/\.mpx($|\?)/],
  presets: [presetMpx()],
})
