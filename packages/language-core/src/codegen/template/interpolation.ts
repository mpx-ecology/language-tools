import type * as ts from 'typescript'
import type { TemplateCodegenContext } from './context'
import type { Code, MpxCodeInformation, MpxCompilerOptions } from '../../types'
import { isGloballyAllowed, makeMap } from '@mpxjs/language-shared'
import { collectVars, createTsAst, identifierRegex } from '../utils'
import { getNodeText, getStartEnd } from '../../utils/shared'

const isLiteralWhitelisted = /*@__PURE__*/ makeMap('true,false,null,this')
const isMpxGloballyWhitelisted = /*@__PURE__*/ makeMap(
  '__mpx_mode__,__mpx_env__',
)
const isMpxGlobalDollarsWhitelisted = /*@__PURE__*/ makeMap('$t,$tc,$te,$tm')

export function* generateInterpolation(
  options: {
    ts: typeof ts
    destructuredPropNames: Set<string> | undefined
    templateRefNames: Set<string> | undefined
    mpxCompilerOptions: MpxCompilerOptions
  },
  ctx: TemplateCodegenContext,
  source: string,
  data:
    | MpxCodeInformation
    | ((offset: number) => MpxCodeInformation)
    | undefined,
  code: string,
  start: number | undefined,
  astHolder: any = {},
  prefix: string = '',
  suffix: string = '',
): Generator<Code> {
  for (const segment of forEachInterpolationSegment(
    options.mpxCompilerOptions,
    options.ts,
    options.destructuredPropNames,
    options.templateRefNames,
    ctx,
    code,
    start,
    astHolder,
    prefix,
    suffix,
  )) {
    let [section, offset] = segment
    const type = segment[2]

    if (offset === undefined) {
      yield section
    } else {
      offset -= prefix.length
      let addSuffix = ''
      const overLength = offset + section.length - code.length
      if (overLength > 0) {
        addSuffix = section.slice(section.length - overLength)
        section = section.slice(0, -overLength)
      }
      if (offset < 0) {
        yield section.slice(0, -offset)
        section = section.slice(-offset)
        offset = 0
      }
      const shouldSkip =
        section.length === 0 &&
        (type === 'startText' ||
          type === 'endText' ||
          type === 'contextBoundary')
      if (!shouldSkip) {
        if (start !== undefined && data) {
          const resolvedData =
            typeof data === 'function' ? data(start + offset) : data
          const localCompletion =
            type === 'localCompletion' && resolvedData.completion
          if (localCompletion) {
            ctx.addLocalCompletion(
              source,
              start + offset,
              section || code.slice(offset).match(/^\s*/)?.[0] || '',
              segment[3]!,
              resolvedData.completion,
            )
          }
          yield [
            section,
            source,
            start + offset,
            type === 'errorMappingOnly'
              ? ctx.codeFeatures.verification
              : type === 'completionMappingOnly'
                ? { completion: resolvedData.completion }
                : type === 'contextBoundary' || localCompletion
                  ? { ...resolvedData, completion: false }
                  : resolvedData,
          ]
        } else {
          yield section
        }
      }
      yield addSuffix
    }
  }
}

interface CtxVar {
  text: string
  offset: number
  isShorthand?: boolean
  isLocal?: boolean
}

interface BracesVar {
  text: string
  offset: number
  /** 1 for '{{', 2 for '}}' */
  bracesType?: 1 | 2
}

type Segment = [
  fragment: string,
  offset: number | undefined,
  type?:
    | 'errorMappingOnly'
    | 'completionMappingOnly'
    | 'startText'
    | 'endText'
    | 'contextBoundary'
    | 'localCompletion',
  locals?: string[],
]

