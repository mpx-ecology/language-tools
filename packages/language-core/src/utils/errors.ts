import type { CompilerError, SourceLocation } from '@vue/compiler-dom'

export interface MpxCompilerError extends CompilerError {
  code: MpxErrorCodes
}

export function createMpxCompilerError(
  code: MpxErrorCodes,
  loc?: SourceLocation,
  messages?: string,
): MpxCompilerError {
  const msg = messages || mpxErrorMessages[code]
  const error = new SyntaxError(String(msg)) as MpxCompilerError
  error.code = code
  error.loc = loc
  return error
}

export enum MpxErrorCodes {
  // mpx template transform errors
  TEMPLATE_WX_FOR_VALUE_BRACE = 1001,
  TEMPLATE_WX_IF_VALUE_BRACE,
  TEMPLATE_WX_IF_NO_ADJACENT_BRANCH,

  // others ..
}

export const mpxErrorMessages: Record<MpxErrorCodes, string> = {
  // mpx template transform errors
  [MpxErrorCodes.TEMPLATE_WX_IF_VALUE_BRACE]:
    'wx:if 双括号表达式前后不应该包含空格，否则会导致编译时错误。',
  [MpxErrorCodes.TEMPLATE_WX_FOR_VALUE_BRACE]:
    'wx:for 双括号表达式前后不应该包含空格，否则会导致编译时错误。',
  [MpxErrorCodes.TEMPLATE_WX_IF_NO_ADJACENT_BRANCH]: `wx:elif/wx:else 没有相邻的 wx:if 或者 wx:elif。`,

  // others ..
}
