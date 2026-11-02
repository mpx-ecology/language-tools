import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { parseUsingComponentsWithJs } from '../src/utils/parseJsonUsingComponents'

function parse(source: string) {
  return parseUsingComponentsWithJs(
    ts,
    ts.createSourceFile('config.js', source, ts.ScriptTarget.Latest),
  )
}

describe('assigned component objects', () => {
  it.each([
    'usingComponents: { ...components }',
    'usingComponents: components',
    'usingComponents',
  ])('resolves static writes through %s', registration => {
    const variable =
      registration === 'usingComponents' ? 'usingComponents' : 'components'
    const source = `
      const ${variable} = {}
      if (__mpx_mode__ === 'wx') {
        ${variable}['demo-panel'] = './panel.mpx?root=demo'
        ${variable}.header = './header.mpx'
      }
      module.exports = { ${registration} }
    `
    const result = parse(source)
    expect([...result.keys()]).toEqual(['demo-panel', 'header'])
    expect(result.get('demo-panel')).toEqual([
      {
        text: './panel.mpx?root=demo',
        offset: source.indexOf("'./panel.mpx?root=demo'"),
        nameOffset: source.indexOf("'demo-panel'"),
      },
    ])
    expect(result.get('header')).toEqual([
      {
        text: './header.mpx',
        offset: source.indexOf("'./header.mpx'"),
        nameOffset: source.indexOf('header ='),
      },
    ])
  })

  it('keeps conditional candidates and assignments in comma expressions', () => {
    const result = parse(`
      const components = { initial: './initial.mpx' }
      if (__mpx_mode__ === 'wx') {
        components.panel = './wx-panel.mpx',
        components.header = './header.mpx'
      } else {
        components.panel = './ali-panel.mpx'
      }
      Object.assign(components, { footer: './footer.mpx' })
      module.exports = { usingComponents: { ...components } }
    `)
    expect(result.get('panel')?.map(info => info.text)).toEqual([
      './wx-panel.mpx',
      './ali-panel.mpx',
    ])
    expect([...result.keys()]).toEqual(['initial', 'panel', 'header', 'footer'])
  })

  it('ignores unrelated objects, computed names and non-path writes', () => {
    const result = parse(`
      const components = {}
      const placeholders = {}
      const name = 'dynamic-panel'
      placeholders.panel = 'view'
      components[name] = './dynamic.mpx'
      components.panel += './suffix'
      components.count = 1
      module.exports = { usingComponents: { ...components } }
    `)
    expect(result.size).toBe(0)
  })

  it('does not duplicate paths through shared spreads', () => {
    const result = parse(`
      const components = {}
      const alias = components
      components.panel = './panel.mpx'
      module.exports = { usingComponents: { ...components, ...alias } }
    `)
    expect(result.get('panel')?.map(info => info.text)).toEqual(['./panel.mpx'])
  })

  it('keeps assigned path variables mapped to their string literal', () => {
    const source = `
      const panelPath = './panel.mpx'
      const components = {}
      components.panel = panelPath
      module.exports = { usingComponents: { ...components } }
    `
    expect(parse(source).get('panel')).toEqual([
      {
        text: './panel.mpx',
        offset: source.indexOf("'./panel.mpx'"),
        nameOffset: source.indexOf('panel ='),
      },
    ])
  })

  it.each([
    [
      'function local',
      `function unused() {
      const components = {}
      components.ghost = './missing.mpx'
      Object.assign(components, { panel: './wrong.mpx' })
    }`,
    ],
    [
      'parameter',
      `function unused(components) {
      components.ghost = './missing.mpx'
      Object.assign(components, { panel: './wrong.mpx' })
    }`,
    ],
    [
      'destructured parameter',
      `function unused({ components }) {
      components.ghost = './missing.mpx'
    }`,
    ],
    [
      'block local',
      `{
      const components = {}
      components.ghost = './missing.mpx'
    }`,
    ],
    [
      'destructured local',
      `{
      const { components } = { components: {} }
      components.ghost = './missing.mpx'
    }`,
    ],
    [
      'catch binding',
      `try {} catch (components) {
      components.ghost = './missing.mpx'
    }`,
    ],
    [
      'loop binding',
      `for (const components of [{}]) {
      components.ghost = './missing.mpx'
    }`,
    ],
    [
      'hoisted function var',
      `function unused() {
      components.ghost = './missing.mpx'
      if (true) { var components = {} }
    }`,
    ],
    [
      'named function expression',
      `const unused = function components() {
      components.ghost = './missing.mpx'
    }`,
    ],
    [
      'class binding',
      `{
      class components {}
      components.ghost = './missing.mpx'
    }`,
    ],
  ])('ignores writes to a shadowing %s', (_, shadow) => {
    // Put unrelated declarations first so resolving an initializer must also
    // respect scope, rather than choosing the first name in the source file.
    const result = parse(`
      ${shadow}
      const components = { initial: './initial.mpx' }
      if (__mpx_mode__ === 'wx') {
        components.panel = './panel.mpx'
        Object.assign(components, { footer: './footer.mpx' })
      }
      module.exports = { usingComponents: { ...components } }
    `)
    expect([...result.keys()]).toEqual(['initial', 'panel', 'footer'])
    expect(result.get('panel')?.map(info => info.text)).toEqual(['./panel.mpx'])
  })

  it('resolves a block-local registration, alias and path in their own scope', () => {
    const source = `
      const components = { ghost: './missing.mpx' }
      const panelPath = './wrong.mpx'
      {
        const components = {}
        const panelPath = './panel.mpx'
        const alias = components
        components.panel = panelPath
        module.exports = { usingComponents: { ...alias, ...components } }
      }
    `
    const result = parse(source)
    expect([...result.keys()]).toEqual(['panel'])
    expect(result.get('panel')).toEqual([
      {
        text: './panel.mpx',
        offset: source.indexOf("'./panel.mpx'"),
        nameOffset: source.indexOf('panel ='),
      },
    ])
  })

  it('resolves var declarations hoisted out of conditional blocks', () => {
    const result = parse(`
      if (__mpx_mode__ === 'wx') {
        var components = { initial: './initial.mpx' }
      }
      components.panel = './panel.mpx'
      module.exports = { usingComponents: components }
    `)
    expect([...result.keys()]).toEqual(['initial', 'panel'])
  })

  it.each([
    [
      'parameter initializer',
      `
      const components = { panel: './panel.mpx' }
      function build(config = { usingComponents: components }) {
        var components = { ghost: './missing.mpx' }
        return config
      }
      module.exports = build()
    `,
    ],
    [
      'implicit CommonJS binding',
      `
      function unrelated(exports) {
        Object.assign(exports, { ghost: './missing.mpx' })
      }
      Object.assign(exports, { panel: './panel.mpx' })
      module.exports = { usingComponents: { ...exports } }
    `,
    ],
    [
      'computed method name',
      `
      const components = {}
      const methods = {
        [(Object.assign(components, { panel: './panel.mpx' }), 'register')](components) {}
      }
      module.exports = { usingComponents: components }
    `,
    ],
  ])('keeps the binding and source position for a %s', (_, source) => {
    const result = parse(source)
    expect([...result.keys()]).toEqual(['panel'])
    expect(result.get('panel')).toEqual([
      {
        text: './panel.mpx',
        offset: source.indexOf("'./panel.mpx'"),
        nameOffset: source.indexOf('panel:'),
      },
    ])
  })

  it.each([
    ['uninitialized var', 'var components', ['panel']],
    ['hoisted var', 'if (true) { var components }', ['panel']],
    ['initialized var', 'var components = {}', []],
    ['later initializer', 'var components; var components = {}', []],
    ['iteration binding', 'for (var components of [{}]) {}', []],
  ])('preserves parameter object writes for an %s', (_, declaration, names) => {
    const source = `
      function build(components = {}, config = { usingComponents: components }) {
        ${declaration}
        Object.assign(components, { panel: './panel.mpx' })
        return config
      }
      module.exports = build()
    `
    const result = parse(source)
    expect([...result.keys()]).toEqual(names)
    if (names.length) {
      expect(result.get('panel')).toEqual([
        {
          text: './panel.mpx',
          offset: source.indexOf("'./panel.mpx'"),
          nameOffset: source.indexOf('panel:'),
        },
      ])
    }
  })

  it('keeps repeated registrations linear in cache probes', () => {
    function measure(size: number) {
      const source = `
        const components = {}
        ${Array.from({ length: size }, (_, i) => `components.panel${i} = './panel${i}.mpx'`).join('\n')}
        const configs = [${Array.from({ length: size }, () => '{ usingComponents: components }').join(',')}]
        module.exports = configs[0]
      `
      const ast = ts.createSourceFile(
        'config.js',
        source,
        ts.ScriptTarget.Latest,
      )
      const has = Set.prototype.has
      let probes = 0
      try {
        // Count work instead of wall-clock time so CI load cannot make this flaky.
        Set.prototype.has = function (value) {
          probes++
          return has.call(this, value)
        }
        const result = parseUsingComponentsWithJs(ts, ast)
        return { result, probes }
      } finally {
        Set.prototype.has = has
      }
    }
    const small = measure(50)
    const large = measure(100)
    expect(large.result.size).toBe(100)
    expect([...large.result.values()].every(paths => paths.length === 1)).toBe(
      true,
    )
    expect(large.probes).toBeLessThanOrEqual(Math.max(1, small.probes) * 3)
  })

  it('keeps paths through recursive object sources without duplicate mappings', () => {
    const result = parse(`
      const first = {}
      const second = { ...first, second: './second.mpx' }
      Object.assign(first, second, { first: './first.mpx' })
      module.exports = { usingComponents: { ...first, ...second } }
    `)
    expect([...result.keys()].sort()).toEqual(['first', 'second'])
    expect(result.get('first')).toHaveLength(1)
    expect(result.get('second')).toHaveLength(1)
  })
})
