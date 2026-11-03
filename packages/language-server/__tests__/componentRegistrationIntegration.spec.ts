import type { CompletionItem, TextEdit } from '@mpxjs/language-service'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { afterEach, describe, expect, it } from 'vitest'
import { createJsonProject } from './utils/createJsonProject'

type Project = Awaited<ReturnType<typeof createJsonProject>>
let project: Project | undefined
afterEach(() => {
  const jsonOnly = project?.jsonOnly
  const remaining = project?.dispose()
  project = undefined
  expect(remaining?.documentListeners).toBe(0)
  // The upstream standalone TS auto-import cache keeps one subscription.
  // Registration must release its own listener in both project modes.
  expect(remaining?.fileListeners).toBe(jsonOnly ? 0 : 1)
})

function document(p: Project, text: string) {
  return TextDocument.create(p.uri('page.mpx').toString(), 'mpx', 0, text)
}
function at(doc: TextDocument, needle: string, offset: number) {
  const start = doc.getText().indexOf(needle)
  expect(start).toBeGreaterThanOrEqual(0)
  return doc.positionAt(start + offset)
}
function registrations(items: CompletionItem[]) {
  return items.filter(item => item.detail === '自动注册 usingComponents')
}

describe.each([true, false])(
  'component registration with the shared project (JSON-only host: %s)',
  jsonOnly => {
    async function start() {
      return (project = await createJsonProject(
        jsonOnly,
        {},
        true,
        'component-registration',
      ))
    }

    it('keeps alias-aware atomic completion edits alongside CommonJS hover and Quick Fix', async () => {
      const p = await start()
      expect(
        p.service.context.project.mpx?.typescriptCompilerOptions?.paths,
      ).toEqual({ '@config/*': ['./*'] })
      const source = p.read('page.mpx').replace('<demo-card ', '<demo-ca ')
      await p.edit('page.mpx', source)
      const doc = document(p, source)
      const uri = p.uri('page.mpx')
      const items = registrations(
        (await p.service.getCompletionItems(uri, at(doc, 'demo-ca ', 7))).items,
      )
      expect(items.map(item => item.label)).toEqual(['demo-card'])
      expect(items[0].labelDetails?.description).toBe('@config/demo-card')
      const resolved = await p.service.resolveCompletionItem(items[0])
      expect(resolved.additionalTextEdits?.length).toBeGreaterThan(0)
      expect(resolved.command).toBeUndefined()
      const accepted = TextDocument.applyEdits(doc, [
        resolved.textEdit as TextEdit,
        ...resolved.additionalTextEdits!,
      ])
      expect(accepted).toContain('<demo-card title="Mpx" />')
      expect(accepted).toContain("'demo-card': '@config/demo-card'")
      expect(accepted).toContain("'known-alias': '@config/known-card'")
      await p.edit('page.mpx', accepted)
      const current = document(p, accepted)
      const hover = await p.service.getHover(
        uri,
        at(current, 'navigationBarTitleText', 2),
      )
      expect(JSON.stringify(hover?.contents)).toContain('string')
      expect(
        registrations(
          (
            await p.service.getCompletionItems(
              uri,
              at(current, 'demo-card ', 9),
              { triggerKind: 3 },
            )
          ).items,
        ),
      ).toEqual([])

      // Restore the complete original snapshot, as a single editor undo does.
      await p.edit('page.mpx', source)
      expect(
        registrations(
          (
            await p.service.getCompletionItems(uri, at(doc, 'demo-ca ', 7), {
              triggerKind: 3,
            })
          ).items,
        ).map(item => item.label),
      ).toEqual(['demo-card'])

      const completeTag = p.read('page.mpx')
      await p.edit('page.mpx', completeTag)
      const completeDoc = document(p, completeTag)
      const position = at(completeDoc, 'demo-card ', 2)
      const actions = await p.service.getCodeActions(
        uri,
        { start: position, end: position },
        { diagnostics: [], only: ['quickfix'] },
      )
      const action = actions?.find(action =>
        action.title.startsWith('注册 demo-card'),
      )
      expect(action).toBeDefined()
      const fixed = await p.service.resolveCodeAction(action!)
      expect(Object.keys(fixed.edit!.changes!)).toEqual([uri.toString()])
      expect(
        TextDocument.applyEdits(
          completeDoc,
          fixed.edit!.changes![uri.toString()],
        ),
      ).toContain("'demo-card': '@config/demo-card'")
    })

    it('refreshes closed candidate files and discards unsaved candidate buffers through the shared lifecycle', async () => {
      const p = await start()
      const source = p.read('page.mpx').replace('<demo-card ', '<demo-ca ')
      await p.edit('page.mpx', source)
      const doc = document(p, source)
      const complete = async () =>
        registrations(
          (
            await p.service.getCompletionItems(
              p.uri('page.mpx'),
              at(doc, 'demo-ca ', 7),
            )
          ).items,
        ).map(item => item.label)
      const candidate = p.read('demo-card.mpx')
      const hidden = candidate.replace('true', 'false')
      expect(await complete()).toEqual(['demo-card'])
      await p.write('demo-card.mpx', hidden)
      expect(await complete()).toEqual([])
      await p.write('demo-card.mpx', candidate)
      expect(await complete()).toEqual(['demo-card'])
      await p.edit('demo-card.mpx', hidden)
      expect(await complete()).toEqual([])
      await p.close('demo-card.mpx')
      expect(await complete()).toEqual(['demo-card'])
    })
  },
)
