import type * as ts from 'typescript'
import type { Code } from '../../types'
import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'

import * as CompilerDOM from '@vue/compiler-dom'
import {
  endOfLine,
  generateEscaped,
  normalizeAttributeValue,
  replaceMustacheWithSpaces,
  wrapWith,
} from '../utils'
import { getNodeText } from '../../utils/shared'

const classNameEscapeRegex = /([\\'])/

export function* generateStyleScopedClassReferences(
  ctx: TemplateCodegenContext,
  withDot = false,
): Generator<Code> {
  for (const offset of ctx.emptyClassOffsets) {
    yield `/** @type {__VLS_StyleScopedClasses['`
    yield ['', 'template', offset, ctx.codeFeatures.additionalCompletion]
    yield `']} */${endOfLine}`
  }
  for (const { source, className, offset } of ctx.scopedClasses) {
    yield `/** @type {__VLS_StyleScopedClasses[`
    yield* wrapWith(
      offset - (withDot ? 1 : 0),
      offset + className.length,
      source,
      ctx.codeFeatures.navigation,
      `'`,
      ...generateEscaped(
        className,
        source,
        offset,
        ctx.codeFeatures.navigationAndAdditionalCompletion,
        classNameEscapeRegex,
      ),
      `'`,
    )
    yield `]} */${endOfLine}`
  }
}

export function collectStyleScopedClassReferences(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
) {
  for (const prop of node.props) {
    if (
      prop.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
      (prop.name === 'class' || prop.name === 'wx:class') &&
      prop.value
    ) {
      const isWrapped = false
      const [content, startOffset] = normalizeAttributeValue(prop.value)
      if (content) {
        // 刨除表达式部分 class="xx {{ xx }}" -> class="xx         "
        const replaced = replaceMustacheWithSpaces(content)
        const classes = collectClasses(
          replaced,
          startOffset + (isWrapped ? 1 : 0),
        )
        ctx.scopedClasses.push(...classes)
      } else {
        ctx.emptyClassOffsets.push(startOffset)
      }
    } else if (
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
      prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
      prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
      prop.arg.content === 'class'
    ) {
      const content = '`${' + prop.exp.content + '}`'
      const startOffset = prop.exp.loc.start.offset - 3

      const { ts } = options
      const ast = ts.createSourceFile(
        '',
        content,
        99 satisfies ts.ScriptTarget.Latest,
      )
      const literals: ts.StringLiteralLike[] = []

      ts.forEachChild(ast, node => {
        if (
          !ts.isExpressionStatement(node) ||
          !isTemplateExpression(node.expression)
        ) {
          return
        }

        const expression = node.expression.templateSpans[0].expression

        if (ts.isStringLiteralLike(expression)) {
          literals.push(expression)
        }

        if (ts.isArrayLiteralExpression(expression)) {
          walkArrayLiteral(expression)
        }

        if (ts.isObjectLiteralExpression(expression)) {
          walkObjectLiteral(expression)
        }
      })

      for (const literal of literals) {
        if (literal.text) {
          const classes = collectClasses(
            literal.text,
            literal.end - literal.text.length - 1 + startOffset,
          )
          ctx.scopedClasses.push(...classes)
        } else {
          ctx.emptyClassOffsets.push(literal.end - 1 + startOffset)
        }
      }

      function walkArrayLiteral(node: ts.ArrayLiteralExpression) {
        const { elements } = node
        for (const element of elements) {
          if (ts.isStringLiteralLike(element)) {
            literals.push(element)
          } else if (ts.isObjectLiteralExpression(element)) {
            walkObjectLiteral(element)
          }
        }
      }

      function walkObjectLiteral(node: ts.ObjectLiteralExpression) {
        const { properties } = node
        for (const property of properties) {
          if (ts.isPropertyAssignment(property)) {
            const { name } = property
            if (ts.isIdentifier(name)) {
              walkIdentifier(name)
            } else if (ts.isStringLiteral(name)) {
              literals.push(name)
            } else if (ts.isComputedPropertyName(name)) {
              const { expression } = name
              if (ts.isStringLiteralLike(expression)) {
                literals.push(expression)
              }
            }
          } else if (ts.isShorthandPropertyAssignment(property)) {
            walkIdentifier(property.name)
          }
        }
      }

      function walkIdentifier(node: ts.Identifier) {
        const text = getNodeText(ts, node, ast)
        ctx.scopedClasses.push({
          source: 'template',
          className: text,
          offset: node.end - text.length + startOffset,
        })
      }
    }
  }
}

function collectClasses(content: string, startOffset = 0) {
  const classes: {
    source: string
    className: string
    offset: number
  }[] = []

  let currentClassName = ''
  let offset = 0
  for (const char of content + ' ') {
    if (char.trim() === '') {
      if (currentClassName !== '') {
        classes.push({
          source: 'template',
          className: currentClassName,
          offset: offset + startOffset,
        })
        offset += currentClassName.length
        currentClassName = ''
      }
      offset += char.length
    } else {
      currentClassName += char
    }
  }
  return classes
}

// isTemplateExpression is missing in tsc
function isTemplateExpression(node: ts.Node): node is ts.TemplateExpression {
  return node.kind === (228 satisfies ts.SyntaxKind.TemplateExpression)
}
