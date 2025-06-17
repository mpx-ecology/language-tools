import { parse } from '@babel/parser'
import * as t from '@babel/types'
import traverse from '@babel/traverse'
import { SFCDescriptor, SFCJsonBlock, SFCScriptBlock } from '@vue/compiler-sfc'
import * as path from 'node:path'
import { URI } from 'vscode-uri'
import {
  reolveAbsolutePath,
  tryResolveByTsConfig,
  tryResolvePackage,
} from './resolve'
import type * as ts from 'typescript'

function extractUsingComponents(
  code: string,
  usingComponents: Record<string, string | string[]>,
) {
  const result = parse(code, { sourceType: 'script' })
  const componentPathFromExpr = (node: t.Expression) => {
    if (t.isIdentifier(node)) {
      return node.name
    }

    if (t.isLiteral(node)) {
      if (t.isStringLiteral(node)) {
        return node.value
      }
    }
  }
  const componentNameFromObjectProp = (node: t.ObjectProperty) => {
    const key = node.key
    if (t.isPrivateName(key)) {
      return key.id.name
    }

    if (t.isExpression(key)) {
      return componentPathFromExpr(key)
    }

    return
  }

  const tryAsComponentDecl = (node: t.ObjectProperty) => {
    const value = node.value

    if (t.isStringLiteral(value)) {
      return value.value
    }
  }

  const tryAsComponent = (node: t.ObjectProperty) => {
    const componentName = componentNameFromObjectProp(node)
    const componentPath = tryAsComponentDecl(node)

    if (!(componentName && componentPath)) {
      return
    }

    return [componentName, componentPath]
  }

  // 不精确的匹配
  traverse(result, {
    ObjectProperty(node) {
      if (node.node.extra?.markSkip) return

      const name = componentNameFromObjectProp(node.node)
      if (node.parentPath) {
        const objectExprParent = node.parentPath.node
        if (t.isObjectExpression(objectExprParent)) {
          const objectPropParent = node.parentPath.parentPath?.node
          if (t.isObjectProperty(objectPropParent)) {
            const parentName = componentNameFromObjectProp(objectPropParent)
            if (parentName === 'componentPlaceholder') {
              return
            }
          }
        }
      }

      if (name === 'componentPlaceholder') {
        const childNode = node.node.value
        if (t.isObjectExpression(node.node.value)) {
          childNode.extra ??= {}
          childNode.extra.markSkip = true
          return
        }
      }
      const component = tryAsComponent(node.node)

      if (component) {
        const [name, compPath] = component
        if (!usingComponents[name]) usingComponents[name] = []
        if (!Array.isArray(usingComponents[name]))
          usingComponents[name] = [usingComponents[name]]
        usingComponents[name].push(compPath)
      }
    },
  })
}

export interface ProcessJsonBlockOptions {
  uri?: string
  compilerConfig?: ts.CompilerOptions
}

export function processJsonBlock(
  scriptBlock: SFCScriptBlock,
  descriptor: SFCDescriptor,
  options: ProcessJsonBlockOptions = {},
) {
  const { uri, compilerConfig } = options
  const jsonBlock = scriptBlock as unknown as SFCJsonBlock

  const usingComponents: Record<string, string | string[]> = {}
  let isMatched = false
  // static json
  if (scriptBlock.attrs.type === 'application/json') {
    jsonBlock.jsonType = 'application/json'

    try {
      const mpxConfigDeclaretion = JSON.parse(jsonBlock.content)
      Object.assign(
        usingComponents,
        mpxConfigDeclaretion?.usingComponents ?? {},
      )
    } catch (error) {
      console.log('JSON parse error:', error)
    }

    isMatched = true
  } else if (scriptBlock.attrs.name === 'json') {
    // dynamic json
    jsonBlock.jsonType = 'application/script'
    extractUsingComponents(jsonBlock.content, usingComponents)
    isMatched = true
  }

  descriptor.json = jsonBlock

  jsonBlock.usingComponents = uri
    ? new Promise(resolve => {
        const jsonMapping: Map<
          string,
          { configPath: string; absolutePath: string; relativePath: string }[]
        > = new Map()

        Promise.allSettled(
          Object.entries(usingComponents).flatMap(([key, val]) =>
            (Array.isArray(val) ? val : [val]).map(async componentPath => {
              try {
                const { absolutePath = '', relativePath = '' } =
                  await formatUsingComponentsPath(
                    componentPath,
                    uri,
                    compilerConfig ?? {},
                  )
                if (absolutePath || relativePath) {
                  if (!jsonMapping.has(key)) jsonMapping.set(key, [])
                  jsonMapping.get(key)?.push({
                    configPath: componentPath,
                    absolutePath,
                    relativePath,
                  })
                }
              } catch (error) {
                console.log(
                  `[debug warning] ${uri} resolve "${componentPath}" failed`,
                  error,
                )
              }
            }),
          ),
        ).finally(() => {
          resolve(jsonMapping)
        })
      })
    : undefined

  return isMatched
}

export const uriToFileName = (uri: string) =>
  URI.parse(uri).fsPath.replace(/\\/g, '/')
export async function findResult<T, R>(
  arr: T[],
  callback: (item: T) => Promise<R>,
): Promise<R | undefined> {
  for (const item of arr) {
    const result = await callback(item)
    if (result) return result
  }
}
export async function formatUsingComponentsPath(
  componentPath: string = '',
  uri: string,
  compilerConfig: ts.CompilerOptions,
): Promise<{ absolutePath?: string; relativePath?: string }> {
  if (!componentPath) return {}

  const queryIndex = componentPath.indexOf('?')
  if (queryIndex !== -1) {
    componentPath = componentPath.substring(0, queryIndex)
  }

  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    componentPath = path.join(uriToFileName(uri), '..', componentPath)
  } else {
    const resolvedPath = await findResult(
      [
        () => tryResolveByTsConfig(componentPath, compilerConfig),
        () => tryResolvePackage(componentPath),
      ],
      fn => fn(),
    )

    if (resolvedPath)
      return {
        absolutePath: resolvedPath,
      }

    return { relativePath: componentPath }
  }

  // absolute path
  const absolutePath = reolveAbsolutePath(componentPath)
  if (absolutePath) {
    return { absolutePath }
  }

  return { relativePath: componentPath }
}
