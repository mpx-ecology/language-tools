import type * as ts from 'typescript'
import { MpxCompilerOptions } from '../types'
import { getSlotsPropertyName } from '../utils/shared'
import { endOfLine } from './utils'

export function getLocalTypesGenerator(
  compilerOptions: ts.CompilerOptions,
  mpxCompilerOptions: MpxCompilerOptions,
) {
  const used = new Set<string>()

  const OmitKeepDiscriminatedUnion = defineHelper(
    `__VLS_OmitKeepDiscriminatedUnion`,
    () =>
      `
type __VLS_OmitKeepDiscriminatedUnion<T, K extends keyof any> = T extends any
	? Pick<T, Exclude<keyof T, K>>
	: never;
`.trimStart(),
  )
  const WithDefaults = defineHelper(`__VLS_WithDefaults`, () =>
    `
type __VLS_WithDefaults<P, D> = {
	[K in keyof Pick<P, keyof P>]: K extends keyof D
		? ${PrettifyLocal.name}<P[K] & { default: D[K]}>
		: P[K]
};
`.trimStart(),
  )
  const PrettifyLocal = defineHelper(
    `__VLS_PrettifyLocal`,
    () =>
      `type __VLS_PrettifyLocal<T> = { [K in keyof T]: T[K]; } & {}${endOfLine}`,
  )
  const WithSlots = defineHelper(`__VLS_WithSlots`, () =>
    `
type __VLS_WithSlots<T, S> = T & {
	new(): {
		${getSlotsPropertyName()}: S;
	}
};
`.trimStart(),
  )
  const PropsChildren = defineHelper(`__VLS_PropsChildren`, () =>
    `
type __VLS_PropsChildren<S> = {
	[K in keyof (
		boolean extends (
			// @ts-ignore
			JSX.ElementChildrenAttribute extends never
				? true
				: false
		)
			? never
			// @ts-ignore
			: JSX.ElementChildrenAttribute
	)]?: S;
};
`.trimStart(),
  )
  const TypePropsToOption = defineHelper(`__VLS_TypePropsToOption`, () =>
    compilerOptions.exactOptionalPropertyTypes
      ? `
type __VLS_TypePropsToOption<T> = {
	[K in keyof T]-?: {} extends Pick<T, K>
		? { type: import('${mpxCompilerOptions.lib}').PropType<T[K]> }
		: { type: import('${mpxCompilerOptions.lib}').PropType<T[K]>, required: true }
};
`.trimStart()
      : `
type __VLS_NonUndefinedable<T> = T extends undefined ? never : T;
type __VLS_TypePropsToOption<T> = {
	[K in keyof T]-?: {} extends Pick<T, K>
		? { type: import('${mpxCompilerOptions.lib}').PropType<__VLS_NonUndefinedable<T[K]>> }
		: { type: import('${mpxCompilerOptions.lib}').PropType<T[K]>, required: true }
};
`.trimStart(),
  )
  const OmitIndexSignature = defineHelper(
    `__VLS_OmitIndexSignature`,
    () =>
      `type __VLS_OmitIndexSignature<T> = { [K in keyof T as {} extends Record<K, unknown> ? never : K]: T[K]; }${endOfLine}`,
  )
  const helpers = {
    [PrettifyLocal.name]: PrettifyLocal,
    [OmitKeepDiscriminatedUnion.name]: OmitKeepDiscriminatedUnion,
    [WithDefaults.name]: WithDefaults,
    [WithSlots.name]: WithSlots,
    [PropsChildren.name]: PropsChildren,
    [TypePropsToOption.name]: TypePropsToOption,
    [OmitIndexSignature.name]: OmitIndexSignature,
  }
  used.clear()

  return {
    generate,
    getUsedNames() {
      return used
    },
    get PrettifyLocal() {
      return PrettifyLocal.name
    },
    get OmitKeepDiscriminatedUnion() {
      return OmitKeepDiscriminatedUnion.name
    },
    get WithDefaults() {
      return WithDefaults.name
    },
    get WithSlots() {
      return WithSlots.name
    },
    get PropsChildren() {
      return PropsChildren.name
    },
    get TypePropsToOption() {
      return TypePropsToOption.name
    },
    get OmitIndexSignature() {
      return OmitIndexSignature.name
    },
  }

  function* generate(names: string[]) {
    const generated = new Set<string>()
    while (names.length) {
      used.clear()
      for (const name of names) {
        if (generated.has(name)) {
          continue
        }
        const helper = helpers[name as keyof typeof helpers]
        yield helper.generate()
        generated.add(name)
      }
      names = [...used].filter(name => !generated.has(name))
    }
  }

  function defineHelper(name: string, generate: () => string) {
    return {
      get name() {
        used.add(name)
        return name
      },
      generate,
    }
  }
}
