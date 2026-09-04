# Item catalog

Every game item belongs under a category in this folder. Item definitions hold the values that describe that item, including its `value` in gold, level requirement, skill, equipment slot, and appearance data.

## Categories

- `resources/<type>/` contains gathered materials. Every wood type has its own file in `resources/logs/`, so changing one file's `value` changes only that log type.
- `weapons/<type>/` contains wieldable weapons. All current axes live in `weapons/axes/index.ts`; they are not stored with skill definitions.
- `armor/<slot>/` contains worn items grouped by their equipment slot.
- `index.ts` is the central registry. Game systems read this registry so banking, inventory, equipment, and future item interactions share one source of truth.

When adding an item, place its definition in the correct item category, add its ID to `game/types.ts`, and register it in this folder's `index.ts`. Skill rules belong in `game/skills/`, not in this item catalog.
