import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'
import { createComponentReferenceIndex } from '../src'
import { compileMpxSource } from './utils/compileMpxFixture'
import { createTestLanguageService } from './utils/createTestLanguageService'

const fixtureRoot = path.resolve(__dirname, 'fixtures/component-references')

function createMutableProject() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'mpx-component-references-'),
  )
  fs.cpSync(fixtureRoot, root, {
    recursive: true,
    filter: file => !file.includes('node_modules'),
  })
  const fixture = createTestLanguageService(root)
  let revision = 0
  const initial = fixture.languageServiceHost.getScriptFileNames()
  const added: string[] = []
  fixture.languageServiceHost.getProjectVersion = () => String(revision)
  fixture.languageServiceHost.getScriptVersion = () => String(revision)
  fixture.languageServiceHost.getScriptFileNames = () =>
    [...initial, ...added].filter(
      file => file.includes('.mpx-global-types') || fs.existsSync(file),
    )
  const index = createComponentReferenceIndex(ts, fixture.language, id => id)
  return {
    root,
    fixture,
    index,
    references(file: string) {
      return index.getFileReferences(
        fixture.languageService.getProgram()!,
        fixture.file(file),
      )
    },
    write(file: string, content: string | undefined) {
      const full = fixture.file(file)
      if (content === undefined) fs.unlinkSync(full)
      else {
        fs.mkdirSync(path.dirname(full), { recursive: true })
        fs.writeFileSync(full, content)
        if (
          !initial.includes(full) &&
          !added.includes(full) &&
          file.endsWith('.mpx')
        )
          added.push(full)
      }
      revision++
    },
    dispose() {
      fixture.dispose()
      fs.rmSync(root, { recursive: true, force: true })
    },
  }
}

describe('component reference index lifecycle', () => {
  it('keeps the isolated scenarios valid for the published Mpx compiler', async () => {
    const files = fs
      .readdirSync(fixtureRoot)
      .filter(file => file.endsWith('.mpx'))
    for (const file of files) {
      const result = await compileMpxSource(
        fs.readFileSync(path.join(fixtureRoot, file), 'utf8'),
        path.join(fixtureRoot, file),
      )
      expect(result.wxml.length, file).toBeGreaterThan(0)
    }
  })

  it('does not initialize the project index for ordinary script symbols', () => {
    const project = createMutableProject()
    try {
      const program = project.fixture.languageService.getProgram()!
      const enumerate = vi.spyOn(program, 'getSourceFiles')
      expect(
        project.index.getReferencesAtPosition(
          program,
          project.fixture.file('panel.mpx'),
          project.fixture.read('panel.mpx').indexOf('title:'),
        ),
      ).toBeUndefined()
      expect(enumerate).not.toHaveBeenCalled()
      enumerate.mockRestore()
    } finally {
      project.dispose()
    }
  })

  it('reuses the current Program index without project enumeration or reparsing', () => {
    const project = createMutableProject()
    try {
      const program = project.fixture.languageService.getProgram()!
      const first = project.index.getFileReferences(
        program,
        project.fixture.file('panel.mpx'),
      )
      expect(first.length).toBeGreaterThan(0)
      const enumerate = vi.spyOn(program, 'getSourceFiles')
      for (let i = 0; i < 10; i++)
        expect(
          project.index.getFileReferences(
            program,
            project.fixture.file('panel.mpx'),
          ),
        ).toBe(first)
      expect(enumerate).not.toHaveBeenCalled()
      enumerate.mockRestore()
    } finally {
      project.dispose()
    }
  })

  it('invalidates registrations and tags after source edits and removes deleted consumers', () => {
    const project = createMutableProject()
    try {
      expect(
        project
          .references('panel.mpx')
          .some(reference => reference.fileName.endsWith('/second.mpx')),
      ).toBe(true)
      project.write(
        'second.mpx',
        project.fixture
          .read('second.mpx')
          .replace('./panel', './other.mpx')
          .replace('other-name />', 'other-name></other-name>'),
      )
      expect(
        project
          .references('panel.mpx')
          .some(reference => reference.fileName.endsWith('/second.mpx')),
      ).toBe(false)
      expect(
        project
          .references('other.mpx')
          .filter(reference => reference.fileName.endsWith('/second.mpx')),
      ).toHaveLength(3)
      project.write('second.mpx', undefined)
      expect(
        project
          .references('other.mpx')
          .some(reference => reference.fileName.endsWith('/second.mpx')),
      ).toBe(false)
    } finally {
      project.dispose()
    }
  })

  it('refreshes unresolved registrations when their target is created or deleted', () => {
    const project = createMutableProject()
    try {
      project.write(
        'second.mpx',
        project.fixture.read('second.mpx').replace('./panel', './created.mpx'),
      )
      expect(project.references('created.mpx')).toEqual([])
      project.write('created.mpx', project.fixture.read('panel.mpx'))
      expect(project.references('created.mpx')).toHaveLength(2)
      project.write('created.mpx', undefined)
      expect(project.references('created.mpx')).toEqual([])
    } finally {
      project.dispose()
    }
  })

  it('uses resolved package and symlink identities without joining unrelated same-name tags', () => {
    const project = createMutableProject()
    try {
      fs.mkdirSync(path.join(project.root, 'node_modules/demo-panel'), {
        recursive: true,
      })
      fs.symlinkSync(
        project.fixture.file('panel.mpx'),
        path.join(project.root, 'node_modules/demo-panel/index.mpx'),
      )
      fs.writeFileSync(
        path.join(project.root, 'node_modules/demo-panel/package.json'),
        '{"name":"demo-panel","main":"index.mpx"}',
      )
      project.write(
        'second.mpx',
        project.fixture.read('second.mpx').replace('./panel', 'demo-panel'),
      )
      const references = project.references('panel.mpx')
      expect(
        references.filter(reference =>
          reference.fileName.endsWith('/second.mpx'),
        ),
      ).toHaveLength(2)
      expect(
        references.some(reference =>
          reference.fileName.endsWith('/unrelated.mpx'),
        ),
      ).toBe(false)
      const program = project.fixture.languageService.getProgram()!
      expect(
        project.index.getFileReferences(
          program,
          path.join(project.root, 'node_modules/demo-panel/index.mpx'),
        ),
      ).toEqual(references)
    } finally {
      project.dispose()
    }
  })
})