function* forEachInterpolationSegment(
  options: MpxCompilerOptions,
  ts: typeof import('typescript'),
  destructuredPropNames: Set<string> | undefined,
  templateRefNames: Set<string> | undefined,
  ctx: TemplateCodegenContext,
  originalCode: string,
  start: number | undefined,
  astHolder: any,
  prefix: string,
  suffix: string,
): Generator<Segment> {
  const code = prefix + originalCode + suffix
  const offset = start !== undefined ? start - prefix.length : undefined
  const ctxVars: CtxVar[] = []
  const locals = ctx.getLocalVariables()

  if (
    identifierRegex.test(originalCode) &&
    (locals.includes(originalCode) ||
      !shouldIdentifierSkipped(
        ctx,
        originalCode,
        destructuredPropNames,
        options.templateGlobalDefs,
      ))
  ) {
    ctxVars.push({
      text: originalCode,
      offset: prefix.length,
      isLocal: locals.includes(originalCode),
    })
  } else {
    const ast = createTsAst(ts, astHolder, code)
    const varCb = (id: ts.Identifier, isShorthand = false) => {
      const text = getNodeText(ts, id, ast)
      if (
        locals.includes(text) ||
        !shouldIdentifierSkipped(
          ctx,
          text,
          destructuredPropNames,
          options.templateGlobalDefs,
        )
      ) {
        ctxVars.push({
          text,
          offset: getStartEnd(ts, id, ast).start,
          isShorthand,
          isLocal: locals.includes(text),
        })
      }
    }
    ts.forEachChild(ast, node => walkIdentifiers(ts, node, ast, varCb, ctx))
  }

  const points: (BracesVar | CtxVar)[] = findBracesPoints(code)
    .concat(ctxVars)
    .sort((a, b) => a.offset - b.offset)

  function hasLocalCompletion(variable: BracesVar | CtxVar | undefined) {
    return (
      !!variable &&
      !isBracesVar(variable) &&
      !!locals.length &&
      !variable.isShorthand &&
      !templateRefNames?.has(variable.text) &&
      !isMpxGlobalDollarsWhitelisted(variable.text) &&
      !ctx.dollarVars.has(variable.text)
    )
  }

  function* generateText(
    start: number,
    end: number,
    type: 'startText' | 'endText' | undefined,
    previous: BracesVar | CtxVar | undefined,
    next?: BracesVar | CtxVar,
  ): Generator<Segment> {
    if (hasLocalCompletion(previous) && !originalCode.trim()) {
      yield [code.slice(start, end), start, 'contextBoundary']
      return
    }
    // Do not let the following character reclaim completion at a root's end.
    // Restore its far boundary so member completion after a dot still works.
    const split =
      hasLocalCompletion(previous) &&
      start < end &&
      start < prefix.length + originalCode.length
    if (split) {
      yield [code.slice(start, start + 1), start, 'contextBoundary']
      start++
      if (!next || start < next.offset) {
        yield ['', start, 'completionMappingOnly']
      }
    }
    if (!split || start < end) {
      yield [code.slice(start, end), start, type]
    }
  }

  if (points.length) {
    for (let i = 0; i < points.length; i++) {
      const lastVar = points[i - 1]
      const curVar = points[i]
      const lastVarEnd = lastVar ? lastVar.offset + lastVar.text.length : 0

      const precedingEnd =
        !isBracesVar(curVar) && curVar.offset > lastVarEnd
          ? curVar.offset - 1
          : curVar.offset
      yield* generateText(
        lastVarEnd,
        precedingEnd,
        i ? undefined : 'startText',
        lastVar,
        curVar,
      )
      if (precedingEnd < curVar.offset) {
        // The trivia/operator immediately before ctx.x shares x's source
        // boundary. Its lexical completions must not hide ctx's members.
        // Keep its diagnostic, semantic and navigation mappings unchanged.
        yield [
          code.slice(precedingEnd, curVar.offset),
          precedingEnd,
          'contextBoundary',
        ]
      }

      if (isBracesVar(curVar)) {
        // eg: "{{ a }} {{ b }}" -> "( a ) + ' ' + ( b )"
        yield [curVar.bracesType === 1 ? `+ ' ' +(` : `)`, undefined]
      } else {
        // eg: "{{ { a } }}" -> "{ a: ctx.a }"
        if (curVar.isShorthand) {
          // Keep the generated property key mapped before the rewritten value.
          // TypeScript can then use the contextual object type to complete a
          // partially typed shorthand key (`{ i }` -> `id`), while the second
          // mapping below still powers navigation and checking for ctx.i.
          yield [curVar.text, curVar.offset, 'completionMappingOnly']
          yield [`: `, undefined]
        }
        yield* generateVar(
          templateRefNames,
          ctx,
          code,
          offset,
          curVar,
          locals,
          hasLocalCompletion(curVar),
        )
      }
    }

    const lastVar = points.at(-1)!
    if (lastVar.offset + lastVar.text.length < code.length) {
      yield* generateText(
        lastVar.offset + lastVar.text.length,
        code.length,
        'endText',
        lastVar,
      )
    }
  } else {
    yield [code, 0]
  }
}

