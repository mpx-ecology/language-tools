const globalTypes = `
  // #region DefineComponent - global types
  function DefineComponent<
    D extends Data = {},
    P extends Properties = {},
    C = {},
    M extends Methods = {},
    Mi extends Array<any> = [],
    S extends AnyObject = {},
    O extends AnyObject = {},
  >(
    opt: ThisTypedComponentOpt<D, P, C, M, Mi, S, O>,
  ): ComponentIns<D, P, C, M, Mi, S, O>
  // #endregion
`

const localTypes = `
// #region DefineComponent - local types
type Data = object | (() => object)
interface Properties {
  [key: string]: WechatMiniprogram.Component.AllProperty
}
interface Methods {
  [key: string]: (...args: any[]) => any
}
type ObjectOf<T> = {
  [key: string]: T
}
type AnyObject = ObjectOf<any>
type ThisTypedComponentOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends Array<any>,
  S extends Record<any, any>,
  O = {},
> = ComponentOpt<D, P, C, M, Mi, S> & ThisType<ComponentIns<D, P, C, M, Mi, S, O>> & O
interface ComponentOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends Array<any>,
  S extends Record<any, any>,
> extends Partial<WechatMiniprogram.Component.Lifetimes & WechatMiniprogram.Component.OtherOption> {
  data?: D
  properties?: P
  computed?: C
  methods?: M
  mixins?: Mi
  watch?: WatchField
  setup?: (props: GetPropsType<P & UnboxMixinsField<Mi, 'properties'>>, context: any) => S
  pageShow?: () => void
  pageHide?: () => void
  initData?: Record<string, any>
  provide?: Record<string, any> | (() => Record<string, any>)
  inject?:
    | {
        [key: string]: string | Symbol | { from?: string | Symbol; default?: any }
      }
    | Array<string>
  [index: string]: any
}
interface WatchOpt {
  immediate?: boolean
  immediateAsync?: boolean
  deep?: boolean
  sync?: boolean
  once?: boolean | ((newVal: any, oldVal: any) => boolean)
}
interface WatchOptWithHandler extends WatchOpt {
  handler?: WatchHandler
}
interface WatchHandler {
  (val: any, oldVal?: any): void
}
interface WatchField {
  [key: string]: WatchHandler | WatchOptWithHandler
}
type GetPropsType<T extends Properties> = {
  readonly [K in keyof T]: T[K] extends FullPropType<infer V>
    ? V
    : T[K] extends PropType<infer V>
      ? V
      : WechatMiniprogram.Component.PropertyToData<T[K]>
}
type FullPropType<T> = {
  type: PropType<T>
  value?: T
  optionalTypes?: WechatMiniprogram.Component.ShortProperty[]
}
export type PropType<T> = {
  __type: T
} & (T extends string
  ? StringConstructor
  : T extends number
    ? NumberConstructor
    : T extends boolean
      ? BooleanConstructor
      : T extends any[]
        ? ArrayConstructor
        : T extends object
          ? ObjectConstructor
          : never)
type UnboxMixinField<T extends Mixin<{}, {}, {}, {}>, F> = F extends keyof T ? T[F] : {}
type UnboxMixinsField<Mi extends Array<any>, F> = UnionToIntersection<
  RequiredPropertiesForUnion<UnboxMixinField<ArrayType<Mi>, F>>
>
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never
type RequiredPropertiesForUnion<T> = T extends object ? Pick<T, RequiredPropertyNames<T>> : never
type RequiredPropertyNames<T> = {
  [K in keyof T]-?: T[K] extends undefined ? never : K
}[keyof T]
type ArrayType<T extends any[]> = T extends Array<infer R> ? R : never
interface Mixin<D, P, C, M> {
  data?: D
  properties?: P
  computed?: C
  methods?: M
  [index: string]: any
}
export type ComponentIns<
  D extends Data = {},
  P extends Properties = {},
  C = {},
  M extends Methods = {},
  Mi extends Array<any> = [],
  S extends Record<any, any> = {},
  O = {},
> = GetDataType<D> &
  UnboxMixinsField<Mi, 'data'> &
  M &
  UnboxMixinsField<Mi, 'methods'> & {
    [K in keyof S]: S[K] extends Ref<infer V> ? V : S[K]
  } & GetPropsType<P & UnboxMixinsField<Mi, 'properties'>> &
  GetComputedType<C & UnboxMixinsField<Mi, 'computed'>> &
  WxComponentIns<D, P, M> &
  MpxComponentIns &
  MpxComProps<O>
type GetDataType<T> = T extends () => any ? ReturnType<T> : T
type MpxComProps<O> = { $rawOptions: O }
export interface Ref<T = any> {
  value: T
  [RefSymbol]: true
}
declare const RefSymbol: unique symbol
export interface MpxComponentIns {
  [k: string]: any
}
type GetComputedSetKeys<T> = {
  [K in keyof T]: T[K] extends {
    get(): any
    set(val: any): void
  }
    ? K
    : never
}[keyof T]
export type GetComputedType<T> = {
  readonly [K in Exclude<keyof T, GetComputedSetKeys<T>>]: T[K] extends () => infer R ? R : T[K]
} & {
  [K in GetComputedSetKeys<T>]: T[K] extends {
    get(): infer R
    set(val: any): void
  }
    ? R
    : T[K]
}
type WxComponentIns<D extends Data = {}, P extends Properties = {}, M extends Methods = {}> = Omit<
  WechatMiniprogram.Component.Instance<D, P, M, any>,
  'selectComponent' | 'selectAllComponents'
> &
  ReplaceWxComponentIns
interface ReplaceWxComponentIns {
  selectComponent(selector: string): ComponentIns<{}, {}, {}, {}, []>
  selectAllComponents(selector: string): Array<ComponentIns<{}, {}, {}, {}, []>>
}
// #endregion
`

export const defineComponentTypesContents = {
  globalTypes,
  localTypes,
}
