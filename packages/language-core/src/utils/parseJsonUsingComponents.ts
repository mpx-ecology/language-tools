import type { SfcJsonBlockUsingComponents } from '../types'
import type * as ts from 'typescript'

export function parseUsingComponents(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  lang: string,
) {
  if (lang === 'js') {
    return parseUsingComponentsWithJs(ts, sourceFile)
  }
  return parseUsingComponentsWithJson(ts, sourceFile)
}

export function parseUsingComponentsWithJson(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
): SfcJsonBlockUsingComponents {
  const usingComponents: SfcJsonBlockUsingComponents = new Map()

  if (
    !sourceFile.statements.length ||
    !ts.isExpressionStatement(sourceFile.statements[0])
  ) {
    return usingComponents
  }

  const objectLiteral = sourceFile.statements[0].expression
  if (!ts.isObjectLiteralExpression(objectLiteral)) {
    return usingComponents
  }

  const usingComponentsProperty = objectLiteral.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) &&
      ts.isStringLiteral(prop.name) &&
      prop.name.text === 'usingComponents',
  )

  if (
    usingComponentsProperty &&
    ts.isObjectLiteralExpression(usingComponentsProperty.initializer)
  ) {
    for (const prop of usingComponentsProperty.initializer.properties) {
      if (
        ts.isPropertyAssignment(prop) &&
        ts.isStringLiteral(prop.name) &&
        ts.isStringLiteral(prop.initializer)
      ) {
        // eg: name: 'list', value: '../components/list'
        usingComponents.set(prop.name.text, {
          text: prop.initializer.text,
          offset: prop.initializer.getStart(sourceFile),
          nameOffset: prop.name.getStart(sourceFile),
        })
      }
    }
  }

  return usingComponents
}

export function parseUsingComponentsWithJs(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
): SfcJsonBlockUsingComponents {
  const usingComponents: SfcJsonBlockUsingComponents = new Map()

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      node.name.text === 'usingComponents'
    ) {
      if (ts.isObjectLiteralExpression(node.initializer)) {
        for (const prop of node.initializer.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
            (ts.isStringLiteral(prop.initializer) ||
              ts.isIdentifier(prop.initializer) ||
              ts.isPropertyAccessExpression(prop.initializer))
          ) {
            const name = prop.name.text
            let text = ''
            let _variableOffset: number | undefined = undefined

            if (ts.isStringLiteral(prop.initializer)) {
              text = prop.initializer.text
            } else if (ts.isIdentifier(prop.initializer)) {
              const identifierName = prop.initializer.text
              const { variableValue, variableOffset } = findVariableValue(
                ts,
                sourceFile,
                identifierName,
              )
              if (variableValue) {
                text = variableValue
                _variableOffset = variableOffset
              }
            } else if (ts.isPropertyAccessExpression(prop.initializer)) {
              text = sourceFile.text.substring(
                prop.initializer.getStart(),
                prop.initializer.getEnd(),
              )
            }

            if (text) {
              usingComponents.set(name, {
                text,
                offset:
                  _variableOffset ?? prop.initializer.getStart(sourceFile),
                nameOffset: prop.name.getStart(sourceFile),
              })
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return usingComponents
}

function findVariableValue(
  ts: typeof import('typescript'),
  sourceFile: ts.SourceFile,
  identifierName: string,
) {
  let variableValue: string | undefined = undefined
  let variableOffset: number | undefined = undefined

  function findDeclaration(node: ts.Node): boolean | undefined {
    if (
      (ts.isVariableDeclaration(node) || ts.isPropertyAssignment(node)) &&
      ts.isIdentifier(node.name) &&
      node.name.text === identifierName &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      variableValue = node.initializer.text
      variableOffset = node.initializer.getStart(sourceFile)
      return true
    }

    return ts.forEachChild(node, findDeclaration)
  }

  findDeclaration(sourceFile)
  return { variableValue, variableOffset }
}
