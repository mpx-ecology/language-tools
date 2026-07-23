import { MpxCompilerOptions } from '../../types'

// Capture raw options independently from Mpx's constrained inference so IDE
// metadata remains available even when ComponentIns contains conflicting fields.
const globalTypes = () => `
  function __VLS_CaptureOptions<RawO extends Record<string, any>>(
    opt: RawO & ThisType<__VLS_TemplateContext<RawO>>
  ): RawO
  function __VLS_GetRawProperties<RawO extends Record<string, any>>(
    opt: RawO
  ): __VLS_GetOptionField<RawO, 'properties'>
  function __VLS_GetTemplateContext<RawO extends Record<string, any>>(
    opt: RawO
  ): __VLS_TemplateContext<RawO>

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
    config?: { customCtor: any }
  ): ComponentIns<D, P, C, M, Mi, S, O> & ExtractMpxOnReactHooksExec<O['__REACTHOOKSEXEC']>
  // #endregion

  // #region DefinePage - global types
  function DefinePage<
    D extends Data = {},
    P extends Properties = {},
    C = {},
    M extends Methods = {},
    Mi extends Array<any> = [],
    O extends AnyObject = {},
  >(
    opt: ThisTypedPageOpt<D, P, C, M, Mi, O>,
    config?: { customCtor: any }
  ): ComponentIns<D, P, C, M, Mi, O>
  // #endregion

  type ExtractMpxOnReactHooksExec<O> = O extends (...args: any[]) => any
    ? ReturnType<O> extends Record<any, any>
      ? ReturnType<O>
      : {}
    : {}
`

const runtimePropTypes = () => `
  type __VLS_GetPropsType<T> = Partial<__VLS_GetInstancePropsType<T>>
  type __VLS_GetInstancePropsType<T> = {
    readonly [K in keyof T]: __VLS_GetPropType<T[K]>
  }
  type __VLS_GetPropType<T> = T extends FullPropType<infer V>
    ? V
    : T extends import('@mpxjs/core').PropType<infer V>
      ? V
      : T extends WechatMiniprogram.Component.AllProperty
        ? WechatMiniprogram.Component.PropertyToData<T>
        : T extends { type: infer U }
          ? U extends import('@mpxjs/core').PropType<infer V>
            ? V
            : U extends WechatMiniprogram.Component.AllProperty
              ? WechatMiniprogram.Component.PropertyToData<U>
              : any
          : any
`

const localTypes = (lib: MpxCompilerOptions['lib']) => `
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
type PageOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends Array<any>,
  S extends Record<any, any>,
> = ComponentOpt<D, P, C, M, Mi, S> & Partial<WechatMiniprogram.Page.ILifetime>
type ThisTypedPageOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends Array<any>,
  S extends Record<any, any>,
  O = {},
> = PageOpt<D, P, C, M, Mi, S> & ThisType<ComponentIns<D, P, C, M, Mi, S, O>> & O
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
    : T[K] extends import('@mpxjs/core').PropType<infer V>
      ? V
      : WechatMiniprogram.Component.PropertyToData<T[K]>
}
type FullPropType<T> = {
  type: import('@mpxjs/core').PropType<T>
  value?: T
  optionalTypes?: WechatMiniprogram.Component.ShortProperty[]
}
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
type ComponentIns<
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
    [K in keyof S]: S[K] extends import('${lib}').Ref<infer V> ? V : S[K]
  } & GetPropsType<P & UnboxMixinsField<Mi, 'properties'>> &
  GetComputedType<C & UnboxMixinsField<Mi, 'computed'>> &
  WxComponentIns<D, P, M> &
  MpxComponentIns &
  MpxComProps<O>
type __VLS_TemplateContext<RawO extends Record<string, any>> = __VLS_MergeInstanceSources<
  [
    __VLS_RemoveIndexSignature<WxComponentIns<{}, {}, {}>>,
    __VLS_RemoveIndexSignature<MpxComponentIns>,
    GetDataType<__VLS_GetOptionField<RawO, 'data'>>,
    UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'data'>,
    __VLS_GetOptionField<RawO, 'methods'>,
    UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'methods'>,
    __VLS_GetSetupReturnType<__VLS_GetOptionField<RawO, 'setup'>>,
    __VLS_GetInstancePropsType<__VLS_GetOptionField<RawO, 'properties'>>,
    __VLS_GetInstancePropsType<
      UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'properties'>
    >,
    GetComputedType<__VLS_GetOptionField<RawO, 'computed'>>,
    GetComputedType<
      UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'computed'>
    >,
    MpxComProps<RawO>,
    ExtractMpxOnReactHooksExec<
      __VLS_GetOptionField<RawO, '__REACTHOOKSEXEC'>
    >,
  ]
> & {
  [key: string]: any
}
type __VLS_GetSetupType<S> = {
  [K in keyof S]: S[K] extends import('${lib}').Ref<infer V> ? V : S[K]
}
type __VLS_GetSetupReturnType<T> = T extends (...args: any[]) => infer R
  ? __VLS_GetSetupType<__VLS_AsInstanceSource<R>>
  : {}
type __VLS_GetOptionField<O, K extends PropertyKey> = K extends keyof O
  ? NonNullable<O[K]>
  : {}
type __VLS_GetOptionMixins<O> = __VLS_GetOptionField<O, 'mixins'> extends Array<any>
  ? __VLS_GetOptionField<O, 'mixins'>
  : []
type __VLS_MergeInstanceSources<Sources extends Array<any>, Result = {}> = Sources extends [
  infer Source,
  ...infer Rest,
]
  ? __VLS_MergeInstanceSources<
      Rest,
      __VLS_MergeInstanceFields<
        __VLS_AsInstanceSource<Result>,
        __VLS_AsInstanceSource<Source>
      >
    >
  : Result
// Preserve source symbols for unique fields so template navigation still
// reaches their original declarations; only synthesize genuinely shared keys.
type __VLS_MergeInstanceFields<A, B> = Pick<A, Exclude<keyof A, keyof B>> &
  Pick<B, Exclude<keyof B, keyof A>> & {
    [K in keyof A & keyof B]: A[K] & B[K]
  }
type __VLS_AsInstanceSource<T> = 0 extends 1 & T
  ? {}
  : [T] extends [never]
    ? {}
    : T extends object
      ? T
      : {}
type __VLS_RemoveIndexSignature<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : symbol extends K
        ? never
        : K]: T[K]
}
type GetDataType<T> = T extends () => any ? ReturnType<T> : T
type MpxComProps<O> = { $rawOptions: O }
type MpxComponentIns = import('${lib}').MpxComponentIns
type GetComputedType<T> = {
  [K in keyof T]: T[K] extends { get: (...args: any[]) => infer R }
    ? R
    : T[K] extends (...args: any[]) => infer R
      ? R
      : never
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
  runtimePropTypes,
}
