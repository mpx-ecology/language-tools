// @ts-ignore
import * as postcssStyl from 'postcss-styl'

/**
 * Stylus Transformer - 智能拍平嵌套的 Stylus 代码
 *
 * 策略:
 * 1. & 开头的选择器总是拼接父级 (.foo &_bar -> .foo_bar)
 * 2. 普通嵌套:
 *    - 无冲突: 提取到顶层并简化 (.parent .child -> .child)
 *    - 有冲突: 保留嵌套结构 (.container1 .item 保留为嵌套)
 */

interface Declaration {
  type: 'decl'
  prop: string
  value: string
  important?: boolean
  raws?: any
  source?: SourceLocation
}

interface Comment {
  type: 'comment'
  text: string
  raws?: {
    before?: string
    left?: string
    right?: string
    inline?: boolean
  }
  source?: SourceLocation
}

interface Rule {
  type: 'rule'
  selector: string
  nodes: Array<Declaration | Comment | Rule>
  pythonic?: boolean
  raws?: any
  source?: SourceLocation
}

interface AtRule {
  type: 'atrule'
  name: string
  params?: string
  raws?: any
  source?: SourceLocation
}

interface Root {
  type: 'root'
  nodes: Array<Rule | AtRule>
  raws?: any
  source?: SourceLocation
}

interface SourceLocation {
  start?: { line: number; column: number; offset: number }
  end?: { line: number; column: number; offset: number }
  inputId?: number
}

interface ConflictInfo {
  selector: string
  locations: Array<{
    fullPath: string
    sourceLine?: number // 源文件行号
    sourceColumn?: number // 源文件列号
    outputLine?: number // 输出文件行号
    outputColumn?: number // 输出文件列号
  }>
}

interface ErrorInfo {
  selector: string
  reason: string
  sourceLine?: number // 源文件行号
  sourceColumn?: number // 源文件列号
  outputLine?: number // 输出文件行号
  outputColumn?: number // 输出文件列号
}

export interface TransformResult {
  code: string
  conflicts: ConflictInfo[]
  errors: ErrorInfo[]
}

/**
 * 格式化声明输出（统一使用 Stylus 语法：无冒号和分号，保留 !important 和行内注释）
 */
function formatDeclaration(decl: Declaration): string {
  const prop = decl.prop
  // 使用原始值（包含行内注释）如果存在
  const rawValue = decl.raws?.value?.raw || decl.value
  // raws.important 包含 " !important" 以及后面的注释（如果有）
  const important = decl.important ? decl.raws?.important || ' !important' : ''

  // 统一使用 Stylus 语法：属性名和值之间用空格分隔，无冒号和分号
  return `${prop} ${rawValue}${important}`
}

/**
 * 格式化注释输出（保留块注释格式）
 */
function formatComment(comment: Comment): string {
  // 检查是否是单行注释（inline 字段为 true）
  const isInlineComment = comment.raws?.inline === true
  if (isInlineComment) {
    return `// ${comment.text}`
  }
  // 否则作为块注释输出
  return `/* ${comment.text} */`
}

/** 提取简单类名（如 .foo -> foo） */
function extractSimpleClassName(selector: string): string | null {
  if (selector.startsWith('&')) return null
  const match = selector.match(/^\.([a-zA-Z0-9_-]+)$/)
  return match?.[1] ?? null
}

/** 检查选择器类型 */
const hasCommaSeparator = (selector: string) => selector.includes(',')
const isAttributeSelector = (selector: string) => selector.startsWith('&[')
const isPseudoSelector = (selector: string) =>
  selector.startsWith('&:') || selector.startsWith('&::')
const isMultiClassCombinator = (selector: string) => selector.startsWith('&.')

/** 分割逗号选择器 */
const splitCommaSelector = (selector: string) =>
  selector.split(',').map(s => s.trim())

/**
 * 收集所有规则的信息
 */
interface RuleData {
  selector: string
  fullPath: string // 用于冲突检测的路径（&.class 会展开为 .class）
  displayPath: string // 用于报告显示的路径（保留原始嵌套结构）
  declarations: Array<Declaration | Comment>
  source?: SourceLocation
  parentPath?: string // 父路径
  hasErrorChildren?: boolean // 是否有错误的子规则
}

/** 提取选择器路径的最后一部分 */
const getLastSelectorPart = (fullPath: string) => {
  const parts = fullPath.trim().split(/\s+/)
  return parts[parts.length - 1] || fullPath
}

