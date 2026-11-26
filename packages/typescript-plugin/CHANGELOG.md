# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.26.0](https://github.com/mpx-ecology/language-tools/compare/v1.24.3...v1.26.0) (2026-11-26)

### Bug Fixes

* **core:** infer registered React Native components in templates ([816dd4b](https://github.com/mpx-ecology/language-tools/commit/816dd4b574aa425df819aed064d988239757cd80))
* **diagnostics:** handle localized template expression messages ([469d75a](https://github.com/mpx-ecology/language-tools/commit/469d75a6087a49f2ada918a288bb5166eea86721))
* **diagnostics:** preserve mapping callbacks and add end-to-end regressions ([9abce02](https://github.com/mpx-ecology/language-tools/commit/9abce0203bfed5a12addd15a9d1fadc8b2caf121))
* **diagnostics:** restore template expressions in TypeScript errors ([8175b75](https://github.com/mpx-ecology/language-tools/commit/8175b7547916c4cc56611b023ae1665caa5e38f0))
* **language-core:** isolate app.mpx from page targetIds ([dc194c7](https://github.com/mpx-ecology/language-tools/commit/dc194c72d3ddd391aa56f48badf03e445e63ad3d))
* **language-core:** match component registrations by exact source names ([aa3bed2](https://github.com/mpx-ecology/language-tools/commit/aa3bed2484a5791bb1863e5195903092870480d2))
* **language-core:** refresh platform component dependencies on file events ([cb60c9c](https://github.com/mpx-ecology/language-tools/commit/cb60c9ca913d0d597fb1c745396a638304f7f155))
* **language-core:** resolve mpxTagName template identities ([3fd141c](https://github.com/mpx-ecology/language-tools/commit/3fd141caf6a0af52a018caff72a41e18228f533d))
* **language-core:** resolve platform component files consistently ([a354c85](https://github.com/mpx-ecology/language-tools/commit/a354c85ee5f1977f79080b54bc787746d0cadb7d))
* **language-core:** warn on duplicate setup instance fields ([470faab](https://github.com/mpx-ecology/language-tools/commit/470faab63b0f84884051045569a1e672afadc801))
* **references:** find statically registered component consumers ([d778421](https://github.com/mpx-ecology/language-tools/commit/d778421baf8dad3faf087db9af8cd2253551ae6d))
* **service:** complete registered application and global components ([cd6b56b](https://github.com/mpx-ecology/language-tools/commit/cd6b56b3cc5d90ddc4308560220acf524155cf27))
* **typescript-plugin:** highlight numeric component tags ([7bd1dcd](https://github.com/mpx-ecology/language-tools/commit/7bd1dcdd4a728af7903f133898bb41e2cd4ee236))
* **typescript-plugin:** map definition protocol positions to source lines ([35296e3](https://github.com/mpx-ecology/language-tools/commit/35296e38719026421274487ddda042a70a0970ab))
* **typescript-plugin:** preserve raw component registration keys for highlighting ([15ce72e](https://github.com/mpx-ecology/language-tools/commit/15ce72e6b63b4803b4a42f81e1b21a02e842208c))

### Performance Improvements

* **language-core:** reuse filesystem probes during project startup ([88554af](https://github.com/mpx-ecology/language-tools/commit/88554aff556e206e9c4b859d4c009c49dfcfd20f))
* **language-tools:** reduce template and graph startup work ([5c9d52b](https://github.com/mpx-ecology/language-tools/commit/5c9d52b163a0e14eb9b8ec7124b92a54ededb74f))
* **language-tools:** reuse startup syntax and omit source padding ([72e2ced](https://github.com/mpx-ecology/language-tools/commit/72e2cedb7d3a7e15dd7f78bfc5ba3cb3a5f74ca6))
* **typescript-plugin:** generate only the service script in tsserver ([8e41b85](https://github.com/mpx-ecology/language-tools/commit/8e41b85bf3b2d43cecfcd36ee8be6825d8eb22ac))

## [1.24.3](https://github.com/mpx-ecology/language-tools/compare/v1.24.2...v1.24.3) (2026-10-29)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.24.2](https://github.com/mpx-ecology/language-tools/compare/v1.24.1...v1.24.2) (2026-08-20)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.24.1](https://github.com/mpx-ecology/language-tools/compare/v1.24.0...v1.24.1) (2026-07-23)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.24.0](https://github.com/mpx-ecology/language-tools/compare/v1.22.6...v1.24.0) (2026-07-23)

### Features

* support type checking and completion for custom component props ([fd71c11](https://github.com/mpx-ecology/language-tools/commit/fd71c1199724ba1d3bc95e3e2de90d7d17b1e102))

## [1.22.6](https://github.com/mpx-ecology/language-tools/compare/v1.22.5...v1.22.6) (2026-07-01)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.22.5](https://github.com/mpx-ecology/language-tools/compare/v1.22.4...v1.22.5) (2026-06-23)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.22.4](https://github.com/mpx-ecology/language-tools/compare/v1.22.3...v1.22.4) (2026-06-22)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.22.3](https://github.com/mpx-ecology/language-tools/compare/v1.22.2...v1.22.3) (2026-05-28)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.22.2](https://github.com/mpx-ecology/language-tools/compare/v1.22.1...v1.22.2) (2026-05-28)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.22.1](https://github.com/mpx-ecology/language-tools/compare/v1.22.0...v1.22.1) (2026-05-28)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.22.0](https://github.com/mpx-ecology/language-tools/compare/v1.20.0...v1.22.0) (2026-05-28)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.20.0](https://github.com/mpx-ecology/language-tools/compare/v1.18.5...v1.20.0) (2026-03-09)

### Features

* review update ([de8bb4e](https://github.com/mpx-ecology/language-tools/commit/de8bb4e2c199c856160d4b2c432254436299d4b4))
* 组件路径补全（mvp） ([6f19f1d](https://github.com/mpx-ecology/language-tools/commit/6f19f1d00ec71ee32778623d877b374142e1c6fe))

## [1.18.5](https://github.com/mpx-ecology/language-tools/compare/v1.18.4...v1.18.5) (2026-01-08)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.18.4](https://github.com/mpx-ecology/language-tools/compare/v1.18.3...v1.18.4) (2025-12-17)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.18.3](https://github.com/mpx-ecology/language-tools/compare/v1.18.2...v1.18.3) (2025-12-15)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.18.2](https://github.com/mpx-ecology/language-tools/compare/v1.18.1...v1.18.2) (2025-12-10)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.18.1](https://github.com/mpx-ecology/language-tools/compare/v1.18.0...v1.18.1) (2025-12-05)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.18.0](https://github.com/mpx-ecology/language-tools/compare/v1.16.1...v1.18.0) (2025-12-04)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.16.1](https://github.com/mpx-ecology/language-tools/compare/v1.16.0...v1.16.1) (2025-12-01)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.16.0](https://github.com/mpx-ecology/language-tools/compare/v1.14.3...v1.16.0) (2025-11-30)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.14.3](https://github.com/mpx-ecology/language-tools/compare/v1.14.2...v1.14.3) (2025-11-12)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.14.2](https://github.com/mpx-ecology/language-tools/compare/v1.14.1...v1.14.2) (2025-10-10)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.14.1](https://github.com/mpx-ecology/language-tools/compare/v1.14.0...v1.14.1) (2025-09-25)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.14.0](https://github.com/mpx-ecology/language-tools/compare/v1.12.3...v1.14.0) (2025-09-17)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.12.3](https://github.com/mpx-ecology/language-tools/compare/v1.12.2...v1.12.3) (2025-09-08)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.12.2](https://github.com/mpx-ecology/language-tools/compare/v1.12.1...v1.12.2) (2025-09-04)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.12.1](https://github.com/mpx-ecology/language-tools/compare/v1.12.0...v1.12.1) (2025-09-02)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.12.0](https://github.com/mpx-ecology/language-tools/compare/v1.10.1...v1.12.0) (2025-09-01)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.10.1](https://github.com/mpx-ecology/language-tools/compare/v1.10.0...v1.10.1) (2025-08-27)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.10.0](https://github.com/mpx-ecology/language-tools/compare/v1.8.5...v1.10.0) (2025-08-19)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.8.5](https://github.com/mpx-ecology/language-tools/compare/v1.8.4...v1.8.5) (2025-08-18)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.8.4](https://github.com/mpx-ecology/language-tools/compare/v1.8.3...v1.8.4) (2025-08-14)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.8.3](https://github.com/mpx-ecology/language-tools/compare/v1.8.2...v1.8.3) (2025-08-12)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.8.2](https://github.com/mpx-ecology/language-tools/compare/v1.8.1...v1.8.2) (2025-08-11)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.8.1](https://github.com/mpx-ecology/language-tools/compare/v1.8.0...v1.8.1) (2025-08-07)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.8.0](https://github.com/mpx-ecology/language-tools/compare/v1.6.2...v1.8.0) (2025-08-06)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.6.2](https://github.com/mpx-ecology/language-tools/compare/v1.6.1...v1.6.2) (2025-08-01)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.6.1](https://github.com/mpx-ecology/language-tools/compare/v1.6.0...v1.6.1) (2025-07-31)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.6.0](https://github.com/mpx-ecology/language-tools/compare/v1.4.1...v1.6.0) (2025-07-30)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.4.1](https://github.com/mpx-ecology/language-tools/compare/v1.4.0...v1.4.1) (2025-07-29)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.4.0](https://github.com/mpx-ecology/language-tools/compare/v1.2.8...v1.4.0) (2025-07-26)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.8](https://github.com/mpx-ecology/language-tools/compare/v1.2.7...v1.2.8) (2025-07-24)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.7](https://github.com/mpx-ecology/language-tools/compare/v1.2.6...v1.2.7) (2025-07-24)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.6](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.6) (2025-07-23)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.5](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.5) (2025-07-23)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.4](https://github.com/mpx-ecology/language-tools/compare/v1.2.3...v1.2.4) (2025-07-22)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.3](https://github.com/mpx-ecology/language-tools/compare/v1.2.2...v1.2.3) (2025-07-21)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.2](https://github.com/mpx-ecology/language-tools/compare/v1.2.1...v1.2.2) (2025-07-17)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.2.1](https://github.com/mpx-ecology/language-tools/compare/v1.2.0...v1.2.1) (2025-07-17)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.2.0](https://github.com/mpx-ecology/language-tools/compare/v1.0.4...v1.2.0) (2025-07-16)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.0.4](https://github.com/mpx-ecology/language-tools/compare/v1.0.3...v1.0.4) (2025-07-15)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.0.3](https://github.com/mpx-ecology/language-tools/compare/v1.0.2...v1.0.3) (2025-07-14)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.0.2](https://github.com/mpx-ecology/language-tools/compare/v1.0.1...v1.0.2) (2025-07-14)

**Note:** Version bump only for package @mpxjs/typescript-plugin

## [1.0.1](https://github.com/mpx-ecology/language-tools/compare/v1.0.0...v1.0.1) (2025-07-14)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [1.0.0](https://github.com/mpx-ecology/language-tools/compare/v0.3.0...v1.0.0) (2025-07-14)

### Features

* handle json js block ([44cafba](https://github.com/mpx-ecology/language-tools/commit/44cafbaa8fc187f0b153a1f78b8acc7c5292d301))

# [0.3.0](https://github.com/mpx-ecology/language-tools/compare/v0.2.0...v0.3.0) (2025-07-04)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# [0.2.0](https://github.com/mpx-ecology/language-tools/compare/v0.1.0...v0.2.0) (2025-06-26)

**Note:** Version bump only for package @mpxjs/typescript-plugin

# 0.1.0 (2025-06-24)

### Bug Fixes

* format ([118bb85](https://github.com/mpx-ecology/language-tools/commit/118bb85c08d6291e3f6c7241225e9267e9af9483))

### Features

* cleanup codes and update inspect cases ([0dd6d34](https://github.com/mpx-ecology/language-tools/commit/0dd6d349cc24ce5ab2b294e52e8db413c086fc58))
* init server ([761f6b3](https://github.com/mpx-ecology/language-tools/commit/761f6b31c835c7b4a559451b00b8ad0f5fdde80c))
* update service & core ([d494238](https://github.com/mpx-ecology/language-tools/commit/d49423828d963bed81af446b2c39ca8425920afa))
* update var name ([a251b3c](https://github.com/mpx-ecology/language-tools/commit/a251b3c9c0fab25594b73421928adbf5b7092fd6))
