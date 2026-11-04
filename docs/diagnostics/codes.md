# Mpx 自定义诊断码

对外的 `Diagnostic.code` 使用数字，源码通过 `@mpxjs/language-shared` 的 `MpxDiagnosticCode` 语义名称引用。`source`、`message` 与 `severity` 独立；error / warning 的调整不改变规则编号。

## 注册表

| 数字码 | 内部名称                       | 来源              | 含义与历史                                                   |
| ------ | ------------------------------ | ----------------- | ------------------------------------------------------------ |
| 1001   | `TemplateWxForValueBrace`      | `mpx`             | wx:for 双括号边界错误；保留原编号                            |
| 1002   | `TemplateWxIfValueBrace`       | `mpx`             | wx:if 双括号边界错误；保留原编号                             |
| 1003   | `TemplateWxIfNoAdjacentBranch` | `mpx`             | 缺少相邻条件分支；保留原编号，当前发出位置已注释，仍不回收   |
| 4001   | `JsonPathNotFound`             | `mpx-json`        | 注册组件 / 页面路径不存在；原 `'4001'` 改为数字 `4001`       |
| 4002   | `JsonConfigValue`              | `mpx-json-schema` | 动态 JSON 配置值与 schema 不符；#160 原 `config-value`       |
| 5001   | `DuplicateInstanceField`       | `mpx`             | 实例公开字段跨来源重名；保留 #158 已使用的编号               |
| 5002   | `ReservedInstanceData`         | `mpx`             | 实例公开字段 data 为保留名；#161 原 `reserved-instance-data` |

所有编号显式赋值，禁止依赖 enum 自增。已分配的编号不重排、不复用；弃用编号保留。新增规则先在公共注册表分配编号并补测试，再引用常量，避免并行 PR 撞号。`1xxx` 现用于模板，`4xxx` 用于 JSON 配置 / 路径，`5xxx` 用于实例字段；这不是严重级别划分。

```ts
import { MpxDiagnosticCode } from '@mpxjs/language-shared'

const diagnostic = {
  source: 'mpx',
  code: MpxDiagnosticCode.ReservedInstanceData,
  severity: 2,
  message: '"data" 是 Mpx 实例保留字段，请更换公开字段名。',
}
```

## 兼容边界

历史 `MpxErrorCodes.TEMPLATE_*` API 保留，数值转为引用公共注册表。模板错误文案与原有过滤逻辑不变。

`createMpxLanguageServicePlugins` 的公共注册出口会包装 Mpx 自有诊断 provider，仅将以下已审计的 `(source, code)` 对转换为数字：

| source            | 旧 code                    | 公共 code |
| ----------------- | -------------------------- | --------- |
| `mpx-json`        | `'4001'`                   | `4001`    |
| `mpx-json-schema` | `'config-value'`           | `4002`    |
| `mpx`             | `'reserved-instance-data'` | `5002`    |

此桥接使尚未合并的功能 PR 可以独立落地，无需把它们的业务实现搬到本 PR。它不是新规则的命名方式：新增实现直接使用常量；后续修改这些旧 provider 时也应替换为注册表引用。直接调用内部 provider 的旧测试可能仍观察到旧字符串，公共语言服务契约则是数字。

不按字符串形状或编号范围批量转换，不将未知 code 强制转为数字。TypeScript、Vue/HTML parser、JSON Schema validator、CSS、Stylus 等上游诊断保留原 code / source，包括由 `mpx-*` 插件转发的诊断。诊断范围、message、severity、relatedInformation、tags、data 和 codeDescription 均保持原值；本次没有新增 code action。

旧消费者若比较 `diagnostic.code === '4001'`，应改为 `MpxDiagnosticCode.JsonPathNotFound`；英文字符串形式的公开码同步迁移到对应数字。不会同时发出新旧两份诊断。

## 2026-11-03 在途 PR 盘点

审计起点 main `60ebb13`，随后同步已合入的 #142 至 main `e40ca6a`。以下是审计时的不可变 head；PR 后续新增规则需要重新核对。

