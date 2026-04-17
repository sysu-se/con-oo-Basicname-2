# con-oo-Basicname-2 - Review

## Review 结论

这份实现已经有一个基本可用的 `Sudoku`/`Game` + Svelte store adapter 原型，静态看也能完成最小的渲染、输入和撤销/重做；但它还没有把领域对象真正接成现有数独应用的核心，且数独最关键的业务约束（givens 不可修改）仍然留在 adapter/UI 一侧，导致业务建模、OOD 和 Svelte 接入质量都达不到作业要求中的“真实接入现有游戏流程”。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | fair |
| Sudoku Business | poor |
| OOD | poor |

## 缺点

### 1. 题目 givens 的不可变规则没有进入领域模型

- 严重程度：core
- 位置：src/domain/index.js:166-175,247-333; src/stores/gameStore.js:71-78,117-120
- 原因：`Sudoku` 只保存一份可随意覆盖的 grid，`guess(...)` 本身不区分题目 givens 与玩家输入；真正阻止修改 givens 的逻辑放在 `gameStore` 的 `fixedCells` 里。这把数独最核心的业务约束拆散到了 Svelte 适配层，导致 `Game`/`Sudoku` 不是完整的业务边界，UI 之外的调用也无法靠领域对象自行保证规则成立。

### 2. 领域对象没有接入现有 Svelte 游戏流程，而是另起了一套简化版页面

- 严重程度：core
- 位置：src/App.svelte:2-58; src/components/Board/index.svelte:2-8,40-51; src/components/Controls/Keyboard.svelte:2-25; src/components/Header/Dropdown.svelte:2-23,41-55; src/components/Modal/Types/Welcome.svelte:2-24
- 原因：当前只有 `App.svelte` 使用 `gameStore`，而原项目里的棋盘、键盘、开始新局、载入题目等真实流程仍然依赖旧的 `@sudoku/*` stores/逻辑，或者被整个绕开。这样做更像“做了一个独立 demo UI”，而不是把领域对象接进现有游戏前端，因此不满足作业里强调的“真实接入现有 Svelte 游戏流程”。

### 3. Game 暴露了可变的内部 Sudoku，破坏聚合封装

- 严重程度：major
- 位置：src/domain/index.js:277-285
- 原因：`getSudoku()` 直接返回内部 `currentSudoku` 对象本身，而不是只读视图或快照。外部代码一旦拿到它，就可以直接 `guess(...)`，从而绕过 `Game.guess()` 的历史记录、redo 清空等聚合规则。这是明显的封装泄漏，也削弱了 `Game` 作为 UI 统一操作入口的设计。

### 4. 序列化无法完整恢复数独业务语义

- 严重程度：major
- 位置：src/domain/index.js:218-240,314-364; src/stores/gameStore.js:71-78
- 原因：`toJSON()` / `createGameFromJSON()` 只保存当前 grid 和历史 grid，没有保存 givens/fixed cells 之类的题目信息；但不可修改的题目格又被放在 store adapter 的 `fixedCells` 中。结果是序列化后的 `Game` 不能独立恢复完整业务状态，这说明领域对象的外表化设计还不自洽。

### 5. 适配层重复实现底层规则，并且坐标约定不统一

- 严重程度：minor
- 位置：src/domain/index.js:4-29; src/stores/gameStore.js:18-43; src/App.svelte:29-34
- 原因：`cloneGrid`/grid 校验在 domain 和 store 里各写了一遍，增加了维护成本；同时 `fixedCells` 用的是 `row,col`，`invalidCells` 用的是 `col,row`，模板里不得不分别拼不同格式的 key。它不一定立刻出 bug，但会让代码可读性和后续扩展性明显变差，也不符合常见的 JS/前端代码整洁性惯例。

## 优点

### 1. 采用了作业推荐的 store adapter 形态

- 位置：src/stores/gameStore.js:64-155
- 原因：`createGameStore()` 内部持有 `Game`，对外暴露 `subscribe`、`guess`、`undo`、`redo`、`selectCell` 等方法，方向上符合“由 Svelte store 适配领域对象”的推荐方案。

### 2. Sudoku 的校验、胜利判断和外表化集中在领域层

- 位置：src/domain/index.js:177-226
- 原因：`validate()`、`isSolved()`、`toJSON()`、`toString()` 都在 `Sudoku` 内部，不是散落在组件事件里，这一点比把业务逻辑写进 `.svelte` 文件要好。

### 3. Undo/Redo 已经收敛到 Game 聚合中

- 位置：src/domain/index.js:282-304; src/App.svelte:19-20
- 原因：历史栈和撤销/重做逻辑位于 `Game`，UI 只是触发 `gameStore.undo()` / `redo()`，没有把历史管理写在组件里，符合 OOP/OOD 的基本方向。

### 4. Svelte 更新机制的基本方向是对的

- 位置：src/stores/gameStore.js:45-61,84-85; src/App.svelte:25-57
- 原因：每次领域对象变化后，adapter 都重新读取领域状态并 `store.set(...)`，UI 只消费 `$gameStore` 来渲染，而不是依赖隐式 mutate；从静态结构看，这条响应式链路是成立的。

## 补充说明

- 本次结论只基于静态阅读，没有运行测试，也没有实际启动页面验证交互行为。
- 审查范围主要是 `src/domain/index.js`、`src/stores/gameStore.js`、`src/App.svelte`，以及为确认“是否接入现有 Svelte 游戏流程”而读取的少量现有组件引用关系。
- 关于“未接入真实游戏流程”的判断来自源码依赖关系的静态证据：`gameStore` 只被 `src/App.svelte` 使用，而原有棋盘、键盘、开始新局和载入题目的组件仍然引用旧的 `@sudoku/*` stores/逻辑。
