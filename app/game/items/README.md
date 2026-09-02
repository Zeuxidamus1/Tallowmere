# Item catalog

Every game item belongs under a category in this folder. Item definitions hold the values that describe that item, including its `value` in gold, level requirement, skill, equipment slot, and appearance data.

## Categories

- `resources/<skill>/` contains resources produced by a skill. Normal logs live in `resources/woodcutting/normal-logs.ts`, so changing that file's `value` changes normal logs only.
- `weapons/<type>/` contains wieldable weapons. The current woodcutting axes live in `weapons/axes/index.ts`.
- `armor/<slot>/` contains worn items grouped by their equipment slot.
- `index.ts` is the central registry. Game systems read this registry so banking, inventory, equipment, and future item interactions share one source of truth.

When adding an item, place its definition in the correct category, add its ID to `game/types.ts`, and register it in this folder's `index.ts`. Generic systems should read the registry instead of checking individual item names.
