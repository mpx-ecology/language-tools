import { MpxCompilerOptions } from '../../types'

// Capture raw options independently from Mpx's constrained inference so IDE
// metadata remains available even when ComponentIns contains conflicting fields.
const globalTypes = () => `
  type __VLS_MpxPublicFields<T> = __VLS_RemoveIndexSignature<T>
  type __VLS_MpxPublicOptions<RawO extends Record<string, any>> =
    __VLS_RemoveIndexSignature<__VLS_TemplateContext<RawO>>
  function __VLS_CaptureOptions<
    P extends Properties = {},
    Mi extends MixinsOption = [],
    RawO extends Record<string, any> = Record<string, any>,
  >(
    opt: RawO & {
      properties?: P
      mixins?: Mi
      setup?: SetupFunction<P, Mi, any>
    } & ThisType<__VLS_TemplateContext<RawO>>
  ): RawO
  function __VLS_GetRawProperties<RawO extends Record<string, any>>(
    opt: RawO
  ): __VLS_GetOptionField<RawO, 'properties'>
  function __VLS_GetRawComponents<RawO extends Record<string, any>>(
    opt: RawO
  ): __VLS_KnownProperties<__VLS_GetOptionField<RawO, 'components'>>
  function __VLS_GetTemplateContext<RawO extends Record<string, any>>(
    opt: RawO
  ): __VLS_TemplateContext<RawO>

  // #region DefineComponent - global types
  function DefineComponent<
    D extends Data = {},
    P extends Properties = {},
    C = {},
    M extends Methods = {},
    Mi extends MixinsOption = [],
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
    Mi extends MixinsOption = [],
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

// Match Mpx's compiler macros instead of relying on ambient declarations: Vue
// 2.7 declares the same global names with different runtime-prop/default rules.
const scriptSetupMacroTypes = () => `
  function __VLS_PropsBeforeSpread<Props, Spread>(
    props: Props,
    spread: Spread,
  ): __VLS_IsAny<Spread> extends true ? {} : Props
  type __VLS_MpxDefineProps = {
    <T extends Properties = {}>(props: T): Readonly<GetPropsType<T>>
    <T>(): Readonly<T>
  }
  type __VLS_MpxWithDefaults = <Props, Defaults extends __VLS_MpxInferDefaults<Props>>(
    props: Props,
    defaults: Defaults
  ) => Props & {
    [K in keyof Defaults]: K extends keyof Props
      ? Exclude<Props[K], undefined>
      : never
  }
  type __VLS_MpxInferDefaults<T> = {
    [K in keyof T]?: __VLS_MpxInferDefault<T, Exclude<T[K], undefined>>
  }
  type __VLS_MpxInferDefault<P, T> = T extends
    | null
    | number
    | string
    | boolean
    | symbol
    | Array<any>
    | Object
      ? T | ((props: P) => T)
      : (props: P) => T
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
type MixinsOption = readonly [any, ...any[]] | readonly any[]
type SetupFunction<
  P extends Properties,
  Mi extends MixinsOption,
  S,
> = (
  props: GetPropsType<
    __VLS_OverrideInstanceFields<
      UnboxMixinsField<Mi, 'properties'>,
      __VLS_AsInstanceSource<P>
    >
  >,
  context: any
) => S
type ThisTypedComponentOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends MixinsOption,
  S extends Record<any, any>,
  O = {},
> = ComponentOpt<D, P, C, M, Mi, S> & ThisType<ComponentIns<D, P, C, M, Mi, S, O>> & O
interface ComponentOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends MixinsOption,
  S extends Record<any, any>,
