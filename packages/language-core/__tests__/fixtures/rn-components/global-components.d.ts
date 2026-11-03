import { View } from 'react-native'

declare module '@mpxjs/core' {
  interface GlobalComponents {
    GlobalNative: typeof View
  }
}