/** 计算完整路径（用于冲突检测） */
function computeFullPath(selector: string, parentPath: string): string {
  if (!parentPath) return selector

  if (selector.startsWith('&')) {
    // &.class -> .class (不拼接父级)
    return isMultiClassCombinator(selector)
      ? selector.slice(1)
      : parentPath + selector.slice(1)
  }

  return parentPath + ' ' + selector
}

function collectAllRules(
  rule: Rule,
  parentPath: string = '',
  displayParentPath: string = '',
): RuleData[] {
  const rules: RuleData[] = []

  // 计算完整路径
  const fullPath =
    parentPath && hasCommaSeparator(rule.selector)
      ? rule.selector // 逗号选择器保持原样
      : computeFullPath(rule.selector, parentPath)

  const displayPath =
    parentPath && hasCommaSeparator(rule.selector)
      ? rule.selector
      : parentPath
        ? rule.selector.startsWith('&')
          ? isMultiClassCombinator(rule.selector)
            ? displayParentPath + ' ' + rule.selector
            : displayParentPath + ' ' + rule.selector
          : displayParentPath + ' ' + rule.selector
        : rule.selector

  // 分离声明和嵌套规则
  const declarations: Array<Declaration | Comment> = []
  const nested: Rule[] = []

  for (const node of rule.nodes) {
    if (node.type === 'decl' || node.type === 'comment') {
      declarations.push(node)
    } else if (node.type === 'rule') {
      nested.push(node)
    }
  }

  // 只添加有声明的规则
  if (declarations.length > 0) {
    rules.push({
      selector: rule.selector,
      fullPath,
      displayPath,
      declarations,
      ...(rule.source && { source: rule.source }),
      ...(parentPath && { parentPath }),
    })
  }

  // 递归处理嵌套规则
  for (const n of nested) {
    rules.push(...collectAllRules(n, fullPath, displayPath))
  }

  return rules
}

