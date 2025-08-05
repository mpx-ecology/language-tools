// #region 全局声明变量（比如 webpack defs 注入的常量）
/** 版本号 */
declare const __version__: string
/** 是否为开发环境 */
declare const __is_dev__: boolean
// #endregion

declare module 'react' {
  // 导出 React 的常用 hooks 和组件
  export const useState: any
  export const useEffect: any
  export const useContext: any
  export const useReducer: any
  export const useCallback: any
  export const useMemo: any
  export const useRef: any
  export const useLayoutEffect: any
  export const Component: any
  export const PureComponent: any
  export const Fragment: any
  export const createElement: any
  export const cloneElement: any

  // 添加通用导出，支持任何属性访问
  const react: {
    [key: string]: any
  }
  export default react
}

declare module 'react-native' {
  import { Component } from 'react'

  // 导出常用的 React Native 组件
  export const View: Component<any>
  export const Text: Component<any>
  export const ScrollView: Component<any>
  export const FlatList: Component<any>
  export const TouchableOpacity: Component<any>
  export const TouchableHighlight: Component<any>
  export const TouchableWithoutFeedback: Component<any>
  export const Image: Component<any>
  export const TextInput: Component<any>
  export const Button: Component<any>
  export const Alert: any
  export const Dimensions: any
  export const Platform: any
  export const StyleSheet: any

  // 导出常用的 Props 类型
  export interface ViewProps {
    [key: string]: any
  }
  export interface ScrollViewProps {
    [key: string]: any
  }
  export interface TextProps {
    [key: string]: any
  }

  // 添加通用导出，支持任何属性访问
  const reactNative: {
    [key: string]: any
  }
  export default reactNative
}
declare module 'react-native-gesture-handler' {
  import { Component } from 'react'
  import { ScrollViewProps as RNScrollViewProps, ViewProps } from 'react-native'

  // 导出所有可能的组件和类型
  export const ScrollView: Component<RNScrollViewProps>
  export const FlatList: Component<any>
  export const PanGestureHandler: Component<any>
  export const TapGestureHandler: Component<any>
  export const LongPressGestureHandler: Component<any>
  export const PinchGestureHandler: Component<any>
  export const RotationGestureHandler: Component<any>
  export const FlingGestureHandler: Component<any>
  export const ForceTouchGestureHandler: Component<any>
  export const NativeViewGestureHandler: Component<any>
  export const createNativeWrapper: any
  export const Swipeable: Component<any>
  export const DrawerLayout: Component<any>
  export const State: any
  export const Directions: any
  export const gestureHandlerRootHOC: any
  export const GestureHandlerRootView: Component<ViewProps>

  // 添加一个通用的默认导出，支持任何属性访问
  const gestureHandler: {
    [key: string]: any
  }
  export default gestureHandler
}
