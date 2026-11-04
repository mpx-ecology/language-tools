import { TextDocument } from 'vscode-languageserver-textdocument'
import { afterEach, describe, expect, it } from 'vitest'
import { createJsonProject } from './utils/createJsonProject'

type Project = Awaited<ReturnType<typeof createJsonProject>>
let project: Project | undefined

afterEach(() => {
  project?.dispose()
  project = undefined
})

const consumer = `<template>
  <test-panel></test-panel>
</template>
<script setup lang="ts">
defineExpose({})
</script>
<script name="json">
const panelPath = './panel.mpx'
module.exports = { usingComponents: { 'test-panel': panelPath } }
</script>
`

describe.each([true, false])(
  'component references with JSON semantics (JSON-only: %s)',
  jsonOnly => {
    it('preserves native JSON binding references and rename', async () => {
      const p = (project = await createJsonProject(jsonOnly))
      await p.edit('consumer.mpx', consumer)
      const uri = p.uri('consumer.mpx')
      const document = TextDocument.create(uri.toString(), 'mpx', 0, consumer)
      const position = document.positionAt(consumer.indexOf('panelPath'))
      const references = await p.service.getReferences(uri, position, {
        includeDeclaration: true,
      })
      expect(references).toHaveLength(2)
      expect(
        references!.every(reference => reference.uri === uri.toString()),
      ).toBe(true)
      expect(
        references!.map(reference => document.getText(reference.range)),
      ).toEqual(['panelPath', 'panelPath'])
      const edits = await p.service.getRenameEdits(
        uri,
        position,
        'registeredPanel',
      )
      expect(Object.keys(edits!.changes!)).toEqual([uri.toString()])
      expect(edits!.changes![uri.toString()]).toHaveLength(2)
      expect(
        edits!.changes![uri.toString()].map(edit =>
          document.getText(edit.range),
        ),
      ).toEqual(['panelPath', 'panelPath'])
    })
  },
)

it('keeps cross-file component usages in the complete standalone project', async () => {
  const p = (project = await createJsonProject(false))
  await p.edit('consumer.mpx', consumer)
  const uri = p.uri('consumer.mpx')
  const document = TextDocument.create(uri.toString(), 'mpx', 0, consumer)
  const fileReferences = await p.service.getFileReferences(p.uri('panel.mpx'))
  expect(
    fileReferences!
      .filter(reference => reference.uri === uri.toString())
      .map(reference => document.getText(reference.range))
      .sort(),
  ).toEqual(['./panel.mpx', 'test-panel', 'test-panel'].sort())
  const references = await p.service.getReferences(
    uri,
    document.positionAt(consumer.indexOf('test-panel') + 1),
    { includeDeclaration: false },
  )
  expect(references).toEqual(fileReferences)
})
