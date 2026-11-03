# U09 / T15 实例字段重名

在本分支独立 Extension Host 中打开本目录。无需运行 RN 应用；Hooks 的字段规则按 RN 运行时检查。

1. `index.mpx`：❌ 四个 `mpx(5001)` warning，spread 原始 key 两个、最终 Hooks 返回 key 两个。悬浮应显示冲突来源；相关位置应指向 props / expose 原始 key。
2. `typed.mpx`：❌ 两个 warning：exposed 参数及最终 Hooks 的 title。关联信息保留本地 Props 接口及 `types.ts` 的 title 定义。✅ 早期 Hooks 的 obsolete 不警告。
3. `safe.mpx`：✅ 无 5001。局部 title、公开 renamed、未知动态 key 与被后续 Hooks 取代的返回值均不误报。
4. `options-props.mpx`：❌ expose 的 title 与 `defineOptions.properties` 重名。存在 `defineProps` 时，Mpx 会忽略 defineOptions 的 properties，诊断遵循同一优先级。
5. 在 index 模板中查看 title/count 的 hover、补全与定义，应保留当前 main 的类型与导航行为。warning 不改变生成上下文的合并优先级。

当前范围只检查 script setup 的可确定 props、defineExpose 及最后一次 Hooks 注册。`@mpx-if` 区域和运行时条件下无法确认的注册保守跳过；不求值项目 defs、不猜测动态 key。保留名 data 归 T16。本场景不要求其他已有故意错误消失。

增量验收（保持同一 Extension Host，不重启服务）：

1. 在 `typed.mpx` 中将最后一个 Hooks 返回的 title 改为 other：❌ Hooks warning 消失，expose 与 props 的 warning 保留。
2. 将 `types.ts` 的 title 改为 renamed：✅ expose 重名 warning 消失；编辑中可出现独立 TS 类型错误。撤销后 warning 恢复，related information 指向当前类型声明位置。
3. 在文件开头插入注释或空行：❌ warning 和关联信息应跟随源码位置移动，不重复、不残留。
4. 在 `safe.mpx` 删除最后一次 Hooks 注册：❌ 早期返回的 earlierOnly 现在与 props 冲突，应出现 warning；撤销后消失。

性能复现与优化前后数据见 `packages/language-core/__tests__/instance-fields-performance.md`。
