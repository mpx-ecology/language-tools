// https://github.com/vuejs/core/blob/main/packages/compiler-sfc/src/cssVars.ts#L47-L61

export const commentReg = /(?<=\/\*)[\s\S]*?(?=\*\/)|(?<=\/\/)[\s\S]*?(?=\n)/g

export function fillBlank(css: string, ...regs: RegExp[]) {
  for (const reg of regs) {
    css = css.replace(reg, match => ' '.repeat(match.length))
  }
  return css
}
