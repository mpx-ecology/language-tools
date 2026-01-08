/**
 * 判断组件路径是否为小程序自定义插件组件路径
 * See https://developers.weixin.qq.com/miniprogram/dev/framework/plugin/using.html
 */
export const isMpPluginComponentPath = (componentPath: string) => {
  return componentPath.startsWith('plugin://')
}

function aliasToRegExp(alias: string): RegExp {
  // 1. 纯 *
  if (alias === '*') {
    return /^.*$/
  }

  // 2. 带 /* 的通配 alias
  if (alias.endsWith('/*')) {
    const prefix = alias.slice(0, -1) // 去掉 *
    return new RegExp(`^${escapeReg(prefix)}.*`)
  }

  // 3. 精确路径
  return new RegExp(`^${escapeReg(alias)}($|\\/)`)
}

function escapeReg(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sortAliasesByPriority(aliases: string[]) {
  return [...aliases].sort((a, b) => {
    // 去掉 *
    const lenA = a.replace(/\*$/, '').length
    const lenB = b.replace(/\*$/, '').length
    return lenB - lenA
  })
}

/**
 * 判断是否为alias别名前缀
 */
export function hitAnyAlias(prefix: string, paths: Record<string, string[]>) {
  const aliases = sortAliasesByPriority(Object.keys(paths))
  for (const alias of aliases) {
    const reg = aliasToRegExp(alias)
    if (reg.test(prefix)) {
      return { alias }
    }
  }
  return null
}
