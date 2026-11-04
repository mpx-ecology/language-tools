# 实例保留字段回归

- `final-hooks-safe.ios.mpx`：Options 与早期 Hooks 返回的 `data` 已被最终注册替代，不应出现 5002。
- `final-hooks-error.ios.mpx`：仅最终回调中的公开 `data` key 出现一条 `mpx(5002)` warning；早期返回值不重复提示。
- 原有 props、expose、普通 options 字段及模块局部变量场景继续保留各自预期。
