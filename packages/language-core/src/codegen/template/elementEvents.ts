import type * as ts from 'typescript'
import type { Code } from '../../types'
import * as CompilerDOM from '@vue/compiler-dom'
import { camelize } from '@mpxjs/language-shared'
import { endOfLine, newLine } from '../utils'
import { wrapWith } from '../utils/wrapWith'
import type { TemplateCodegenContext } from './context'
import type { TemplateCodegenOptions } from './index'
import { generateInterpolation } from './interpolation'
import { generateObjectProperty } from './objectProperty'

export function* generateElementEvents(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  node: CompilerDOM.ElementNode,
  componentOriginalVar: string,
  componentFunctionalVar: string,
  componentVNodeVar: string,
  componentCtxVar: string,
): Generator<Code> {
  let emitsVar: string | undefined
  let propsVar: string | undefined

  for (const prop of node.props) {
    if (
      prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
      ((prop.name === 'on' &&
        prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
        prop.arg.isStatic) ||
        (options.mpxCompilerOptions.strictWxModel &&
          prop.name === 'model' &&
          (!prop.arg ||
            (prop.arg.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
              prop.arg.isStatic))))
    ) {
      ctx.currentComponent!.used = true
      if (!emitsVar) {
        emitsVar = ctx.getInternalVariable()
        propsVar = ctx.getInternalVariable()
        yield `let ${emitsVar}!: __VLS_ResolveEmits<typeof ${componentOriginalVar}, typeof ${componentCtxVar}.emit>${endOfLine}`
        yield `let ${propsVar}!: __VLS_FunctionalComponentProps<typeof ${componentFunctionalVar}, typeof ${componentVNodeVar}>${endOfLine}`
      }
      const source = prop.arg?.loc.source ?? 'model-value'
      const start = prop.arg?.loc.start.offset
      let propPrefix = 'on-'
      let emitPrefix = ''
      if (prop.name === 'model') {
        propPrefix = 'onUpdate:'
        emitPrefix = 'update:'
      }
      yield `(): __VLS_NormalizeComponentEvent<typeof ${propsVar}, typeof ${emitsVar}, '${camelize(propPrefix + source)}', '${emitPrefix + source}', '${camelize(emitPrefix + source)}'> => (${newLine}`
      if (prop.name === 'on') {
        yield `{ `
        yield* generateObjectProperty(
          emitPrefix + source,
          start!,
          ctx.codeFeatures.navigation,
          true,
        )
        yield `: {} as any } as typeof ${emitsVar},${newLine}`
      }
      yield `{ `
      if (prop.name === 'on') {
        yield* generateEventArg(ctx, source, start!)
        yield `: `
        yield* generateEventExpression(options, ctx, prop)
      } else {
        yield `'${camelize(propPrefix + source)}': `
        yield* generateModelEventExpression(options, ctx, prop)
      }
      yield `})${endOfLine}`
    }
  }
}

export function* generateEventArg(
  ctx: TemplateCodegenContext,
  name: string,
  start: number,
): Generator<Code> {
  const features = {
    ...ctx.codeFeatures.withoutHighlightAndCompletion,
    ...ctx.codeFeatures.navigationWithoutRename,
  }

  const prefixMatch = name.match(/^(bind|catch):(.+)$/)
  if (prefixMatch) {
    const [, prefix, eventName] = prefixMatch
    // bind:xx -> 'bindxx' or catch:xx -> 'catchxx'
    yield* wrapWith(
      start,
      start + name.length,
      features,
      `'`,
      [prefix, 'template', start, features],
      [
        eventName,
        'template',
        start + prefix.length + 1, // +1 for the ':'
        features,
      ],
      `'`,
    )
  } else {
    // bindxx -> 'bindxx'
    yield* wrapWith(
      start,
      start + name.length,
      features,
      `'`,
      [name, 'template', start, { __combineOffset: 1 }],
      `'`,
    )
  }
}

export function* generateEventExpression(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  prop: CompilerDOM.DirectiveNode,
): Generator<Code> {
  if (prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
    let prefix = `(`
    let suffix = `)`
    let isFirstMapping = true

    // const ast = createTsAst(options.ts, prop.exp, prop.exp.content)
    const _isCompoundExpression = false // isCompoundExpression(options.ts, ast)
    if (_isCompoundExpression) {
      yield `(...[$event]) => {${newLine}`
      ctx.addLocalVariable('$event')
      yield* ctx.generateConditionGuards()
      prefix = ``
      suffix = ``
    }

    yield* generateInterpolation(
      options,
      ctx,
      'template',
      () => {
        if (_isCompoundExpression && isFirstMapping) {
          isFirstMapping = false
        }
        return ctx.codeFeatures.all
      },
      prop.exp.content,
      prop.exp.loc.start.offset,
      prop.exp.loc,
      prefix,
      suffix,
    )

    if (_isCompoundExpression) {
      ctx.removeLocalVariable('$event')

      yield endOfLine
      yield `}`
    }
  } else {
    yield `() => {}`
  }
}

export function* generateModelEventExpression(
  options: TemplateCodegenOptions,
  ctx: TemplateCodegenContext,
  prop: CompilerDOM.DirectiveNode,
): Generator<Code> {
  if (prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION) {
    yield `(...[$event]) => {${newLine}`
    yield* ctx.generateConditionGuards()
    yield* generateInterpolation(
      options,
      ctx,
      'template',
      ctx.codeFeatures.verification,
      prop.exp.content,
      prop.exp.loc.start.offset,
      prop.exp.loc,
    )
    yield ` = $event${endOfLine}`
    yield `}`
  } else {
    yield `() => {}`
  }
}

export function isCompoundExpression(
  ts: typeof import('typescript'),
  ast: ts.SourceFile,
) {
  let result = true
  if (ast.statements.length === 0) {
    result = false
  } else if (ast.statements.length === 1) {
    ts.forEachChild(ast, child_1 => {
      if (ts.isExpressionStatement(child_1)) {
        ts.forEachChild(child_1, child_2 => {
          if (ts.isArrowFunction(child_2)) {
            result = false
          } else if (isPropertyAccessOrId(ts, child_2)) {
            result = false
          }
        })
      } else if (ts.isFunctionDeclaration(child_1)) {
        result = false
      }
    })
  }
  return result
}

function isPropertyAccessOrId(ts: typeof import('typescript'), node: ts.Node) {
  if (ts.isIdentifier(node)) {
    return true
  }
  if (ts.isPropertyAccessExpression(node)) {
    return isPropertyAccessOrId(ts, node.expression)
  }
  return false
}