function findBracesPoints(code: string) {
  const points: BracesVar[] = []
  const length = code.length
  for (let i = 0; i < length - 1; i++) {
    if (code[i] === '{' && code[i + 1] === '{') {
      points.push({ text: '{{', offset: i, bracesType: 1 })
      i++
    } else if (code[i] === '}' && code[i + 1] === '}') {
      points.push({ text: '}}', offset: i, bracesType: 2 })
      i++
    }
  }
  return points
}

function isBracesVar(node: CtxVar | BracesVar): node is BracesVar {
  return 'bracesType' in node
}

function* generateVar(
  templateRefNames: Set<string> | undefined,
  ctx: TemplateCodegenContext,
  code: string,
  offset: number | undefined,
  curVar: CtxVar,
  locals: string[],
  localCompletion: boolean,
): Generator<Segment> {
  yield ['', curVar.offset, 'errorMappingOnly']

  const isTemplateRef = templateRefNames?.has(curVar.text) ?? false
  const isDollar =
    isMpxGlobalDollarsWhitelisted(curVar.text) ||
    ctx.dollarVars.has(curVar.text)
  const completionType = localCompletion ? 'localCompletion' : undefined
  if (curVar.isLocal) {
    yield [curVar.text, curVar.offset, completionType, locals]
    return
  }
  if (isTemplateRef) {
    yield [`__VLS_unref(`, undefined]
    yield [
      code.slice(curVar.offset, curVar.offset + curVar.text.length),
      curVar.offset,
    ]
    yield [`)`, undefined]
  } else {
    if (offset !== undefined) {
      ctx.accessExternalVariable(curVar.text, offset + curVar.offset)
    } else {
      ctx.accessExternalVariable(curVar.text)
    }

    if (isDollar) {
      yield [`__MPX_dollars.`, undefined]
    } else {
      yield [`__MPX_ctx.`, undefined]
    }
    yield [
      code.slice(curVar.offset, curVar.offset + curVar.text.length),
      curVar.offset,
      completionType,
      locals,
    ]
  }
}

