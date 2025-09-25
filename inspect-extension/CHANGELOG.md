# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.14.1](https://github.com/mpx-ecology/language-tools/compare/v1.14.0...v1.14.1) (2025-09-25)

### Features

* **service:** align prettier formatter with `vue` parser ([c3cd31b](https://github.com/mpx-ecology/language-tools/commit/c3cd31bc9c982d6d406ee73aead65af69784626c))
* **service:** enhance prettier formatter ([801a49e](https://github.com/mpx-ecology/language-tools/commit/801a49e68ca3ecac8f1673d2b747cb30bb2e1495))
* **service:** little refactor ([62437de](https://github.com/mpx-ecology/language-tools/commit/62437decd7f327753a46db99c494cade3492f1ab))
* 去除 HTML 内置标签src、href等属性的跳转功能，避免与{{ xxx }}内的路径冲突 ([c59caa6](https://github.com/mpx-ecology/language-tools/commit/c59caa6f5f91668b52b6a24271a8d268134b3c35))

# [1.14.0](https://github.com/mpx-ecology/language-tools/compare/v1.12.3...v1.14.0) (2025-09-17)

### Features

* **core:** update usingComponents handling and style adjustments ([327971b](https://github.com/mpx-ecology/language-tools/commit/327971b5076b2817b6117aac815e48b880b9f4bb))
* review ([0800ec0](https://github.com/mpx-ecology/language-tools/commit/0800ec0eb9dde130a3c6a1e9418795bda7129965))
* **service:** refactor stylus colors parsing ([04d088f](https://github.com/mpx-ecology/language-tools/commit/04d088fb027e025cdad4c1dfa53d7bf8d6abf12e))
* **vscode:** support interpolation decorators like Vue ([6c89d68](https://github.com/mpx-ecology/language-tools/commit/6c89d68668a7e3dcab1e0a926a85b470b4efbb27))
* 增强正则逻辑，处理命中id选择器情况 ([7a16220](https://github.com/mpx-ecology/language-tools/commit/7a1622068f0f917491d6c9be810d7d239ab95b2c))
* 支持mpx文件css样式颜色调色板显示和更改颜色 ([4809101](https://github.com/mpx-ecology/language-tools/commit/4809101fc41f33375a50be32052a47751b7a601c))

## [1.12.3](https://github.com/mpx-ecology/language-tools/compare/v1.12.2...v1.12.3) (2025-09-08)

### Features

* refactor prettier integration and add bracket spacing formatting ([b564e66](https://github.com/mpx-ecology/language-tools/commit/b564e6688df97be4328d43a6af390efaf2ac05b2))
* support prettier formatter for template ([215e0a2](https://github.com/mpx-ecology/language-tools/commit/215e0a2bc0c452fe3e6a702632f1cc3e2856e19f))

## [1.12.2](https://github.com/mpx-ecology/language-tools/compare/v1.12.1...v1.12.2) (2025-09-04)

### Features

* **core:** enhance Object.assign parsing for `usingComponents` ([f2f52fc](https://github.com/mpx-ecology/language-tools/commit/f2f52fc1687f1432025a70d6e9c75191f1e78b4b))
* **core:** support link and diagnostics for pages ([85c683d](https://github.com/mpx-ecology/language-tools/commit/85c683df601d8cf278e22e580ea5edf92117eaeb))

## [1.12.1](https://github.com/mpx-ecology/language-tools/compare/v1.12.0...v1.12.1) (2025-09-02)

### Bug Fixes

* **core:** enhance usingComponents parsing ([f8c061a](https://github.com/mpx-ecology/language-tools/commit/f8c061a1ffe18d5281a198e290e299ad266e8eda))

# [1.12.0](https://github.com/mpx-ecology/language-tools/compare/v1.10.1...v1.12.0) (2025-09-01)

### Features

* add Prettier formatting configuration options ([ea8fcf9](https://github.com/mpx-ecology/language-tools/commit/ea8fcf9165813b662ee52c859c9f1e2a5fdb6b44))
* prettier formatting support script initial indent formatting config and json_js module ([9aa6bd6](https://github.com/mpx-ecology/language-tools/commit/9aa6bd6ef2be89edde09c7270704543905b9fabe))
* **service:** introduce prettier formatter for script js/ts ([d0061ce](https://github.com/mpx-ecology/language-tools/commit/d0061ceab349ae00558b0a79f8c75fcd0d87507b))

## [1.10.1](https://github.com/mpx-ecology/language-tools/compare/v1.10.0...v1.10.1) (2025-08-27)

**Note:** Version bump only for package inspect

# [1.10.0](https://github.com/mpx-ecology/language-tools/compare/v1.8.5...v1.10.0) (2025-08-19)

### Bug Fixes

* **core:** enhance component handling and support for external components in code generation ([b389d9f](https://github.com/mpx-ecology/language-tools/commit/b389d9f9f05152256726ce5da526ab51f8e4976a))

### Features

* **core:** support document link for dynamic component range ([ff422c6](https://github.com/mpx-ecology/language-tools/commit/ff422c6dcef51984013da5a5771ce7d5e2f9fe1c))
* review ([b3f51cc](https://github.com/mpx-ecology/language-tools/commit/b3f51cc59bfa87816207ba5e10997b1ef3f36c6a))

## [1.8.5](https://github.com/mpx-ecology/language-tools/compare/v1.8.4...v1.8.5) (2025-08-18)

### Bug Fixes

* **core:** support event param `$event` codegen for compound expression ([b5707e2](https://github.com/mpx-ecology/language-tools/commit/b5707e2b73bba49d77a711f7209e05e3df0e0031))

### Features

* **core:** implement `onReactHooksExec` codegen in script setup ([d57b836](https://github.com/mpx-ecology/language-tools/commit/d57b8365d1c2c050bda3f99088645769084cc23f))
* **inspect:** add `defineOptions` options ([6341753](https://github.com/mpx-ecology/language-tools/commit/6341753482cb7d0a6699a5622a175900c405cadf))
* **inspect:** add `defineOptions` test case ([7fbf5da](https://github.com/mpx-ecology/language-tools/commit/7fbf5daa19dd0689591b389ebcbd9bf67e5ee206))

## [1.8.4](https://github.com/mpx-ecology/language-tools/compare/v1.8.3...v1.8.4) (2025-08-14)

**Note:** Version bump only for package inspect

## [1.8.3](https://github.com/mpx-ecology/language-tools/compare/v1.8.2...v1.8.3) (2025-08-12)

### Bug Fixes

* **core:** enhance codegen for style url value ([0e3f7e0](https://github.com/mpx-ecology/language-tools/commit/0e3f7e0435e2c3c1277b8077082850b83244284f))
* **core:** prevent duplicate error reporting in options component ([9f18ccd](https://github.com/mpx-ecology/language-tools/commit/9f18ccd5a474aa92e650155d05f33f927524f708))

## [1.8.2](https://github.com/mpx-ecology/language-tools/compare/v1.8.1...v1.8.2) (2025-08-11)

### Bug Fixes

* enhance codegen for `capture:` and `capture` ([b814923](https://github.com/mpx-ecology/language-tools/commit/b814923edb31b67d45590dc90fe8f8eb9e00ba3f))

### Features

* enhance component paths resolve for spread assignments ([c67a0bb](https://github.com/mpx-ecology/language-tools/commit/c67a0bbc85440ed806f8c5cb58538d5ecfda8243))
* format test cases ([d85a5a3](https://github.com/mpx-ecology/language-tools/commit/d85a5a32532483977a1eeb6fff79a1bf1d9b2aba))

## [1.8.1](https://github.com/mpx-ecology/language-tools/compare/v1.8.0...v1.8.1) (2025-08-07)

### Features

* enhance musatche handler for `style` and `class` ([ecd2d8c](https://github.com/mpx-ecology/language-tools/commit/ecd2d8cf02d74b8d5c5624f5f47918076c873152))

# [1.8.0](https://github.com/mpx-ecology/language-tools/compare/v1.6.2...v1.8.0) (2025-08-06)

### Features

* **core:** support codegen for `[REACTHOOKSEXEC]` option ([a025239](https://github.com/mpx-ecology/language-tools/commit/a0252399fd04df430e06ee6517af307e0880d66a))
* enhance template handling with mustache syntax and improve formatting options ([a7ce3ad](https://github.com/mpx-ecology/language-tools/commit/a7ce3ad1e2f5c0686d28a928c95840c2f8b9d3d3))
* review ([f1c6073](https://github.com/mpx-ecology/language-tools/commit/f1c6073d4d65364f827ecbfd9d80d8125ed3093f))

## [1.6.2](https://github.com/mpx-ecology/language-tools/compare/v1.6.1...v1.6.2) (2025-08-01)

**Note:** Version bump only for package inspect

## [1.6.1](https://github.com/mpx-ecology/language-tools/compare/v1.6.0...v1.6.1) (2025-07-31)

### Bug Fixes

* enhance tab/space formatting option for stylus ([81970bf](https://github.com/mpx-ecology/language-tools/commit/81970bfd5c5fb38bc9bfc7465065fadc768e0d15))

# [1.6.0](https://github.com/mpx-ecology/language-tools/compare/v1.4.1...v1.6.0) (2025-07-30)

### Bug Fixes

* enhance directive comments for `wx:if` ([40dff73](https://github.com/mpx-ecology/language-tools/commit/40dff73ac7a2b01c527b073514e168fd9e0d943b))

### Features

* add autoinsert space plugin for template ([aba84ba](https://github.com/mpx-ecology/language-tools/commit/aba84bae92561da2ba2b6db69fdfbd09d8a6ffcf))

## [1.4.1](https://github.com/mpx-ecology/language-tools/compare/v1.4.0...v1.4.1) (2025-07-29)

### Bug Fixes

* resolve native components path for `usingComponents` ([885fbf5](https://github.com/mpx-ecology/language-tools/commit/885fbf59c15b12a84e50d0f1618e586fbcb4c414))

### Features

* add template formatter option `bracketSpacing` ([6c3b6d1](https://github.com/mpx-ecology/language-tools/commit/6c3b6d1b07bff8b674d929586d9d7a49a226158d))

# [1.4.0](https://github.com/mpx-ecology/language-tools/compare/v1.2.8...v1.4.0) (2025-07-26)

### Features

* enhance template formatting ([997ed10](https://github.com/mpx-ecology/language-tools/commit/997ed10e21345d1526ce60d5e24f96cca8d65a64))
* support Stylus formatter with built-in data ([b418f16](https://github.com/mpx-ecology/language-tools/commit/b418f16a19b828541e23160aabffee3290b573e0))

## [1.2.8](https://github.com/mpx-ecology/language-tools/compare/v1.2.7...v1.2.8) (2025-07-24)

### Bug Fixes

* remove unused file ([305bc4b](https://github.com/mpx-ecology/language-tools/commit/305bc4b36329ce5e335712c451702f1f24ce18da))

### Features

* support stylus formatting with `stylus-supremacy` ([b1a6aaa](https://github.com/mpx-ecology/language-tools/commit/b1a6aaa57b6bc3bf4eabc7bdd4520cdd1a226e67))

## [1.2.7](https://github.com/mpx-ecology/language-tools/compare/v1.2.6...v1.2.7) (2025-07-24)

### Bug Fixes

* **core:** enhance codegen for bind event ([7f93660](https://github.com/mpx-ecology/language-tools/commit/7f936608e61d89845eab7fbf805ee458f7d6843e))

## [1.2.6](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.6) (2025-07-23)

### Features

* implement compiler errors handling for mpx template transformations ([d282594](https://github.com/mpx-ecology/language-tools/commit/d28259420b593ba4ea94eb6b59ffaf0828c68e56))

## [1.2.5](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.5) (2025-07-23)

**Note:** Version bump only for package inspect

## [1.2.4](https://github.com/mpx-ecology/language-tools/compare/v1.2.3...v1.2.4) (2025-07-22)

### Bug Fixes

* enhance `wx:If` processing logic for static string ([65dbfae](https://github.com/mpx-ecology/language-tools/commit/65dbfaef6625a27adb7291b4ddaf8ec50bd70a36))
* refine `wx:if` handling and improve whitespace management in templates ([216a2ff](https://github.com/mpx-ecology/language-tools/commit/216a2ff3f26809161e736a6fddec0598f9e4930c))

### Features

* enhance `wx:if` handling and support compiler error diagnostics for templates ([0151bf4](https://github.com/mpx-ecology/language-tools/commit/0151bf43508c696cda3d289fb1a73fd0c2d1126c))

## [1.2.3](https://github.com/mpx-ecology/language-tools/compare/v1.2.2...v1.2.3) (2025-07-21)

**Note:** Version bump only for package inspect

## [1.2.2](https://github.com/mpx-ecology/language-tools/compare/v1.2.1...v1.2.2) (2025-07-17)

### Bug Fixes

* resolve directory path of usingComponents ([66dcc5b](https://github.com/mpx-ecology/language-tools/commit/66dcc5be5e102e8bff336ea634db4953f403c004))

## [1.2.1](https://github.com/mpx-ecology/language-tools/compare/v1.2.0...v1.2.1) (2025-07-17)

**Note:** Version bump only for package inspect

# [1.2.0](https://github.com/mpx-ecology/language-tools/compare/v1.0.4...v1.2.0) (2025-07-16)

### Bug Fixes

* review ([dbb7849](https://github.com/mpx-ecology/language-tools/commit/dbb7849a60ce77abb3b44783d7607bba9556be72))

### Features

* enhance json usingComponents paths handler and add errors diagnostics for mpx json ([a0bc4dc](https://github.com/mpx-ecology/language-tools/commit/a0bc4dcd6f05b32d533124229c16f59f03c37783))
* **service:** support schema for mpx json ([06fcfa2](https://github.com/mpx-ecology/language-tools/commit/06fcfa29348d389d1ce7cffbc5a9c6739bde6e1d))
* **service:** support usingComponents document link for json-js ([a819598](https://github.com/mpx-ecology/language-tools/commit/a8195986d14b8c43cfd3599b17e99fd7cc2c3fcc))

## [1.0.4](https://github.com/mpx-ecology/language-tools/compare/v1.0.3...v1.0.4) (2025-07-15)

### Features

* **service:** update attrs info ([701fea6](https://github.com/mpx-ecology/language-tools/commit/701fea611252df6891f00336b6fe85ed31fab34d))

## [1.0.3](https://github.com/mpx-ecology/language-tools/compare/v1.0.2...v1.0.3) (2025-07-14)

**Note:** Version bump only for package inspect

## [1.0.2](https://github.com/mpx-ecology/language-tools/compare/v1.0.1...v1.0.2) (2025-07-14)

**Note:** Version bump only for package inspect

## [1.0.1](https://github.com/mpx-ecology/language-tools/compare/v1.0.0...v1.0.1) (2025-07-14)

**Note:** Version bump only for package inspect

# [1.0.0](https://github.com/mpx-ecology/language-tools/compare/v0.3.0...v1.0.0) (2025-07-14)

### Bug Fixes

* filter comment when find ifNode prev node ([b52acdb](https://github.com/mpx-ecology/language-tools/commit/b52acdb5cde41d688325178b7d84974a09107afb))
* wx condition ([a9704d8](https://github.com/mpx-ecology/language-tools/commit/a9704d8a81805c1eeed749663a5663f7655566e3))

### Features

* **core:** enhance codegen for attributesValue ([b41754e](https://github.com/mpx-ecology/language-tools/commit/b41754ee2552e260dcf3fd9f303b4f5fdf66518d))
* enhance template document link for custom component ([75e7bff](https://github.com/mpx-ecology/language-tools/commit/75e7bffa3202bce476fa416894a5221055a2786a))
* **inspect:** update wx:for and wx:if priority case ([4df6996](https://github.com/mpx-ecology/language-tools/commit/4df6996a9b7732246837ba95d6098507a8a6c799))
* refactor and cleanup code ([d34747a](https://github.com/mpx-ecology/language-tools/commit/d34747af1f6573e22c7bf674486d8e126a7e902f))
* refactor shared code and update deps ([3d8c0dd](https://github.com/mpx-ecology/language-tools/commit/3d8c0ddb874137d55f424bbdca97082da5cde0de))
* **service:** support for custom components in template completion ([a8345b6](https://github.com/mpx-ecology/language-tools/commit/a8345b63ba8447c962fb027aa8ae1ac3528ecfe3))
* support abs path resolve ([c0702de](https://github.com/mpx-ecology/language-tools/commit/c0702ded94df3fa23dab8cacb6fd172a37e9813f))
* support document link for json component ([9a7f9f7](https://github.com/mpx-ecology/language-tools/commit/9a7f9f75da5f372f411b481857a8c385f9dbd5a1))
* support template global definitions ([a8c5b56](https://github.com/mpx-ecology/language-tools/commit/a8c5b56d3c28714b149062be116fb4c382ce2fc0))

# [0.3.0](https://github.com/mpx-ecology/language-tools/compare/v0.2.0...v0.3.0) (2025-07-04)

### Bug Fixes

* **core:** fix destructuring issues for `defineProps` ([8d82468](https://github.com/mpx-ecology/language-tools/commit/8d82468645d015e2bd0de9fb679caf9e29717027))
* **core:** handle properties types ([b2023bb](https://github.com/mpx-ecology/language-tools/commit/b2023bbcf2fbc8292be4ac84be565a5679a65c92))
* **core:** unref setup returned dotValue correctly ([5ae8bec](https://github.com/mpx-ecology/language-tools/commit/5ae8bec75b6a1db0d52294d58f471948d0d36091))

### Features

* **core:** handle built-in variables like `__mpx_mode__` ([7603e6c](https://github.com/mpx-ecology/language-tools/commit/7603e6c35d975ef704a36eba957f030223706a92))
* **core:** refactor global types and enhance dollar vars support in templates ([d16081f](https://github.com/mpx-ecology/language-tools/commit/d16081f728cbbf56d4f034badf14b78cfe3caf8c))
* **core:** support ts check for native components attrs and refactor globalTypes code ([555f497](https://github.com/mpx-ecology/language-tools/commit/555f4970e4f99a9144d250d77b19fecde2465968))
* **core:** update native components types ([da9b78a](https://github.com/mpx-ecology/language-tools/commit/da9b78a40ab6853e49cd137402f91e47a0a24fbf))
* **directive-comments:** add mpx-expect-error, mpx-ignore, and mpx-skip templates ([99c2f68](https://github.com/mpx-ecology/language-tools/commit/99c2f68a1b028169831c0608fa12121b27d9d5b9))
* **inspect:** update cases for script-json ([b801799](https://github.com/mpx-ecology/language-tools/commit/b8017994ca4b800eb01bf146fbc35b26fe384bbf))
* **inspect:** update json inspect cases ([a78c902](https://github.com/mpx-ecology/language-tools/commit/a78c902fd056a7dbb0aa72dd3d9b0c2cfbb2aa40))
* support wx condition directive ([7db529a](https://github.com/mpx-ecology/language-tools/commit/7db529adadde6d20c9c7e1bb70513649f408457c))

# [0.2.0](https://github.com/mpx-ecology/language-tools/compare/v0.1.0...v0.2.0) (2025-06-26)

### Features

* **service:** add template plugin for attrs completion and hover support ([075173e](https://github.com/mpx-ecology/language-tools/commit/075173ed45ef98defcaa1a68804447e73def8977))

# 0.1.0 (2025-06-24)

### Bug Fixes

* compact for ts<5 ([0d2e778](https://github.com/mpx-ecology/language-tools/commit/0d2e77882ce72193b38238063a134f13093742c5))
* duplicate update error for 'wx:for-item' and 'wx:for-index' ([7eebce8](https://github.com/mpx-ecology/language-tools/commit/7eebce8a4b330625d2e9e8381faff79196b59073))
* handle unused locals warning for wx:for ([6bc43f4](https://github.com/mpx-ecology/language-tools/commit/6bc43f48c36bb9f958f61a73d39ce967d7a399e0))
* skip generate for template import element temporarily ([1868808](https://github.com/mpx-ecology/language-tools/commit/18688080dca3c4a7683ce16c7f8d3aa4e21808d0)), closes [#3](https://github.com/mpx-ecology/language-tools/issues/3)
* update attribute node AST handling ([f7269d8](https://github.com/mpx-ecology/language-tools/commit/f7269d8ef620a0126a7cdaf53921fb39bc7afa12))
* update error comments ([ddc659d](https://github.com/mpx-ecology/language-tools/commit/ddc659d5990a5ee6f2acb6100d75f6f7df2635e2))
* update event generate logic ([93a9373](https://github.com/mpx-ecology/language-tools/commit/93a9373321a0c01fdd3eeaf6a7281b6f53b74a22))
* update wx:* syntaxes highlight ([843b111](https://github.com/mpx-ecology/language-tools/commit/843b111198dbc720a94fc4581df3cc40e6519edf))

### Features

* add createPage type define and inspect case ([e9e420b](https://github.com/mpx-ecology/language-tools/commit/e9e420ba7c360653fe20213263d64e53abd5135a))
* cleanup codes and update inspect cases ([0dd6d34](https://github.com/mpx-ecology/language-tools/commit/0dd6d349cc24ce5ab2b294e52e8db413c086fc58))
* **core:** generate virtual code correctly for script setup ([f6d6b27](https://github.com/mpx-ecology/language-tools/commit/f6d6b272b8c3823fec438357b90ef2b62c463f2b))
* **core:** generate virtual code for createComponent ([fa38f46](https://github.com/mpx-ecology/language-tools/commit/fa38f462ce0be71e31bc23e9c7ed871e4daa383e))
* **core:** support defineProps and update unocss config ([deb7280](https://github.com/mpx-ecology/language-tools/commit/deb7280510934610c21a807ce1943bc0ab9fcbd8))
* enhance element props generation for value with double curly ([cd651a0](https://github.com/mpx-ecology/language-tools/commit/cd651a03a5f98f584f73b427989928860bef1c2d))
* **inspect:** update test cases ([65b0ae6](https://github.com/mpx-ecology/language-tools/commit/65b0ae61e4359e46af27c70143bcba012d532193))
* json with directive ([5b46915](https://github.com/mpx-ecology/language-tools/commit/5b469156391c4854ba79b27e99379bb391f01824))
* little update ([9f4590e](https://github.com/mpx-ecology/language-tools/commit/9f4590e59235fa85e6416c843c75b9aac5999364))
* parse class/wx:class string to styles ([e3a59ad](https://github.com/mpx-ecology/language-tools/commit/e3a59adc2addebc7f15ee710fe3304b03011df5d))
* refactor code generation functions for attrs value and other update ([170fd44](https://github.com/mpx-ecology/language-tools/commit/170fd44cbf84c2a40030797a49f740b9f5706955))
* remove componentsOption and update inspect cases ([e40e953](https://github.com/mpx-ecology/language-tools/commit/e40e9536e8819893d4488d141541eb39a2dea705))
* support auto added dotValue for defineExpose ([b56f8ed](https://github.com/mpx-ecology/language-tools/commit/b56f8edd430a9478816491de5ef29a6746aa2134))
* support for item/inex & bind event ([227201d](https://github.com/mpx-ecology/language-tools/commit/227201db1e83542c4dd770d5d30e66910cf51892))
* support more event prefix & disable highlight of default for item/index ([bb51152](https://github.com/mpx-ecology/language-tools/commit/bb51152d60ed002af15531f9ddb40d34c0562dd3))
* update service & core ([d494238](https://github.com/mpx-ecology/language-tools/commit/d49423828d963bed81af446b2c39ca8425920afa))
