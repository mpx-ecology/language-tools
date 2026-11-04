import * as CompilerDOM from '@vue/compiler-dom'
import { camelize, capitalize } from '@mpxjs/language-shared'
import type { Code } from '../../types'
import type { ScriptCodegenOptions } from './index'
import { codeFeatures } from '../codeFeatures'
import { endOfLine, normalizeAttributeValue } from '../utils'
import { generateObjectProperty } from '../template/objectProperty'
import {
  getCanonicalComponentName,
  getPossibleOriginalComponentNames,
} from '../template/element'

// Resolve from the component registry, independently of __MPX_ctx. Exposing
// refs back to the template must not create a circular context/ref type.
export function* generateTemplateRefs(
  options: ScriptCodegenOptions,
): Generator<Code> {
  const refs = new Map<string, { type: string; offset: number }[]>()
  if (options.sfc.template?.ast) visit(options.sfc.template.ast, false)
  yield `type __VLS_TemplateRefs = {}`
  for (const [name, entries] of refs) {
    const type = [...new Set(entries.map(entry => entry.type))].join(' | ')
    for (const entry of entries) {
      yield ` & { `
      yield* generateObjectProperty(name, entry.offset, codeFeatures.navigation)
      yield `: ${type} }`
    }
  }
  yield endOfLine

  function visit(
    node: CompilerDOM.RootNode | CompilerDOM.TemplateChildNode,
    inFor: boolean,
  ) {
    if (node.type === CompilerDOM.NodeTypes.IF) {
      for (const branch of node.branches) {
        for (const child of branch.children) visit(child, inFor)
      }
    } else if (node.type === CompilerDOM.NodeTypes.FOR) {
      for (const child of node.children) visit(child, true)
    } else if (
      node.type === CompilerDOM.NodeTypes.ROOT ||
      node.type === CompilerDOM.NodeTypes.ELEMENT
    ) {
      if (node.type === CompilerDOM.NodeTypes.ELEMENT) {
        const ref = node.props.find(
          (prop): prop is CompilerDOM.AttributeNode =>
            prop.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
            prop.name === 'wx:ref',
        )
        if (ref?.value) {
          const [name, offset] = normalizeAttributeValue(ref.value)
          if (name && !name.includes('{{')) {
            let type = 'WechatMiniprogram.NodesRef'
            const registeredNames = [
              ...(options.sfc.json?.usingComponents?.keys() ?? []),
            ]
            const component =
              node.tagType === CompilerDOM.ElementTypes.COMPONENT ||
              registeredNames.some(
                name =>
                  capitalize(camelize(name)) === capitalize(camelize(node.tag)),
              )
            if (component) {
              const canonical = getCanonicalComponentName(node.tag)
              const names = getPossibleOriginalComponentNames(
                node.tag,
                false,
              ).map(name => JSON.stringify(name))
              const ctor = `__VLS_WithComponent<${JSON.stringify(canonical)}, typeof __MPX_jsonComponents, void, ${names.join(', ')}>[${JSON.stringify(canonical)}]`
              type = `__VLS_MpxPublicInstance<${ctor}>`
              type = inFor ? `(${type})[]` : `${type} | null | undefined`
            }
            const entries = refs.get(name) ?? []
            entries.push({ type, offset })
            refs.set(name, entries)
          }
        }
      }
      for (const child of node.children) visit(child, inFor)
    }
  }
}
