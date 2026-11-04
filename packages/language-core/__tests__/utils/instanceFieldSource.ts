// Plain calls remain unrelated to instance-field registration as files grow.
export function instanceFieldSource(calls: number, edit = 0) {
  return `<script setup lang="ts">
function ordinary(value: number) { return value }
${Array.from({ length: calls }, (_, i) => `const value${i} = ordinary(${i === 0 ? i + edit : i})`).join('\n')}
defineProps({ title: String })
defineExpose({ title: 'exposed' })
</script>`
}
