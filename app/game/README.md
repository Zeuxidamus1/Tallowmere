# Game code map

- `components/` contains focused interface pieces such as the inventory grid, equipment slots, item icons, and trees.
- `data/` contains world constants and map placement data.
- `items/` is the categorized item catalog and central item registry.
- `lib/` contains reusable gameplay and inventory rules.
- `types.ts` contains the shared game-state and item types.

The route in `app/page.tsx` coordinates these pieces. New skills and item categories should be added under `game/` rather than growing the route into one large file again.
