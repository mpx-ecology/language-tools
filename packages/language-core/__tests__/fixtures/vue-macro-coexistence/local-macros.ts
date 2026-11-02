export function defineProps(value: string) {
  return { localLabel: value }
}

export function withDefaults(value: { localLabel: string }) {
  return { localCount: value.localLabel.length }
}
