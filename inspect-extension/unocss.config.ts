import { defineConfig } from 'unocss'

export default defineConfig({
  theme: {},
  // include: [/\.mpx($|\?)/],
  content: {
    pipeline: {
      include: [/\.mpx($|\?)/],
    },
  },
})
