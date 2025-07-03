import { computed } from '@mpxjs/core'

export default function useMapDrag() {
  const mapResetInfo = computed(() => {
    return {
      source: 'estimate',
      statusType: 'success',
      trackAttrs: {
        uid: 1,
      },
    }
  })

  return {
    mapResetInfo,
  }
}