export function flattenStylusRules(stylusCode: string): TransformResult {
  const ast = postcssStyl.parse(stylusCode) as Root
  const allRules: RuleData[] = []
  const errors: ErrorInfo[] = []
  const errorSelectors = new Set<string>()
  const atRules: AtRule[] = []

  // 收集所有规则并检测不支持的语法
  for (const node of ast.nodes) {
    if (node.type === 'atrule') {
      atRules.push(node)
      continue
    }
    if (node.type !== 'rule') continue

    const rules = collectAllRules(node)

    for (const rule of rules) {
      // 检测错误选择器
      const createError = (reason: string) => ({
        selector: rule.selector,
        reason,
        ...(rule.source?.start && {
          sourceLine: rule.source.start.line,
          sourceColumn: rule.source.start.column,
        }),
      })

      if (isAttributeSelector(rule.selector)) {
        errors.push(createError('不支持 &[ 这种属性选择器写法，请改用普通嵌套'))
        errorSelectors.add(rule.selector)
      } else if (isPseudoSelector(rule.selector)) {
        errors.push(
          createError(
            '不支持 &: 或 &:: 这种伪类/伪元素选择器写法，请改用普通嵌套',
          ),
        )
        errorSelectors.add(rule.selector)
      }
    }

    allRules.push(...rules)
  }

  // 标记有错误子规则的父规则
  for (const rule of allRules) {
    if (rule.source?.start?.line) {
      rule.hasErrorChildren = errors.some(
        error =>
          error.sourceLine &&
          error.sourceLine > rule.source!.start!.line &&
          errorSelectors.has(error.selector),
      )
    }
  }

  // 检测冲突 - 计算选择器的冲突检测 key
  const getSelectorKey = (selector: string, effectivePath: string) => {
    const simpleName = isMultiClassCombinator(selector)
      ? extractSimpleClassName(selector.slice(1))
      : extractSimpleClassName(selector)
    return simpleName || getLastSelectorPart(effectivePath)
  }

  const selectorMap = new Map<
    string,
    Array<{ rule: RuleData; effectivePath: string }>
  >()

  for (const rule of allRules) {
    // 跳过错误选择器和空声明规则
    if (
      errorSelectors.has(rule.selector) ||
      (rule.declarations.length === 0 && !rule.hasErrorChildren)
    ) {
      continue
    }

    // 处理逗号选择器
    if (hasCommaSeparator(rule.selector)) {
      for (const part of splitCommaSelector(rule.selector)) {
        const effectivePath = computeFullPath(part, rule.parentPath || '')
        const key = getSelectorKey(part, effectivePath)

        if (!selectorMap.has(key)) selectorMap.set(key, [])
        selectorMap.get(key)!.push({ rule, effectivePath })
      }
    } else {
      const key = getSelectorKey(rule.selector, rule.fullPath)

      if (!selectorMap.has(key)) selectorMap.set(key, [])
      selectorMap.get(key)!.push({ rule, effectivePath: rule.fullPath })
    }
  }

  const conflictSelectors = new Set<string>()
  const conflictFullPaths = new Set<string>() // 存储冲突的完整路径
  const conflicts: ConflictInfo[] = []

  for (const [key, items] of selectorMap.entries()) {
    // 去重：基于 effectivePath 和源位置去重（同一位置的规则才是重复的）
    const uniqueItems = Array.from(
      new Map(
        items.map(item => {
          const uniqueKey = `${item.effectivePath}:${
            item.rule.source?.start?.line || 0
          }:${item.rule.source?.start?.column || 0}`
          return [uniqueKey, item]
        }),
      ).values(),
    )

    if (uniqueItems.length > 1) {
      conflictSelectors.add(key)

      // 将所有冲突规则的完整路径加入集合（使用规则的实际 fullPath）
      for (const item of uniqueItems) {
        conflictFullPaths.add(item.rule.fullPath)
      }

      const locations = uniqueItems.map(item => {
        const loc: {
          fullPath: string
          sourceLine?: number
          sourceColumn?: number
        } = {
          fullPath: item.rule.displayPath, // 使用 displayPath 显示原始嵌套结构
        }
        if (item.rule.source?.start?.line !== undefined)
          loc.sourceLine = item.rule.source.start.line
        if (item.rule.source?.start?.column !== undefined)
          loc.sourceColumn = item.rule.source.start.column
        return loc
      })

      conflicts.push({ selector: key, locations })
    }
  }

  // 生成输出 - 重新遍历 AST 并根据冲突情况生成代码
  const lines: string[] = []
  const extractedDeclarations: Array<{
    selector: string
    declarations: Array<Declaration | Comment>
  }> = []

  // 先输出所有 at-rules（如 @import）
  for (const atRule of atRules) {
    const params = atRule.params || ''
    lines.push(`@${atRule.name} ${params}`.trim())
  }
  if (atRules.length > 0) {
    lines.push('') // at-rules 后添加空行
  }

  // 跟踪源位置到选择器文本的映射 (源行号:源列号 -> 选择器文本)
  const sourcePosToSelector = new Map<string, string>()

  // 辅助函数：记录并添加选择器行
  function pushSelectorLine(
    selector: string,
    source?: SourceLocation,
    indent: number = 0,
  ): void {
    const indentStr = '  '.repeat(indent)
    lines.push(indentStr + selector)

    if (
      source?.start?.line !== undefined &&
      source?.start?.column !== undefined
    ) {
      const key = `${source.start.line}:${source.start.column}`
      sourcePosToSelector.set(key, selector)
    }
  }

  // 检查选择器是否冲突
  function isRuleConflicted(
    selector: string,
    fullPath: string,
    parentPath: string = '',
  ): boolean {
    // 先检查是否有错误
    if (errorSelectors.has(selector)) return true

    // 逗号选择器需要检查每个部分
    if (hasCommaSeparator(selector)) {
      return splitCommaSelector(selector).some(part => {
        const partFullPath = computeFullPath(part, parentPath)
        const simpleName = extractSimpleClassName(part)
        const lastPart = getLastSelectorPart(partFullPath)

        return (
          conflictFullPaths.has(partFullPath) ||
          (simpleName && conflictSelectors.has(simpleName)) ||
          conflictSelectors.has(lastPart)
        )
      })
    }

    // 普通选择器
    const simpleName = isMultiClassCombinator(selector)
      ? extractSimpleClassName(selector.slice(1))
      : extractSimpleClassName(selector)
    const lastPart = getLastSelectorPart(fullPath)

    return (
      conflictFullPaths.has(fullPath) ||
      (simpleName && conflictSelectors.has(simpleName)) ||
      conflictSelectors.has(lastPart)
    )
  }

  function processRule(
    rule: Rule,
    parentPath: string = '',
    indent: number = 0,
  ): void {
    const indentStr = '  '.repeat(indent)
    let fullPath = rule.selector

    if (parentPath) {
      if (rule.selector.startsWith('&')) {
        fullPath = parentPath + rule.selector.slice(1)
      } else {
        fullPath = parentPath + ' ' + rule.selector
      }
    }

    const declarations: Array<Declaration | Comment> = []
    const nested: Rule[] = []

    for (const node of rule.nodes) {
      if (node.type === 'decl' || node.type === 'comment') {
        declarations.push(node)
      } else if (node.type === 'rule') {
        nested.push(node)
      }
    }
    // 检查嵌套规则是否有冲突（递归检查所有子孙规则）
    function hasAnyNestedConflicts(
      nestedRules: Rule[],
      currentPath: string,
    ): boolean {
      return nestedRules.some(n => {
        const nFullPath = computeFullPath(n.selector, currentPath)

        // 检查当前规则是否冲突
        if (isRuleConflicted(n.selector, nFullPath, currentPath)) return true

        // 递归检查子规则
        const subNested = n.nodes.filter(node => node.type === 'rule') as Rule[]
        return hasAnyNestedConflicts(subNested, nFullPath)
      })
    }

    const hasNestedConflicts = hasAnyNestedConflicts(nested, fullPath)
    const isSelfConflicted = isRuleConflicted(
      rule.selector,
      fullPath,
      parentPath,
    )

    // 分类嵌套规则
    const conflictedNested: Rule[] = []
    const normalNested: Rule[] = []

    for (const n of nested) {
      const nFullPath = computeFullPath(n.selector, fullPath)
      const isConflicted = isRuleConflicted(n.selector, nFullPath, fullPath)

      // 检查该规则的子孙是否有冲突
      const subNested = n.nodes.filter(node => node.type === 'rule') as Rule[]
      const hasDescendantConflicts = hasAnyNestedConflicts(subNested, nFullPath)

      if (isConflicted || hasDescendantConflicts) {
        conflictedNested.push(n)
      } else {
        normalNested.push(n)
      }
    }

    // 是否需要嵌套输出
    const needsNesting = hasNestedConflicts || isSelfConflicted

    if (needsNesting || indent > 0) {
      // 需要嵌套输出（有冲突的子规则或自身冲突）或已经在嵌套中

      // 顶层 + 有嵌套冲突或自身冲突：分开处理声明和嵌套
      if (indent === 0 && needsNesting) {
        // 1. 先输出完整嵌套结构（包含自身冲突的声明或冲突的子规则）
        if (isSelfConflicted || conflictedNested.length > 0) {
          pushSelectorLine(rule.selector, rule.source, indent)

          // 如果自身冲突，输出自己的声明
          if (isSelfConflicted && declarations.length > 0) {
            for (const decl of declarations) {
              if (decl.type === 'decl') {
                lines.push(`  ${formatDeclaration(decl)}`)
              } else if (decl.type === 'comment') {
                lines.push(`  ${formatComment(decl)}`)
              }
            }
          }

          // 输出冲突的子规则
          for (const n of conflictedNested) {
            processRule(n, fullPath, indent + 1)
          }
          lines.push('')
        }

        // 2. 如果有自己的声明且不冲突，单独输出简化版本
        if (!isSelfConflicted && declarations.length > 0) {
          const simpleName = extractSimpleClassName(rule.selector)
          const selectorToUse = simpleName ? `.${simpleName}` : rule.selector
          pushSelectorLine(selectorToUse, rule.source, 0)
          for (const decl of declarations) {
            if (decl.type === 'decl') {
              lines.push(`  ${formatDeclaration(decl)}`)
            } else if (decl.type === 'comment') {
              lines.push(`  ${formatComment(decl)}`)
            }
          }
          lines.push('')
        }
      } else {
        // 已经在嵌套中：需要特殊处理
        // 如果有子孙冲突（但自身不冲突）且有自己的声明，将声明提升到顶层
        if (
          hasNestedConflicts &&
          !isSelfConflicted &&
          declarations.length > 0
        ) {
          let selectorToUse: string
          if (rule.selector.startsWith('&')) {
            // 对于 & 开头的选择器，需要拼接父级
            const parentLastPart = getLastSelectorPart(parentPath)
            selectorToUse = parentLastPart + rule.selector.slice(1)
          } else {
            const simpleName = extractSimpleClassName(rule.selector)
            selectorToUse = simpleName ? `.${simpleName}` : rule.selector
          }
          extractedDeclarations.push({ selector: selectorToUse, declarations })
        }

        // 输出选择器（如果有声明或嵌套）
        if (declarations.length > 0 || needsNesting) {
          pushSelectorLine(rule.selector, rule.source, indent)
        }

        // 如果没有子孙冲突或者自身冲突，输出声明
        if (!hasNestedConflicts || isSelfConflicted) {
          for (const decl of declarations) {
            if (decl.type === 'decl') {
              lines.push(indentStr + `  ${formatDeclaration(decl)}`)
            } else if (decl.type === 'comment') {
              lines.push(indentStr + `  ${formatComment(decl)}`)
            }
          }
        }

        // 输出有冲突的嵌套规则
        for (const n of conflictedNested) {
          processRule(n, fullPath, indent + 1)
        }

        // 如果有嵌套规则需要处理（冲突的或需要拍平的），添加空行分隔
        // 注意：这个空行是为了分隔当前嵌套块和后续拍平的规则
        if (conflictedNested.length > 0 || normalNested.length > 0) {
          // 只在非嵌套层级（indent === 0）或者是嵌套但有拍平规则时添加空行
          // 嵌套层级的空行由顶层的第643行逻辑处理
          if (indent === 0) {
            lines.push('')
          }
        }
      }
    } else {
      // 顶层且无冲突：简化输出
      if (declarations.length > 0) {
        // 处理逗号选择器：保持原样输出
        const selectorToUse = hasCommaSeparator(rule.selector)
          ? rule.selector
          : (() => {
              const simpleName = extractSimpleClassName(rule.selector)
              return simpleName && !fullPath.includes('&')
                ? `.${simpleName}`
                : fullPath
            })()

        lines.push(selectorToUse)

        for (const decl of declarations) {
          if (decl.type === 'decl') {
            lines.push(`  ${formatDeclaration(decl)}`)
          } else if (decl.type === 'comment') {
            lines.push(`  ${formatComment(decl)}`)
          }
        }

        lines.push('')
      }
    }

    // 输出无冲突的嵌套规则（拍平到顶层）
    // 无论当前规则的嵌套层级如何，无冲突的子规则都应该被拍平
    // 如果有需要拍平的规则，且当前不是顶层第一个规则，添加空行分隔
    if (
      normalNested.length > 0 &&
      lines.length > 0 &&
      lines[lines.length - 1] !== ''
    ) {
      lines.push('')
    }

    for (const n of normalNested) {
      // 对于 & 连接的选择器，计算最终选择器
      if (fullPath && n.selector.startsWith('&')) {
        // 对于 &.class，直接使用 .class（不拼接父级）
        if (isMultiClassCombinator(n.selector)) {
          const finalSelector = n.selector.slice(1) // 去掉 &，得到 .class
          const tempRule = { ...n, selector: finalSelector }
          processRule(tempRule as Rule, '', 0)
        } else if (hasCommaSeparator(fullPath)) {
          // 展开逗号选择器，为每个部分应用 &
          const parts = splitCommaSelector(fullPath)
          const expandedSelectors = parts.map(part => {
            const parentLastPart = getLastSelectorPart(part.trim())
            return parentLastPart + n.selector.slice(1)
          })
          // 合并成逗号分隔的选择器
          const finalSelector = expandedSelectors.join(', ')
          const tempRule = { ...n, selector: finalSelector }
          processRule(tempRule as Rule, '', 0)
        } else {
          // 获取父选择器的最后一部分
          const parentLastPart = getLastSelectorPart(fullPath)
          // 拼接得到最终选择器（如 .item + :hover = .item:hover）
          const finalSelector = parentLastPart + n.selector.slice(1)
          // 创建一个临时规则对象，修改选择器为最终形式
          const tempRule = { ...n, selector: finalSelector }
          processRule(tempRule as Rule, '', 0)
        }
      } else {
        processRule(n, fullPath, 0)
      }
    }
  }

  for (let i = 0; i < ast.nodes.length; i++) {
    const node = ast.nodes[i]
    if (node && node.type === 'rule') {
      processRule(node)
      if (i < ast.nodes.length - 1) {
        lines.push('')
      }
    }
  }

  // 输出提升到顶层的声明
  for (const extracted of extractedDeclarations) {
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('')
    }
    lines.push(extracted.selector)
    for (const decl of extracted.declarations) {
      if (decl.type === 'decl') {
        lines.push(`  ${formatDeclaration(decl)}`)
      } else if (decl.type === 'comment') {
        lines.push(`  ${formatComment(decl)}`)
      }
    }
  }

  const code = lines.join('\n').replace(/\n\n+/g, '\n\n').trim()
  const processedLines = code.split('\n')

  // 位置映射：收集所有需要查找的选择器
  const selectorsToFind: Array<{
    key: string
    selectorText: string
    sourceLine: number
  }> = []

  const addSelector = (sourceLine?: number, sourceColumn?: number) => {
    if (sourceLine !== undefined && sourceColumn !== undefined) {
      const key = `${sourceLine}:${sourceColumn}`
      const selectorText = sourcePosToSelector.get(key)
      if (selectorText) {
        selectorsToFind.push({ key, selectorText, sourceLine })
      }
    }
  }

  conflicts.forEach(conflict =>
    conflict.locations.forEach(loc =>
      addSelector(loc.sourceLine, loc.sourceColumn),
    ),
  )
  errors.forEach(error => addSelector(error.sourceLine, error.sourceColumn))

  // 按源文件行号排序并匹配输出行号
  selectorsToFind.sort((a, b) => a.sourceLine - b.sourceLine)

  const finalPositionMap = new Map<string, number>()
  const usedOutputLines = new Set<number>()

  // 遍历处理后的代码，按顺序匹配选择器
  for (const { key, selectorText } of selectorsToFind) {
    for (let i = 0; i < processedLines.length; i++) {
      if (usedOutputLines.has(i)) continue

      const line = processedLines[i]
      if (line && line.trim() === selectorText) {
        finalPositionMap.set(key, i + 1) // 1-based行号
        usedOutputLines.add(i)
        break
      }
    }
  }

  // 更新输出位置
  const updatePosition = (sourceLine?: number, sourceColumn?: number) => {
    if (sourceLine !== undefined && sourceColumn !== undefined) {
      const key = `${sourceLine}:${sourceColumn}`
      return {
        outputLine: finalPositionMap.get(key),
        outputColumn: sourceColumn, // 保持源码列号
      }
    }
    return {}
  }

  conflicts.forEach(conflict =>
    conflict.locations.forEach(loc =>
      Object.assign(loc, updatePosition(loc.sourceLine, loc.sourceColumn)),
    ),
  )
  errors.forEach(error =>
    Object.assign(error, updatePosition(error.sourceLine, error.sourceColumn)),
  )

  return { code, conflicts, errors }
}

