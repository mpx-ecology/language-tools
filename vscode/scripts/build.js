// @ts-check
const path = require('path')
const fs = require('fs')
const esbuild = require('esbuild')

const minify = process.argv.includes('--minify')
const watch = process.argv.includes('--watch')

const resolve = (file = '') => path.join(__dirname, '..', file)

async function main() {
  const ctx = await esbuild.context({
    entryPoints: {
      'dist/client': './out/client.js',
      'dist/server':
        './node_modules/@mpxjs/language-server/bin/mpx-language-server.js',
      //   'node_modules/mpx-language-core-pack/index':
      //     './node_modules/@mpxjs/language-core/out/index.js',
      //   'node_modules/mpx-typescript-plugin-pack/index':
      //     './node_modules/@mpxjs/typescript-plugin/out/index.js',
    },
    outdir: '.',
    bundle: true,
    format: 'cjs',
    platform: 'node',
    external: ['vscode'],
    sourcemap: false,
    sourcesContent: false,
    logLevel: 'warning',
    tsconfig: './tsconfig.json',
    minify: minify,
    metafile: process.argv.includes('--metafile'),
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    plugins: [
      esbuildProblemMatcherPlugin,
      umd2esmPlugin,
      resolveShareModulePlugin,
      // schemasPlugin,
      metasPlugin,
    ],
  })

  console.log('[esbuild] start')

  if (watch) {
    // await ctx.watch()
    console.log('[esbuild] watching...')
  } else {
    await ctx.rebuild()
    await ctx.dispose()
  }
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',

  setup(build) {
    build.onStart(() => {
      console.log('[esbuild] build started')
    })
    build.onEnd(result => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`)
        if (location == null) return
        console.error(
          `    ${location.file}:${location.line}:${location.column}:`,
        )
      })
      console.log('[esbuild] build finished.')
    })
  },
}

/**
 * @type {import('esbuild').Plugin}
 */
const umd2esmPlugin = {
  name: 'umd2esm',
  setup(build) {
    build.onResolve(
      {
        filter:
          /^(vscode-.*-languageservice|vscode-languageserver-types|jsonc-parser)$/,
      },
      args => {
        const pathUmdMay = require.resolve(args.path, {
          paths: [args.resolveDir],
        })
        // Call twice the replace is to solve the problem of the path in Windows
        const pathEsm = pathUmdMay
          .replace('/umd/', '/esm/')
          .replace('\\umd\\', '\\esm\\')
        return {
          path: pathEsm,
        }
      },
    )
    build.onResolve(
      {
        filter: /^vscode-uri$/,
      },
      args => {
        const pathUmdMay = require.resolve(args.path, {
          paths: [args.resolveDir],
        })
        // v3
        let pathEsm = pathUmdMay
          .replace('/umd/index.js', '/esm/index.mjs')
          .replace('\\umd\\index.js', '\\esm\\index.mjs')
        if (pathEsm !== pathUmdMay && fs.existsSync(pathEsm)) {
          return {
            path: pathEsm,
          }
        }
        // v2
        pathEsm = pathUmdMay
          .replace('/umd/', '/esm/')
          .replace('\\umd\\', '\\esm\\')
        return {
          path: pathEsm,
        }
      },
    )
  },
}

/**
 * @type {import('esbuild').Plugin}
 */
const resolveShareModulePlugin = {
  name: 'resolve-share-module',
  setup(build) {
    build.onResolve(
      {
        filter: /^@mpxjs\/language-core$/,
      },
      () => {
        return {
          path: 'mpx-language-core-pack',
          external: true,
        }
      },
    )
  },
}

/**
 * @type {import('esbuild').Plugin}
 */
const schemasPlugin = {
  name: 'schemas',
  setup(build) {
    build.onEnd(() => {
      if (!fs.existsSync(resolve('dist/schemas'))) {
        fs.mkdirSync(resolve('dist/schemas'))
      }
      fs.cpSync(
        resolve(
          'node_modules/@mpxjs/language-core/schemas/mpx-tsconfig.schema.json',
        ),
        resolve('dist/schemas/mpx-tsconfig.schema.json'),
      )
    })
  },
}

/**
 * @type {import('esbuild').Plugin}
 */
const metasPlugin = {
  name: 'meta',
  setup(build) {
    build.onEnd(result => {
      if (result.metafile && result.errors.length === 0) {
        fs.writeFileSync(resolve('meta.json'), JSON.stringify(result.metafile))
      }
    })
  },
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
