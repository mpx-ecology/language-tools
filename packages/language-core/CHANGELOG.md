# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.26.0](https://github.com/mpx-ecology/language-tools/compare/v1.24.3...v1.26.0) (2026-11-26)

### Bug Fixes

* **core:** align macro regressions with Mpx compiler semantics ([6aa8b9e](https://github.com/mpx-ecology/language-tools/commit/6aa8b9e5ffd45b78b033c25c4f47f4a0852b0a63))
* **core:** infer registered React Native components in templates ([816dd4b](https://github.com/mpx-ecology/language-tools/commit/816dd4b574aa425df819aed064d988239757cd80))
* **core:** isolate setup macros from Vue globals ([1f1648a](https://github.com/mpx-ecology/language-tools/commit/1f1648af665c610a076fc3679c0c67a965302fb7))
* **core:** preserve macro completions and hoisted bindings ([0afa724](https://github.com/mpx-ecology/language-tools/commit/0afa72438f9103e1f57fc6489187824983f11b98))
* **core:** preserve setup macro bindings and navigation ([e0a436e](https://github.com/mpx-ecology/language-tools/commit/e0a436ebc48927bb7483d4e8c82d31683b0abe96))
* **core:** preserve template locals and capture event mappings ([a536b22](https://github.com/mpx-ecology/language-tools/commit/a536b223c909bc1b73b2f781ea546324b1b8b939))
* **core:** resolve dynamic class navigation and completion ([feb54f2](https://github.com/mpx-ecology/language-tools/commit/feb54f2abc156de508bfac3cfe9b377f5f98fe28))
* **core:** retain local completions with any context ([8091535](https://github.com/mpx-ecology/language-tools/commit/8091535dd7b31df6d43c9f6ff05fb4f2c32e67cf))
* **diagnostics:** handle localized template expression messages ([469d75a](https://github.com/mpx-ecology/language-tools/commit/469d75a6087a49f2ada918a288bb5166eea86721))
* **diagnostics:** preserve mapping callbacks and add end-to-end regressions ([9abce02](https://github.com/mpx-ecology/language-tools/commit/9abce0203bfed5a12addd15a9d1fadc8b2caf121))
* **diagnostics:** restore template expressions in TypeScript errors ([8175b75](https://github.com/mpx-ecology/language-tools/commit/8175b7547916c4cc56611b023ae1665caa5e38f0))
* **diagnostics:** standardize numeric diagnostic codes ([d5fb923](https://github.com/mpx-ecology/language-tools/commit/d5fb9238f960bfce0341c601be83788d876455c4))
* **language-core:** align withDefaults detection with the compiler ([b52a19a](https://github.com/mpx-ecology/language-tools/commit/b52a19af3b5b5e2409448a42ebe40c163f2a4e64))
* **language-core:** allow omitting props with Mpx defaults ([3a19cf7](https://github.com/mpx-ecology/language-tools/commit/3a19cf73d82791ef94b0a3678692cfe1898be2e1))
* **language-core:** check RN style bindings as template expressions ([f55eb0a](https://github.com/mpx-ecology/language-tools/commit/f55eb0a82864ed83882ee790b56e04a8c7389672))
* **language-core:** handle parenthesized props and inline spread navigation ([2ae39a2](https://github.com/mpx-ecology/language-tools/commit/2ae39a2c21dd8d04cdd326f3d0c3e78cbc11b57b))
* **language-core:** infer public component refs from wx:ref ([103341a](https://github.com/mpx-ecology/language-tools/commit/103341aa62777e66e0495bb99f0d119b97a8b585))
* **language-core:** isolate app.mpx from page targetIds ([dc194c7](https://github.com/mpx-ecology/language-tools/commit/dc194c72d3ddd391aa56f48badf03e445e63ad3d))
* **language-core:** isolate component object bindings by scope ([c4ebf28](https://github.com/mpx-ecology/language-tools/commit/c4ebf2876eb689fee6ad80bef404134d121f156f))
* **language-core:** match component registrations by exact source names ([aa3bed2](https://github.com/mpx-ecology/language-tools/commit/aa3bed2484a5791bb1863e5195903092870480d2))
* **language-core:** override same-block mixin fields by order ([5818b6c](https://github.com/mpx-ecology/language-tools/commit/5818b6c4b8d017cfc0efa9e2d70595cc76e1340d))
* **language-core:** preserve Object.assign parameter targets ([73cd5c4](https://github.com/mpx-ecology/language-tools/commit/73cd5c464b63f479c770041e261a89346898d129))
* **language-core:** preserve template props after any spreads ([df483f0](https://github.com/mpx-ecology/language-tools/commit/df483f0b53a643371def45b78f9bebf76edfd7c1))
* **language-core:** preserve trailing TypeScript directives before React Hooks ([2a77ad1](https://github.com/mpx-ecology/language-tools/commit/2a77ad1f46f43273435e07741f3c63805ab8064b))
* **language-core:** preserve TypeScript directives before React Hooks calls ([7387986](https://github.com/mpx-ecology/language-tools/commit/73879863e84539f7c6e231f05ad9ed85152da32f))
* **language-core:** refine component scope resolution ([aa56abe](https://github.com/mpx-ecology/language-tools/commit/aa56abed5ef6e01a89698c07cb4ea62ade28381e))
* **language-core:** refresh platform component dependencies on file events ([cb60c9c](https://github.com/mpx-ecology/language-tools/commit/cb60c9ca913d0d597fb1c745396a638304f7f155))
* **language-core:** resolve assigned component objects ([ab7ab71](https://github.com/mpx-ecology/language-tools/commit/ab7ab7135b83a3f8e745d2e40b99828b0ac126f3))
* **language-core:** resolve mpxTagName template identities ([3fd141c](https://github.com/mpx-ecology/language-tools/commit/3fd141caf6a0af52a018caff72a41e18228f533d))
* **language-core:** resolve platform component files consistently ([a354c85](https://github.com/mpx-ecology/language-tools/commit/a354c85ee5f1977f79080b54bc787746d0cadb7d))
* **language-core:** resolve WXS modules in template expressions ([d00a149](https://github.com/mpx-ecology/language-tools/commit/d00a149ee8651a9c7f807e9235e98a668047e758))
* **language-core:** scope diagnostic directives to WXS declarations ([f13b645](https://github.com/mpx-ecology/language-tools/commit/f13b645f3ca2a81fba00e3e256b220955d219ba2))
* **language-core:** strip index signatures from template context ([1b2df72](https://github.com/mpx-ecology/language-tools/commit/1b2df72f6198aea0442ab49cf1123b6d18df50f2))
* **language-core:** warn on duplicate setup instance fields ([470faab](https://github.com/mpx-ecology/language-tools/commit/470faab63b0f84884051045569a1e672afadc801))
* **language-service:** address style src review comments ([b516fb0](https://github.com/mpx-ecology/language-tools/commit/b516fb078c28bc6f9cb4cf7572a5738f15f362d8))
* **language-service:** harden JSON semantic boundaries ([82e6901](https://github.com/mpx-ecology/language-tools/commit/82e690155aa441f5ffa51fe61e9a86978da43b42))
* **language-service:** refine JSON ranges and project invalidation ([c7c4c30](https://github.com/mpx-ecology/language-tools/commit/c7c4c303bfd52bea88979ce3319555b7cd9ba32c))
* **language-service:** skip JSON-only programs for instance diagnostics ([4d0c395](https://github.com/mpx-ecology/language-tools/commit/4d0c3958582491c6d2f1f990545bd884d2f34cfe))
* **language-service:** support JavaScript semantics in JSON scripts ([ea0ee9a](https://github.com/mpx-ecology/language-tools/commit/ea0ee9a3c624e2decc187c0c32c918510c5bc8ae))
* **language-service:** support navigation for style src files ([5491a16](https://github.com/mpx-ecology/language-tools/commit/5491a16bb48ab8e5f489f74b7185ad9c1a8c295a))
* **language-tools:** handle cached project lifecycles ([6b1ee0c](https://github.com/mpx-ecology/language-tools/commit/6b1ee0c9504ef7da426b80ae5cf35df98ab611ff))
* **references:** find statically registered component consumers ([d778421](https://github.com/mpx-ecology/language-tools/commit/d778421baf8dad3faf087db9af8cd2253551ae6d))
* **service:** complete registered application and global components ([cd6b56b](https://github.com/mpx-ecology/language-tools/commit/cd6b56b3cc5d90ddc4308560220acf524155cf27))
* **service:** restore template variable and built-in binding completions ([6904660](https://github.com/mpx-ecology/language-tools/commit/69046609314cf0af381a9ff881e76f4683e24e3a))
* **typescript-plugin:** highlight numeric component tags ([7bd1dcd](https://github.com/mpx-ecology/language-tools/commit/7bd1dcdd4a728af7903f133898bb41e2cd4ee236))
* **typescript-plugin:** map definition protocol positions to source lines ([35296e3](https://github.com/mpx-ecology/language-tools/commit/35296e38719026421274487ddda042a70a0970ab))
* **typescript-plugin:** preserve raw component registration keys for highlighting ([15ce72e](https://github.com/mpx-ecology/language-tools/commit/15ce72e6b63b4803b4a42f81e1b21a02e842208c))

### Performance Improvements

* **language-core:** avoid redundant startup diagnostics and imports ([177a6f4](https://github.com/mpx-ecology/language-tools/commit/177a6f43aa4c5a01353dc215aa80d0c511ac7651))
* **language-core:** cache component binding analysis ([df3a4be](https://github.com/mpx-ecology/language-tools/commit/df3a4be48e55f005e10d1fc82e411502a9100201))
* **language-core:** reduce component resolution and JSON startup work ([bbefb80](https://github.com/mpx-ecology/language-tools/commit/bbefb80ee70fedf53ce7598e53bab7b0489b0437))
* **language-core:** reuse component resolution across source files ([93d9437](https://github.com/mpx-ecology/language-tools/commit/93d943712a162d89b0bfdd47bce10af07e045e14))
* **language-core:** reuse filesystem probes during project startup ([88554af](https://github.com/mpx-ecology/language-tools/commit/88554aff556e206e9c4b859d4c009c49dfcfd20f))
* **language-core:** reuse package scopes and inherited component imports ([3ecf140](https://github.com/mpx-ecology/language-tools/commit/3ecf140e66fb5c54d58cf7a5577de172d45d0e97))
* **language-core:** reuse setup syntax in instance field diagnostics ([0534404](https://github.com/mpx-ecology/language-tools/commit/0534404dd70c2210a1311cc91deaa199481f7b7e))
* **language-tools:** reduce template and graph startup work ([5c9d52b](https://github.com/mpx-ecology/language-tools/commit/5c9d52b163a0e14eb9b8ec7124b92a54ededb74f))
* **language-tools:** reuse startup syntax and omit source padding ([72e2ced](https://github.com/mpx-ecology/language-tools/commit/72e2cedb7d3a7e15dd7f78bfc5ba3cb3a5f74ca6))
* **typescript-plugin:** generate only the service script in tsserver ([8e41b85](https://github.com/mpx-ecology/language-tools/commit/8e41b85bf3b2d43cecfcd36ee8be6825d8eb22ac))

## [1.24.3](https://github.com/mpx-ecology/language-tools/compare/v1.24.2...v1.24.3) (2026-10-29)

**Note:** Version bump only for package @mpxjs/language-core

## [1.24.2](https://github.com/mpx-ecology/language-tools/compare/v1.24.1...v1.24.2) (2026-08-20)

### Bug Fixes

* **core:** preserve setup prop types in template context ([1f40112](https://github.com/mpx-ecology/language-tools/commit/1f40112245c1f1c994769824f31fb3942517e4e3))

## [1.24.1](https://github.com/mpx-ecology/language-tools/compare/v1.24.0...v1.24.1) (2026-07-23)

### Features

* add component-runtime-props for runtime property handling and update index.mpx ([91f607f](https://github.com/mpx-ecology/language-tools/commit/91f607fb321333c647e5840cf27621d66f70088b))

# [1.24.0](https://github.com/mpx-ecology/language-tools/compare/v1.22.6...v1.24.0) (2026-07-23)

### Features

* add component options examples and improve type inference handling in templates ([b632db6](https://github.com/mpx-ecology/language-tools/commit/b632db665256b18d9f59de12d8f134533a19ee21))
* add event handling to component-options and improve prop type checks ([9b7a9ab](https://github.com/mpx-ecology/language-tools/commit/9b7a9abea160b3524d3cde33d292c2b46c15c1c3))
* add vitest for testing, update pnpm workspace, and implement component tests ([cb3a680](https://github.com/mpx-ecology/language-tools/commit/cb3a680ca5de1a4cf21aab5b899f66c2dfbd57ad))
* enhance component import handling and improve custom data request validation ([789b7d1](https://github.com/mpx-ecology/language-tools/commit/789b7d1fe8d8edee4b403e3c4aa4c1fddf41ba66))
* enhance component structure and add new component without properties ([78efa51](https://github.com/mpx-ecology/language-tools/commit/78efa51917652a1b42e37188675e28584c388cc2))
* enhance prop handling with at-mode checks and add getAtModeBaseName utility ([68e68a2](https://github.com/mpx-ecology/language-tools/commit/68e68a2ab1eadd0d24f065f090bdd3d6ae8bc170))
* implement synchronous resolution for using components paths in JSON files ([dc1fe73](https://github.com/mpx-ecology/language-tools/commit/dc1fe73e7dd27894ed10040fc711a42074d8ef94))
* support type checking and completion for custom component props ([fd71c11](https://github.com/mpx-ecology/language-tools/commit/fd71c1199724ba1d3bc95e3e2de90d7d17b1e102))
* 支持自定义组件props类型提示支持, close: https://github.com/mpx-ecology/language-tools/issues/86 ([d35a9dc](https://github.com/mpx-ecology/language-tools/commit/d35a9dccc1bf7fde6d22b9609c2b7d12fc495602))

## [1.22.6](https://github.com/mpx-ecology/language-tools/compare/v1.22.5...v1.22.6) (2026-07-01)

### Features

* add new attributes and descriptions for RN environment components ([26c1350](https://github.com/mpx-ecology/language-tools/commit/26c135079798c2603043e134f49120b456670d2e))

## [1.22.5](https://github.com/mpx-ecology/language-tools/compare/v1.22.4...v1.22.5) (2026-06-23)

**Note:** Version bump only for package @mpxjs/language-core

## [1.22.4](https://github.com/mpx-ecology/language-tools/compare/v1.22.3...v1.22.4) (2026-06-22)

**Note:** Version bump only for package @mpxjs/language-core

## [1.22.3](https://github.com/mpx-ecology/language-tools/compare/v1.22.2...v1.22.3) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-core

## [1.22.2](https://github.com/mpx-ecology/language-tools/compare/v1.22.1...v1.22.2) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-core

## [1.22.1](https://github.com/mpx-ecology/language-tools/compare/v1.22.0...v1.22.1) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-core

# [1.22.0](https://github.com/mpx-ecology/language-tools/compare/v1.20.0...v1.22.0) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-core

# [1.20.0](https://github.com/mpx-ecology/language-tools/compare/v1.18.5...v1.20.0) (2026-03-09)

### Bug Fixes

* improve `parseUsingComponentsWithJs` ([50755aa](https://github.com/mpx-ecology/language-tools/commit/50755aaf7884ec4e2203639501e03b19ad245e71))
* improve UnwrapRefs type to handle optional Ref types ([3474ecb](https://github.com/mpx-ecology/language-tools/commit/3474ecbec2c96c5c2f0f6b14ffe6453bbeb56bd5))
* review rollback ([67b18ab](https://github.com/mpx-ecology/language-tools/commit/67b18ab2604fe5015a6b53ef18866cd48ff8a9f9))
* 修复volar 虚拟文件和真实文件映射位置 ([ed9d307](https://github.com/mpx-ecology/language-tools/commit/ed9d3079772b31340c1987671f06d8aad62416ff))
* 过滤原生标签,不进行格式化路径 ([c305b12](https://github.com/mpx-ecology/language-tools/commit/c305b12bef8aa859e78ca4669c804ddf7a2d323b))

### Features

* review update ([de8bb4e](https://github.com/mpx-ecology/language-tools/commit/de8bb4e2c199c856160d4b2c432254436299d4b4))
* 组件路径补全（mvp） ([6f19f1d](https://github.com/mpx-ecology/language-tools/commit/6f19f1d00ec71ee32778623d877b374142e1c6fe))

## [1.18.5](https://github.com/mpx-ecology/language-tools/compare/v1.18.4...v1.18.5) (2026-01-08)

**Note:** Version bump only for package @mpxjs/language-core

## [1.18.4](https://github.com/mpx-ecology/language-tools/compare/v1.18.3...v1.18.4) (2025-12-17)

**Note:** Version bump only for package @mpxjs/language-core

## [1.18.3](https://github.com/mpx-ecology/language-tools/compare/v1.18.2...v1.18.3) (2025-12-15)

**Note:** Version bump only for package @mpxjs/language-core

## [1.18.2](https://github.com/mpx-ecology/language-tools/compare/v1.18.1...v1.18.2) (2025-12-10)

**Note:** Version bump only for package @mpxjs/language-core

## [1.18.1](https://github.com/mpx-ecology/language-tools/compare/v1.18.0...v1.18.1) (2025-12-05)

### Bug Fixes

* enhance computedSfc and mpx-sfc for improved symbol handling ([87e9a39](https://github.com/mpx-ecology/language-tools/commit/87e9a39c8e0f693b6e02679e261ea4b8dc5aec5c))

### Features

* review update ([d61bffd](https://github.com/mpx-ecology/language-tools/commit/d61bffdd15e46953eb3e77a98822534f58bb0050))

# [1.18.0](https://github.com/mpx-ecology/language-tools/compare/v1.16.1...v1.18.0) (2025-12-04)

**Note:** Version bump only for package @mpxjs/language-core

## [1.16.1](https://github.com/mpx-ecology/language-tools/compare/v1.16.0...v1.16.1) (2025-12-01)

**Note:** Version bump only for package @mpxjs/language-core

# [1.16.0](https://github.com/mpx-ecology/language-tools/compare/v1.14.3...v1.16.0) (2025-11-30)

### Bug Fixes

* **core:** avoid duplicate prompts when autocompleting setup template variables ([8a7304e](https://github.com/mpx-ecology/language-tools/commit/8a7304eb6b5fa0180d9a467cddce6df7f6ac6f39))

## [1.14.3](https://github.com/mpx-ecology/language-tools/compare/v1.14.2...v1.14.3) (2025-11-12)

### Bug Fixes

* 增加usingComponents为短属性命名时的解析 ([105ebf9](https://github.com/mpx-ecology/language-tools/commit/105ebf98e8c114c504470e48649259a7abf79dc4))

## [1.14.2](https://github.com/mpx-ecology/language-tools/compare/v1.14.1...v1.14.2) (2025-10-10)

### Bug Fixes

* plugin component path ([8f69267](https://github.com/mpx-ecology/language-tools/commit/8f6926716bfb8ce03c2861085248f242e1228001))

## [1.14.1](https://github.com/mpx-ecology/language-tools/compare/v1.14.0...v1.14.1) (2025-09-25)

**Note:** Version bump only for package @mpxjs/language-core

# [1.14.0](https://github.com/mpx-ecology/language-tools/compare/v1.12.3...v1.14.0) (2025-09-17)

### Features

* **core:** update usingComponents handling and style adjustments ([327971b](https://github.com/mpx-ecology/language-tools/commit/327971b5076b2817b6117aac815e48b880b9f4bb))

## [1.12.3](https://github.com/mpx-ecology/language-tools/compare/v1.12.2...v1.12.3) (2025-09-08)

**Note:** Version bump only for package @mpxjs/language-core

## [1.12.2](https://github.com/mpx-ecology/language-tools/compare/v1.12.1...v1.12.2) (2025-09-04)

### Features

* **core:** enhance Object.assign parsing for `usingComponents` ([f2f52fc](https://github.com/mpx-ecology/language-tools/commit/f2f52fc1687f1432025a70d6e9c75191f1e78b4b))
* **core:** support link and diagnostics for pages ([85c683d](https://github.com/mpx-ecology/language-tools/commit/85c683df601d8cf278e22e580ea5edf92117eaeb))

## [1.12.1](https://github.com/mpx-ecology/language-tools/compare/v1.12.0...v1.12.1) (2025-09-02)

### Bug Fixes

* **core:** enhance usingComponents parsing ([f8c061a](https://github.com/mpx-ecology/language-tools/commit/f8c061a1ffe18d5281a198e290e299ad266e8eda))

# [1.12.0](https://github.com/mpx-ecology/language-tools/compare/v1.10.1...v1.12.0) (2025-09-01)

### Features

* **core:** enhance `parseUsingComponentsWithJs` ([83fd54a](https://github.com/mpx-ecology/language-tools/commit/83fd54a520b47602352ad7c6ac028b877dcd6589))

## [1.10.1](https://github.com/mpx-ecology/language-tools/compare/v1.10.0...v1.10.1) (2025-08-27)

**Note:** Version bump only for package @mpxjs/language-core

# [1.10.0](https://github.com/mpx-ecology/language-tools/compare/v1.8.5...v1.10.0) (2025-08-19)

### Bug Fixes

* **core:** enhance component handling and support for external components in code generation ([b389d9f](https://github.com/mpx-ecology/language-tools/commit/b389d9f9f05152256726ce5da526ab51f8e4976a))

### Features

* **core:** support document link for dynamic component range ([ff422c6](https://github.com/mpx-ecology/language-tools/commit/ff422c6dcef51984013da5a5771ce7d5e2f9fe1c))
* review ([b3f51cc](https://github.com/mpx-ecology/language-tools/commit/b3f51cc59bfa87816207ba5e10997b1ef3f36c6a))
* review ([c835370](https://github.com/mpx-ecology/language-tools/commit/c835370ce01e095f36bf097ff49aaadf482e84af))

## [1.8.5](https://github.com/mpx-ecology/language-tools/compare/v1.8.4...v1.8.5) (2025-08-18)

### Bug Fixes

* **core:** support event param `$event` codegen for compound expression ([b5707e2](https://github.com/mpx-ecology/language-tools/commit/b5707e2b73bba49d77a711f7209e05e3df0e0031))

### Features

* **core:** implement `defineOptions` handling in script setup and template generation ([c55cb63](https://github.com/mpx-ecology/language-tools/commit/c55cb63c50621398a9f28ee938f2f775bdc76db7))
* **core:** implement `onReactHooksExec` codegen in script setup ([d57b836](https://github.com/mpx-ecology/language-tools/commit/d57b8365d1c2c050bda3f99088645769084cc23f))
* review ([96b9b29](https://github.com/mpx-ecology/language-tools/commit/96b9b295885bcbeb01e2f775639dbcdc4ea4a9a6))

## [1.8.4](https://github.com/mpx-ecology/language-tools/compare/v1.8.3...v1.8.4) (2025-08-14)

### Bug Fixes

* **core:** enhance `parseResult.source.loc` for `wx:for` in `updateSFCTemplate` ([115d499](https://github.com/mpx-ecology/language-tools/commit/115d49917ebcb8c9317a3f83f467883e6285af88))

### Features

* review ([1bde9e2](https://github.com/mpx-ecology/language-tools/commit/1bde9e25d25a546f1c17c67fa95563215c1d70a5))

## [1.8.3](https://github.com/mpx-ecology/language-tools/compare/v1.8.2...v1.8.3) (2025-08-12)

### Bug Fixes

* **core:** enhance codegen for style url value ([0e3f7e0](https://github.com/mpx-ecology/language-tools/commit/0e3f7e0435e2c3c1277b8077082850b83244284f))
* **core:** prevent duplicate error reporting in options component ([9f18ccd](https://github.com/mpx-ecology/language-tools/commit/9f18ccd5a474aa92e650155d05f33f927524f708))

## [1.8.2](https://github.com/mpx-ecology/language-tools/compare/v1.8.1...v1.8.2) (2025-08-11)

### Bug Fixes

* enhance codegen for `capture:` and `capture` ([b814923](https://github.com/mpx-ecology/language-tools/commit/b814923edb31b67d45590dc90fe8f8eb9e00ba3f))
* enhance formatter for mustache props ([7d550d2](https://github.com/mpx-ecology/language-tools/commit/7d550d218b682a1ece12e1b8b01acfbb2e82c873))

### Features

* enhance component paths resolve for spread assignments ([c67a0bb](https://github.com/mpx-ecology/language-tools/commit/c67a0bbc85440ed806f8c5cb58538d5ecfda8243))

## [1.8.1](https://github.com/mpx-ecology/language-tools/compare/v1.8.0...v1.8.1) (2025-08-07)

### Features

* enhance musatche handler for `style` and `class` ([ecd2d8c](https://github.com/mpx-ecology/language-tools/commit/ecd2d8cf02d74b8d5c5624f5f47918076c873152))

# [1.8.0](https://github.com/mpx-ecology/language-tools/compare/v1.6.2...v1.8.0) (2025-08-06)

### Features

* **core:** support codegen for `[REACTHOOKSEXEC]` option ([a025239](https://github.com/mpx-ecology/language-tools/commit/a0252399fd04df430e06ee6517af307e0880d66a))
* enhance template handling with mustache syntax and improve formatting options ([a7ce3ad](https://github.com/mpx-ecology/language-tools/commit/a7ce3ad1e2f5c0686d28a928c95840c2f8b9d3d3))

## [1.6.2](https://github.com/mpx-ecology/language-tools/compare/v1.6.1...v1.6.2) (2025-08-01)

**Note:** Version bump only for package @mpxjs/language-core

## [1.6.1](https://github.com/mpx-ecology/language-tools/compare/v1.6.0...v1.6.1) (2025-07-31)

**Note:** Version bump only for package @mpxjs/language-core

# [1.6.0](https://github.com/mpx-ecology/language-tools/compare/v1.4.1...v1.6.0) (2025-07-30)

### Bug Fixes

* enhance directive comments for `wx:if` ([40dff73](https://github.com/mpx-ecology/language-tools/commit/40dff73ac7a2b01c527b073514e168fd9e0d943b))

## [1.4.1](https://github.com/mpx-ecology/language-tools/compare/v1.4.0...v1.4.1) (2025-07-29)

### Bug Fixes

* resolve native components path for `usingComponents` ([885fbf5](https://github.com/mpx-ecology/language-tools/commit/885fbf59c15b12a84e50d0f1618e586fbcb4c414))

# [1.4.0](https://github.com/mpx-ecology/language-tools/compare/v1.2.8...v1.4.0) (2025-07-26)

### Bug Fixes

* bind event expression generation ([4b08b3f](https://github.com/mpx-ecology/language-tools/commit/4b08b3f6c527f91acb2e0d4ab6a00da83933b3f5))

### Features

* support Stylus formatter with built-in data ([b418f16](https://github.com/mpx-ecology/language-tools/commit/b418f16a19b828541e23160aabffee3290b573e0))

## [1.2.8](https://github.com/mpx-ecology/language-tools/compare/v1.2.7...v1.2.8) (2025-07-24)

### Features

* support stylus formatting with `stylus-supremacy` ([b1a6aaa](https://github.com/mpx-ecology/language-tools/commit/b1a6aaa57b6bc3bf4eabc7bdd4520cdd1a226e67))

## [1.2.7](https://github.com/mpx-ecology/language-tools/compare/v1.2.6...v1.2.7) (2025-07-24)

### Bug Fixes

* **core:** enhance codegen for bind event ([7f93660](https://github.com/mpx-ecology/language-tools/commit/7f936608e61d89845eab7fbf805ee458f7d6843e))

## [1.2.6](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.6) (2025-07-23)

### Bug Fixes

* review ([90979a8](https://github.com/mpx-ecology/language-tools/commit/90979a83bc7c12d6471b57ad8da7cbf7044142bb))

### Features

* implement compiler errors handling for mpx template transformations ([d282594](https://github.com/mpx-ecology/language-tools/commit/d28259420b593ba4ea94eb6b59ffaf0828c68e56))

## [1.2.5](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.5) (2025-07-23)

**Note:** Version bump only for package @mpxjs/language-core

## [1.2.4](https://github.com/mpx-ecology/language-tools/compare/v1.2.3...v1.2.4) (2025-07-22)

### Bug Fixes

* enhance `wx:If` processing logic for static string ([65dbfae](https://github.com/mpx-ecology/language-tools/commit/65dbfaef6625a27adb7291b4ddaf8ec50bd70a36))
* refine `wx:if` handling and improve whitespace management in templates ([216a2ff](https://github.com/mpx-ecology/language-tools/commit/216a2ff3f26809161e736a6fddec0598f9e4930c))
* review ([95f0bfa](https://github.com/mpx-ecology/language-tools/commit/95f0bfa0b831341aa037e9dd4dd3ce4587fe4978))

### Features

* enhance `wx:if` handling and support compiler error diagnostics for templates ([0151bf4](https://github.com/mpx-ecology/language-tools/commit/0151bf43508c696cda3d289fb1a73fd0c2d1126c))
* resolve node modules by filename ([c3384e8](https://github.com/mpx-ecology/language-tools/commit/c3384e8720d64ad9336c75eb7f579dccc8e4b162))

## [1.2.3](https://github.com/mpx-ecology/language-tools/compare/v1.2.2...v1.2.3) (2025-07-21)

**Note:** Version bump only for package @mpxjs/language-core

## [1.2.2](https://github.com/mpx-ecology/language-tools/compare/v1.2.1...v1.2.2) (2025-07-17)

### Bug Fixes

* resolve directory path of usingComponents ([66dcc5b](https://github.com/mpx-ecology/language-tools/commit/66dcc5be5e102e8bff336ea634db4953f403c004))

## [1.2.1](https://github.com/mpx-ecology/language-tools/compare/v1.2.0...v1.2.1) (2025-07-17)

**Note:** Version bump only for package @mpxjs/language-core

# [1.2.0](https://github.com/mpx-ecology/language-tools/compare/v1.0.4...v1.2.0) (2025-07-16)

### Bug Fixes

* review ([0ea6118](https://github.com/mpx-ecology/language-tools/commit/0ea6118b60eefdf486ad00813ae1287792e56716))

### Features

* enhance json usingComponents paths handler and add errors diagnostics for mpx json ([a0bc4dc](https://github.com/mpx-ecology/language-tools/commit/a0bc4dcd6f05b32d533124229c16f59f03c37783))
* **service:** support usingComponents document link for json-js ([a819598](https://github.com/mpx-ecology/language-tools/commit/a8195986d14b8c43cfd3599b17e99fd7cc2c3fcc))

## [1.0.4](https://github.com/mpx-ecology/language-tools/compare/v1.0.3...v1.0.4) (2025-07-15)

**Note:** Version bump only for package @mpxjs/language-core

## [1.0.3](https://github.com/mpx-ecology/language-tools/compare/v1.0.2...v1.0.3) (2025-07-14)

**Note:** Version bump only for package @mpxjs/language-core

## [1.0.2](https://github.com/mpx-ecology/language-tools/compare/v1.0.1...v1.0.2) (2025-07-14)

**Note:** Version bump only for package @mpxjs/language-core

## [1.0.1](https://github.com/mpx-ecology/language-tools/compare/v1.0.0...v1.0.1) (2025-07-14)

**Note:** Version bump only for package @mpxjs/language-core

# [1.0.0](https://github.com/mpx-ecology/language-tools/compare/v0.3.0...v1.0.0) (2025-07-14)

### Bug Fixes

* filter comment when find ifNode prev node ([b52acdb](https://github.com/mpx-ecology/language-tools/commit/b52acdb5cde41d688325178b7d84974a09107afb))
* wx condition ([a9704d8](https://github.com/mpx-ecology/language-tools/commit/a9704d8a81805c1eeed749663a5663f7655566e3))

### Features

* clean code ([7183dd8](https://github.com/mpx-ecology/language-tools/commit/7183dd859830da6f171a71f932e15ab59365b6ca))
* **core:** completion component type inference ([ee94e6c](https://github.com/mpx-ecology/language-tools/commit/ee94e6c359cb0a2203d7cd96e7f5be7c7799edec))
* **core:** completion component type inference ([6349b9a](https://github.com/mpx-ecology/language-tools/commit/6349b9aab0ed2d1bc43b84eeec5ffe80f60a2e51))
* **core:** completion component type inference ([0182f1a](https://github.com/mpx-ecology/language-tools/commit/0182f1adb8e7872e33c5a13e67e632996cedf28b))
* **core:** enhance codegen for attributesValue ([b41754e](https://github.com/mpx-ecology/language-tools/commit/b41754ee2552e260dcf3fd9f303b4f5fdf66518d))
* **core:** WIP add component types ([e6c304d](https://github.com/mpx-ecology/language-tools/commit/e6c304dd1d89f05686b74cb8f9f25c952eb10f5e))
* **core:** WIP add form components ([c277bd1](https://github.com/mpx-ecology/language-tools/commit/c277bd1d28ceb8cd54fb47200ddc7dc1751b0806))
* parse json usingComponents and add json service document link ([a6192b0](https://github.com/mpx-ecology/language-tools/commit/a6192b071dbf7d0aeae000832dd40831313183ab))
* refactor and cleanup code ([d34747a](https://github.com/mpx-ecology/language-tools/commit/d34747af1f6573e22c7bf674486d8e126a7e902f))
* refactor shared code and update deps ([3d8c0dd](https://github.com/mpx-ecology/language-tools/commit/3d8c0ddb874137d55f424bbdca97082da5cde0de))
* support abs path resolve ([c0702de](https://github.com/mpx-ecology/language-tools/commit/c0702ded94df3fa23dab8cacb6fd172a37e9813f))
* support document link for json component ([9a7f9f7](https://github.com/mpx-ecology/language-tools/commit/9a7f9f75da5f372f411b481857a8c385f9dbd5a1))
* support template global definitions ([a8c5b56](https://github.com/mpx-ecology/language-tools/commit/a8c5b56d3c28714b149062be116fb4c382ce2fc0))

# [0.3.0](https://github.com/mpx-ecology/language-tools/compare/v0.2.0...v0.3.0) (2025-07-04)

### Bug Fixes

* **core:** fix destructuring issues for `defineProps` ([8d82468](https://github.com/mpx-ecology/language-tools/commit/8d82468645d015e2bd0de9fb679caf9e29717027))
* **core:** handle properties types ([b2023bb](https://github.com/mpx-ecology/language-tools/commit/b2023bbcf2fbc8292be4ac84be565a5679a65c92))
* **core:** unref setup returned dotValue correctly ([5ae8bec](https://github.com/mpx-ecology/language-tools/commit/5ae8bec75b6a1db0d52294d58f471948d0d36091))
* **types:** update types ([f48eb13](https://github.com/mpx-ecology/language-tools/commit/f48eb13831d914079f3d4db7f315714bd7ae720a))

### Features

* **core:** handle built-in variables like `__mpx_mode__` ([7603e6c](https://github.com/mpx-ecology/language-tools/commit/7603e6c35d975ef704a36eba957f030223706a92))
* **core:** refactor global types and enhance dollar vars support in templates ([d16081f](https://github.com/mpx-ecology/language-tools/commit/d16081f728cbbf56d4f034badf14b78cfe3caf8c))
* **core:** support ts check for native components attrs and refactor globalTypes code ([555f497](https://github.com/mpx-ecology/language-tools/commit/555f4970e4f99a9144d250d77b19fecde2465968))
* **core:** update native components types ([da9b78a](https://github.com/mpx-ecology/language-tools/commit/da9b78a40ab6853e49cd137402f91e47a0a24fbf))
* **core:** WIP add base components ([ecedfe1](https://github.com/mpx-ecology/language-tools/commit/ecedfe1b8d9d69f4d7589ee22d63fc76f1d61a32))
* **core:** WIP add view components ([0bf93f7](https://github.com/mpx-ecology/language-tools/commit/0bf93f7954c501dff1430987b9e5333ead485b1e))
* **inspect:** update json inspect cases ([a78c902](https://github.com/mpx-ecology/language-tools/commit/a78c902fd056a7dbb0aa72dd3d9b0c2cfbb2aa40))
* **service:** add mpx-css and mpx-document-link plugins ([55154a0](https://github.com/mpx-ecology/language-tools/commit/55154a06831f9b4de404183a56ee61a97fe4bc7d))
* support wx condition directive ([7db529a](https://github.com/mpx-ecology/language-tools/commit/7db529adadde6d20c9c7e1bb70513649f408457c))
* update formatting for mpx json ([97f441f](https://github.com/mpx-ecology/language-tools/commit/97f441fa4a02b5f3b5d1374519e023fcce4bae25))

# [0.2.0](https://github.com/mpx-ecology/language-tools/compare/v0.1.0...v0.2.0) (2025-06-26)

### Bug Fixes

* **core:** remove unnecessary ts-ignore and update code feature handling ([a62bf31](https://github.com/mpx-ecology/language-tools/commit/a62bf310459804aca9803c7cbb11d3d863f39f78))

# 0.1.0 (2025-06-24)

### Bug Fixes

* compact for ts<5 ([0d2e778](https://github.com/mpx-ecology/language-tools/commit/0d2e77882ce72193b38238063a134f13093742c5))
* **core:** correct offset adjustments for wx:for attribute ([9e5c3ad](https://github.com/mpx-ecology/language-tools/commit/9e5c3adefbba1b2ac417e56dc74dee7d470572ea))
* duplicate update error for 'wx:for-item' and 'wx:for-index' ([7eebce8](https://github.com/mpx-ecology/language-tools/commit/7eebce8a4b330625d2e9e8381faff79196b59073))
* handle unused locals warning for wx:for ([6bc43f4](https://github.com/mpx-ecology/language-tools/commit/6bc43f48c36bb9f958f61a73d39ce967d7a399e0))
* skip generate for template import element temporarily ([1868808](https://github.com/mpx-ecology/language-tools/commit/18688080dca3c4a7683ce16c7f8d3aa4e21808d0)), closes [#3](https://github.com/mpx-ecology/language-tools/issues/3)
* update attribute node AST handling ([f7269d8](https://github.com/mpx-ecology/language-tools/commit/f7269d8ef620a0126a7cdaf53921fb39bc7afa12))
* update error comments ([ddc659d](https://github.com/mpx-ecology/language-tools/commit/ddc659d5990a5ee6f2acb6100d75f6f7df2635e2))
* update event generate logic ([93a9373](https://github.com/mpx-ecology/language-tools/commit/93a9373321a0c01fdd3eeaf6a7281b6f53b74a22))

### Features

* add createPage type define and inspect case ([e9e420b](https://github.com/mpx-ecology/language-tools/commit/e9e420ba7c360653fe20213263d64e53abd5135a))
* cleanup codes and update inspect cases ([0dd6d34](https://github.com/mpx-ecology/language-tools/commit/0dd6d349cc24ce5ab2b294e52e8db413c086fc58))
* **core:** add defineComponentTypesContents to setupGlobalTypes ([1509345](https://github.com/mpx-ecology/language-tools/commit/15093456104a3325bb9d3f620dc6a50bed1a5cfe))
* **core:** generate virtual code correctly for script setup ([f6d6b27](https://github.com/mpx-ecology/language-tools/commit/f6d6b272b8c3823fec438357b90ef2b62c463f2b))
* **core:** generate virtual code for createComponent ([fa38f46](https://github.com/mpx-ecology/language-tools/commit/fa38f462ce0be71e31bc23e9c7ed871e4daa383e))
* **core:** implement wxFor and refactor related code ([ef55a41](https://github.com/mpx-ecology/language-tools/commit/ef55a41c7e9b1f148001656a7bf172f49db7ed33))
* **core:** refactor component type definitions and update related parsing logic ([274e8b6](https://github.com/mpx-ecology/language-tools/commit/274e8b6cca6e80d32696e5363512660fc0465984))
* **core:** support defineProps and update unocss config ([deb7280](https://github.com/mpx-ecology/language-tools/commit/deb7280510934610c21a807ce1943bc0ab9fcbd8))
* **core:** update support for createPage ([7d1a2c5](https://github.com/mpx-ecology/language-tools/commit/7d1a2c518f0bdb18f1c0433d94231ee9f5246b1e))
* enhance element props generation for value with double curly ([cd651a0](https://github.com/mpx-ecology/language-tools/commit/cd651a03a5f98f584f73b427989928860bef1c2d))
* first implementation of core and server ([44e3346](https://github.com/mpx-ecology/language-tools/commit/44e3346331a66f405f0d8704f156e786a06f55e0))
* Implement splitEditors feature and refactor types ([1a17d90](https://github.com/mpx-ecology/language-tools/commit/1a17d901ea6d6a8ee56829a19c886068d69d4469))
* init server ([761f6b3](https://github.com/mpx-ecology/language-tools/commit/761f6b31c835c7b4a559451b00b8ad0f5fdde80c))
* init types and update config ([84a6525](https://github.com/mpx-ecology/language-tools/commit/84a6525453d0ef697ec62c586ca462fc438d84e6))
* json with directive ([5b46915](https://github.com/mpx-ecology/language-tools/commit/5b469156391c4854ba79b27e99379bb391f01824))
* little update ([9f4590e](https://github.com/mpx-ecology/language-tools/commit/9f4590e59235fa85e6416c843c75b9aac5999364))
* parse class/wx:class string to styles ([e3a59ad](https://github.com/mpx-ecology/language-tools/commit/e3a59adc2addebc7f15ee710fe3304b03011df5d))
* refactor code generation functions for attrs value and other update ([170fd44](https://github.com/mpx-ecology/language-tools/commit/170fd44cbf84c2a40030797a49f740b9f5706955))
* remove componentsOption and update inspect cases ([e40e953](https://github.com/mpx-ecology/language-tools/commit/e40e9536e8819893d4488d141541eb39a2dea705))
* remove jsxSlots from MpxCompilerOptions and related usages ([0fc2317](https://github.com/mpx-ecology/language-tools/commit/0fc2317f51af2e7cd06d91114252aa8c3216cbb0))
* support auto added dotValue for defineExpose ([b56f8ed](https://github.com/mpx-ecology/language-tools/commit/b56f8edd430a9478816491de5ef29a6746aa2134))
* support for item/inex & bind event ([227201d](https://github.com/mpx-ecology/language-tools/commit/227201db1e83542c4dd770d5d30e66910cf51892))
* support more event prefix & disable highlight of default for item/index ([bb51152](https://github.com/mpx-ecology/language-tools/commit/bb51152d60ed002af15531f9ddb40d34c0562dd3))
* update ([c3ab94b](https://github.com/mpx-ecology/language-tools/commit/c3ab94b517f1aa58c93b2db82a5965e1faa4dbf3))
* update for mpx ([53cd1e5](https://github.com/mpx-ecology/language-tools/commit/53cd1e56efdc5bc128452965b016a6478c648d35))
* update license ([7515686](https://github.com/mpx-ecology/language-tools/commit/7515686f61bef6deb624b7389ec1d2daf75fb786))
* update plugins and improve VS Code extension documentation ([940f63c](https://github.com/mpx-ecology/language-tools/commit/940f63c3f7a5afb63b4849593d6420e818b0c8b5))
* update service & core ([d494238](https://github.com/mpx-ecology/language-tools/commit/d49423828d963bed81af446b2c39ca8425920afa))
* update var name ([a251b3c](https://github.com/mpx-ecology/language-tools/commit/a251b3c9c0fab25594b73421928adbf5b7092fd6))
