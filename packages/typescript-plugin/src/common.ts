import type * as ts from 'typescript'
import type { RequestContext } from './requests/types'

import {
  Language,
  MpxCompilerOptions,
  MpxVirtualCode,
  forEachElementNode,
  hyphenateTag,
} from '@mpxjs/language-core'
import { camelize, capitalize } from '@mpxjs/language-shared'
import { _getComponentNames } from './requests/getComponentNames'
import { _getElementNames } from './requests/getElementNames'

const windowsPathReg = /\\/g

export function proxyLanguageServiceForMpx<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  languageService: ts.LanguageService,
  mpxOptions: MpxCompilerOptions,
  asScriptId: (fileName: string) => T,
) {
  const proxyCache = new Map<
    string | symbol,
    ((...args: any[]) => any) | undefined
  >()
  const getProxyMethod = (
    target: ts.LanguageService,
    p: string | symbol,
  ): ((...args: any[]) => any) | undefined => {
    switch (p) {
      case 'getCompletionsAtPosition':
        return getCompletionsAtPosition(mpxOptions, target[p])
      case 'getCompletionEntryDetails':
        return getCompletionEntryDetails(language, asScriptId, target[p])
      case 'getCodeFixesAtPosition':
        return getCodeFixesAtPosition(target[p])
      case 'getDefinitionAndBoundSpan':
        return getDefinitionAndBoundSpan(
          ts,
          language,
          languageService,
          mpxOptions,
          asScriptId,
          target[p],
        )
      case 'getQuickInfoAtPosition':
        return getQuickInfoAtPosition(ts, target, target[p])
      // TS plugin only
      case 'getEncodedSemanticClassifications':
        return getEncodedSemanticClassifications(
          ts,
          language,
          target,
          asScriptId,
          target[p],
        )
    }
  }

  return new Proxy(languageService, {
    get(target, p, receiver) {
      if (getProxyMethod) {
        if (!proxyCache.has(p)) {
          proxyCache.set(p, getProxyMethod(target, p))
        }
        const proxyMethod = proxyCache.get(p)
        if (proxyMethod) {
          return proxyMethod
        }
      }
      return Reflect.get(target, p, receiver)
    },
    set(target, p, value, receiver) {
      return Reflect.set(target, p, value, receiver)
    },
  })
}

function getCompletionsAtPosition(
  mpxOptions: MpxCompilerOptions,
  getCompletionsAtPosition: ts.LanguageService['getCompletionsAtPosition'],
): ts.LanguageService['getCompletionsAtPosition'] {
  return (filePath, position, options, formattingSettings) => {
    const fileName = filePath.replace(windowsPathReg, '/')
    const result = getCompletionsAtPosition(
      fileName,
      position,
      options,
      formattingSettings,
    )
    if (result) {
      // filter __VLS_
      result.entries = result.entries.filter(
        entry =>
          !entry.name.includes('__VLS_') &&
          !entry.labelDetails?.description?.includes('__VLS_'),
      )
      // modify label
      for (const item of result.entries) {
        if (item.source) {
          const originalName = item.name
          for (const mpxExt of mpxOptions.extensions) {
            const suffix = capitalize(mpxExt.slice(1)) // .mpx -> Mpx
            if (item.source.endsWith(mpxExt) && item.name.endsWith(suffix)) {
              item.name = capitalize(item.name.slice(0, -suffix.length))
              if (item.insertText) {
                item.insertText = item.insertText.replace(`${suffix}$1`, '$1')
              }
              if (item.data) {
                // @ts-expect-error ignore
                item.data.__isComponentAutoImport = {
                  ext: mpxExt,
                  suffix,
                  originalName,
                  newName: item.insertText,
                }
              }
              break
            }
          }
          if (item.data) {
            // @ts-expect-error ignore
            item.data.__isAutoImport = {
              fileName,
            }
          }
        }
      }
    }
    return result
  }
}

