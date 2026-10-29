// 与 index.mpx 的 script 块对照：两边 MARK 标题均应显示并对齐源码行。
// MARK: 列表数据
const list = ['第一项', '第二项']

// MARK: 滚动
const onScroll = () => list.length

// #region TypeScript 区域
const label = 'MARK: 字符串不生成标题'
// #endregion

export { label, list, onScroll }
