// Type-check-only ambient control: this TS module has no Mpx macro transform.
// The probe is never invoked; this file only supplies language-service queries.
import type {} from '@mpxjs/core'

export function inspectAmbientTypes() {
  const ambient = defineProps({ title: { type: String, value: 'hello' } })
  void ambient.title
  void defineProps
  void withDefaults
}
