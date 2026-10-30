<template>
  <div>{{ props.title.toUpperCase() }} {{ props.count.toFixed() }}</div>
</template>

<script setup lang="ts">
// Expected: Vue keeps its own required/default conventions and component types.
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 1 },
})

props.title.toUpperCase()
props.count.toFixed()

// Intentional error: TS2339, number has no toUpperCase().
props.count.toUpperCase()
</script>