function getCompletionEntryDetails<T>(
  language: Language<T>,
  asScriptId: (fileName: string) => T,
  getCompletionEntryDetails: ts.LanguageService['getCompletionEntryDetails'],
): ts.LanguageService['getCompletionEntryDetails'] {
  return (...args) => {
    const details = getCompletionEntryDetails(...args)
    // modify import statement
    // @ts-expect-error ignore
    if (args[6]?.__isComponentAutoImport) {
      const { originalName, newName } =
        // @ts-expect-error ignore
        args[6]?.__isComponentAutoImport || {}
      for (const codeAction of details?.codeActions ?? []) {
        for (const change of codeAction.changes) {
          for (const textChange of change.textChanges) {
            textChange.newText = textChange.newText.replace(
              'import ' + originalName + ' from ',
              'import ' + newName + ' from ',
            )
          }
        }
      }
    }
    // @ts-expect-error ignore
    if (args[6]?.__isAutoImport) {
      // @ts-expect-error ignore
      const { fileName } = args[6]?.__isAutoImport || {}
      const sourceScript = language.scripts.get(asScriptId(fileName))
      if (sourceScript?.generated?.root instanceof MpxVirtualCode) {
        const sfc = sourceScript.generated.root.mpxSfc
        if (!sfc?.descriptor.script && !sfc?.descriptor.scriptSetup) {
          for (const codeAction of details?.codeActions ?? []) {
            for (const change of codeAction.changes) {
              for (const textChange of change.textChanges) {
                textChange.newText = `<script setup lang="ts">${textChange.newText}</script>\n\n`
                break
              }
              break
            }
            break
          }
        }
      }
    }
    return details
  }
}

function getCodeFixesAtPosition(
  getCodeFixesAtPosition: ts.LanguageService['getCodeFixesAtPosition'],
): ts.LanguageService['getCodeFixesAtPosition'] {
  return (...args) => {
    let result = getCodeFixesAtPosition(...args)
    // filter __VLS_
    result = result.filter(entry => !entry.description.includes('__VLS_'))
    return result
  }
}

