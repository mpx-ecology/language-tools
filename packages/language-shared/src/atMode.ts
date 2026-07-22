const validModes = new Set([
  'wx',
  'ali',
  'swan',
  'tt',
  'qq',
  'web',
  'qa',
  'jd',
  'dd',
  'tenon',
  'ios',
  'android',
  'harmony',
  'ks',
  'noMode',
])

const wrappedCondition = /^\((.*)\)$/

/**
 * Strip the final Mpx platform condition from an attribute name.
 *
 * Mirrors template-compiler `processAtMode`, including implicit modes (`_wx`),
 * environment conditions (`wx:didi`) and grouped conditions (`(wx|ali)`).
 */
export function getAtModeBaseName(name: string) {
  if (!name.includes('@')) {
    return name
  }

  const nameParts = name.split('@')
  let condition = nameParts.pop()!
  const wrappedMatch = wrappedCondition.exec(condition)
  if (wrappedMatch) {
    condition = wrappedMatch[1]!
  }
  if (!condition) {
    return name
  }

  const modes = condition.split('|').map(item => {
    const mode = item.split(':')[0] || 'noMode'
    return mode.startsWith('_') ? mode.slice(1) : mode
  })

  return modes.every(mode => validModes.has(mode)) ? nameParts.join('@') : name
}
