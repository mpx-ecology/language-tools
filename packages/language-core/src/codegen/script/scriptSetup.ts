import { camelize } from '@mpxjs/language-shared'
import {
  type ScriptSetupRanges,
  parseBindingRanges,
} from '../../parsers/scriptSetupRanges'
import type { Code, Sfc, TextRange } from '../../types'
import { codeFeatures } from '../codeFeatures'
import { endOfLine, generateSfcBlockSection, newLine } from '../utils'
import { generateCamelized } from '../utils/camelized'
import { generateComponentSelf } from './componentSelf'
import type { ScriptCodegenContext } from './context'
import {
  type ScriptCodegenOptions,
  generateScriptSectionPartiallyEnding,
} from './index'
import { generateTemplate } from './template'

export function* generateScriptSetupImports(
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  scriptSetupRanges: ScriptSetupRanges,
): Generator<Code> {
  yield [
    scriptSetup.content.slice(
      0,
      Math.max(
        scriptSetupRanges.importSectionEndOffset,
        scriptSetupRanges.leadingCommentEndOffset,
      ),
    ),
    'scriptSetup',
    0,
    codeFeatures.all,
  ]
}

export function* generateScriptSetup(
  options: ScriptCodegenOptions,
  ctx: ScriptCodegenContext,
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  scriptSetupRanges: ScriptSetupRanges,
): Generator<Code> {
  const setupCodes = generateSetupMacros(
    options,
    ctx,
    scriptSetup,
    scriptSetupRanges,
    generateSetupFunction(options, ctx, scriptSetup, scriptSetupRanges),
  )
  if (!options.sfc.script) {
    // no script block, generate script setup code at root
    yield* setupCodes
  } else {
    yield `export default `
    yield `await (async () => {${newLine}`
    yield* setupCodes
    yield `})()`
  }
}

