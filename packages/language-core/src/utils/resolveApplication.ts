import type * as ts from 'typescript'
import type { Sfc } from '../types'
import * as path from 'path-browserify'
import type { createUsingComponentsPathResolver } from './formatUsingComponentsPath'

const packagePaths = new WeakMap<ts.SourceFile, string[]>()

/** Look only along the ancestor chain, never enumerate workspace components. */
export function resolveApplication(
  ts: typeof import('typescript'),
  fileName: string,
  projectRoot: string | undefined,
  getSfc: (fileName: string) => Sfc | undefined,
  resolve: ReturnType<typeof createUsingComponentsPathResolver>,
): Sfc['application'] {
  const candidates: { fileName: string; sfc?: Sfc }[] = []
  let directory = path.dirname(fileName)
  for (;;) {
    const appFile = path.join(directory, 'app.mpx')
    if (appFile === fileName) {
      // An app must not inherit a different application's registration table.
      candidates.push({ fileName })
    } else {
      const sfc = getSfc(appFile)
      if (sfc) candidates.push({ fileName: appFile, sfc })
    }
    const parent = path.dirname(directory)
    if (parent === directory || directory === projectRoot) break
    directory = parent
  }
  if (!candidates.length) return

  // A package may expose its development app.mpx as a packages entry. Mpx
  // consumes only pages/packages there; its usingComponents is not global.
  let application = candidates[0]
  for (const candidate of candidates.slice(1)) {
    if (
      candidate.sfc &&
      referencesPackage(
        candidate.fileName,
        candidate.sfc,
        application.fileName,
        new Set(),
      )
    ) {
      application = candidate
    }
  }
  if (application.fileName === fileName || !application.sfc?.json) return
  return { fileName: application.fileName, json: application.sfc.json }

  function referencesPackage(
    importer: string,
    sfc: Sfc,
    target: string,
    visited: Set<string>,
  ): boolean {
    if (visited.has(importer)) return false
    visited.add(importer)
    const json = sfc.json
    if (!json) return false
    let paths = packagePaths.get(json.ast)
    if (!paths) {
      paths = []
      const visit = (node: ts.Node) => {
        if (
          ts.isPropertyAssignment(node) &&
          (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
          node.name.text === 'packages' &&
          ts.isArrayLiteralExpression(node.initializer)
        ) {
          for (const entry of node.initializer.elements) {
            if (ts.isStringLiteralLike(entry)) paths!.push(entry.text)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(json.ast)
      packagePaths.set(json.ast, paths)
    }
    return paths.some(entry => {
      const resolved = resolve(entry, importer)?.result
      if (!resolved) return false
      if (resolved === target) return true
      const child = getSfc(resolved)
      return !!child && referencesPackage(resolved, child, target, visited)
    })
  }
}
