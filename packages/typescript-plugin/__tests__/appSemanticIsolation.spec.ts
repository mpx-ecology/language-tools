import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  MpxVirtualCode,
  createMpxLanguagePlugin,
  createParsedCommandLine,
} from '@mpxjs/language-core'
import { createTestLanguageService } from '../../language-core/__tests__/utils/createTestLanguageService'
import pluginFactory from '../src/index'

const fixturesRoot = path.resolve(
  __dirname,
  '../../language-core/__tests__/fixtures/registered-components',
)
const noop = () => {}
const nullLogger: ts.server.Logger = {
  close: noop,
  hasLevel: () => false,
  loggingEnabled: () => false,
  perftrc: noop,
  info: noop,
  startGroup: noop,
  endGroup: noop,
  msg: noop,
  getLogFileName: () => undefined,
}

function createTsServerSession(files: Record<string, string>) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'mpx-tsserver-isolation-')),
  )
  const filePath = (relative: string) =>
    path.join(root, relative).replace(/\\/g, '/')
  for (const [relative, content] of Object.entries(files)) {
    const target = filePath(relative)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.writeFileSync(target, content)
  }
  const serverHost: ts.server.ServerHost = {
    ...ts.sys,
    args: [],
    newLine: '\n',
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    write: noop,
    writeOutputIsTTY: () => false,
    setTimeout,
    clearTimeout,
    setImmediate,
    clearImmediate,
    watchFile: () => ({ close: noop }),
    watchDirectory: () => ({ close: noop }),
    require: (_initialPath, moduleName) =>
      moduleName === 'mpx-typescript-plugin-pack'
        ? { module: pluginFactory, error: undefined }
        : {
            module: undefined,
            error: new Error(`Unexpected plugin request: ${moduleName}`),
          },
  }
  const session = new ts.server.Session({
    host: serverHost,
    cancellationToken: ts.server.nullCancellationToken,
    useSingleInferredProject: false,
    useInferredProjectPerProjectRoot: false,
    typingsInstaller: ts.server.nullTypingsInstaller,
    byteLength: Buffer.byteLength,
    hrtime: (): [number, number] => [0, 0],
    logger: nullLogger,
    canUseEvents: false,
    globalPlugins: ['mpx-typescript-plugin-pack'],
    pluginProbeLocations: [root],
    allowLocalPluginLoads: true,
  })
  let seq = 0
  const send = <R = unknown>(command: string, args: unknown): R => {
    const res = session.executeCommand({
      seq: ++seq,
      type: 'request',
      command,
      arguments: args,
    })
    return res.response as R
  }
  const lineCol = (content: string, needle: string, offset = 1) => {
    const index = content.indexOf(needle)
    if (index < 0) throw new Error(`Missing needle: ${needle}`)
    const prefix = content.slice(0, index + offset)
    const lines = prefix.split('\n')
    return {
      line: lines.length,
      offset: lines[lines.length - 1].length + 1,
    }
  }
  const open = (relative: string) =>
    send('open', {
      file: filePath(relative),
      fileContent: fs.readFileSync(filePath(relative), 'utf8'),
      projectRootPath: root,
    })
  const change = (relative: string, current: string, next: string) => {
    const endLines = current.split('\n')
    send('change', {
      file: filePath(relative),
      line: 1,
      offset: 1,
      endLine: endLines.length,
      endOffset: endLines[endLines.length - 1].length + 1,
      insertString: next,
    })
  }
  const getProject = (relative: string) =>
    (
      session as unknown as {
        projectService: ts.server.ProjectService
      }
    ).projectService.getDefaultProjectForFile(
      filePath(relative) as ts.server.NormalizedPath,
      true,
    )!
  return {
    root,
    filePath,
    send,
    lineCol,
    open,
    change,
    getProject,
    dispose() {
      session.executeCommand({
        seq: ++seq,
        type: 'request',
        command: 'exit',
      })
      fs.rmSync(root, { recursive: true, force: true })
    },
  }
}

const tsconfigContent = JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    module: 'Node16',
    moduleResolution: 'Node16',
    strict: true,
    allowJs: true,
    checkJs: true,
    noEmit: true,
  },
  files: [
    'pages/index.mpx',
    'pages/result.mpx',
    'panel.mpx',
    'local.mpx',
    'app.mpx',
  ],
})

const panelSource = `<template><view>{{ title }}</view></template>
<script setup lang="ts">
defineProps<{ title: string }>()
defineExpose({})
</script>
<script type="application/json">{"component":true}</script>`

const localSource = `<template><view>{{ count }}</view></template>
<script setup lang="ts">
defineProps<{ count: number }>()
defineExpose({})
</script>
<script type="application/json">{"component":true}</script>`

