# Game code map

- `components/` contains focused interface pieces such as the inventory grid, equipment slots, item icons, and trees.
- `data/` contains world constants and map placement data.
- `items/` is the categorized item catalog and central item registry.
- `skills/` contains one section per skill. Woodcutting owns its XP curve, XP rewards, level cap, and axe-use rules in `skills/woodcutting/`.
- `shops/` contains the city building and merchant catalog, including store locations and stock.
- `lib/` contains reusable gameplay and inventory rules.
- `types.ts` contains the shared game-state and item types.

The route in `app/page.tsx` coordinates these pieces. New skills belong under `skills/`, while the weapons and resources they use belong in their matching `items/` categories. New merchants belong in `shops/` and use item values from the shared catalog.