export function formatConflicts(
  conflicts: ConflictInfo[],
  filePath?: string,
): string {
  if (conflicts.length === 0) {
    return '[1/2] ✅ 没有检测到选择器冲突'
  }

  const lines: string[] = [
    `[1/2] ⚠️ 检测到 ${conflicts.length} 个选择器冲突，需要手动检查处理\n`,
  ]

  for (let i = 0; i < conflicts.length; i++) {
    const conflict = conflicts[i]
    lines.push(
      `\t- [${i + 1}/${conflicts.length}] 选择器冲突: ${conflict.selector}`,
    )
    for (const loc of conflict.locations) {
      const outputPos = loc.outputLine
        ? `(行列号: ${loc.outputLine}:${loc.outputColumn})`
        : ''
      lines.push(`\t\t- ${loc.fullPath} ${outputPos}`)
      if (loc.outputLine && filePath) {
        lines.push(`\t\t\t- ${filePath}:${loc.outputLine}:${loc.outputColumn}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

export function formatErrors(errors: ErrorInfo[], filePath?: string): string {
  if (errors.length === 0) {
    return '[2/2] ✅ 没有检测到不支持的选择器语法'
  }

  const lines: string[] = [
    `[2/2] ❌ 检测到 ${errors.length} 个不支持的选择器语法\n`,
  ]

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i]
    const outputPos = error.outputLine
      ? `(行列号: ${error.outputLine}:${error.outputColumn})`
      : ''
    lines.push(
      `\t- [${i + 1}/${errors.length}] 错误: ${error.selector} ${outputPos}`,
    )
    if (error.outputLine && filePath) {
      lines.push(
        `\t\t\t- ${filePath}:${error.outputLine}:${error.outputColumn}`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}