function getDefinitionAndBoundSpan<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  languageService: ts.LanguageService,
  mpxOptions: MpxCompilerOptions,
  asScriptId: (fileName: string) => T,
  getDefinitionAndBoundSpan: ts.LanguageService['getDefinitionAndBoundSpan'],
): ts.LanguageService['getDefinitionAndBoundSpan'] {
  return (fileName, position) => {
    console.log('[Mpx Go to Definition] getDefinitionAndBoundSpan called:', {
      fileName,
      position,
    })

    const result = getDefinitionAndBoundSpan(fileName, position)
    if (!result?.definitions?.length) {
      console.log('[Mpx Go to Definition] No definitions found')
      return result
    }

    const program = languageService.getProgram()!
    const sourceScript = language.scripts.get(asScriptId(fileName))
    if (!sourceScript?.generated) {
      return result
    }

    const root = sourceScript.generated.root
    if (!(root instanceof MpxVirtualCode)) {
      return result
    }

    if (
      !root.sfc.template ||
      position < root.sfc.template.startTagEnd ||
      position > root.sfc.template.endTagStart
    ) {
      return result
    }

    const definitions = new Set<ts.DefinitionInfo>(result.definitions)
    const skippedDefinitions: ts.DefinitionInfo[] = []

    if (result.definitions.length >= 2) {
      for (const definition of result.definitions) {
        if (
          root.sfc.content[definition.textSpan.start - 1] === '@' ||
          root.sfc.content.slice(
            definition.textSpan.start - 5,
            definition.textSpan.start,
          ) === 'v-on:'
        ) {
          skippedDefinitions.push(definition)
        }
      }
    }

    // 从模板位置提取属性名和组件标签名
    const templateContent = root.sfc.template.content
    const templateOffset = position - root.sfc.template.startTagEnd
    const attrInfo = extractAttributeNameAtPosition(
      templateContent,
      templateOffset,
    )
    const tagInfo = extractTagNameAtPosition(templateContent, templateOffset)

    console.log('[Mpx Go to Definition] Template position info:', {
      position,
      templateOffset,
      attrInfo,
      tagInfo,
    })

    // 如果在组件属性上（非事件绑定），尝试跳转到子组件的属性定义
    if (attrInfo && tagInfo && !attrInfo.isEvent) {
      // 从 usingComponents 中查找子组件路径
      const componentPath = findComponentPath(
        root.sfc,
        tagInfo.tagName,
        fileName,
      )
      console.log('[Mpx Go to Definition] Component path:', componentPath)

      if (componentPath) {
        const propDefinition = tryFindComponentPropDefinitionByPath(
          ts,
          language,
          asScriptId,
          componentPath,
          attrInfo.attrName,
        )
        if (propDefinition) {
          console.log(
            '[Mpx Go to Definition] Found prop definition in child component:',
            JSON.stringify(propDefinition),
          )
          definitions.add(propDefinition)
          // 跳过原始定义
          for (const def of result.definitions) {
            skippedDefinitions.push(def)
          }
        }
      }
    }

    for (const definition of result.definitions) {
      const isMpxFile = mpxOptions.extensions.some(ext =>
        definition.fileName.endsWith(ext),
      )

      console.log(
        '[Mpx Go to Definition] Processing definition:',
        JSON.stringify({
          fileName: definition.fileName,
          textSpan: definition.textSpan,
          isMpxFile,
          definitionName: definition.name,
          definitionKind: definition.kind,
          containerName: definition.containerName,
          extensions: mpxOptions.extensions,
        }),
      )

      // 跳过已经处理过的组件属性定义
      if (isMpxFile && attrInfo && tagInfo && !attrInfo.isEvent) {
        continue
      }

      const sourceFile = program.getSourceFile(definition.fileName)
      if (!sourceFile) {
        continue
      }

      visit(sourceFile, definition, sourceFile)
    }

    for (const definition of skippedDefinitions) {
      definitions.delete(definition)
    }

    return {
      definitions: [...definitions],
      textSpan: result.textSpan,
    }

    function visit(
      node: ts.Node,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      if (ts.isPropertySignature(node) && node.type) {
        proxy(node.name, node.type, definition, sourceFile)
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.type &&
        !node.initializer
      ) {
        proxy(node.name, node.type, definition, sourceFile)
      } else {
        ts.forEachChild(node, child => visit(child, definition, sourceFile))
      }
    }

    function proxy(
      name: ts.PropertyName,
      type: ts.TypeNode,
      definition: ts.DefinitionInfo,
      sourceFile: ts.SourceFile,
    ) {
      const { textSpan, fileName } = definition
      const start = name.getStart(sourceFile)
      const end = name.getEnd()

      if (start !== textSpan.start || end - start !== textSpan.length) {
        return
      }

      if (!ts.isIndexedAccessTypeNode(type)) {
        return
      }

      const pos = type.indexType.getStart(sourceFile)
      const res = getDefinitionAndBoundSpan(fileName, pos)
      if (res?.definitions?.length) {
        for (const definition of res.definitions) {
          definitions.add(definition)
        }
        skippedDefinitions.push(definition)
      }
    }
  }
}

/**
 * 从模板内容中提取当前位置的属性名
 * 支持: title="xxx", show-header="{{ xxx }}", bindtap="handler"
 */
function extractAttributeNameAtPosition(
  templateContent: string,
  offset: number,
): { attrName: string; isEvent: boolean } | undefined {
  // 向前查找属性名的开始位置
  let start = offset
  while (start > 0) {
    const char = templateContent[start - 1]
    // 属性名可以包含字母、数字、连字符、冒号
    if (/[a-zA-Z0-9\-:]/.test(char)) {
      start--
    } else {
      break
    }
  }

  // 向后查找属性名的结束位置
  let end = offset
  while (end < templateContent.length) {
    const char = templateContent[end]
    if (/[a-zA-Z0-9\-:]/.test(char)) {
      end++
    } else {
      break
    }
  }

  if (start === end) {
    return undefined
  }

  const attrName = templateContent.slice(start, end)

  // 检查是否是事件绑定
  const isEvent = /^(bind|catch|capture-bind|capture-catch|mut-bind):?/.test(
    attrName,
  )

  console.log('[Mpx Go to Definition] Extracted attribute:', {
    attrName,
    isEvent,
    start,
    end,
  })

  return { attrName, isEvent }
}

