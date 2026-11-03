# T07：Mpx 组件 refs 类型验收

关联 [Issue #155](https://github.com/mpx-ecology/language-tools/issues/155)，对应 U04 / S06。

在本分支独立 Extension Host 中打开 `index.mpx`。改动后等待 watch 构建并执行 `Mpx: Restart Server`。不要重启其他会话的宿主。

✅ 为正例，❌ 为故意错误；出现注释描述的诊断即通过，不要删除反例。

`screenshot.mpx` 是用于 before/after 的最小场景：在 result 上显示 hover，并打开 Problems 面板。修复前应退化为 any 且 string 参数无诊断；修复后应为 Promise<number> | undefined，并在 'bad' 上报告 TS2345。场景及全部 script-setup 自动化 fixtures 已通过真实 Mpx 编译器检查。

- `useContext().refs` 补全模板中的静态具名 ref；其余 context API（如 triggerEvent）保留原类型。
- setup 子组件保留 defineExpose、props、defineOptions 公开字段；不补全未公开的私有 setup 变量。Ref 在公开实例中解包。
- `loadMore` 参数为 number，返回 Promise<number>；Options 的 `find` 参数为 string，返回 number。hover、签名帮助与 F12 指向子组件源码。
- 单个组件实例可在挂载前或移除后缺失，类型包含 null / undefined；支持可选链及判空收窄。
- 循环中的子组件为实例数组，可能为空；节点 ref 在循环内外都为 NodesRef 查询对象。
- 普通同名 ref 使用候选实例的联合，不自动变成数组；同名 ref 混合循环与非循环时保留两种可能形态。F12 到同名 ref 的全部模板声明。
- `refs` 暴露回模板后不应产生循环类型；检查故意错误每处仅诊断一次。

自动化 fixtures 独立位于 `packages/language-core/__tests__/fixtures/template-refs`，不依赖本目录。专项测试还覆盖 JS、生命周期回调、局部同名函数、静态连字符名称及各 mapping 能力。

范围边界：本项只连接现有可解析 Mpx 组件的静态 `wx:ref`。动态 ref 名不推测为字面量字段；空 `wx:ref` 不生成具名字段。React Native 直接注册的 React 组件实例和平台文件选择分别由 T03 / T04 扩展；本项没有添加注册或 resolver。Mpx 真实编译器的 wx / ios 元数据测试覆盖 component/node 与循环标记，不代表 RN 设备运行验收。

## 验证记录

2026-11-03，独立用户数据目录的 Code Insiders 1.145.0-insider、工作区 TypeScript 6.0.3、仅加载本分支开发扩展，调用实际 VS Code providers 通过：

- result hover 为 Promise<number> | undefined，count 为 number | undefined。
- 子组件成员候选包含 loadMore、count、title、$props，不含 privateMethod。
- loadMore 参数签名为 page: number；定义跳到子组件函数和公开字段。
- shared 定义跳到两处 wx:ref。
- 故意错误恰好产生 5 条诊断：TS2345、3 条 TS2339、TS18049；范围分别落在错误参数/成员/未判空表达式。

23 项专项测试（含 wx / ios 真实编译器元数据与 7 份 script-setup fixture 编译）、全量 496 项测试、pnpm build、pnpm lint、扩展 bundle 均通过。自动化分别检查 verification、completion、semantic、navigation 映射。RN 设备运行未执行。真实 UI 截图待补：独立 ff1d26d 基线与修复扩展已构建，相同场景、主题和设置已准备。基线宿主当前处于 Restricted Mode，TypeScript 服务未启动，已释放桌面锁；待用户手动完成临时基线工作区信任后，再申请锁采集并上传 GitHub attachments。设置检查图不作为问题证据，provider 输出不代替截图。