> extends Partial<WechatMiniprogram.Component.Lifetimes & WechatMiniprogram.Component.OtherOption> {
  data?: D
  properties?: P
  computed?: C
  methods?: M
  mixins?: Mi
  watch?: WatchField
  setup?: SetupFunction<P, Mi, S>
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
  Mi extends MixinsOption,
  S extends Record<any, any>,
> = ComponentOpt<D, P, C, M, Mi, S> & Partial<WechatMiniprogram.Page.ILifetime>
type ThisTypedPageOpt<
  D extends Data,
  P extends Properties,
  C,
  M extends Methods,
  Mi extends MixinsOption,
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
type GetPropsType<T> = {
  readonly [K in keyof T]: T[K] extends FullPropType<infer V>
    ? V
    : T[K] extends import('@mpxjs/core').PropType<infer V>
      ? V
      : T[K] extends WechatMiniprogram.Component.AllProperty
        ? WechatMiniprogram.Component.PropertyToData<T[K]>
        : any
}
type FullPropType<T> = {
  type: import('@mpxjs/core').PropType<T>
  value?: T
  optionalTypes?: WechatMiniprogram.Component.ShortProperty[]
}
type UnboxMixinField<T, F extends PropertyKey> = 0 extends 1 & T
  ? {}
  : [T] extends [never]
    ? {}
    : T extends object
      ? __VLS_GetOptionField<T, F>
      : {}
type __VLS_UnboxMixinMember<T, F extends PropertyKey> = RequiredPropertiesForUnion<
  __VLS_AsInstanceSource<
    F extends 'data'
      ? GetDataType<UnboxMixinField<T, F>>
      : UnboxMixinField<T, F>
  >
>
// Follow Mpx runtime mergeOptions semantics: later mixins override earlier ones
// for ordered tuples, while unordered arrays and conditional branches merge
// field-by-field so disjoint fields keep their symbols and shared keys union.
type __VLS_FoldMixinTuple<
  Mi extends readonly any[],
  F extends PropertyKey,
  Acc = {},
> = Mi extends readonly []
  ? Acc
  : Mi extends readonly [infer Head, ...infer Tail]
    ? __VLS_FoldMixinTuple<
        Tail,
        F,
        __VLS_OverrideInstanceFields<
          Acc,
          __VLS_MergeUnorderedInstanceSources<__VLS_UnboxMixinMember<Head, F>>
        >
      >
    : Mi extends readonly [...infer Init, infer Last]
      ? __VLS_OverrideInstanceFields<
          __VLS_FoldMixinTuple<Init, F, Acc>,
          __VLS_MergeUnorderedInstanceSources<__VLS_UnboxMixinMember<Last, F>>
        >
      : Mi extends readonly (infer Elem)[]
        ? __VLS_OverrideInstanceFields<
            Acc,
            __VLS_MergeUnorderedInstanceSources<__VLS_UnboxMixinMember<Elem, F>>
          >
        : Acc
type UnboxMixinsField<Mi extends readonly any[], F extends PropertyKey> =
  0 extends 1 & Mi
    ? {}
    : [Mi] extends [never]
      ? {}
      : __VLS_MergeUnorderedInstanceSources<
          Mi extends readonly any[] ? __VLS_FoldMixinTuple<Mi, F> : never
        >
type __VLS_AllKeys<U> = U extends any ? keyof U : never
type __VLS_SharedKeys<U, All = U> = U extends any
  ? keyof U & __VLS_AllKeys<Exclude<All, U>>
  : never
type __VLS_MergeUnorderedInstanceSources<
  U,
  Shared extends PropertyKey = __VLS_SharedKeys<U>,
> = [U] extends [never]
  ? {}
  : ((
      U extends any ? (k: Pick<U, Exclude<keyof U, Shared>>) => void : never
    ) extends (k: infer I) => void
      ? I
      : {}) &
      ([Shared] extends [never]
        ? {}
        : {
            [K in Shared]: U extends any ? (K extends keyof U ? U[K] : never) : never
          })
type RequiredPropertiesForUnion<T> = T extends object ? Pick<T, RequiredPropertyNames<T>> : never
type RequiredPropertyNames<T> = {
  [K in keyof T]-?: T[K] extends undefined ? never : K
}[keyof T]
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
  Mi extends MixinsOption = [],
  S extends Record<any, any> = {},
  O = {},
> = __VLS_OverrideInstanceFields<
  UnboxMixinsField<Mi, 'data'>,
  __VLS_AsInstanceSource<GetDataType<D>>
> &
  __VLS_OverrideInstanceFields<
    UnboxMixinsField<Mi, 'methods'>,
    __VLS_AsInstanceSource<M>
  > & {
    [K in keyof S]: S[K] extends import('${lib}').Ref<infer V> ? V : S[K]
  } & GetPropsType<
    __VLS_OverrideInstanceFields<
      UnboxMixinsField<Mi, 'properties'>,
      __VLS_AsInstanceSource<P>
    >
  > &
  GetComputedType<
    __VLS_OverrideInstanceFields<
      UnboxMixinsField<Mi, 'computed'>,
      __VLS_AsInstanceSource<C>
    >
  > &
  WxComponentIns<D, P, M> &
  MpxComponentIns &
  MpxComProps<O>
type __VLS_TemplateContext<RawO extends Record<string, any>> = __VLS_MergeInstanceSources<
  [
    WxComponentIns<{}, {}, {}>,
    MpxComponentIns,
    __VLS_OverrideInstanceFields<
      UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'data'>,
      __VLS_AsInstanceSource<GetDataType<__VLS_GetOptionField<RawO, 'data'>>>
    >,
    __VLS_OverrideInstanceFields<
      UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'methods'>,
      __VLS_AsInstanceSource<__VLS_GetOptionField<RawO, 'methods'>>
    >,
    __VLS_GetSetupReturnType<__VLS_GetOptionField<RawO, 'setup'>>,
    __VLS_GetInstancePropsType<
      __VLS_OverrideInstanceFields<
        UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'properties'>,
        __VLS_AsInstanceSource<__VLS_GetOptionField<RawO, 'properties'>>
      >
    >,
    GetComputedType<
      __VLS_OverrideInstanceFields<
        UnboxMixinsField<__VLS_GetOptionMixins<RawO>, 'computed'>,
        __VLS_AsInstanceSource<__VLS_GetOptionField<RawO, 'computed'>>
      >
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
type __VLS_GetOptionField<O, K extends PropertyKey> = 0 extends 1 & O
  ? {}
  : K extends keyof __VLS_RemoveIndexSignature<O>
    ? K extends keyof O
      ? NonNullable<O[K]>
      : {}
    : {}
type __VLS_GetOptionMixins<O> = __VLS_GetOptionField<O, 'mixins'> extends readonly any[]
  ? __VLS_GetOptionField<O, 'mixins'>
  : []
type __VLS_MergeInstanceSources<Sources extends Array<any>, Result = {}> = Sources extends [
  infer Source,
  ...infer Rest,
]
  ? __VLS_MergeInstanceSources<
      Rest,
      __VLS_MergeInstanceFields<Result, __VLS_AsInstanceSource<Source>>
    >
  : Result
type __VLS_OverrideInstanceFields<A, B> = [keyof A] extends [never]
  ? B
  : [keyof B] extends [never]
    ? A
    : Pick<A, Exclude<keyof A, keyof B>> & B
// Preserve source symbols for unique fields so template navigation still
// reaches their original declarations; only synthesize genuinely shared keys.
type __VLS_MergeInstanceFields<A, B> = [keyof A] extends [never]
  ? B
  : [keyof B] extends [never]
    ? A
    : Pick<A, Exclude<keyof A, keyof B>> &
        Pick<B, Exclude<keyof B, keyof A>> & {
          [K in keyof A & keyof B]: A[K] & B[K]
        }
type __VLS_AsInstanceSource<T> = 0 extends 1 & T
  ? {}
  : [T] extends [never]
    ? {}
    : T extends object
      ? __VLS_RemoveIndexSignature<T>
      : {}
type __VLS_RemoveIndexSignature<T> = {
  [K in keyof T as {} extends { [P in K]: 1 } ? never : K]: T[K]
}
type GetDataType<T> = T extends () => any ? ReturnType<T> : T
type MpxComProps<O> = { $rawOptions: O }
type MpxComponentIns = import('${lib}').MpxComponentIns
type __VLS_ComputedReturn<V> = V extends { get: (...args: any[]) => infer R }
  ? R
  : V extends (...args: any[]) => infer R
    ? R
    : never
type GetComputedType<T> = {
  [K in keyof T]: __VLS_ComputedReturn<T[K]>
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
  scriptSetupMacroTypes,
}