/**
 * 从模板内容中提取当前位置所在的组件标签名
 */
function extractTagNameAtPosition(
  templateContent: string,
  offset: number,
): { tagName: string } | undefined {
  // 向前查找最近的 < 符号
  let tagStart = offset
  while (tagStart > 0) {
    if (templateContent[tagStart] === '<') {
      break
    }
    // 如果遇到 > 说明不在标签内
    if (templateContent[tagStart] === '>') {
      return undefined
    }
    tagStart--
  }

  if (tagStart === 0 && templateContent[0] !== '<') {
    return undefined
  }

  // 跳过 < 和可能的 /
  let nameStart = tagStart + 1
  if (templateContent[nameStart] === '/') {
    nameStart++
  }

  // 提取标签名
  let nameEnd = nameStart
  while (nameEnd < templateContent.length) {
    const char = templateContent[nameEnd]
    if (/[a-zA-Z0-9\-_]/.test(char)) {
      nameEnd++
    } else {
      break
    }
  }

  if (nameStart === nameEnd) {
    return undefined
  }

  const tagName = templateContent.slice(nameStart, nameEnd)
  return { tagName }
}

/**
 * 从 SFC 的 JSON 配置中查找组件路径
 */
function findComponentPath(
  sfc: any,
  tagName: string,
  currentFileName: string,
): string | undefined {
  // 尝试从 script[type="application/json"] 中获取 usingComponents
  const jsonBlock = sfc.customBlocks?.find(
    (block: any) =>
      block.type === 'script' && block.attrs?.type === 'application/json',
  )

  if (!jsonBlock?.content) {
    // 也尝试从 sfc.json 获取
    if (sfc.json?.content) {
      try {
        const jsonContent = JSON.parse(sfc.json.content)
        const componentPath = jsonContent.usingComponents?.[tagName]
        if (componentPath) {
          return resolveComponentPath(componentPath, currentFileName)
        }
      } catch (e) {
        console.log('[Mpx Go to Definition] Failed to parse json block:', e)
      }
    }
    return undefined
  }

  try {
    const jsonContent = JSON.parse(jsonBlock.content)
    const componentPath = jsonContent.usingComponents?.[tagName]
    if (componentPath) {
      return resolveComponentPath(componentPath, currentFileName)
    }
  } catch (e) {
    console.log('[Mpx Go to Definition] Failed to parse json block:', e)
  }

  return undefined
}

/**
 * 解析组件相对路径为绝对路径
 */
function resolveComponentPath(
  componentPath: string,
  currentFileName: string,
): string {
  // 如果是相对路径，解析为绝对路径
  if (componentPath.startsWith('./') || componentPath.startsWith('../')) {
    const currentDir = currentFileName.substring(
      0,
      currentFileName.lastIndexOf('/'),
    )
    // 简单的路径解析
    const parts = componentPath.split('/')
    const currentParts = currentDir.split('/')

    for (const part of parts) {
      if (part === '.') {
        continue
      } else if (part === '..') {
        currentParts.pop()
      } else {
        currentParts.push(part)
      }
    }

    let resolvedPath = currentParts.join('/')
    // 添加 .mpx 扩展名（如果没有）
    if (!resolvedPath.endsWith('.mpx')) {
      resolvedPath += '.mpx'
    }
    return resolvedPath
  }

  // 如果是绝对路径或包路径，直接返回
  return componentPath
}

/**
 * 通过组件路径查找属性定义
 */
