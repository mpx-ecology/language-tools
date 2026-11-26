# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.26.0](https://github.com/mpx-ecology/language-tools/compare/v1.24.3...v1.26.0) (2026-11-26)

### Bug Fixes

* **diagnostics:** restore template expressions in TypeScript errors ([8175b75](https://github.com/mpx-ecology/language-tools/commit/8175b7547916c4cc56611b023ae1665caa5e38f0))
* **language-core:** isolate app.mpx from page targetIds ([dc194c7](https://github.com/mpx-ecology/language-tools/commit/dc194c72d3ddd391aa56f48badf03e445e63ad3d))
* **language-core:** refresh platform component dependencies on file events ([cb60c9c](https://github.com/mpx-ecology/language-tools/commit/cb60c9ca913d0d597fb1c745396a638304f7f155))
* **language-core:** resolve platform component files consistently ([a354c85](https://github.com/mpx-ecology/language-tools/commit/a354c85ee5f1977f79080b54bc787746d0cadb7d))
* **language-service:** add dynamic JSON config schema hints ([824dc32](https://github.com/mpx-ecology/language-tools/commit/824dc32428de369fc76d902c9c451dc84fba6595))
* **language-service:** harden JSON semantic boundaries ([82e6901](https://github.com/mpx-ecology/language-tools/commit/82e690155aa441f5ffa51fe61e9a86978da43b42))
* **language-service:** preserve multi-target component navigation ([3654c42](https://github.com/mpx-ecology/language-tools/commit/3654c42e0278b147c7acb49e1375a6ab61be02e0))
* **language-service:** refine JSON ranges and project invalidation ([c7c4c30](https://github.com/mpx-ecology/language-tools/commit/c7c4c303bfd52bea88979ce3319555b7cd9ba32c))
* **language-service:** support JavaScript semantics in JSON scripts ([ea0ee9a](https://github.com/mpx-ecology/language-tools/commit/ea0ee9a3c624e2decc187c0c32c918510c5bc8ae))
* **language-tools:** handle cached project lifecycles ([6b1ee0c](https://github.com/mpx-ecology/language-tools/commit/6b1ee0c9504ef7da426b80ae5cf35df98ab611ff))
* **service:** complete registered application and global components ([cd6b56b](https://github.com/mpx-ecology/language-tools/commit/cd6b56b3cc5d90ddc4308560220acf524155cf27))
* **service:** register workspace components from template completions ([eaf194a](https://github.com/mpx-ecology/language-tools/commit/eaf194a309772c1b6aa0bc0aa9e8fab6458d6086))
* **vscode:** synchronize JSON script dependencies ([e3ff85c](https://github.com/mpx-ecology/language-tools/commit/e3ff85cb4c9c58c74650f9037d81d110abe9ece8))
* **vscode:** underline multi-target component paths ([12752d5](https://github.com/mpx-ecology/language-tools/commit/12752d5f2097948bd380675a4ad8c3d668bf6d4d))

### Performance Improvements

* **language-core:** avoid redundant startup diagnostics and imports ([177a6f4](https://github.com/mpx-ecology/language-tools/commit/177a6f43aa4c5a01353dc215aa80d0c511ac7651))
* **language-core:** reduce component resolution and JSON startup work ([bbefb80](https://github.com/mpx-ecology/language-tools/commit/bbefb80ee70fedf53ce7598e53bab7b0489b0437))
* **language-core:** reuse filesystem probes during project startup ([88554af](https://github.com/mpx-ecology/language-tools/commit/88554aff556e206e9c4b859d4c009c49dfcfd20f))
* **typescript-plugin:** generate only the service script in tsserver ([8e41b85](https://github.com/mpx-ecology/language-tools/commit/8e41b85bf3b2d43cecfcd36ee8be6825d8eb22ac))

## [1.24.3](https://github.com/mpx-ecology/language-tools/compare/v1.24.2...v1.24.3) (2026-10-29)

**Note:** Version bump only for package @mpxjs/language-server

## [1.24.2](https://github.com/mpx-ecology/language-tools/compare/v1.24.1...v1.24.2) (2026-08-20)

**Note:** Version bump only for package @mpxjs/language-server

## [1.24.1](https://github.com/mpx-ecology/language-tools/compare/v1.24.0...v1.24.1) (2026-07-23)

**Note:** Version bump only for package @mpxjs/language-server

# [1.24.0](https://github.com/mpx-ecology/language-tools/compare/v1.22.6...v1.24.0) (2026-07-23)

**Note:** Version bump only for package @mpxjs/language-server

## [1.22.6](https://github.com/mpx-ecology/language-tools/compare/v1.22.5...v1.22.6) (2026-07-01)

**Note:** Version bump only for package @mpxjs/language-server

## [1.22.5](https://github.com/mpx-ecology/language-tools/compare/v1.22.4...v1.22.5) (2026-06-23)

**Note:** Version bump only for package @mpxjs/language-server

## [1.22.4](https://github.com/mpx-ecology/language-tools/compare/v1.22.3...v1.22.4) (2026-06-22)

**Note:** Version bump only for package @mpxjs/language-server

## [1.22.3](https://github.com/mpx-ecology/language-tools/compare/v1.22.2...v1.22.3) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-server

## [1.22.2](https://github.com/mpx-ecology/language-tools/compare/v1.22.1...v1.22.2) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-server

## [1.22.1](https://github.com/mpx-ecology/language-tools/compare/v1.22.0...v1.22.1) (2026-05-28)

**Note:** Version bump only for package @mpxjs/language-server

# [1.22.0](https://github.com/mpx-ecology/language-tools/compare/v1.20.0...v1.22.0) (2026-05-28)

### Features

* add standalone agent mode and component goToDefinition ([296805d](https://github.com/mpx-ecology/language-tools/commit/296805d1d74e4fdd00f583c3186b89a31e778194))
* enhance MpxLanguageServicePlugins with componentDefinitionProvider option ([9dab453](https://github.com/mpx-ecology/language-tools/commit/9dab453f833661d1659ae21a16ff1dac85c5f27d))

# [1.20.0](https://github.com/mpx-ecology/language-tools/compare/v1.18.5...v1.20.0) (2026-03-09)

### Features

* 组件路径补全（mvp） ([6f19f1d](https://github.com/mpx-ecology/language-tools/commit/6f19f1d00ec71ee32778623d877b374142e1c6fe))

## [1.18.5](https://github.com/mpx-ecology/language-tools/compare/v1.18.4...v1.18.5) (2026-01-08)

**Note:** Version bump only for package @mpxjs/language-server

## [1.18.4](https://github.com/mpx-ecology/language-tools/compare/v1.18.3...v1.18.4) (2025-12-17)

**Note:** Version bump only for package @mpxjs/language-server

## [1.18.3](https://github.com/mpx-ecology/language-tools/compare/v1.18.2...v1.18.3) (2025-12-15)

**Note:** Version bump only for package @mpxjs/language-server

## [1.18.2](https://github.com/mpx-ecology/language-tools/compare/v1.18.1...v1.18.2) (2025-12-10)

**Note:** Version bump only for package @mpxjs/language-server

## [1.18.1](https://github.com/mpx-ecology/language-tools/compare/v1.18.0...v1.18.1) (2025-12-05)

**Note:** Version bump only for package @mpxjs/language-server

# [1.18.0](https://github.com/mpx-ecology/language-tools/compare/v1.16.1...v1.18.0) (2025-12-04)

**Note:** Version bump only for package @mpxjs/language-server

## [1.16.1](https://github.com/mpx-ecology/language-tools/compare/v1.16.0...v1.16.1) (2025-12-01)

**Note:** Version bump only for package @mpxjs/language-server

# [1.16.0](https://github.com/mpx-ecology/language-tools/compare/v1.14.3...v1.16.0) (2025-11-30)

**Note:** Version bump only for package @mpxjs/language-server

## [1.14.3](https://github.com/mpx-ecology/language-tools/compare/v1.14.2...v1.14.3) (2025-11-12)

**Note:** Version bump only for package @mpxjs/language-server

## [1.14.2](https://github.com/mpx-ecology/language-tools/compare/v1.14.1...v1.14.2) (2025-10-10)

**Note:** Version bump only for package @mpxjs/language-server

## [1.14.1](https://github.com/mpx-ecology/language-tools/compare/v1.14.0...v1.14.1) (2025-09-25)

**Note:** Version bump only for package @mpxjs/language-server

# [1.14.0](https://github.com/mpx-ecology/language-tools/compare/v1.12.3...v1.14.0) (2025-09-17)

**Note:** Version bump only for package @mpxjs/language-server

## [1.12.3](https://github.com/mpx-ecology/language-tools/compare/v1.12.2...v1.12.3) (2025-09-08)

**Note:** Version bump only for package @mpxjs/language-server

## [1.12.2](https://github.com/mpx-ecology/language-tools/compare/v1.12.1...v1.12.2) (2025-09-04)

**Note:** Version bump only for package @mpxjs/language-server

## [1.12.1](https://github.com/mpx-ecology/language-tools/compare/v1.12.0...v1.12.1) (2025-09-02)

**Note:** Version bump only for package @mpxjs/language-server

# [1.12.0](https://github.com/mpx-ecology/language-tools/compare/v1.10.1...v1.12.0) (2025-09-01)

**Note:** Version bump only for package @mpxjs/language-server

## [1.10.1](https://github.com/mpx-ecology/language-tools/compare/v1.10.0...v1.10.1) (2025-08-27)

**Note:** Version bump only for package @mpxjs/language-server

# [1.10.0](https://github.com/mpx-ecology/language-tools/compare/v1.8.5...v1.10.0) (2025-08-19)

**Note:** Version bump only for package @mpxjs/language-server

## [1.8.5](https://github.com/mpx-ecology/language-tools/compare/v1.8.4...v1.8.5) (2025-08-18)

**Note:** Version bump only for package @mpxjs/language-server

## [1.8.4](https://github.com/mpx-ecology/language-tools/compare/v1.8.3...v1.8.4) (2025-08-14)

**Note:** Version bump only for package @mpxjs/language-server

## [1.8.3](https://github.com/mpx-ecology/language-tools/compare/v1.8.2...v1.8.3) (2025-08-12)

**Note:** Version bump only for package @mpxjs/language-server

## [1.8.2](https://github.com/mpx-ecology/language-tools/compare/v1.8.1...v1.8.2) (2025-08-11)

**Note:** Version bump only for package @mpxjs/language-server

## [1.8.1](https://github.com/mpx-ecology/language-tools/compare/v1.8.0...v1.8.1) (2025-08-07)

**Note:** Version bump only for package @mpxjs/language-server

# [1.8.0](https://github.com/mpx-ecology/language-tools/compare/v1.6.2...v1.8.0) (2025-08-06)

**Note:** Version bump only for package @mpxjs/language-server

## [1.6.2](https://github.com/mpx-ecology/language-tools/compare/v1.6.1...v1.6.2) (2025-08-01)

**Note:** Version bump only for package @mpxjs/language-server

## [1.6.1](https://github.com/mpx-ecology/language-tools/compare/v1.6.0...v1.6.1) (2025-07-31)

**Note:** Version bump only for package @mpxjs/language-server

# [1.6.0](https://github.com/mpx-ecology/language-tools/compare/v1.4.1...v1.6.0) (2025-07-30)

**Note:** Version bump only for package @mpxjs/language-server

## [1.4.1](https://github.com/mpx-ecology/language-tools/compare/v1.4.0...v1.4.1) (2025-07-29)

**Note:** Version bump only for package @mpxjs/language-server

# [1.4.0](https://github.com/mpx-ecology/language-tools/compare/v1.2.8...v1.4.0) (2025-07-26)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.8](https://github.com/mpx-ecology/language-tools/compare/v1.2.7...v1.2.8) (2025-07-24)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.7](https://github.com/mpx-ecology/language-tools/compare/v1.2.6...v1.2.7) (2025-07-24)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.6](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.6) (2025-07-23)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.5](https://github.com/mpx-ecology/language-tools/compare/v1.2.4...v1.2.5) (2025-07-23)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.4](https://github.com/mpx-ecology/language-tools/compare/v1.2.3...v1.2.4) (2025-07-22)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.3](https://github.com/mpx-ecology/language-tools/compare/v1.2.2...v1.2.3) (2025-07-21)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.2](https://github.com/mpx-ecology/language-tools/compare/v1.2.1...v1.2.2) (2025-07-17)

**Note:** Version bump only for package @mpxjs/language-server

## [1.2.1](https://github.com/mpx-ecology/language-tools/compare/v1.2.0...v1.2.1) (2025-07-17)

**Note:** Version bump only for package @mpxjs/language-server

# [1.2.0](https://github.com/mpx-ecology/language-tools/compare/v1.0.4...v1.2.0) (2025-07-16)

**Note:** Version bump only for package @mpxjs/language-server

## [1.0.4](https://github.com/mpx-ecology/language-tools/compare/v1.0.3...v1.0.4) (2025-07-15)

**Note:** Version bump only for package @mpxjs/language-server

## [1.0.3](https://github.com/mpx-ecology/language-tools/compare/v1.0.2...v1.0.3) (2025-07-14)

**Note:** Version bump only for package @mpxjs/language-server

## [1.0.2](https://github.com/mpx-ecology/language-tools/compare/v1.0.1...v1.0.2) (2025-07-14)

**Note:** Version bump only for package @mpxjs/language-server

## [1.0.1](https://github.com/mpx-ecology/language-tools/compare/v1.0.0...v1.0.1) (2025-07-14)

**Note:** Version bump only for package @mpxjs/language-server

# [1.0.0](https://github.com/mpx-ecology/language-tools/compare/v0.3.0...v1.0.0) (2025-07-14)

### Features

* handle json js block ([44cafba](https://github.com/mpx-ecology/language-tools/commit/44cafbaa8fc187f0b153a1f78b8acc7c5292d301))

# [0.3.0](https://github.com/mpx-ecology/language-tools/compare/v0.2.0...v0.3.0) (2025-07-04)

### Features

* **service:** add mpx-css and mpx-document-link plugins ([55154a0](https://github.com/mpx-ecology/language-tools/commit/55154a06831f9b4de404183a56ee61a97fe4bc7d))

# [0.2.0](https://github.com/mpx-ecology/language-tools/compare/v0.1.0...v0.2.0) (2025-06-26)

**Note:** Version bump only for package @mpxjs/language-server

# 0.1.0 (2025-06-24)

### Bug Fixes

* format ([118bb85](https://github.com/mpx-ecology/language-tools/commit/118bb85c08d6291e3f6c7241225e9267e9af9483))

### Features

* first implementation of core and server ([44e3346](https://github.com/mpx-ecology/language-tools/commit/44e3346331a66f405f0d8704f156e786a06f55e0))
* Implement splitEditors feature and refactor types ([1a17d90](https://github.com/mpx-ecology/language-tools/commit/1a17d901ea6d6a8ee56829a19c886068d69d4469))
* init server ([761f6b3](https://github.com/mpx-ecology/language-tools/commit/761f6b31c835c7b4a559451b00b8ad0f5fdde80c))
* init types and update config ([84a6525](https://github.com/mpx-ecology/language-tools/commit/84a6525453d0ef697ec62c586ca462fc438d84e6))
* update license ([7515686](https://github.com/mpx-ecology/language-tools/commit/7515686f61bef6deb624b7389ec1d2daf75fb786))
* update plugins and improve VS Code extension documentation ([940f63c](https://github.com/mpx-ecology/language-tools/commit/940f63c3f7a5afb63b4849593d6420e818b0c8b5))
* update service & core ([d494238](https://github.com/mpx-ecology/language-tools/commit/d49423828d963bed81af446b2c39ca8425920afa))
* update var name ([a251b3c](https://github.com/mpx-ecology/language-tools/commit/a251b3c9c0fab25594b73421928adbf5b7092fd6))
* **vscode:** integrate mpx-ts-plugin into TS LSP ([d9e3241](https://github.com/mpx-ecology/language-tools/commit/d9e32410e93361823791c4d00d43e900b8fcc080))