| PR                                                             | 审计 head                                  | 自定义诊断与迁移                                                                                                  |
| -------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [#131](https://github.com/mpx-ecology/language-tools/pull/131) | `cbb4fddeaab54130ae96c4bb038a0f51182c3acb` | 文档，无新增诊断                                                                                                  |
| [#142](https://github.com/mpx-ecology/language-tools/pull/142) | `d0e23625384b26e244726e6fbbe03feced3c93a7` | 已合入；转发 TS 语义诊断，不分配 Mpx code；保留 JSON 路径 4001                                                    |
| [#157](https://github.com/mpx-ecology/language-tools/pull/157) | `3a5533f443a5b9a53ac6b0b70ba95490b046f301` | 转发上游 JSON Schema 诊断，无新 Mpx code；`staticJson.spec.ts` 的 `'4001'` 字符串断言在同步本迁移时需改为数字常量 |
| [#158](https://github.com/mpx-ecology/language-tools/pull/158) | `470faab63b0f84884051045569a1e672afadc801` | `duplicateInstanceFieldCode = 5001` 已为数字，含 relatedInformation 的 TS 诊断也使用此值；公共注册表保留它        |
| [#159](https://github.com/mpx-ecology/language-tools/pull/159) | `816dd4b574aa425df819aed064d988239757cd80` | 原生组件推断，使用既有 TS 诊断，无新增 Mpx code                                                                   |
| [#160](https://github.com/mpx-ecology/language-tools/pull/160) | `824dc32428de369fc76d902c9c451dc84fba6595` | `mpx-json-schema / config-value` → `JsonConfigValue = 4002`，出口兼容旧写法                                       |
| [#161](https://github.com/mpx-ecology/language-tools/pull/161) | `9168c906760d756a16631a0824e6fdad743a39c3` | `mpx / reserved-instance-data` → `ReservedInstanceData = 5002`，出口兼容旧写法                                    |
| [#162](https://github.com/mpx-ecology/language-tools/pull/162) | `103341aa62777e66e0495bb99f0d119b97a8b585` | refs 类型推断，使用既有 TS 诊断，无新增 Mpx code                                                                  |
| [#163](https://github.com/mpx-ecology/language-tools/pull/163) | `d778421baf8dad3faf087db9af8cd2253551ae6d` | references，无新增诊断                                                                                            |
| [#164](https://github.com/mpx-ecology/language-tools/pull/164) | `cd6b56b3cc5d90ddc4308560220acf524155cf27` | 全局组件补全，无新增诊断                                                                                          |
| [#165](https://github.com/mpx-ecology/language-tools/pull/165) | `eaf194a309772c1b6aa0bc0aa9e8fab6458d6086` | 组件自动注册，无新增诊断                                                                                          |
| [#166](https://github.com/mpx-ecology/language-tools/pull/166) | `3fd141caf6a0af52a018caff72a41e18228f533d` | mpxTagName，复用 TS 诊断，无新增 Mpx code                                                                         |
| [#167](https://github.com/mpx-ecology/language-tools/pull/167) | `172475dfc9f25f110182223abd8cbce33aa04b2e` | 平台组件路径，复用 JSON 路径和 TS 诊断，无新增 Mpx code                                                           |

#158 后续可将本地导出的 `duplicateInstanceFieldCode` 定义为 `MpxDiagnosticCode.DuplicateInstanceField`，保持已有导出兼容；#160 / #161 后续可直接引用常量替代旧字符串。以上在途业务文件不在本 PR 中复制或修改。

## 验证

自动化入口：`packages/language-shared/__tests__/diagnosticCodes.spec.ts` 和 `packages/language-service/__tests__/diagnosticCodes.spec.ts`，覆盖稳定编号、唯一性、旧名转换、来源隔离、provider 参数 / receiver、上游诊断保真及真实 SFC 源码映射。

F5 场景：`inspect-extension/diagnostics/numeric-codes.mpx`。1001 / 1002 / 4001 的可见编号保持原值，JSON Schema 的类型错误保留上游编号。若同时验收 #161，使用其 `inspect-extension/instance-fields/reserved-data/expose.mpx`：注册本迁移后应显示 `mpx(5002)`，文案、warning 级别与公开 key 的下划线范围不变。仅有 main 而未合入 #161 时，不应凭空出现该实例保留名诊断。
