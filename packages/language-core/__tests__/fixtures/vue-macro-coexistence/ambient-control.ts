// This ordinary TS module keeps the ambient macro; the fix is SFC-local.
import type {} from '@mpxjs/core'

const ambient = defineProps({ title: { type: String, value: 'hello' } })
void ambient.title
void defineProps
void withDefaults
export {}
