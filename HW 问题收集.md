## HW 问题收集

列举在HW 1、HW1.1过程里，你所遇到的2\~3个通过自己学习已经解决的问题，和2\~3个尚未解决的问题与挑战

### 已解决的问题

1. **解决领域对象修改后 UI 不刷新的问题**
   - **上下文**：数独的部分是写在 `Sudoku` 类里的，但在 Svelte 组件中调用类的方法修改数字时，页面并没有自动更新。这是由于 Svelte 是响应式编程框架，它只能在组件中直接操作数据，不能在组件外部操作。
     ```javascript
     // src/stores/gameStore.js
     function commit(message = '') {
       store.set(readDomainState(game, selected, fixedCells, message));
     }
     ```
   - **解决手段**：在 `gameStore.js` 中把 `Sudoku` 实例放进 Svelte 的 `writable` store 里，这样可以让 UI 知道数据变了，然后我添加了一个 `commit` 函数，每次操作完领域对象后，手动调用一次 `store.set()` 把最新的状态发给 UI，就成功触发了 Svelte 的响应式更新。

2. **简化 `Undo/Redo` 的实现逻辑**
   - **上下文**：刚开始想撤销功能时，设想是记录每一步改了哪个数字、坐标，然后反向操作，代码写起来比较乱，而且很容易出错。
     ```javascript
     // src/domain/index.js
     guess: function (move) {
       undoList.push(currentSudoku.clone()); // 变更前先存快照
       currentSudoku.guess(move);
       redoList.length = 0;
     },
     ```
   - **解决手段**：改成了存快照。每次填数字前，先把整个棋盘数组深拷贝一份(需要深拷贝，保证是独立的副本)存进历史数组里。撤销的时候，直接把上一个数组拿出来替换掉当前的就行。但是不足之处是浪费内存，不过用其他方式会很复杂。

### 尚未解决的问题与挑战

1. **如何让 UI 自动响应领域层触发的事件**
   - **上下文**：目前像`游戏胜利`这种判断是在类里面做的，但弹出胜利对话框由 UI 进行。
     ```javascript
     // src/stores/gameStore.js 中的 readDomainState 函数
     won: typeof sudoku.isSolved === 'function' ? sudoku.isSolved() : false,
     ```
   - **尝试解决手段**：我目前是在 Store 里手动检查 `won` 状态。但不确定有没有更高级的办法，让领域对象在发现自己赢了的时候，能主动让 UI 自动弹出模态框，而不是每次都要手动去问它。

2. **性能优化的度量问题**
   - **上下文**：现在的撤销功能是每次都拷贝整个棋盘。
     ```javascript
     // src/domain/index.js
     function cloneGrid(grid) {
       return grid.map(row => row.slice()); // 每次都全量深拷贝
     }
     ```
   - **尝试解决手段**：虽然现在的棋盘比较小，还没有问题，但如果以后做更更大的棋盘，或者增加游戏次数，甚至在本地保存一些游戏状态，这样每一次拷贝肯定会造成性能变低。我目前不太清楚 Svelte 3 怎么能只更新那一个变动的格子，而不是让整个棋盘组件都重新渲染一遍，但目前还没找到简单的写法。我尝试过问 Gemini / Codex，给的回答是只记录变动的行，这样其实感觉和深拷贝整个棋盘相比本质没有改变，但当然是起到了降低内存占用的功能。
