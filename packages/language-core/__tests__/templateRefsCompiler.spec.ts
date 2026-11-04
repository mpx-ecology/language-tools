import { createRequire } from 'node:module'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileMpxFixture } from './utils/compileMpxFixture'

const requireFromTest = createRequire(__filename)
const compiler = requireFromTest(
  '@mpxjs/webpack-plugin/lib/template-compiler/compiler',
) as {
  parse(
    source: string,
    options: object,
  ): {
    meta: { refs: { key: string; type: string; all: boolean }[] }
  }
}

describe('Mpx runtime ref metadata', () => {
  it.each([
    'context-js.mpx',
    'exposed-child.mpx',
    'index.mpx',
    'nested-context.mpx',
    'options-setup-child.mpx',
    'setup-options-parent.mpx',
    'shapes.mpx',
  ])('compiles the actual script-setup fixture %s', async file => {
    await expect(
      compileMpxFixture(
        path.resolve(__dirname, 'fixtures/template-refs', file),
      ),
    ).resolves.toBeDefined()
  })
  it.each(['wx', 'ios'])(
    'preserves component/node and loop distinctions for %s',
    mode => {
      const source = `<exposed-child wx:if="{{ visible }}" wx:ref="single" />
<block wx:for="{{ rows }}" wx:key="id">
  <exposed-child wx:ref="list" />
  <view wx:ref="nodes" />
</block>
<exposed-child wx:ref="same" />
<options-child wx:ref="same" />`
      const { meta } = compiler.parse(source, {
        mode,
        srcMode: 'wx',
        filePath: '/template-refs.mpx',
        usingComponentsInfo: { 'exposed-child': {}, 'options-child': {} },
        externalClasses: [],
        proxyComponentEventsRules: [],
        defs: {},
        warn(message: string) {
          throw new Error(message)
        },
        error(message: string) {
          throw new Error(message)
        },
      })
      expect(
        meta.refs.map(({ key, type, all }) => ({ key, type, all })),
      ).toEqual([
        { key: 'single', type: 'component', all: false },
        { key: 'list', type: 'component', all: true },
        { key: 'nodes', type: 'node', all: true },
        { key: 'same', type: 'component', all: false },
        { key: 'same', type: 'component', all: false },
      ])
    },
  )
})