function tryFindComponentPropDefinitionByPath<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  asScriptId: (fileName: string) => T,
  componentPath: string,
  attrName: string,
): ts.DefinitionInfo | undefined {
  console.log(
    '[Mpx Go to Definition] Trying to find prop in component:',
    JSON.stringify({
      componentPath,
      attrName,
    }),
  )

  // 获取目标组件的虚拟代码
  const targetScript = language.scripts.get(asScriptId(componentPath))
  if (!targetScript?.generated?.root) {
    console.log(
      '[Mpx Go to Definition] No target script found for path:',
      componentPath,
    )
    return
  }

  const targetRoot = targetScript.generated.root
  if (!(targetRoot instanceof MpxVirtualCode)) {
    console.log('[Mpx Go to Definition] Target root is not MpxVirtualCode')
    return
  }

  // 获取原始 .mpx 文件的 script 内容
  const sfc = targetRoot.sfc
  const scriptBlock = sfc.script || sfc.scriptSetup
  if (!scriptBlock) {
    console.log(
      '[Mpx Go to Definition] No script block found in target component',
    )
    return
  }

  console.log(
    '[Mpx Go to Definition] Target script block info:',
    JSON.stringify({
      lang: scriptBlock.lang,
      startTagEnd: scriptBlock.startTagEnd,
      endTagStart: scriptBlock.endTagStart,
      contentLength: scriptBlock.content.length,
    }),
  )

  // 在原始脚本内容中查找 properties 定义
  const propDefinitionOffset = findPropertyDefinitionInScript(
    ts,
    scriptBlock.ast,
    attrName,
  )
  if (propDefinitionOffset === undefined) {
    console.log(
      '[Mpx Go to Definition] No prop definition found in target script',
    )
    return
  }

  // 计算在原始 .mpx 文件中的位置
  const absoluteOffset = scriptBlock.startTagEnd + propDefinitionOffset.start

  console.log(
    '[Mpx Go to Definition] Found prop definition:',
    JSON.stringify({
      relativeOffset: propDefinitionOffset,
      absoluteOffset,
    }),
  )

  return {
    fileName: componentPath,
    textSpan: {
      start: absoluteOffset,
      length: propDefinitionOffset.length,
    },
    kind: ts.ScriptElementKind.memberVariableElement,
    name: attrName,
    containerName: 'properties',
    containerKind: ts.ScriptElementKind.classElement,
  }
}

/**
 * 在脚本 AST 中查找 properties 定义
 * 返回相对于脚本内容的偏移量
 */
function findPropertyDefinitionInScript(
  ts: typeof import('typescript'),
  scriptAst: ts.SourceFile,
  propName: string,
): { start: number; length: number } | undefined {
  let result: { start: number; length: number } | undefined

  // 将 kebab-case 转换为 camelCase
  const camelizedPropName = camelize(propName)
  const possibleNames = [propName, camelizedPropName]
  if (propName !== camelizedPropName) {
    possibleNames.push(capitalize(camelizedPropName))
  }

  function visit(node: ts.Node) {
    if (result) return

    // 查找 createComponent/createPage/Component 调用
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ['createComponent', 'createPage', 'Component', 'Page'].includes(
        node.expression.text,
      )
    ) {
      const arg = node.arguments[0]
      if (arg && ts.isObjectLiteralExpression(arg)) {
        // 查找 properties 属性
        for (const prop of arg.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === 'properties'
          ) {
            if (ts.isObjectLiteralExpression(prop.initializer)) {
              result = findPropInObjectLiteralAst(
                ts,
                scriptAst,
                prop.initializer,
                possibleNames,
              )
            }
            break
          }
        }
      }
    }

    // 查找 defineProps 调用
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'defineProps'
    ) {
      // 泛型写法: defineProps<{ propName: string }>()
      if (node.typeArguments?.length) {
        const typeArg = node.typeArguments[0]
        if (ts.isTypeLiteralNode(typeArg)) {
          result = findPropInTypeLiteralAst(
            ts,
            scriptAst,
            typeArg,
            possibleNames,
          )
        }
      }
      // 对象写法: defineProps({ propName: String })
      else if (node.arguments.length) {
        const arg = node.arguments[0]
        if (ts.isObjectLiteralExpression(arg)) {
          result = findPropInObjectLiteralAst(ts, scriptAst, arg, possibleNames)
        }
      }
    }

    // 查找 withDefaults(defineProps<Props>(), { ... })
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'withDefaults'
    ) {
      const definePropsCall = node.arguments[0]
      if (
        definePropsCall &&
        ts.isCallExpression(definePropsCall) &&
        ts.isIdentifier(definePropsCall.expression) &&
        definePropsCall.expression.text === 'defineProps'
      ) {
        if (definePropsCall.typeArguments?.length) {
          const typeArg = definePropsCall.typeArguments[0]
          // 如果是类型引用，需要找到类型定义
          if (
            ts.isTypeReferenceNode(typeArg) &&
            ts.isIdentifier(typeArg.typeName)
          ) {
            const typeName = typeArg.typeName.text
            result = findTypeAliasAndPropAst(
              ts,
              scriptAst,
              typeName,
              possibleNames,
            )
          } else if (ts.isTypeLiteralNode(typeArg)) {
            result = findPropInTypeLiteralAst(
              ts,
              scriptAst,
              typeArg,
              possibleNames,
            )
          }
        }
      }
    }

    if (!result) {
      ts.forEachChild(node, visit)
    }
  }

  visit(scriptAst)
  return result
}

