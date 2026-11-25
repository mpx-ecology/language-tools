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

export const discriminantFnMixinA = {
  data() {
    return {
      kind: 'a' as const,
      left: 'hello',
    }
  },
  computed: {
    compKind(): 'ca' {
      return 'ca'
    },
  },
  methods: {
    run(v: string) {
      return v
    },
  },
}

export const discriminantFnMixinB = {
  data() {
    return {
      kind: 'b' as const,
      right: 123,
    }
  },
  computed: {
    compKind(): 'cb' {
      return 'cb'
    },
  },
  methods: {
    run(v: number) {
      return v
    },
  },
}

export const discriminantObjMixinA = {
  data: {
    kind: 'a' as const,
    objLeft: 'obj-left',
  },
}

export const discriminantObjMixinB = {
  data: {
    kind: 'b' as const,
    objRight: 456,
  },
}