function walkIdentifiers(
  ts: typeof import('typescript'),
  node: ts.Node,
  ast: ts.SourceFile,
  cb: (varNode: ts.Identifier, isShorthand: boolean) => void,
  ctx: TemplateCodegenContext,
  blockVars: string[] = [],
  isRoot: boolean = true,
) {
  if (ts.isIdentifier(node)) {
    cb(node, false)
  } else if (ts.isShorthandPropertyAssignment(node)) {
    cb(node.name, true)
  } else if (ts.isPropertyAccessExpression(node)) {
    walkIdentifiers(ts, node.expression, ast, cb, ctx, blockVars, false)
  } else if (ts.isVariableDeclaration(node)) {
    collectVars(ts, node.name, ast, blockVars)

    for (const varName of blockVars) {
      ctx.addLocalVariable(varName)
    }

    if (node.initializer) {
      walkIdentifiers(ts, node.initializer, ast, cb, ctx, blockVars, false)
    }
  } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    processFunction(ts, node, ast, cb, ctx)
  } else if (ts.isObjectLiteralExpression(node)) {
    for (const prop of node.properties) {
      if (ts.isPropertyAssignment(prop)) {
        if (ts.isComputedPropertyName(prop.name)) {
          walkIdentifiers(
            ts,
            prop.name.expression,
            ast,
            cb,
            ctx,
            blockVars,
            false,
          )
        }
        walkIdentifiers(ts, prop.initializer, ast, cb, ctx, blockVars, false)
      } else if (ts.isShorthandPropertyAssignment(prop)) {
        walkIdentifiers(ts, prop, ast, cb, ctx, blockVars, false)
      } else if (ts.isSpreadAssignment(prop)) {
        // TODO: cannot report "Spread types may only be created from object types.ts(2698)"
        walkIdentifiers(ts, prop.expression, ast, cb, ctx, blockVars, false)
      } else if (ts.isFunctionLike(prop) && prop.body) {
        processFunction(ts, prop, ast, cb, ctx)
      }
    }
  } else if (ts.isTypeReferenceNode(node)) {
    ts.forEachChild(node, node => walkIdentifiersInTypeReference(ts, node, cb))
  } else {
    const _blockVars = blockVars
    if (ts.isBlock(node)) {
      blockVars = []
    }
    ts.forEachChild(node, node =>
      walkIdentifiers(ts, node, ast, cb, ctx, blockVars, false),
    )
    if (ts.isBlock(node)) {
      for (const varName of blockVars) {
        ctx.removeLocalVariable(varName)
      }
    }
    blockVars = _blockVars
  }

  if (isRoot) {
    for (const varName of blockVars) {
      ctx.removeLocalVariable(varName)
    }
  }
}

function processFunction(
  ts: typeof import('typescript'),
  node:
    | ts.ArrowFunction
    | ts.FunctionExpression
    | ts.AccessorDeclaration
    | ts.MethodDeclaration,
  ast: ts.SourceFile,
  cb: (varNode: ts.Identifier, isShorthand: boolean) => void,
  ctx: TemplateCodegenContext,
) {
  const functionArgs: string[] = []
  for (const param of node.parameters) {
    collectVars(ts, param.name, ast, functionArgs)
    if (param.type) {
      walkIdentifiers(ts, param.type, ast, cb, ctx)
    }
  }
  for (const varName of functionArgs) {
    ctx.addLocalVariable(varName)
  }
  if (node.body) {
    walkIdentifiers(ts, node.body, ast, cb, ctx)
  }
  for (const varName of functionArgs) {
    ctx.removeLocalVariable(varName)
  }
}

function walkIdentifiersInTypeReference(
  ts: typeof import('typescript'),
  node: ts.Node,
  cb: (varNode: ts.Identifier, isShorthand: boolean) => void,
) {
  if (ts.isTypeQueryNode(node) && ts.isIdentifier(node.exprName)) {
    cb(node.exprName, false)
  } else {
    ts.forEachChild(node, node => walkIdentifiersInTypeReference(ts, node, cb))
  }
}

function shouldIdentifierSkipped(
  ctx: TemplateCodegenContext,
  text: string,
  destructuredPropNames: Set<string> | undefined,
  templateGlobalDefs: string[],
) {
  return (
    ctx.hasLocalVariable(text) ||
    isGloballyAllowed(text) ||
    isMpxGloballyWhitelisted(text) ||
    isLiteralWhitelisted(text) ||
    text === 'require' ||
    text.startsWith('__VLS_') ||
    destructuredPropNames?.has(text) ||
    templateGlobalDefs.includes(text)
  )
}