function* generateSetupFunction(
  options: ScriptCodegenOptions,
  ctx: ScriptCodegenContext,
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  scriptSetupRanges: ScriptSetupRanges,
): Generator<Code> {
  let setupCodeModifies: [Code[], number, number][] = []
  if (scriptSetupRanges.defineProps) {
    const { statement, callExp, typeArg } = scriptSetupRanges.defineProps
    /**
     * fix: set `name` to `undefined`
     * 额外给 __VLS_defineProps 赋值一次，防止仅解构一部分时找不到未解构类型
     */
    setupCodeModifies.push(
      ...generateDefineWithType(
        scriptSetup,
        statement,
        scriptSetupRanges.withDefaults?.callExp ?? callExp,
        typeArg,
        undefined,
        `__VLS_defineProps`,
        `__VLS_Props`,
      ),
    )
  }
  if (scriptSetupRanges.defineSlots) {
    const { name, statement, callExp, typeArg } = scriptSetupRanges.defineSlots
    setupCodeModifies.push(
      ...generateDefineWithType(
        scriptSetup,
        statement,
        callExp,
        typeArg,
        name,
        `__VLS_slots`,
        `__VLS_Slots`,
      ),
    )
  }
  if (scriptSetupRanges.defineOptions) {
    const { callExp, arg } = scriptSetupRanges.defineOptions
    if (arg) {
      setupCodeModifies.push([
        [
          `const __VLS_defineOptions = DefineComponent(`,
          generateSfcBlockSection(scriptSetup, arg.start, arg.end, {
            ...codeFeatures.all,
            verification: false, // 避免重复报错
          }),
          `)${endOfLine}`,
        ],
        callExp.start,
        callExp.start,
      ])
    } else {
      setupCodeModifies.push([
        [`const __VLS_defineOptions = {}${endOfLine}`],
        callExp.start,
        callExp.start,
      ])
    }
  }
  if (scriptSetupRanges.onReactHooksExec) {
    const { callExp, arg } = scriptSetupRanges.onReactHooksExec
    if (arg) {
      setupCodeModifies.push(
        [
          [
            `const __VLS_onReactHooksExec = `,
            generateSfcBlockSection(scriptSetup, arg.start, arg.end, {
              ...codeFeatures.all,
              verification: false, // 避免重复报错
            }),
            endOfLine,
          ],
          callExp.start,
          callExp.start,
        ],
        [[`__VLS_onReactHooksExec`], arg.start, arg.end],
      )
    }
  }
  if (scriptSetupRanges.defineExpose) {
    const { callExp, arg, typeArg } = scriptSetupRanges.defineExpose
    if (typeArg) {
      setupCodeModifies.push(
        [
          [
            `let __VLS_defineExpose!: `,
            generateSfcBlockSection(
              scriptSetup,
              typeArg.start,
              typeArg.end,
              codeFeatures.all,
            ),
            endOfLine,
          ],
          callExp.start,
          callExp.start,
        ],
        [[`typeof __VLS_defineExpose`], typeArg.start, typeArg.end],
      )
    } else if (arg) {
      setupCodeModifies.push(
        [
          [
            `const __VLS_defineExpose = `,
            generateSfcBlockSection(
              scriptSetup,
              arg.start,
              arg.end,
              codeFeatures.all,
            ),
            ` as const${endOfLine}`,
          ],
          callExp.start,
          callExp.start,
        ],
        [[`__VLS_defineExpose`], arg.start, arg.end],
      )
    } else {
      setupCodeModifies.push([
        [`const __VLS_defineExpose = {}${endOfLine}`],
        callExp.start,
        callExp.start,
      ])
    }
  }
  const isTs = options.lang !== 'js'
  for (const { callExp, exp, arg } of scriptSetupRanges.useTemplateRef) {
    const templateRefType = arg
      ? [
          `__VLS_TemplateRefs[`,
          generateSfcBlockSection(
            scriptSetup,
            arg.start,
            arg.end,
            codeFeatures.all,
          ),
          `]`,
        ]
      : [`unknown`]
    if (isTs) {
      setupCodeModifies.push([[`<`, ...templateRefType, `>`], exp.end, exp.end])
    } else {
      setupCodeModifies.push(
        [[`(`], callExp.start, callExp.start],
        [
          [` as __VLS_UseTemplateRef<`, ...templateRefType, `>)`],
          callExp.end,
          callExp.end,
        ],
      )
    }
    if (arg) {
      setupCodeModifies.push([[`__VLS_placeholder`], arg.start, arg.end])
    }
  }
  setupCodeModifies = setupCodeModifies.sort((a, b) => a[1] - b[1])

  let nextStart = Math.max(
    scriptSetupRanges.importSectionEndOffset,
    scriptSetupRanges.leadingCommentEndOffset,
  )
  for (const [codes, start, end] of setupCodeModifies) {
    yield generateSfcBlockSection(
      scriptSetup,
      nextStart,
      start,
      codeFeatures.all,
    )
    yield* codes
    nextStart = end
  }
  yield generateSfcBlockSection(
    scriptSetup,
    nextStart,
    scriptSetup.content.length,
    codeFeatures.all,
  )

  yield* generateScriptSectionPartiallyEnding(
    scriptSetup.name,
    scriptSetup.content.length,
    '#3632/scriptSetup',
  )

  if (
    scriptSetupRanges.defineProps?.typeArg &&
    scriptSetupRanges.withDefaults?.arg
  ) {
    yield `const __VLS_withDefaultsArg = (function <T>(t: T) { return t })(`
    yield generateSfcBlockSection(
      scriptSetup,
      scriptSetupRanges.withDefaults.arg.start,
      scriptSetupRanges.withDefaults.arg.end,
      codeFeatures.navigation,
    )
    yield `)${endOfLine}`
  }

  yield* generateComponentProps(ctx, scriptSetup, scriptSetupRanges)
  yield* generateTemplate(options, ctx)
  yield* generateComponentSelf(options)
}