/**
 * 在对象字面量 AST 中查找属性定义
 */
function findPropInObjectLiteralAst(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  obj: ts.ObjectLiteralExpression,
  possibleNames: string[],
): { start: number; length: number } | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) ||
      ts.isShorthandPropertyAssignment(prop)
    ) {
      const name = prop.name
      if (ts.isIdentifier(name) && possibleNames.includes(name.text)) {
        return {
          start: name.getStart(sourceFile),
          length: name.getEnd() - name.getStart(sourceFile),
        }
      }
      if (ts.isStringLiteral(name) && possibleNames.includes(name.text)) {
        return {
          start: name.getStart(sourceFile),
          length: name.getEnd() - name.getStart(sourceFile),
        }
      }
    }
    // 支持方法简写: propName() { ... }
    if (ts.isMethodDeclaration(prop)) {
      const name = prop.name
      if (ts.isIdentifier(name) && possibleNames.includes(name.text)) {
        return {
          start: name.getStart(sourceFile),
          length: name.getEnd() - name.getStart(sourceFile),
        }
      }
    }
  }
  return undefined
}

/**
 * 在类型字面量 AST 中查找属性定义
 */
function findPropInTypeLiteralAst(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  typeLiteral: ts.TypeLiteralNode,
  possibleNames: string[],
): { start: number; length: number } | undefined {
  for (const member of typeLiteral.members) {
    if (ts.isPropertySignature(member)) {
      const name = member.name
      if (ts.isIdentifier(name) && possibleNames.includes(name.text)) {
        return {
          start: name.getStart(sourceFile),
          length: name.getEnd() - name.getStart(sourceFile),
        }
      }
    }
  }
  return undefined
}

/**
 * 查找类型别名并在其中查找属性
 */
function findTypeAliasAndPropAst(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  typeName: string,
  possibleNames: string[],
): { start: number; length: number } | undefined {
  let result: { start: number; length: number } | undefined

  function visit(node: ts.Node) {
    if (result) return

    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeName) {
      if (ts.isTypeLiteralNode(node.type)) {
        result = findPropInTypeLiteralAst(
          ts,
          sourceFile,
          node.type,
          possibleNames,
        )
      }
    }

    if (!result) {
      ts.forEachChild(node, visit)
    }
  }

  visit(sourceFile)
  return result
}

