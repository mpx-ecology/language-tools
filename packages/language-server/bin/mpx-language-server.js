#!/usr/bin/env node
// @ts-check
if (process.argv.includes('--version')) {
  console.log(require('../package.json').version)
} else {
  console.log('---> debug: mpx-language-server')
  require('../out/node.js')
}
