## Q1: Svelte 的响应式机制如何与领域对象协作？

用 store adapter（`src/stores/gameStore.js`）来做桥接。即 `Game/Sudoku` 负责业务状态，Svelte 组件不直接去改它们的内部字段。每次用户操作（填数、撤销、重做）都会先走 `gameStore` 的方法，然后在 adapter 里统一 `store.set(...)` 推一份新的 `Snapshot` 给界面。这样做的好处是边界很清楚：领域层管规则，视图层只管读状态和发命令，不会把逻辑散到组件里。

## Q2: View 层如何消费 `Sudoku` / `Game`？

View 层不是直接拿 `Sudoku` 实例去改，而是消费 `gameStore`。页面里真正会用到的状态包括盘面 `grid`、冲突格 `invalidCells`、当前选中位置 `selected`、题目固定格 `fixedCells`、是否完成 `won`、能不能撤销/重做（`canUndo` / `canRedo`）和提示信息 `message`。

用户交互也都走同一个路径：

- 点格子：`gameStore.selectCell(...)`
- 输入数字：`gameStore.guess(...)`，内部再调用 `Game.guess(...)` 和 `Sudoku.guess(...)`
- 撤销/重做：`gameStore.undo/redo(...)`

## Q3: View 层直接消费的是什么？

直接消费的是 `gameStore` 这个可订阅状态容器，而不是单独的 `Game` 对象。

## Q4: View 层拿到的数据是什么？

拿到的是一份给界面用的状态快照：`grid`、`invalidCells`、`selected`、`fixedCells`、`won`、`canUndo`、`canRedo`、`message`。这些数据都是给渲染层看的，不会把领域对象内部可变状态直接暴露出去。

## Q5: 用户操作如何进入领域对象？

入口统一在 `gameStore`，可以通过点击事件触发 `selectCell`、键盘/按钮输入触发 `guess` 或撤销重做触发 `undo/redo`，然后再由 store adapter 调用 `Game/Sudoku` 的方法完成实际状态变更。

## Q6: 领域对象变化后，Svelte 为什么会更新？

因为组件里用的是 `$gameStore`，Svelte 会自动订阅。每次领域状态变化后，adapter 都会 `store.set(...)` 发布新值，订阅者收到新值就会重渲染。

## Q7: 你依赖的是 `store`、`$:`、重新赋值，还是其他机制？

主要依赖 `store` + `$store` 自动订阅 + `store.set(...)`。

## Q8: 你的方案中，哪些数据是响应式暴露给 UI 的？

响应式暴露给 UI 的是 `gameStore` 提供的状态快照。

## Q9: 哪些状态留在领域对象内部？

`Sudoku` 内部可变 grid、`Game` 的 undo/redo 历史栈等都留在领域层内部，不允许组件直接改。

## Q10: 如果不用你的方案，而是直接 mutate 内部对象，会出现什么问题？

常见的问题是：数据其实变了，但界面不刷新，或者刷新时机不稳定。最重要的是是二维数组的就地修改，引用不变时很容易发生问题。

## Q11: 相比 HW1，你改进了什么？

这次的主要改进是三点，参考了 codex 的反馈和老师上课的讲解，以及新的作业要求：

- 输入合规和边界检查更完整（grid、move、JSON）
- 增加了校验能力（`validate`、`isMoveValid`、`isSolved`）
- 做了 Svelte 接入

## Q12: 为什么 HW1 中的做法不足以支撑真实接入？

HW1 证明了领域对象可测试，但没有解决视图层如何稳定消费的问题。到了真实页面，响应式边界如果没设计好，很容易出现逻辑分散、更新不一致。

## Q13: 你的新设计有哪些 trade-off？

有两个 trade-off：

- 快照历史实现简单，但内存占用会更高一些
- 多了一层 adapter，代码量略增，但换来的是更可控的更新链路和更清晰的分层

## Q14: 本次作业流程覆盖说明

- 开始一局：创建 `Game(createSudoku(initialGrid))`
- 界面渲染：用 `gameStore` 导出的盘面状态
- 用户输入：通过 `gameStore.guess(...)` 进入领域层
- Undo / Redo：通过 `gameStore.undo/redo(...)` 调用领域逻辑
- 自动更新：每次状态变化都由 `store.set(...)` 发布