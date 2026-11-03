# RN 注册组件（T03 / #151）

本目录为独立 RN 平台场景，依赖 inspect-extension 的 React 18 / RN 0.76 类型。

1. 打开 setup.ios.mpx 与 options.ios.mpx：✅ NativeView、FunctionAlias、ClassAlias、ForwardAlias 均能补全，正常行无诊断。
2. ✅ 各标签内触发属性补全：NativeView 提供 testID / onLayout，其余提供 title / count / onLayout；不出现 bindlayout。onLayout hover 保留 LayoutChangeEvent。
3. ✅ 模板 handleFooterLayout hover 保留回调类型；脚本 event.nativeEvent.layout. 补全 height / width / x / y。
4. ✅ 标签 F12 到 components 注册别名；注册值再次 F12 可沿 import 跳到 React/RN 声明或本地组件。函数、类和 forwardRef 采用相同规则。
5. 打开 errors.ios.mpx：❌ 五条故意错误，两个 RN prop 错误与三个 title 类型错误；每处只显示一次。
6. required.ios.mpx 展示依赖边界：❌ @mpxjs/core 2.11.0 将注册值约束为 React.ComponentType<{}>，拒绝含必传 props 的组件；该原始诊断保留。✅ 模板仍能得到必传 title: string 并报告错误值。

自动化使用 language-core 下独立 fixture，不读取本目录。未执行真实 Extension Host 验收时不得标记以上 UI 操作通过。

## 真实 Extension Host 对比截图

`evidence/index.ios.mpx` 为两条 RN prop 诊断与 onLayout hover 的最小场景；`evidence/completion.ios.mpx` 用于属性补全。子目录 tsconfig 将项目范围限定在这两份文件，避免其他故意错误影响截图。

修复前使用独立 ff1d26d 基线目录，复制相同场景与 React/RN 类型依赖；修复后使用本 PR。两侧使用相同的 VS Code 版本、Default Dark Modern 主题、16px 字体和 24px 行高。预期 before 未校验两个错误 prop，after 各出现一条类型诊断；after 的 onLayout hover 应保留 LayoutChangeEvent，空属性位置应补全 ViewProps。

实际截图必须来自真实开发宿主并上传为 GitHub attachments，不提交图片文件。当前 Issue/PR 的附件记录是验收状态的依据；自动化 provider 结果不能替代真实 UI 截图。
