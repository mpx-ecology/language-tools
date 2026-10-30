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
})
