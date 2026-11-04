import * as CompilerDOM from '@vue/compiler-dom'
import { getAtModeBaseName } from '@mpxjs/language-shared'
import { normalizeAttributeValue } from '../utils'

/** Offsets describe the spelling of this identity, never its wrapper. */
export interface TemplateTagIdentity {
  name: string
  startTagOffset: number
  endTagOffset?: number
  /** The parser's original node and its linked editing ranges stay intact. */
  sourceTag?: { name: string; startTagOffset: number; endTagOffset?: number }
  condition?: string
}

type Prop = CompilerDOM.ElementNode['props'][number]
interface Condition {
  mode: string
  envs: string[]
}
interface Target {
  mode: string | symbol
  env: string | symbol
}

function attributeName(prop: Prop) {
  return prop.type === CompilerDOM.NodeTypes.ATTRIBUTE
    ? prop.name
    : prop.rawName
}
function attributeConditions(prop: Prop): Condition[] | undefined {
  const name = attributeName(prop)
  if (!name) return
  const base = getAtModeBaseName(name)
  if (base === name) return
  return name
    .slice(base.length + 1)
    .replace(/^\((.*)\)$/, '$1')
    .split('|')
    .map(item => {
      const [mode, ...envs] = item.split(':')
      return { mode: (mode || 'noMode').replace(/^_/, ''), envs }
    })
}
function matches(conditions: Condition[] | undefined, target: Target) {
  return (
    !conditions ||
    conditions.some(
      condition =>
        (condition.mode === 'noMode' || condition.mode === target.mode) &&
        (!condition.envs.length ||
          condition.envs.some(env => env === target.env)),
    )
  )
}
export function isMpxTagName(prop: Prop) {
  return (
    prop.type === CompilerDOM.NodeTypes.ATTRIBUTE &&
    getAtModeBaseName(prop.name) === 'mpxTagName'
  )
}

export function getTemplateTagIdentities(node: CompilerDOM.ElementNode) {
  return getTemplateTagCandidates(node).map(candidate => candidate.identity)
}

/**
 * No active platform is assumed. Partition targets by the modes/environments
 * mentioned on this element, plus an "other" class for each. Every target in a
 * class makes the same compiler decisions, so even overlapping conditions and
 * first-match precedence can be resolved without enumerating build settings.
 */
export function getTemplateTagCandidates(node: CompilerDOM.ElementNode): {
  identity: TemplateTagIdentity
  props: Prop[]
}[] {
  const closingTag = node.loc.source.lastIndexOf('</' + node.tag)
  const original: TemplateTagIdentity = {
    name: node.tag,
    startTagOffset: node.loc.start.offset + 1,
    endTagOffset:
      !node.isSelfClosing && closingTag >= 0
        ? node.loc.start.offset + closingTag + 2
        : undefined,
  }
  const overrides = node.props.filter(
    isMpxTagName,
  ) as CompilerDOM.AttributeNode[]
  if (!overrides.length) return [{ identity: original, props: node.props }]
  const props = node.props.filter(prop => !isMpxTagName(prop))
  function identity(prop: CompilerDOM.AttributeNode): TemplateTagIdentity {
    if (!prop.value) return original
    const [name, offset] = normalizeAttributeValue(prop.value)
    // processMpxTagName consumes a literal, not a Mustache expression. Keep
    // indeterminate strings at the existing wrapper boundary, without guessing.
    if (!/^[a-zA-Z][\w:-]*$/.test(name)) return original
    return {
      name,
      startTagOffset: offset,
      sourceTag: original,
      condition:
        prop.name === 'mpxTagName'
          ? undefined
          : prop.name.slice('mpxTagName@'.length),
    }
  }
  // processAtMode appends matching attributes. getAndRemoveAttr reads the first
  // mpxTagName, so an unconditional declaration (even empty) always wins.
  const unconditional = overrides.find(prop => prop.name === 'mpxTagName')
  if (unconditional) return [{ identity: identity(unconditional), props }]

  const propConditions = new Map(
    node.props.map(prop => [prop, attributeConditions(prop)]),
  )
  const allConditions = [...propConditions.values()].flatMap(
    conditions => conditions ?? [],
  )
  const modes = new Set<string | symbol>([Symbol('other mode')])
  const envs = new Set<string | symbol>([Symbol('other environment')])
  for (const condition of allConditions) {
    if (condition.mode !== 'noMode') modes.add(condition.mode)
    condition.envs.forEach(env => envs.add(env))
  }
  const nodeConditions = node.props.filter(prop => {
    const name = attributeName(prop)
    return name && getAtModeBaseName(name) === ''
  })
  const targets = new Map<CompilerDOM.AttributeNode | undefined, Target[]>()
  targets.set(undefined, [])
  overrides.forEach(prop => targets.set(prop, []))
  for (const mode of modes) {
    for (const env of envs) {
      const target = { mode, env }
      if (
        nodeConditions.length &&
        !nodeConditions.some(prop => matches(propConditions.get(prop), target))
      )
        continue
      const selected = overrides.find(prop =>
        matches(propConditions.get(prop), target),
      )
      targets.get(selected)!.push(target)
    }
  }
  const resolved = new Map<TemplateTagIdentity, Target[]>()
  for (const [prop, possibilities] of targets) {
    if (!possibilities.length) continue
    const selected = prop ? identity(prop) : original
    resolved.set(selected, [
      ...(resolved.get(selected) ?? []),
      ...possibilities,
    ])
  }
  return [...resolved].map(([identity, possibilities]) => ({
    identity,
    props: props.filter(prop =>
      possibilities.some(target => matches(propConditions.get(prop), target)),
    ),
  }))
}
