import type { TemplateCodegenOptions } from './index'
import type { Code, MpxCodeInformation } from '../../types'

import * as CompilerDOM from '@vue/compiler-dom'
import { codeFeatures } from '../codeFeatures'
import { endOfLine, newLine, wrapWith } from '../utils'

export type TemplateCodegenContext = ReturnType<
  typeof createTemplateCodegenContext
>

const commentDirectiveRegex =
  /^<!--\s*@mpx-(?<name>[-\w]+)\b(?<content>[\s\S]*)-->$/

export function createTemplateCodegenContext(
  options: Pick<TemplateCodegenOptions, 'scriptSetupBindingNames'>,
) {
  let variableId = 0

  function resolveCodeFeatures(features: MpxCodeInformation) {
    if (features.verification && stack.length) {
      const data = stack[stack.length - 1]
      if (data.ignoreError) {
        // We are currently in a region of code covered by a @mpx-ignore directive.
        return {
          ...features,
          verification: false,
        }
      }
      if (data.expectError !== undefined) {
        // We are currently in a region of code covered by a @mpx-expect-error directive.
        return {
          ...features,
          verification: {
            shouldReport: () => {
              data.expectError!.token++
              return false
            },
          },
        }
      }
    }
    return features
  }

  const hoistVars = new Map<string, string>()
  const localVars = new Map<string, number>()
  const dollarVars = new Set<string>()
  const accessExternalVariables = new Map<string, Set<number>>()
  const slots: {
    name: string
    offset?: number
    tagRange: [number, number]
    nodeLoc: any
    propsVar: string
  }[] = []
  const dynamicSlots: {
    expVar: string
    propsVar: string
  }[] = []
  const blockConditions: string[] = []
  const scopedClasses: {
    source: string
    className: string
    offset: number
  }[] = []
  const emptyClassOffsets: number[] = []
  const bindingAttrLocs: CompilerDOM.SourceLocation[] = []
  const inheritedAttrVars = new Set<string>()
  const templateRefs = new Map<
    string,
    {
      typeExp: string
      offset: number
    }[]
  >()

  const stack: {
    ignoreError?: boolean
    expectError?: {
      token: number
      node: CompilerDOM.CommentNode
    }
  }[] = []
  const commentBuffer: CompilerDOM.CommentNode[] = []

  return {
    get currentInfo() {
      return stack[stack.length - 1]
    },
    codeFeatures: new Proxy(codeFeatures, {
      get(target, key: keyof typeof codeFeatures) {
        const data = target[key]
        return resolveCodeFeatures(data)
      },
    }),
    resolveCodeFeatures,
    inWxFor: false,
    slots,
    dynamicSlots,
    dollarVars,
    accessExternalVariables,
    blockConditions,
    scopedClasses,
    emptyClassOffsets,
    bindingAttrLocs,
    inheritedAttrVars,
    templateRefs,
    currentComponent: undefined as
      | {
          ctxVar: string
          childTypes: string[]
          used: boolean
        }
      | undefined,
    singleRootElTypes: [] as string[],
    singleRootNodes: new Set<CompilerDOM.ElementNode | null>(),
    addTemplateRef(name: string, typeExp: string, offset: number) {
      let refs = templateRefs.get(name)
      if (!refs) {
        templateRefs.set(name, (refs = []))
      }
      refs.push({ typeExp, offset })
    },
    accessExternalVariable(name: string, offset?: number) {
      let arr = accessExternalVariables.get(name)
      if (!arr) {
        accessExternalVariables.set(name, (arr = new Set()))
      }
      if (offset !== undefined) {
        arr.add(offset)
      }
    },
    hasLocalVariable(name: string) {
      return !!localVars.get(name)
    },
    addLocalVariable(name: string) {
      localVars.set(name, (localVars.get(name) ?? 0) + 1)
    },
    removeLocalVariable(name: string) {
      localVars.set(name, localVars.get(name)! - 1)
    },
    getInternalVariable() {
      return `__VLS_${variableId++}`
    },
    getHoistVariable(originalVar: string) {
      let name = hoistVars.get(originalVar)
      if (name === undefined) {
        hoistVars.set(originalVar, (name = `__VLS_${variableId++}`))
      }
      return name
    },
    *generateHoistVariables() {
      // trick to avoid TS 4081 (#5186)
      if (hoistVars.size) {
        yield `// @ts-ignore${newLine}`
        yield `var `
        for (const [originalVar, hoistVar] of hoistVars) {
          yield `${hoistVar} = ${originalVar}, `
        }
        yield endOfLine
      }
    },
    *generateConditionGuards() {
      for (const condition of blockConditions) {
        yield `if (!${condition}) return${endOfLine}`
      }
    },
    *generateAutoImportCompletion(): Generator<Code> {
      const all = [...accessExternalVariables.entries()]
      if (!all.some(([_, offsets]) => offsets.size)) {
        return
      }
      yield `// @ts-ignore${newLine}`
      yield `[`
      for (const [varName, offsets] of all) {
        for (const offset of offsets) {
          if (options.scriptSetupBindingNames.has(varName)) {
            yield [
              varName,
              'template',
              offset,
              {
                ...codeFeatures.additionalCompletion,
                ...codeFeatures.withoutHighlightAndCompletionAndNavigation,
              },
            ]
          } else {
            yield [
              varName,
              'template',
              offset,
              codeFeatures.additionalCompletion,
            ]
          }
          yield `,`
        }
        offsets.clear()
      }
      yield `]${endOfLine}`
    },
    enter(
      node:
        | CompilerDOM.RootNode
        | CompilerDOM.TemplateChildNode
        | CompilerDOM.SimpleExpressionNode,
    ) {
      if (node.type === CompilerDOM.NodeTypes.COMMENT) {
        commentBuffer.push(node)
        return false
      }

      const data: (typeof stack)[number] = {}
      const comments = [...commentBuffer]
      commentBuffer.length = 0

      for (const comment of comments) {
        const match = comment.loc.source.match(commentDirectiveRegex)
        if (match) {
          const { name } = match.groups!
          switch (name) {
            case 'skip': {
              return false
            }
            case 'ignore': {
              data.ignoreError = true
              break
            }
            case 'expect-error': {
              data.expectError = {
                token: 0,
                node: comment,
              }
              break
            }
          }
        }
      }
      stack.push(data)
      return true
    },
    *exit(): Generator<Code> {
      const data = stack.pop()!
      commentBuffer.length = 0
      if (data.expectError !== undefined) {
        yield* wrapWith(
          data.expectError.node.loc.start.offset,
          data.expectError.node.loc.end.offset,
          {
            verification: {
              // If no errors/warnings/diagnostics were reported within the region of code covered
              // by the @mpx-expect-error directive, then we should allow any `unused @ts-expect-error`
              // diagnostics to be reported upward.
              shouldReport: () => data.expectError!.token === 0,
            },
          },
          `// @ts-expect-error`,
        )
        yield `${newLine}${endOfLine}`
      }
    },
  }
}
