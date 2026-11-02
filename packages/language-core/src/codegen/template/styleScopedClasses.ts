import type * as ts from 'typescript'
import type { Code } from '../../types'
import type { TemplateCodegenOptions } from './index'
import type { TemplateCodegenContext } from './context'

import * as CompilerDOM from '@vue/compiler-dom'
import {
  endOfLine,
  generateEscaped,
  mustacheREG,
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
      const [content, startOffset] = normalizeAttributeValue(prop.value)
      if (content) {
        // 刨除表达式部分 class="xx {{ xx }}" -> class="xx         "
        const replaced = replaceMustacheWithSpaces(content)
        ctx.scopedClasses.push(...collectClasses(replaced, startOffset))
        for (const match of content.matchAll(mustacheREG)) {
          const before = content[match.index - 1]
          const after = content[match.index + match[0].length]
          // A literal adjoining non-whitespace text is only part of a class
          // token (pre-{{ 'active' }}). Do not guess the concatenated name.
          if ((before && before.trim()) || (after && after.trim())) {
            continue
          }
          collectExpressionClasses(
            options.ts,
            ctx,
            match[1],
            startOffset + match.index + 2,
            // Only a complete wx:class expression receives Mpx object/array
            // normalization. Ordinary class and mixed text must stay strings.
            prop.name === 'wx:class' && match[0] === content,
          )
        }
      } else {
        ctx.emptyClassOffsets.push(startOffset)
      }
    } else if (
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
      prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
      prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
      prop.arg.content === 'class'
    ) {
      collectExpressionClasses(
        options.ts,
        ctx,
        prop.exp.content,
        prop.exp.loc.start.offset,
        true,
      )
    }
  }
}

function collectExpressionClasses(
  ts: typeof import('typescript'),
  ctx: TemplateCodegenContext,
  content: string,
  startOffset: number,
  normalizeCollections: boolean,
) {
  const ast = ts.createSourceFile(
    '',
    '(' + content + ')',
    99 satisfies ts.ScriptTarget.Latest,
  )
  // The wrapper makes object literals expressions without changing their source
  // positions; every AST offset includes its opening parenthesis.
  startOffset--

  for (const statement of ast.statements) {
    if (ts.isExpressionStatement(statement)) {
      walkExpression(statement.expression)
    }
  }

  function walkExpression(node: ts.Expression) {
    if (ts.isParenthesizedExpression(node)) {
      walkExpression(node.expression)
    } else if (ts.isStringLiteralLike(node)) {
      collectLiteral(node)
    } else if (normalizeCollections && ts.isArrayLiteralExpression(node)) {
      node.elements.forEach(walkExpression)
    } else if (normalizeCollections && ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) {
          const { name } = property
          if (ts.isIdentifier(name)) {
            collectIdentifier(name)
          } else if (ts.isStringLiteralLike(name)) {
            collectLiteral(name)
          } else if (
            ts.isComputedPropertyName(name) &&
            ts.isStringLiteralLike(name.expression)
          ) {
            collectLiteral(name.expression)
          }
        } else if (ts.isShorthandPropertyAssignment(property)) {
          collectIdentifier(property.name, true)
        }
      }
    } else if (ts.isConditionalExpression(node)) {
      walkExpression(node.whenTrue)
      walkExpression(node.whenFalse)
    } else if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        walkExpression(node.right)
      } else if (
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        walkExpression(node.left)
        walkExpression(node.right)
      }
    }
  }

  function collectLiteral(node: ts.StringLiteralLike) {
    const raw = node.getText(ast)
    // Decoded escapes have different source lengths. Skip them rather than
    // attributing the decoded class name to an unrelated source range.
    if (
      raw.length < 2 ||
      raw.at(-1) !== raw[0] ||
      raw.slice(1, -1) !== node.text
    ) {
      return
    }
    const offset = node.getStart(ast) + 1 + startOffset
    if (node.text) {
      ctx.scopedClasses.push(...collectClasses(node.text, offset))
    } else {
      ctx.emptyClassOffsets.push(offset)
    }
  }

  function collectIdentifier(node: ts.Identifier, isShorthand = false) {
    const text = getNodeText(ts, node, ast)
    ctx.scopedClasses.push({
      source: 'template',
      className: text,
      offset: node.getStart(ast) + startOffset,
      isShorthand,
    })
  }
}

export function* generateClassAwareInterpolation(
  ctx: TemplateCodegenContext,
  start: number,
  end: number,
  codes: Iterable<Code>,
): Generator<Code> {
  const classes = ctx.scopedClasses
    .filter(
      reference =>
        reference.source === 'template' &&
        !reference.isShorthand &&
        reference.offset >= start &&
        reference.offset + reference.className.length <= end,
    )
    .sort((a, b) => a.offset - b.offset)

  for (const code of codes) {
    if (
      typeof code === 'string' ||
      code[1] !== 'template' ||
      !code[0].length ||
      !code[3]?.navigation ||
      !classes.length
    ) {
      yield code
      continue
    }
    const [text, source, offset, features] = code
    let cursor = 0
    for (const reference of classes) {
      const start = Math.max(cursor, reference.offset - offset)
      const end = Math.min(
        text.length,
        reference.offset + reference.className.length - offset,
      )
      if (start >= end) {
        continue
      }
      if (start > cursor) {
        yield [text.slice(cursor, start), source, offset + cursor, features]
      }
      // CSS owns navigation on known class names. Keep the original checking,
      // semantic and completion mappings on the expression; its variables and
      // unrecognized dynamic values continue to navigate as before.
      yield [
        text.slice(start, end),
        source,
        offset + start,
        {
          ...features,
          navigation: false,
        },
      ]
      cursor = end
    }
    if (cursor < text.length) {
      yield [text.slice(cursor), source, offset + cursor, features]
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
