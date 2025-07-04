# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