function* generateSetupMacros(
  options: ScriptCodegenOptions,
  ctx: ScriptCodegenContext,
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  scriptSetupRanges: ScriptSetupRanges,
  codes: Generator<Code>,
): Generator<Code> {
  // Template bindings exclude type-only imports, but those imports must still
  // keep their own symbols (including typeof queries and invalid value uses).
  const bindingNames = new Set(ctx.bindingNames)
  for (const block of [options.sfc.script, scriptSetup]) {
    if (block) {
      for (const { range } of parseBindingRanges(options.ts, block.ast, true)) {
        bindingNames.add(block.content.slice(range.start, range.end))
      }
    }
  }

  const calls: { name: string; type: string; exp: TextRange }[] = []
  for (const [range, type] of [
    [scriptSetupRanges.defineProps, '__VLS_MpxDefineProps'],
    [scriptSetupRanges.withDefaults, '__VLS_MpxWithDefaults'],
  ] as const) {
    if (range) {
      const name = scriptSetup.content.slice(range.exp.start, range.exp.end)
      if (!bindingNames.has(name)) {
        calls.push({ name, type, exp: range.exp })
      }
    }
  }
  calls.sort((a, b) => a.exp.start - b.exp.start)

  if (calls.length) {
    const type = `{ ${calls.map(call => `${call.name}: ${call.type}`).join('; ')} }`
    yield options.lang === 'js'
      ? `const __VLS_setupMacros = /** @type {${type}} */ ({})${endOfLine}`
      : `const __VLS_setupMacros = {} as ${type}${endOfLine}`
    // Keep navigation on the ambient symbol, independently of the Mpx signature
    // used for checking/hover. These compiler macros cannot be renamed locally.
    for (const call of calls) {
      yield [
        call.name,
        scriptSetup.name,
        call.exp.start,
        codeFeatures.navigationWithoutRename,
      ]
      yield endOfLine
    }
  }

  for (const code of codes) {
    if (typeof code === 'string' || code[1] !== scriptSetup.name) {
      yield code
      continue
    }
    const [text, source, start, features] = code
    const end = start + text.length
    let offset = start
    for (const call of calls) {
      if (call.exp.start < start || call.exp.end > end) {
        continue
      }
      if (offset < call.exp.start) {
        yield [
          text.slice(offset - start, call.exp.start - start),
          source,
          offset,
          features,
        ]
      }
      yield '__VLS_setupMacros.'
      yield [
        call.name,
        source,
        call.exp.start,
        { ...features, navigation: false },
      ]
      offset = call.exp.end
    }
    if (offset === start) {
      yield code
    } else if (offset < end) {
      yield [text.slice(offset - start), source, offset, features]
    }
  }
}

function* generateDefineWithType(
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  statement: TextRange,
  callExp: TextRange,
  typeArg: TextRange | undefined,
  name: string | undefined,
  defaultName: string,
  typeName: string,
): Generator<[Code[], number, number]> {
  if (typeArg) {
    yield [
      [
        `type ${typeName} = `,
        generateSfcBlockSection(
          scriptSetup,
          typeArg.start,
          typeArg.end,
          codeFeatures.all,
        ),
        endOfLine,
      ],
      statement.start,
      statement.start,
    ]
    yield [[typeName], typeArg.start, typeArg.end]
  }
  if (!name) {
    if (statement.start === callExp.start && statement.end === callExp.end) {
      yield [[`const ${defaultName} = `], callExp.start, callExp.start]
    } else if (typeArg) {
      yield [
        [
          `const ${defaultName} = `,
          generateSfcBlockSection(
            scriptSetup,
            callExp.start,
            typeArg.start,
            codeFeatures.all,
          ),
        ],
        statement.start,
        typeArg.start,
      ]
      yield [
        [
          generateSfcBlockSection(
            scriptSetup,
            typeArg.end,
            callExp.end,
            codeFeatures.all,
          ),
          endOfLine,
          generateSfcBlockSection(
            scriptSetup,
            statement.start,
            callExp.start,
            codeFeatures.all,
          ),
          defaultName,
        ],
        typeArg.end,
        callExp.end,
      ]
    } else {
      yield [
        [
          `const ${defaultName} = `,
          generateSfcBlockSection(
            scriptSetup,
            callExp.start,
            callExp.end,
            codeFeatures.all,
          ),
          endOfLine,
          generateSfcBlockSection(
            scriptSetup,
            statement.start,
            callExp.start,
            codeFeatures.all,
          ),
          defaultName,
        ],
        statement.start,
        callExp.end,
      ]
    }
  }
}

