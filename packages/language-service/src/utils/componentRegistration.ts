import type * as ts from 'typescript'
import type { TextEdit, WorkspaceEdit } from 'vscode-languageserver-protocol'
import { parse } from '@mpxjs/language-core'
import * as CompilerDOM from '@vue/compiler-dom'
import { TextDocument } from 'vscode-languageserver-textdocument'

export interface StaticComponentConfig {
  block?: NonNullable<ReturnType<typeof parse>['descriptor']['json']>
  ast?: ts.SourceFile
  object?: ts.ObjectLiteralExpression
  components?: ts.ObjectLiteralExpression
  registrations: Map<string, string>
  isComponent: boolean
  reason?: string
}

/** Deliberately narrower than the read-only resolver: never execute configuration. */
export function readComponentConfig(
  ts: typeof import('typescript'),
  source: string,
): StaticComponentConfig {
  const result: StaticComponentConfig = {
    registrations: new Map(),
    isComponent: false,
  }
  const { descriptor } = parse(source)
  const block = descriptor.json
  const jsonBlocks = CompilerDOM.parse(source, {
    parseMode: 'sfc',
    isNativeTag: () => true,
    onError() {},
  }).children.filter(
    node =>
      node.type === CompilerDOM.NodeTypes.ELEMENT &&
      node.tag === 'script' &&
      node.props.some(
        prop =>
          prop.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
          ((prop.name === 'name' && prop.value?.content === 'json') ||
            (prop.name === 'type' &&
              prop.value?.content === 'application/json')),
      ),
  )
  if (jsonBlocks.length > 1)
    return { ...result, reason: '存在多个 JSON 配置区块，请手动注册' }
  if (jsonBlocks.some(node => !/<\/script\s*>$/i.test(node.loc.source)))
    return { ...result, reason: 'JSON 配置区块尚未闭合，请手动注册' }
  if (!block) return result
  result.block = block
  const unsafe = (reason: string) => Object.assign(result, { reason })
  if (
    Object.keys(block.attrs).some(
      key => !['name', 'type', 'lang'].includes(key),
    )
  ) {
    return unsafe('外部或条件配置需要手动注册组件')
  }
  const ast =
    block.lang === 'json'
      ? ts.parseJsonText(
          'config.json',
          block.content.trim() ? block.content : '{}',
        )
      : ts.createSourceFile(
          'config.js',
          block.content,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.JS,
        )
  result.ast = ast
  if (
    (ast as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] })
      .parseDiagnostics.length
  ) {
    return unsafe('配置存在语法错误，请修复后重新触发补全')
  }
  const statements = ast.statements.filter(
    statement => !ts.isEmptyStatement(statement),
  )
  let object: ts.Expression | undefined
  if (statements.length === 1 && ts.isExpressionStatement(statements[0])) {
    const expression = statements[0].expression
    if (block.lang === 'json') object = expression
    else if (
      ts.isBinaryExpression(expression) &&
      expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(expression.left) &&
      ts.isIdentifier(expression.left.expression) &&
      expression.left.expression.text === 'module' &&
      expression.left.name.text === 'exports'
    )
      object = expression.right
  }
  if (
    !object ||
    !ts.isObjectLiteralExpression(object) ||
    !isStaticValue(object)
  ) {
    return unsafe(
      '仅支持静态 JSON 或 module.exports 对象字面量，请手动注册动态配置',
    )
  }
  result.object = object
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    const name = getName(property.name)
    if (name?.startsWith('usingComponents@'))
      return unsafe('存在条件注册配置，请手动注册')
    if (name === 'component')
      result.isComponent =
        property.initializer.kind === ts.SyntaxKind.TrueKeyword
    if (name === 'usingComponents') {
      if (!ts.isObjectLiteralExpression(property.initializer))
        return unsafe('usingComponents 不是对象字面量')
      result.components = property.initializer
      for (const component of property.initializer.properties) {
        if (
          !ts.isPropertyAssignment(component) ||
          !ts.isStringLiteral(component.initializer)
        ) {
          return unsafe('usingComponents 包含动态路径，请手动注册')
        }
        const name = getName(component.name)
        if (!name || name.includes('@'))
          return unsafe('usingComponents 包含条件注册，请手动注册')
        result.registrations.set(name, component.initializer.text)
      }
    }
  }
  return result

  function getName(name: ts.PropertyName) {
    return ts.isIdentifier(name) ||
      ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name)
      ? name.text
      : undefined
  }
  function isStaticValue(value: ts.Expression): boolean {
    if (ts.isObjectLiteralExpression(value)) {
      const names = new Set<string>()
      return value.properties.every(property => {
        if (!ts.isPropertyAssignment(property)) return false
        const name = getName(property.name)
        if (!name || name === '__proto__' || names.has(name)) return false
        names.add(name)
        return isStaticValue(property.initializer)
      })
    }
    if (ts.isArrayLiteralExpression(value))
      return value.elements.every(isStaticValue)
    return (
      ts.isStringLiteral(value) ||
      ts.isNumericLiteral(value) ||
      value.kind === ts.SyntaxKind.TrueKeyword ||
      value.kind === ts.SyntaxKind.FalseKeyword ||
      value.kind === ts.SyntaxKind.NullKeyword ||
      (ts.isPrefixUnaryExpression(value) &&
        (value.operator === ts.SyntaxKind.MinusToken ||
          value.operator === ts.SyntaxKind.PlusToken) &&
        ts.isNumericLiteral(value.operand))
    )
  }
}