const indexPageSource = `<template>
  <app-panel title="{{ 123 }}" />
</template>
<script setup lang="ts">
const statusLabel = 'ready'
const detailInfo = 'ok'
defineExpose({ statusLabel, detailInfo })
</script>
<script type="application/json">{}</script>`

const resultPageSource = `<template>
  <view>{{ isDone }}</view>
</template>
<script setup lang="ts">
const isDone = true
defineExpose({ isDone })
</script>
<script type="application/json">{}</script>`

describe('app.mpx semantic isolation and first-request sync', () => {
  it('does not leak descendant page semantic tokens or diagnostics onto pure JSON app.mpx', () => {
    const appSource = `<script name="json">
  module.exports = {
    pages: [
      './pages/index',
      './pages/result'
    ],
    usingComponents: {
      'app-panel': './panel.mpx'
    }
  }
</script>`
    const env = createTsServerSession({
      'tsconfig.json': tsconfigContent,
      'app.mpx': appSource,
      'panel.mpx': panelSource,
      'local.mpx': localSource,
      'pages/index.mpx': indexPageSource,
      'pages/result.mpx': resultPageSource,
    })
    try {
      env.open('pages/index.mpx')
      env.open('pages/result.mpx')
      env.open('app.mpx')

      // Confirm child page has TS property tokens + TS2322 on invalid prop.
      const pageDiags = env.send<ts.server.protocol.Diagnostic[]>(
        'semanticDiagnosticsSync',
        { file: env.filePath('pages/index.mpx') },
      )
      expect(pageDiags.some(d => d.code === 2322)).toBe(true)

      const appTokens = env.send<{ spans: number[] }>(
        'encodedSemanticClassifications-full',
        {
          file: env.filePath('app.mpx'),
          start: 0,
          length: appSource.length,
          format: '2020',
        },
      )
      expect(appTokens.spans).toEqual([])
      const appDiags = env.send<ts.server.protocol.Diagnostic[]>(
        'semanticDiagnosticsSync',
        { file: env.filePath('app.mpx') },
      )
      expect(appDiags).toEqual([])
      const hoverPos = env.lineCol(appSource, './pages/index')
      const appHover = env.send<
        ts.server.protocol.QuickInfoResponseBody | undefined
      >('quickinfo', { file: env.filePath('app.mpx'), ...hoverPos })
      expect(appHover).toBeUndefined()
    } finally {
      env.dispose()
    }
  })

  it('keeps targetIds empty on app.mpx in serviceScriptOnly language service', () => {
    const service = createTestLanguageService(
      fixturesRoot,
      [path.join(fixturesRoot, 'globals.d.ts')],
      new Map(),
      { serviceScriptOnly: true },
    )
    try {
      const pageFile = service.file('app-a/pages/index.mpx')
      const appFile = service.file('app-a/app.mpx')
      // Trigger page virtual code generation before inspecting app.mpx.
      service.proxyLanguageService.getSemanticDiagnostics(pageFile)
      const appSource = service.language.scripts.get(appFile)!
      expect(appSource.targetIds.size).toBe(0)
      const tokens =
        service.proxyLanguageService.getEncodedSemanticClassifications(
          appFile,
          { start: 0, length: service.read('app-a/app.mpx').length },
          ts.SemanticClassificationFormat.TwentyTwenty,
        )
      expect(tokens.spans).toEqual([])
    } finally {
      service.dispose()
    }
  })

  it('preserves business script semantics and diagnostics on app.mpx when child pages are active', () => {
    const appWithScript = `<script lang="ts">
const appReady = { label: 'ready' }
const badCount: string = 123
console.log(appReady.label, badCount)
</script>
<script name="json">
  module.exports = {
    pages: ['./pages/index'],
    usingComponents: {
      'app-panel': './panel.mpx'
    }
  }
</script>`
    const env = createTsServerSession({
      'tsconfig.json': tsconfigContent,
      'app.mpx': appWithScript,
      'panel.mpx': panelSource,
      'local.mpx': localSource,
      'pages/index.mpx': indexPageSource,
      'pages/result.mpx': resultPageSource,
    })
    try {
      env.open('pages/index.mpx')
      env.open('app.mpx')

      const labelPos = env.lineCol(
        appWithScript,
        'appReady.label',
        'appReady.'.length + 1,
      )
      const hover = env.send<ts.server.protocol.QuickInfoResponseBody>(
        'quickinfo',
        { file: env.filePath('app.mpx'), ...labelPos },
      )
      expect(hover.displayString).toContain('(property) label: string')

      const def = env.send<ts.server.protocol.DefinitionInfoAndBoundSpan>(
        'definitionAndBoundSpan',
        { file: env.filePath('app.mpx'), ...labelPos },
      )
      expect(
        def.definitions.some(
          d => d.file === env.filePath('app.mpx') && d.start.line === 2,
        ),
      ).toBe(true)

      const diags = env.send<ts.server.protocol.Diagnostic[]>(
        'semanticDiagnosticsSync',
        { file: env.filePath('app.mpx') },
      )
      expect(diags.some(d => d.code === 2322)).toBe(true)

      const tokens = env.send<{ spans: number[] }>(
        'encodedSemanticClassifications-full',
        {
          file: env.filePath('app.mpx'),
          start: 0,
          length: appWithScript.length,
          format: '2020',
        },
      )
      expect(tokens.spans.length).toBeGreaterThan(0)
    } finally {
      env.dispose()
    }
  })

  it('refreshes child pages on the very first tsserver request across JSON edit, clear, restore, and ignores non-JSON edits', () => {
    const appInitial = `<script name="json">
  module.exports = {
    pages: ['./pages/index'],
    usingComponents: {
      'app-panel': './panel.mpx'
    }
  }
</script>
<style>.app { color: red; }</style>`
    const env = createTsServerSession({
      'tsconfig.json': tsconfigContent,
      'app.mpx': appInitial,
      'panel.mpx': panelSource,
      'local.mpx': localSource,
      'pages/index.mpx': indexPageSource,
      'pages/result.mpx': resultPageSource,
    })
    try {
      // Child page is listed before app.mpx and opened first.
      env.open('pages/index.mpx')
      env.open('app.mpx')
      const pageFile = env.filePath('pages/index.mpx')
      const titlePos = env.lineCol(indexPageSource, 'title=', 1)

      expect(
        env.send<ts.server.protocol.QuickInfoResponseBody>('quickinfo', {
          file: pageFile,
          ...titlePos,
        })?.displayString,
      ).toContain('title: string')

      // 1. Retarget component to ./local.mpx (title is no longer a valid prop; count: number replaces it).
      const appRetargeted = appInitial.replace('./panel.mpx', './local.mpx')
      env.change('app.mpx', appInitial, appRetargeted)
      const firstPropsAfterRetarget = env.send<
        { name: string; type: string }[]
      >('_mpx:getComponentProps', [pageFile, 'app-panel'])
      expect(firstPropsAfterRetarget.map(p => p.name)).toEqual(['count'])

      // 2. Rename global component key and verify first request sees it immediately.
      const appRenamed = appRetargeted.replace("'app-panel'", "'renamed-panel'")
      env.change('app.mpx', appRetargeted, appRenamed)
      const firstNamesAfterRename = env.send<string[]>(
        '_mpx:getComponentNames',
        [pageFile],
      )
      expect(firstNamesAfterRename).toContain('renamed-panel')
      expect(firstNamesAfterRename).not.toContain('app-panel')

      env.change('app.mpx', appRenamed, appInitial)
      expect(
        env
          .send<ts.server.protocol.Diagnostic[]>('semanticDiagnosticsSync', {
            file: pageFile,
          })
          .some(d => d.code === 2322),
      ).toBe(true)

      // 3. Clear JSON block completely -> first request drops global registration.
      const appCleared = `<style>.app { color: red; }</style>`
      env.change('app.mpx', appInitial, appCleared)
      const firstDiagsAfterClear = env.send<ts.server.protocol.Diagnostic[]>(
        'semanticDiagnosticsSync',
        { file: pageFile },
      )
      expect(firstDiagsAfterClear.some(d => d.code === 2322)).toBe(false)

      // 4. Restore JSON block with ./panel.mpx -> first request restores TS2322 and completion!
      env.change('app.mpx', appCleared, appInitial)
      const firstHoverAfterRestore =
        env.send<ts.server.protocol.QuickInfoResponseBody>('quickinfo', {
          file: pageFile,
          ...titlePos,
        })
      expect(firstHoverAfterRestore.displayString).toContain('title: string')
      // Switch to ./local.mpx and send `completionInfo` inside template interpolation as first request, plus component props.
      const propsPage = `<template>
  <app-panel title="{{ statusLabel }}" />
</template>
<script setup lang="ts">
const statusLabel = 'ready'
defineExpose({ statusLabel })
</script>
<script type="application/json">{}</script>`
      env.change('pages/index.mpx', indexPageSource, propsPage)
      expect(
        env
          .send<
            { name: string }[]
          >('_mpx:getComponentProps', [pageFile, 'app-panel'])
          .map(p => p.name),
      ).toEqual(['title'])

      env.change('app.mpx', appInitial, appRetargeted)
      const firstProps = env.send<{ name: string }[]>(
        '_mpx:getComponentProps',
        [pageFile, 'app-panel'],
      )
      expect(firstProps.map(p => p.name)).toEqual(['count'])
      const firstCompletion = env.send<ts.server.protocol.CompletionInfo>(
        'completionInfo',
        { file: pageFile, ...env.lineCol(propsPage, 'statusLabel }}', 3) },
      )
      expect(firstCompletion.entries.some(e => e.name === 'statusLabel')).toBe(
        true,
      )

      env.change('pages/index.mpx', propsPage, indexPageSource)
      env.change('app.mpx', appRetargeted, appInitial)
      expect(
        env
          .send<ts.server.protocol.Diagnostic[]>('semanticDiagnosticsSync', {
            file: pageFile,
          })
          .some(d => d.code === 2322),
      ).toBe(true)

      // 5. Edit only <style> (JSON unchanged) -> does not trigger extra updateGraph pass.
      const project = env.getProject('app.mpx')
      let updateCount = 0
      const origUpdateGraph = project.updateGraph.bind(project)
      project.updateGraph = () => {
        updateCount++
        return origUpdateGraph()
      }
      const appStyleEdited = appInitial.replace('color: red', 'color: blue')
      env.change('app.mpx', appInitial, appStyleEdited)
      const diagsAfterStyleEdit = env.send<ts.server.protocol.Diagnostic[]>(
        'semanticDiagnosticsSync',
        { file: pageFile },
      )
      expect(diagsAfterStyleEdit.some(d => d.code === 2322)).toBe(true)
      expect(updateCount).toBe(1)
    } finally {
      env.dispose()
    }
  })

  it('keeps dependency tracking isolated per project when sharing fileRegistry', () => {
    const options = createParsedCommandLine(
      ts,
      ts.sys,
      path.join(fixturesRoot, 'tsconfig.json'),
      true,
    )
    options.mpxOptions.__setupedGlobalTypes = {
      absolutePath: path.join(fixturesRoot, 'globals.d.ts'),
    }
    const pluginA = createMpxLanguagePlugin(
      ts,
      options.options,
      options.mpxOptions,
      (name: string) => name,
      undefined,
      false,
    )
    const pluginB = createMpxLanguagePlugin(
      ts,
      options.options,
      options.mpxOptions,
      (name: string) => name,
      undefined,
      false,
    )
    const rootsA = new Map<string, MpxVirtualCode>()
    const rootsB = new Map<string, MpxVirtualCode>()
    const makeCtx = (roots: Map<string, MpxVirtualCode>) =>
      ({
        getAssociatedScript: (name: string) => {
          const code = roots.get(name)
          return code && { generated: { root: code } }
        },
      }) as Parameters<NonNullable<typeof pluginA.createVirtualCode>>[3]
    const appFile = '/shared-registry-isolation/app.mpx'
    const pageFile = '/shared-registry-isolation/pages/index.mpx'
    const appSource = `<script type="application/json">{"usingComponents":{"app-panel":"./panel.mpx"}}</script>`
    const appEdited = `<script type="application/json">{"usingComponents":{"other-panel":"./local.mpx"}}</script>`
    const pageSnapshot = ts.ScriptSnapshot.fromString(
      '<template><view /></template>',
    )
    try {
      const appCodeA = pluginA.createVirtualCode!(
        appFile,
        'mpx',
        ts.ScriptSnapshot.fromString(appSource),
        makeCtx(rootsA),
      )!
      rootsA.set(appFile, appCodeA)
      const pageCodeA = pluginA.createVirtualCode!(
        pageFile,
        'mpx',
        pageSnapshot,
        makeCtx(rootsA),
      )!
      rootsA.set(pageFile, pageCodeA)

      const appCodeB = pluginB.createVirtualCode!(
        appFile,
        'mpx',
        ts.ScriptSnapshot.fromString(appSource),
        makeCtx(rootsB),
      )!
      rootsB.set(appFile, appCodeB)
      const pageCodeB = pluginB.createVirtualCode!(
        pageFile,
        'mpx',
        pageSnapshot,
        makeCtx(rootsB),
      )!
      rootsB.set(pageFile, pageCodeB)

      expect(pluginA.isApplicationDirty(pageFile)).toBe(false)
      expect(pluginB.isApplicationDirty(pageFile)).toBe(false)

      // Update app in project B only.
      pluginB.updateVirtualCode!(
        appFile,
        appCodeB,
        ts.ScriptSnapshot.fromString(appEdited),
        makeCtx(rootsB),
      )
      expect(pluginB.isApplicationDirty(pageFile)).toBe(true)
      expect(pluginA.isApplicationDirty(pageFile)).toBe(false)

      // Delete app in project B only: project B consumer dirties again; project A remains untouched.
      pluginB.disposeVirtualCode!(appFile, appCodeB)
      expect(pluginB.isApplicationDirty(pageFile)).toBe(true)
      expect(pluginA.isApplicationDirty(pageFile)).toBe(false)
    } finally {
      pluginA.dispose()
      pluginB.dispose()
    }
  })
})
