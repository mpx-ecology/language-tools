// @ts-nocheck
import type * as ts from 'typescript'
import type { RequestContext } from './types'
import { MpxVirtualCode } from '@mpxjs/language-core'

export function getSemanticDiagnostics(
  this: RequestContext,
  fileName: string,
  embeddedCodeId: string,
): ts.Diagnostic[] | undefined {
  const {
    typescript: ts,
    language,
    languageService,
    getFileId,
    languageServiceHost,
  } = this
  const volarFile = language.scripts.get(getFileId(fileName))

  if (
    !(volarFile?.generated?.root instanceof MpxVirtualCode) ||
    !embeddedCodeId
  ) {
    return
  }

  const jsCode = volarFile.generated.embeddedCodes.get(embeddedCodeId)

  if (!jsCode) {
    return
  }

  const virtualFileName = fileName + '.' + embeddedCodeId + '.js'

  try {
    // 获取虚拟代码的内容
    const virtualText = jsCode.snapshot.getText(0, jsCode.snapshot.getLength())

    // 如果虚拟代码为空，返回空数组
    if (!virtualText.trim()) {
      return []
    }

    const ast = ts.createSourceFile(
      virtualFileName,
      virtualText,
      99 satisfies ts.ScriptTarget.Latest,
    )
    const program = languageService.getProgram()
    const originalGetSourceFile = program.getSourceFile

    program.getSourceFile = fileName => {
      if (fileName === virtualFileName) {
        return ast
      }
      return originalGetSourceFile(fileName)
    }
    const sourceFile = program.getSourceFile(virtualFileName)

    const diagnostics = languageService.getSemanticDiagnostics(virtualFileName)

    program.getSourceFile = originalGetSourceFile

    // 过滤和映射诊断信息
    return diagnostics.map(diagnostic => {
      // 可以在这里进行位置映射，将虚拟文件的位置映射回原始文件
      // 这需要使用 jsCode.mappings 来进行坐标转换
      return diagnostic
    })
  } catch (error) {
    console.error(
      'Error getting semantic diagnostics for embedded code:',
      error,
    )
    return []
  }
}