function* generateComponentProps(
  ctx: ScriptCodegenContext,
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  scriptSetupRanges: ScriptSetupRanges,
): Generator<Code> {
  if (scriptSetupRanges.defineProp.length) {
    yield `const __VLS_defaults = {${newLine}`
    for (const defineProp of scriptSetupRanges.defineProp) {
      if (!defineProp.defaultValue) {
        continue
      }

      const [propName, localName] = getPropAndLocalName(scriptSetup, defineProp)

      if (defineProp.name || defineProp.isModel) {
        yield `'${propName}'`
      } else if (defineProp.localName) {
        yield localName!
      } else {
        continue
      }

      yield `: `
      yield getRangeText(scriptSetup, defineProp.defaultValue)
      yield `,${newLine}`
    }
    yield `}${endOfLine}`
  }

  yield `type __VLS_PublicProps = `

  if (scriptSetupRanges.defineProps?.typeArg) {
    if (ctx.generatedPropsType) {
      yield ` & `
    }
    ctx.generatedPropsType = true
    yield `__VLS_Props`
  }
  if (scriptSetupRanges.defineProps?.arg) {
    if (ctx.generatedPropsType) {
      yield ` & `
    }
    ctx.generatedPropsType = true
    yield `Partial<typeof __VLS_defineProps>`
  }
  if (scriptSetupRanges.defineProp.length) {
    if (ctx.generatedPropsType) {
      yield ` & `
    }
    ctx.generatedPropsType = true
    yield `{${newLine}`
    for (const defineProp of scriptSetupRanges.defineProp) {
      const [propName, localName] = getPropAndLocalName(scriptSetup, defineProp)

      if (defineProp.comments) {
        yield scriptSetup.content.slice(
          defineProp.comments.start,
          defineProp.comments.end,
        )
        yield newLine
      }

      if (defineProp.isModel && !defineProp.name) {
        yield propName!
      } else if (defineProp.name) {
        yield* generateCamelized(
          getRangeText(scriptSetup, defineProp.name),
          scriptSetup.name,
          defineProp.name.start,
          codeFeatures.navigation,
        )
      } else if (defineProp.localName) {
        yield generateSfcBlockSection(
          scriptSetup,
          defineProp.localName.start,
          defineProp.localName.end,
          codeFeatures.navigation,
        )
      } else {
        continue
      }

      yield defineProp.required ? `: ` : `?: `
      yield* generateDefinePropType(
        scriptSetup,
        propName,
        localName,
        defineProp,
      )
      yield `,${newLine}`

      if (defineProp.modifierType) {
        const modifierName = `${defineProp.name ? propName : 'model'}Modifiers`
        const modifierType = getRangeText(scriptSetup, defineProp.modifierType)
        yield `'${modifierName}'?: Partial<Record<${modifierType}, true>>,${newLine}`
      }
    }
    yield `}`
  }
  if (!ctx.generatedPropsType) {
    yield `{}`
  }
  yield endOfLine
}

function* generateDefinePropType(
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  propName: string | undefined,
  localName: string | undefined,
  defineProp: ScriptSetupRanges['defineProp'][number],
) {
  if (defineProp.type) {
    // Infer from defineProp<T>
    yield getRangeText(scriptSetup, defineProp.type)
  } else if (defineProp.runtimeType && localName) {
    // Infer from actual prop declaration code
    yield `typeof ${localName}['value']`
  } else if (defineProp.defaultValue && propName) {
    // Infer from defineProp({default: T})
    yield `typeof __VLS_defaults['${propName}']`
  } else {
    yield `any`
  }
}

function getPropAndLocalName(
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  defineProp: ScriptSetupRanges['defineProp'][number],
) {
  const localName = defineProp.localName
    ? getRangeText(scriptSetup, defineProp.localName)
    : undefined
  const propName = defineProp.name
    ? camelize(getRangeText(scriptSetup, defineProp.name).slice(1, -1))
    : defineProp.isModel
      ? 'modelValue'
      : localName
  return [propName, localName] as const
}

function getRangeText(
  scriptSetup: NonNullable<Sfc['scriptSetup']>,
  range: TextRange,
) {
  return scriptSetup.content.slice(range.start, range.end)
}
