# 定义跳转最终行列

关联 Issue #181。通过 F5 在独立 Extension Host 打开本目录的 `index.mpx`。

1. 在第 3 行组件属性名 `value` 上执行 F12。两个候选分别选中 `panel.mpx` 第 3 行和 `panel.ios.mpx` 第 5 行的 `defineProps` 属性，均为第 15–20 列，不落到模板或 script 标签。
2. 第 5 行 `explicit-panel` 的属性名只返回 iOS 文件的同一属性声明。第 7 行模板变量 `numeric` 应定位到本文件脚本中的对应名称。
3. 给 iOS 文件开头插入两行空行，保持未保存，再从父文件跳转；声明应随之移动到第 7 行。撤销插入后恢复第 5 行，无需重启服务器。
4. 检查属性 hover 和第 9 行故意保留的 boolean 类型错误 TS2322。错误应继续定位在父组件属性上。

前后对照使用同一场景副本、Dark Modern、Menlo 15 和相同窗口尺寸。源码中的注释标明预期行为；故意的类型错误不能删除。自动化 fixture 独立位于 `packages/language-core/__tests__/fixtures/definition-positions`，验证有前缀和无前缀模式、LF/CRLF、类型式 props、目标及父文件编辑，并通过 tsserver 的协议序列化检查起止行列和上下文范围。
