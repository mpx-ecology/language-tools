# U09 / T15 实例字段重名

在本分支独立 Extension Host 中打开本目录。无需运行 RN 应用；Hooks 的字段规则按 RN 运行时检查。

1. `index.mpx`：❌ 四个 `mpx(5001)` warning，spread 原始 key 两个、最终 Hooks 返回 key 两个。悬浮应显示冲突来源；相关位置应指向 props / expose 原始 key。
2. `typed.mpx`：❌ 两个 warning：exposed 参数及最终 Hooks 的 title。关联信息保留本地 Props 接口及 `types.ts` 的 title 定义。✅ 早期 Hooks 的 obsolete 不警告。
3. `safe.mpx`：✅ 无 5001。局部 title、公开 renamed、未知动态 key 与被后续 Hooks 取代的返回值均不误报。
4. `options-props.mpx`：❌ expose 的 title 与 `defineOptions.properties` 重名。存在 `defineProps` 时，Mpx 会忽略 defineOptions 的 properties，诊断遵循同一优先级。
5. 在 index 模板中查看 title/count 的 hover、补全与定义，应保留当前 main 的类型与导航行为。warning 不改变生成上下文的合并优先级。

当前范围只检查 script setup 的可确定 props、defineExpose 及最后一次 Hooks 注册。`@mpx-if` 区域和运行时条件下无法确认的注册保守跳过；不求值项目 defs、不猜测动态 key。保留名 data 归 T16。本场景不要求其他已有故意错误消失。
