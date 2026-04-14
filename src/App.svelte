<script>
	import { gameStore } from './stores/gameStore.js';

	const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	function handleCellClick(row, col) {
		gameStore.selectCell(row, col);
	}

	function handleGuess(value) {
		gameStore.guess(value);
	}
</script>

<main class="app-shell">
	<header class="toolbar">
		<h1>Sudoku Domain Integration</h1>
		<div class="actions">
			<button on:click={() => gameStore.undo()} disabled={!$gameStore.canUndo}>Undo</button>
			<button on:click={() => gameStore.redo()} disabled={!$gameStore.canRedo}>Redo</button>
			<button on:click={() => gameStore.restart()}>Restart</button>
		</div>
	</header>

	<section class="board-wrap" aria-label="Sudoku board">
		{#each $gameStore.grid as row, rowIndex}
			<div class="board-row" role="row">
				{#each row as value, colIndex}
					{@const cellKey = rowIndex + ',' + colIndex}
					<button
						class="cell"
						class:selected={$gameStore.selected.row === rowIndex && $gameStore.selected.col === colIndex}
						class:fixed={$gameStore.fixedCells.has(cellKey)}
						class:invalid={$gameStore.invalidCells.includes(colIndex + ',' + rowIndex)}
						on:click={() => handleCellClick(rowIndex, colIndex)}
					>
						{value === 0 ? '' : value}
					</button>
				{/each}
			</div>
		{/each}
	</section>

	<section class="keyboard" aria-label="Number keyboard">
		{#each digits as value}
			<button on:click={() => handleGuess(value)}>{value}</button>
		{/each}
		<button class="erase" on:click={() => handleGuess(0)}>Clear</button>
	</section>

	{#if $gameStore.message}
		<p class="message">{$gameStore.message}</p>
	{/if}

	{#if $gameStore.won}
		<p class="won">Puzzle solved.</p>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: "Noto Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
		background: linear-gradient(160deg, #f4f1e8 0%, #f7f6f2 35%, #e8eef4 100%);
	}

	.app-shell {
		max-width: 720px;
		margin: 0 auto;
		padding: 20px 16px 32px;
	}

	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.toolbar h1 {
		font-size: 1.2rem;
		margin: 0;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	button {
		border: 1px solid #d0d2d6;
		border-radius: 8px;
		background: #ffffff;
		padding: 8px 12px;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.board-wrap {
		margin-top: 16px;
		display: grid;
		grid-template-rows: repeat(9, 1fr);
		gap: 2px;
		padding: 6px;
		border-radius: 12px;
		background: #1f2937;
	}

	.board-row {
		display: grid;
		grid-template-columns: repeat(9, 1fr);
		gap: 2px;
	}

	.cell {
		aspect-ratio: 1 / 1;
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: 0;
		border: 0;
		color: #1f2937;
	}

	.cell.fixed {
		background: #e5e7eb;
		color: #111827;
	}

	.cell.invalid {
		background: #fee2e2;
		color: #7f1d1d;
	}

	.cell.selected {
		background: #dbeafe;
		color: #1e3a8a;
	}

	.keyboard {
		margin-top: 16px;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
	}

	.erase {
		grid-column: span 5;
	}

	.message {
		margin-top: 12px;
		color: #92400e;
	}

	.won {
		margin-top: 12px;
		font-weight: 700;
		color: #166534;
	}
</style>