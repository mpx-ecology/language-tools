import type { CodeInformation } from '@volar/language-core'
import type { Code, MpxLanguagePlugin } from '../types'
import * as CompilerDOM from '@vue/compiler-dom'
import { forEachElementNode } from '../codegen/template'
import { allCodeFeatures } from './shared'

const codeFeatures: CodeInformation = {
  ...allCodeFeatures,
  format: false,
  structure: false,
  verification: false,
}

const plugin: MpxLanguagePlugin = () => {
  return {
    name: 'mpx-template-inline-css',

    getEmbeddedCodes(_fileName, sfc) {
      if (!sfc.template?.ast) {
        return []
      }
      return [{ id: 'template_inline_css', lang: 'css' }]
    },

    resolveEmbeddedCode(_fileName, sfc, embeddedFile) {
      if (embeddedFile.id !== 'template_inline_css' || !sfc.template?.ast) {
        return
      }
      embeddedFile.parentCodeId = 'template'
      embeddedFile.content.push(...generate(sfc.template.ast))
    },
  }
}

export default plugin

function* generate(
  templateAst: NonNullable<CompilerDOM.RootNode>,
): Generator<Code> {
  for (const node of forEachElementNode(templateAst)) {
    for (const prop of node.props) {
      if (
        prop.type === CompilerDOM.NodeTypes.DIRECTIVE &&
        prop.name === 'bind' &&
        prop.arg?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
        prop.exp?.type === CompilerDOM.NodeTypes.SIMPLE_EXPRESSION &&
        prop.arg.content === 'style' &&
        prop.exp.constType === CompilerDOM.ConstantTypes.CAN_STRINGIFY &&
        hasNotExpression(prop.arg.loc.source)
      ) {
        const endCrt = prop.arg.loc.source[prop.arg.loc.source.length - 1] // " | '
        const start = prop.arg.loc.source.indexOf(endCrt) + 1
        const end = prop.arg.loc.source.lastIndexOf(endCrt)
        const content = prop.arg.loc.source.slice(start, end)

        yield `x { `
        yield [
          content,
          'template',
          prop.arg.loc.start.offset + start,
          codeFeatures,
        ]
        yield ` }\n`
      }
    }
  }
}

function hasNotExpression(source: string): boolean {
  return !source.includes('{{') && !source.includes('}}')
}
