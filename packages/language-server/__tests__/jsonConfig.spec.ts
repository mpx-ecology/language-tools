import { afterEach, describe, expect, it } from 'vitest'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { createJsonProject } from './utils/createJsonProject'

let project: Awaited<ReturnType<typeof createJsonProject>> | undefined
afterEach(() => {
  project?.dispose()
  project = undefined
})

describe.each([true, false])(
  'config schema alongside JS semantics (JSON-only: %s)',
  jsonOnly => {
    it('reproduces native field inference without schema guidance when the new provider is disabled', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const schema = p.service.context.plugins.find(
        ([plugin]) => plugin.name === 'mpx-json-config',
      )!
      p.service.context.disabledServicePlugins.add(schema[1])
      const source =
        '<script name="json">module.exports = { component: "bad" }</script>'
      await p.edit('config.mpx', source)
      const uri = p.uri('config.mpx')
      const doc = TextDocument.create(uri.toString(), 'mpx', 1, source)
      const hover = JSON.stringify(
        (
          await p.service.getHover(
            uri,
            doc.positionAt(source.indexOf('component:') + 1),
          )
        )?.contents,
      )
      expect(hover).toContain('string')
      expect(hover).not.toContain('自定义组件声明')
      expect(
        (await p.service.getDiagnostics(uri)).filter(
          d => d.source === 'mpx-json-schema',
        ),
      ).toEqual([])
    })

    it('combines schema field docs with native string inference and navigation', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const source = `<script name="json">\nconst config = { component: true, custom: { title: 'Mpx' } };\nconfig.custom.title.toUpperCase();\nmodule.exports = config\n</script>`
      await p.edit('config.mpx', source)
      const uri = p.uri('config.mpx')
      const doc = TextDocument.create(uri.toString(), 'mpx', 1, source)
      const at = (text: string, delta = 1) =>
        doc.positionAt(source.indexOf(text) + delta)
      expect(
        JSON.stringify(
          (await p.service.getHover(uri, at('component:')))?.contents,
        ),
      ).toContain('自定义组件声明')
      expect(
        JSON.stringify(
          (await p.service.getHover(uri, at('title.toUpperCase')))?.contents,
        ),
      ).toContain('string')
      const definitions = await p.service.getDefinition(
        uri,
        at('config.custom'),
      )
      expect(definitions).toHaveLength(1)
      expect(doc.getText(definitions![0].targetSelectionRange)).toBe('config')
      const completions = await p.service.getCompletionItems(
        uri,
        at('title.toUpperCase', 'title.'.length),
      )
      expect(completions.items.some(item => item.label === 'toUpperCase')).toBe(
        true,
      )
      expect(
        (await p.service.getDiagnostics(uri)).filter(
          d => d.severity === 1 || d.source === 'mpx-json-schema',
        ),
      ).toEqual([])
    })

    it('refreshes schema diagnostics and field completions after live edits', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      const uri = p.uri('config.mpx')
      let source =
        '<script name="json">module.exports = { navigationBarTitleText: 42 }</script>'
      await p.edit('config.mpx', source)
      let diagnostics = (await p.service.getDiagnostics(uri)).filter(
        d => d.source === 'mpx-json-schema',
      )
      expect(diagnostics).toHaveLength(1)
      expect(
        TextDocument.create(uri.toString(), 'mpx', 1, source).getText(
          diagnostics[0].range,
        ),
      ).toBe('42')
      source = source.replace('42', "'Mpx'")
      await p.edit('config.mpx', source)
      diagnostics = (await p.service.getDiagnostics(uri)).filter(
        d => d.source === 'mpx-json-schema',
      )
      expect(diagnostics).toEqual([])
      source = '<script name="json">module.exports = { nav }</script>'
      await p.edit('config.mpx', source)
      const document = TextDocument.create(uri.toString(), 'mpx', 3, source)
      const items = (
        await p.service.getCompletionItems(
          uri,
          document.positionAt(source.indexOf('nav }') + 3),
        )
      ).items
      expect(
        items.filter(
          item => item.label === 'navigationBarTitleText' && item.documentation,
        ),
      ).toHaveLength(1)
      source =
        '<script name="json">const flag = true; module.exports = { component:  }</script>'
      await p.edit('config.mpx', source)
      const valueDocument = TextDocument.create(
        uri.toString(),
        'mpx',
        4,
        source,
      )
      const values = (
        await p.service.getCompletionItems(
          uri,
          valueDocument.positionAt(
            source.indexOf('component: ') + 'component: '.length,
          ),
        )
      ).items
      expect(values.map(item => item.label)).toEqual(
        expect.arrayContaining(['flag', 'true', 'false']),
      )
    })
  },
)
