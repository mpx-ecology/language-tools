# T05 组件反向引用验收

关联 [#149](https://github.com/mpx-ecology/language-tools/issues/149)。使用本分支独立 Extension Host，等待 watch 后执行 `Mpx: Restart Mpx and TS servers`。

- ✅ `panel.mpx`：资源管理器右键 Mpx“查找所有文件引用”，应返回 first 的两处注册路径、demo-panel 开闭标签和 PanelAlias，以及 second 的路径和 other-name；每个实际源码范围只出现一次。
- ✅ `first.mpx`：分别对开标签、闭标签、PanelAlias 和两条注册路径查找引用，应得到同一组使用方。F12 仍跳到 panel。
- ❌ `same-name.mpx` 注册的是 other，不能因标签同名混入 panel 的结果。
- ✅ 将 second 的路径临时改为 `./other.mpx`，未保存时重新查找应立即改变归属；撤销后恢复。将自闭合改为成对标签，新增闭标签范围应出现且不重复。
- ✅ 可在本目录临时新建使用方或新组件，再删除，重新查询应更新结果；测试完成后撤销临时改动。

本目录没有故意制造的类型错误。✅ 表示应有行为；❌ 表示禁止出现的误关联。自动化 fixtures 独立位于 language-core 的 `__tests__/fixtures/component-references`。

边界：本次覆盖当前工程内、现有 resolver 可解析的局部静态 usingComponents，包括静态 JS 对象和其候选。应用全局注册、RN components、动态组件 is/range 与动态不可解析配置不计为已支持；自动平台后缀选择依赖 T04。本次不增加平台 resolver。

## 本次验证记录

2026-11-03，在独立用户数据目录的 VS Code Insiders 1.145.0 中加载本 worktree 的开发扩展，以 VS Code 实际 providers / 命令执行：

- ✅ 标签查询和 Mpx 文件引用命令均返回 7 个源码范围（first 为 5 处、second 为 2 处），无 same-name 误关联。
- ✅ first 的标签 F12 回到 panel；paths 未设置 baseUrl 时也保留 PanelAlias 及路径引用。
- ✅ second 未保存改为 other 后，两种查询均变为 5 处；测试缓冲区已恢复。

这是实际 Extension Host API 验收，没有进行人工逐项视觉检查或截图验收。独立自动化另覆盖精确开闭标签范围、JSON/JS 路径、大小写/连字符、歧义碰撞、npm/符号链接、文件创建/删除和 Program 缓存边界；场景经发布版 Mpx 编译器检查。
