import * as CompilerDOM from '@vue/compiler-dom'

export type Node =
  | CompilerDOM.RootNode
  | CompilerDOM.TemplateChildNode
  | CompilerDOM.ExpressionNode
  | CompilerDOM.AttributeNode
  | CompilerDOM.DirectiveNode