/** One source-document WorkspaceEdit, also used as completion additionalTextEdits. */
export function createRegistrationEdit(
  ts: typeof import('typescript'),
  document: TextDocument,
  tag: string,
  path: string,
): { edit?: WorkspaceEdit; edits: TextEdit[]; reason?: string } {
  const text = document.getText()
  const config = readComponentConfig(ts, text)
  const edits: TextEdit[] = []
  if (config.reason) return { edits, reason: config.reason }
  if (config.registrations.has(tag)) return { edits }
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  if (!config.block) {
    const offset = text.length
    const prefix = text.length && !text.endsWith('\n') ? eol : ''
    insert(
      offset,
      `${prefix}<script type="application/json">${eol}{${eol}  "usingComponents": {${eol}    ${JSON.stringify(tag).replace(/</g, '\\u003c')}: ${JSON.stringify(path).replace(/</g, '\\u003c')}${eol}  }${eol}}${eol}</script>${eol}`,
    )
  } else if (!config.block.content.trim() && config.block.lang === 'json') {
    insert(
      config.block.loc.start.offset,
      `${eol}{${eol}  "usingComponents": {${eol}    ${JSON.stringify(tag).replace(/</g, '\\u003c')}: ${JSON.stringify(path).replace(/</g, '\\u003c')}${eol}  }${eol}}${eol}`,
    )
  } else if (config.object) {
    const { block, ast, object, components } = config
    const stringProperty = [
      ...(components?.properties ?? []),
      ...object.properties,
    ].find(
      property =>
        ts.isPropertyAssignment(property) &&
        ts.isStringLiteral(property.initializer),
    )
    const quote =
      block.lang === 'json'
        ? '"'
        : stringProperty && ts.isPropertyAssignment(stringProperty)
          ? stringProperty.initializer.getText(ast!)[0]
          : "'"
    const string = (value: string) =>
      JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/'/g, quote === "'" ? "\\'" : "'")
        .replace(/^"|"$/g, quote)
    const unit = /\n([\t ]+)\S/.exec(block.content)?.[1] ?? '  '
    if (components) {
      appendProperty(components, `${string(tag)}: ${string(path)}`)
    } else {
      const key =
        block.lang === 'json' ||
        /^['"]/.test(object.properties[0]?.name?.getText(ast!) ?? '')
          ? string('usingComponents')
          : 'usingComponents'
      const parentIndent = indentation(object.getStart(ast!))
      const propertyIndent = parentIndent + unit
      const value = block.content.includes('\n')
        ? `{${eol}${propertyIndent}${unit}${string(tag)}: ${string(path)}${eol}${propertyIndent}}`
        : `{ ${string(tag)}: ${string(path)} }`
      appendProperty(object, `${key}: ${value}`)
    }

    function indentation(offset: number) {
      const start = block.content.lastIndexOf('\n', offset - 1) + 1
      return /^[\t ]*/.exec(block.content.slice(start, offset))![0]
    }
    function appendProperty(
      object: ts.ObjectLiteralExpression,
      property: string,
    ) {
      const content = block.content
      const close = object.end - 1
      const lineStart = content.lastIndexOf('\n', close - 1) + 1
      const multiline =
        lineStart > object.getStart(ast!) &&
        !content.slice(lineStart, close).trim()
      const last = object.properties.at(-1)
      const trailing = object.properties.hasTrailingComma
      const insertionOffset = multiline ? lineStart : close
      const propertyIndent = multiline
        ? last
          ? indentation(last.getStart(ast!))
          : indentation(close) + unit
        : ''
      const newText = multiline
        ? `${propertyIndent}${property}${trailing ? ',' : ''}${eol}`
        : ` ${property}${trailing ? ',' : ''} `
      const commaOffset = last && !trailing ? last.end : undefined
      if (commaOffset === insertionOffset)
        insert(block.loc.start.offset + insertionOffset, ',' + newText)
      else {
        if (commaOffset !== undefined)
          insert(block.loc.start.offset + commaOffset, ',')
        insert(block.loc.start.offset + insertionOffset, newText)
      }
    }
  } else {
    return { edits, reason: '配置为空或无法安全定位对象，请手动注册' }
  }
  return { edits, edit: { changes: { [document.uri]: edits } } }

  function insert(offset: number, newText: string) {
    const position = document.positionAt(offset)
    edits.push({ range: { start: position, end: position }, newText })
  }
}
