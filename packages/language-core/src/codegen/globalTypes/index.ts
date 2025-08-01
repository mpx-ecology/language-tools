import type { MpxCompilerOptions } from '../../types'
import { getSlotsPropertyName } from '../../utils/shared'
import { defineComponentTypesContents } from './defineComponentTypes'
import { nativeComponentsTypesFileName } from './nativeComponentsTypes'

export * from './nativeComponentsTypes'

export function getGlobalTypesFileName({
  checkUnknownProps,
  checkUnknownEvents,
  checkUnknownComponents,
}: MpxCompilerOptions) {
  return (
    ['mpx', checkUnknownProps, checkUnknownEvents, checkUnknownComponents]
      .map(v => (typeof v === 'boolean' ? Number(v) : v))
      .join('_') + '.d.ts'
  )
}

export function generateGlobalTypes({
  lib,
  checkUnknownProps,
  checkUnknownEvents,
  checkUnknownComponents,
}: MpxCompilerOptions) {
  const fnPropsType = `(T extends { $props: infer Props } ? Props : {})${checkUnknownProps ? '' : ' & Record<string, unknown>'}`
  const text =
    `
; declare global {
	const __VLS_directiveBindingRestFields: { instance: null, oldValue: null, modifiers: any, dir: any };
	const __VLS_unref: typeof import('${lib}').unref;
	const __VLS_placeholder: any;

	type __VLS_NativeElements = __VLS_SpreadMerge<SVGElementTagNameMap, HTMLElementTagNameMap>;
	type __VLS_NativeComponents = ${`import('./${nativeComponentsTypesFileName}').MpxNativeComponents;`}
	type __VLS_Element = ${`import('./${nativeComponentsTypesFileName}').MpxElement;`}
	type __VLS_GlobalComponents = ${`import('${lib}').GlobalComponents;`}
	type __VLS_GlobalDirectives = import('${lib}').GlobalDirectives;
	type __VLS_IsAny<T> = 0 extends 1 & T ? true : false;
	type __VLS_PickNotAny<A, B> = __VLS_IsAny<A> extends true ? B : A;
	type __VLS_SpreadMerge<A, B> = Omit<A, keyof B> & B;
	type __VLS_WithComponent<N0 extends string, LocalComponents, Self, N1 extends string, N2 extends string, N3 extends string> =
		N1 extends keyof LocalComponents ? N1 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N1] } :
		N2 extends keyof LocalComponents ? N2 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N2] } :
		N3 extends keyof LocalComponents ? N3 extends N0 ? Pick<LocalComponents, N0 extends keyof LocalComponents ? N0 : never> : { [K in N0]: LocalComponents[N3] } :
		Self extends object ? { [K in N0]: Self } :
		N1 extends keyof __VLS_GlobalComponents ? N1 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N1] } :
		N2 extends keyof __VLS_GlobalComponents ? N2 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N2] } :
		N3 extends keyof __VLS_GlobalComponents ? N3 extends N0 ? Pick<__VLS_GlobalComponents, N0 extends keyof __VLS_GlobalComponents ? N0 : never> : { [K in N0]: __VLS_GlobalComponents[N3] } :
		${checkUnknownComponents ? '{}' : '{ [K in N0]: unknown }'};
	type __VLS_FunctionalComponentCtx<T, K> = __VLS_PickNotAny<'__ctx' extends keyof __VLS_PickNotAny<K, {}>
		? K extends { __ctx?: infer Ctx } ? NonNullable<Ctx> : never : any
		, T extends (props: any, ctx: infer Ctx) => any ? Ctx : any
	>;
	type __VLS_FunctionalComponentProps<T, K> = '__ctx' extends keyof __VLS_PickNotAny<K, {}>
		? K extends { __ctx?: { props?: infer P } } ? NonNullable<P> : never
		: T extends (props: infer P, ...args: any) => any ? P
		: {};
	type __VLS_FunctionalComponent<T> = (props: ${fnPropsType}, ctx?: any) => __VLS_Element & {
		__ctx?: {
			attrs?: any,
			slots?: T extends { ${getSlotsPropertyName()}: infer Slots } ? Slots : Record<string, any>,
			emit?: T extends { $emit: infer Emit } ? Emit : {},
			props?: ${fnPropsType},
			expose?: (exposed: T) => void,
		}
	};
	type __VLS_NormalizeSlotReturns<S, R = NonNullable<S> extends (...args: any) => infer K ? K : any> = R extends any[] ? {
		[K in keyof R]: R[K] extends infer V
			? V extends Element ? V
			: V extends new (...args: any) => infer R ? ReturnType<__VLS_FunctionalComponent<R>>
			: V extends (...args: any) => infer R ? R
			: any
			: never
	} : R;
	type __VLS_IsFunction<T, K> = K extends keyof T
		? __VLS_IsAny<T[K]> extends false
		? unknown extends T[K]
		? false
		: true
		: false
		: false;
	type __VLS_NormalizeComponentEvent<Props, Emits, onEvent extends keyof Props, Event extends keyof Emits, CamelizedEvent extends keyof Emits> = (
		__VLS_IsFunction<Props, onEvent> extends true
			? Props
			: __VLS_IsFunction<Emits, Event> extends true
				? { [K in onEvent]?: Emits[Event] }
				: __VLS_IsFunction<Emits, CamelizedEvent> extends true
					? { [K in onEvent]?: Emits[CamelizedEvent] }
					: Props
	)${checkUnknownEvents ? '' : ' & Record<string, unknown>'};
	type __VLS_UnionToIntersection<U> = (U extends unknown ? (arg: U) => unknown : never) extends ((arg: infer P) => unknown) ? P : never;
	type __VLS_OverloadUnionInner<T, U = unknown> = U & T extends (...args: infer A) => infer R
		? U extends T
		? never
		: __VLS_OverloadUnionInner<T, Pick<T, keyof T> & U & ((...args: A) => R)> | ((...args: A) => R)
		: never;
	type __VLS_OverloadUnion<T> = Exclude<
		__VLS_OverloadUnionInner<(() => never) & T>,
		T extends () => never ? never : () => never
	>;
	type __VLS_ConstructorOverloads<T> = __VLS_OverloadUnion<T> extends infer F
		? F extends (event: infer E, ...args: infer A) => any
		? { [K in E & string]: (...args: A) => void; }
		: never
		: never;
	type __VLS_NormalizeEmits<T> = __VLS_PrettifyGlobal<
		__VLS_UnionToIntersection<
			__VLS_ConstructorOverloads<T> & {
				[K in keyof T]: T[K] extends any[] ? { (...args: T[K]): void } : never
			}
		>
	>;
	type __VLS_ResolveEmits<
		Comp,
		Emits,
		TypeEmits = ${`Comp extends { __typeEmits?: infer T } ? unknown extends T ? {} : import('${lib}').ShortEmitsToObject<T> : {}`},
		NormalizedEmits = __VLS_NormalizeEmits<Emits> extends infer E ? string extends keyof E ? {} : E : never,
	> = __VLS_SpreadMerge<NormalizedEmits, TypeEmits>;
	type __VLS_ResolveDirectives<T> = {
		[K in Exclude<keyof T, keyof __VLS_GlobalDirectives> & string as \`v\${Capitalize<K>}\`]: T[K];
	};
	type __VLS_PrettifyGlobal<T> = { [K in keyof T]: T[K]; } & {};
	type __VLS_UseTemplateRef<T> = Readonly<import('${lib}').ShallowRef<T | null>>;

	function __VLS_getWxForSourceType<T extends number | string | any[] | Iterable<any>>(source: T): [
		item: T extends number ? number
			: T extends string ? string
			: T extends any[] ? T[number]
			: T extends Iterable<infer T1> ? T1
			: any,
		index: number,
	][];
	function __VLS_getWxForSourceType<T>(source: T): [
		item: T[keyof T],
		key: keyof T,
		index: number,
	][];
	function __VLS_getSlotParameters<S, D extends S>(slot: S, decl?: D):
		__VLS_PickNotAny<NonNullable<D>, (...args: any) => any> extends (...args: infer P) => any ? P : any[];
	function __VLS_asFunctionalDirective<T>(dir: T): T extends import('${lib}').ObjectDirective
		? NonNullable<T['created' | 'beforeMount' | 'mounted' | 'beforeUpdate' | 'updated' | 'beforeUnmount' | 'unmounted']>
		: T extends (...args: any) => any
			? T
			: (arg1: unknown, arg2: unknown, arg3: unknown, arg4: unknown) => void;
	function __VLS_makeOptional<T>(t: T): { [K in keyof T]?: T[K] };
	function __VLS_asFunctionalComponent<T, K = T extends new (...args: any) => any ? InstanceType<T> : unknown>(t: T, instance?: K):
		T extends new (...args: any) => any ? __VLS_FunctionalComponent<K>
		: T extends () => any ? (props: {}, ctx?: any) => ReturnType<T>
		${``}
		: T extends (...args: any) => any ? T
		: __VLS_FunctionalComponent<{}>;
	function __VLS_functionalComponentArgsRest<T extends (...args: any) => any>(t: T): 2 extends Parameters<T>['length'] ? [any] : [];
	function __VLS_asFunctionalElement<T>(tag: T, endTag?: T): (attrs: T${checkUnknownComponents ? '' : ' & Record<string, unknown>'}) => void;
	function __VLS_asFunctionalSlot<S>(slot: S): S extends () => infer R ? (props: {}) => R : NonNullable<S>;
	function __VLS_tryAsConstant<const T>(t: T): T;

	type I18nValues = { [k: string]: string } | Array<string>

	type UnwrapRefs<T> = {
		[K in keyof T]: T[K] extends import('${lib}').Ref
			? import('${lib}').UnwrapRef<T[K]>
			: T[K]
	}
	${defineComponentTypesContents.globalTypes()}
}
` + defineComponentTypesContents.localTypes(lib)

  return text
}
