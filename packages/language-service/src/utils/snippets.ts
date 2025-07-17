export const scriptSnippets = {
  optionsAPI: [
    {
      label: 'createApp',
      code: `import mpx, { createApp } from '@mpxjs/core'
import apiProxy from '@mpxjs/api-proxy'

mpx.use(apiProxy, { usePromise: true })
createApp({})`,
    },
    {
      label: 'createComponent',
      code: `import { createComponent } from '@mpxjs/core'

createComponent({
  data() {
    return {
      // data properties
    }
  },
  computed: {
    // computed properties
  },
  methods: {
    // methods
  },
  // other component options
})`,
    },
    {
      label: 'createPage',
      code: `import { createPage } from '@mpxjs/core'

createPage({
  data() {
    return {
      // data properties
    }
  },
  computed: {
    // computed properties
  },
  methods: {
    // methods
  },
  // other page options
})`,
    },
  ],
}
