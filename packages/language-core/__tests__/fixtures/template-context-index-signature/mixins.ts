import { getMixin } from '@mpxjs/core'

const dynamicFlagKey: string = '_hooks_ever_run'

export const dynamicDataMixin = getMixin({
  data: {
    [dynamicFlagKey]: false,
  },
})

export const looseIndexMixin = {
  data: {
    [dynamicFlagKey]: true,
  },
} as {
  [index: string]: any
  data: {
    [x: string]: boolean
  }
}

export const typedMixin = getMixin({
  data: {
    fromMixinData: 'mixin-text',
  },
  computed: {
    fromMixinComputed(): boolean {
      return true
    },
  },
  methods: {
    fromMixinMethod(): number {
      return 123
    },
  },
})

export const fnDataMixin = {
  data() {
    return {
      fromFnMixin: 42,
    }
  },
}
