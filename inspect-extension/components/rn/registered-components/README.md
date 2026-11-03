# RN 注册组件（T03 / #151）

本目录为独立 RN 平台场景，依赖 inspect-extension 的 React 18 / RN 0.76 类型。

1. 打开 setup.ios.mpx 与 options.ios.mpx：✅ NativeView、FunctionAlias、ClassAlias、ForwardAlias 均能补全，正常行无诊断。
2. ✅ 各标签内触发属性补全：NativeView 提供 testID / onLayout，其余提供 title / count / onLayout；不出现 bindlayout。onLayout hover 保留 LayoutChangeEvent。
3. ✅ 模板 handleFooterLayout hover 保留回调类型；脚本 event.nativeEvent.layout. 补全 height / width / x / y。
4. ✅ 标签 F12 到 components 注册别名；注册值再次 F12 可沿 import 跳到 React/RN 声明或本地组件。函数、类和 forwardRef 采用相同规则。
5. 打开 errors.ios.mpx：❌ 五条故意错误，两个 RN prop 错误与三个 title 类型错误；每处只显示一次。
6. required.ios.mpx 展示依赖边界：❌ @mpxjs/core 2.11.0 将注册值约束为 React.ComponentType<{}>，拒绝含必传 props 的组件；该原始诊断保留。✅ 模板仍能得到必传 title: string 并报告错误值。

自动化使用 language-core 下独立 fixture，不读取本目录。未执行真实 Extension Host 验收时不得标记以上 UI 操作通过。