function getQuickInfoAtPosition(
  ts: typeof import('typescript'),
  languageService: ts.LanguageService,
  getQuickInfoAtPosition: ts.LanguageService['getQuickInfoAtPosition'],
): ts.LanguageService['getQuickInfoAtPosition'] {
  return (...args) => {
    const result = getQuickInfoAtPosition(...args)
    if (
      result &&
      result.documentation?.length === 1 &&
      result.documentation[0].text.startsWith('__VLS_emit,')
    ) {
      const [_, emitVarName, eventName] =
        result.documentation[0].text.split(',')
      const program = languageService.getProgram()!
      const typeChecker = program.getTypeChecker()
      const sourceFile = program.getSourceFile(args[0])

      result.documentation = undefined

      let symbolNode: ts.Identifier | undefined

      sourceFile?.forEachChild(function visit(node) {
        if (ts.isIdentifier(node) && node.text === emitVarName) {
          symbolNode = node
        }
        if (symbolNode) {
          return
        }
        ts.forEachChild(node, visit)
      })

      if (symbolNode) {
        const emitSymbol = typeChecker.getSymbolAtLocation(symbolNode)
        if (emitSymbol) {
          const type = typeChecker.getTypeOfSymbolAtLocation(
            emitSymbol,
            symbolNode,
          )
          const calls = type.getCallSignatures()
          for (const call of calls) {
            const callEventName = (
              typeChecker.getTypeOfSymbolAtLocation(
                call.parameters[0],
                symbolNode,
              ) as ts.StringLiteralType
            ).value
            call.getJsDocTags()
            if (callEventName === eventName) {
              result.documentation = call.getDocumentationComment(typeChecker)
              result.tags = call.getJsDocTags()
            }
          }
        }
      }
    }
    return result
  }
}

function getEncodedSemanticClassifications<T>(
  ts: typeof import('typescript'),
  language: Language<T>,
  languageService: ts.LanguageService,
  asScriptId: (fileName: string) => T,
  getEncodedSemanticClassifications: ts.LanguageService['getEncodedSemanticClassifications'],
): ts.LanguageService['getEncodedSemanticClassifications'] {
  return (filePath, span, format) => {
    const fileName = filePath.replace(windowsPathReg, '/')
    const result = getEncodedSemanticClassifications(fileName, span, format)
    const sourceScript = language.scripts.get(asScriptId(fileName))
    const root = sourceScript?.generated?.root
    if (root instanceof MpxVirtualCode) {
      const { template } = root.sfc
      if (template) {
        for (const componentSpan of getComponentSpans.call(
          { typescript: ts, languageService },
          root,
          template,
          {
            start: span.start - template.startTagEnd,
            length: span.length,
          },
        )) {
          result.spans.push(
            componentSpan.start + template.startTagEnd,
            componentSpan.length,
            256, // class
          )
        }
      }
    }
    return result
  }
}

function getComponentSpans(
  this: Pick<RequestContext, 'typescript' | 'languageService'>,
  mpxCode: MpxVirtualCode,
  template: NonNullable<MpxVirtualCode['_sfc']['template']>,
  spanTemplateRange: ts.TextSpan,
) {
  const { typescript: ts, languageService } = this
  const result: ts.TextSpan[] = []
  const validComponentNames = _getComponentNames(ts, languageService, mpxCode)
  const elements = new Set(_getElementNames(ts, languageService, mpxCode))
  const components = new Set([
    ...validComponentNames,
    ...validComponentNames.map(hyphenateTag),
  ])
  if (template.ast) {
    for (const node of forEachElementNode(template.ast)) {
      if (
        node.loc.end.offset <= spanTemplateRange.start ||
        node.loc.start.offset >=
          spanTemplateRange.start + spanTemplateRange.length
      ) {
        continue
      }
      if (components.has(node.tag) && !elements.has(node.tag)) {
        let start = node.loc.start.offset
        if (template.lang === 'html') {
          start += '<'.length
        }
        result.push({
          start,
          length: node.tag.length,
        })
        if (template.lang === 'html' && !node.isSelfClosing) {
          result.push({
            start:
              node.loc.start.offset + node.loc.source.lastIndexOf(node.tag),
            length: node.tag.length,
          })
        }
      }
    }
  }
  return result
}
