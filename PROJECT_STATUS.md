# Tallowmere project checkpoint

## Current state

- Playable browser prototype with a 100 × 100 tile world.
- Woodcutting is the only active skill.
- Trees hold 5–10 logs, deplete, and respawn.
- Woodcutting grants 125 XP per log (5× Old School RuneScape's normal-tree XP), using the level 1–99 XP curve.
- The character automatically finds trees, fills a 28-slot inventory, visits the bank, deposits logs, and returns when AFK mode is enabled.
- Offline progress is saved locally and capped at 12 hours per absence.
- The bronze axe starts equipped in the weapon slot and does not consume an inventory slot.
- The camera follows the character while respecting world edges.
- Chopping includes a wind-up, impact, tree movement, and wood-chip effect.
- A static GitHub Pages build and deployment workflow are prepared and verified locally.
- The first old-world visual redesign is complete: darker mossy terrain, worn paths, drifting mist, scattered ruins and woodland props, gnarled trees, and a timber-and-stone bank.
- The player and interface now use a chunkier late-90s fantasy-RPG style with aged parchment, dark wood, muted metal, and stronger shadows.
- The axe swing stays behind the character silhouette and uses a tighter arc to avoid clipping and overshooting.
- The standalone GitHub Pages launcher now lives in `github-pages/`, avoiding a routing collision with the local app preview.
- Players can click open ground to move manually; manual movement pauses AFK mode and the camera follows the destination.
- Equipment can be equipped and unequipped. Equipped items use their gear slots, while removed items return to the 28-slot inventory.
- Woodcutting requires an equipped axe, and gear choices persist with the local save.
- The axe progression now contains 20 distinct axes from level 1 to 99. Higher tiers have increasing chances to harvest one extra log per chop.
- The clickable bank includes a compact classic-RPG item grid, all 20 axe tiers, level locks, selected-item details, and wield/store controls.
- Bank contents and inventory contents now use one shared item-count system. Every registered item automatically supports left-click withdrawal of 1 and a right-click menu for 1, 5, 10, all, or a custom amount, subject to the 28-slot inventory limit.
- Bank slots represent only items actually stored in the bank. When the last copy is withdrawn or equipped, that slot disappears until a copy is deposited again.
- Opening the bank now shows stored items beside a dedicated inventory/equipment companion panel, so banking no longer hides the player's pack or worn gear.
- Every registered inventory item can be left-clicked to deposit one or right-clicked to deposit 1, 5, 10, all, or a custom amount. A universal deposit-all-inventory control is also available.
- Inventory contents now retain their exact 28-slot positions. Loot, skilling rewards, and bank withdrawals fill the next free slot without regrouping existing items, and players can drag items onto empty or occupied slots to move or swap them.
- Depositing from the bank-side inventory targets the exact slot clicked; quantity deposits remove that chosen copy first before taking other matching copies.
- The skills, equipment, and inventory panel can be minimized to its tab strip and reopened from any tab.
- Game code is now separated into focused components, world data, shared gameplay rules, inventory rules, shared types, and a categorized item catalog instead of living in one oversized route file.
- Item definitions now include a gold `value`, category, skill, requirements, and appearance data. Normal logs have their own woodcutting resource file, armor is grouped by equipment slot, and axes are grouped under weapons so individual balancing changes stay isolated.

## Visual direction

Continue the **Well of Souls-era atmosphere** while keeping the artwork original:

- Older online-RPG feeling rather than polished mobile-game presentation.
- Moodier medieval-fantasy palette with stronger shadows and environmental texture.
- More characterful tiled terrain, buildings, trees, and props.
- A chunkier, more readable player sprite and clearer directional movement.
- Denser, practical RPG interface styling with aged stone, dark wood, leather, and parchment cues.
- Preserve the current mechanics while redesigning the world and interface in small passes.

Do not copy Well of Souls artwork, maps, characters, logos, or interface assets directly. Use it only as a high-level mood and era reference.

## Resume checklist

1. Review the current local prototype and this checkpoint.
2. Push the new visual checkpoint through GitHub Desktop.
3. Make the GitHub repository public if using free GitHub Pages, then enable GitHub Actions as the Pages source.
4. Test the published game URL and confirm saved progress, AFK mode, bank access, tabs, and camera movement.
5. Test click-to-move, panel minimizing, equipping and removing gear, and several bank axe tiers.
6. For the next art pass, add directional player poses, more building details, and another distinct woodland landmark.
7. For the next gameplay pass, choose whether to add axe acquisition costs or begin the second skill.

## Repository

`https://github.com/Zeuxidamus1/Tallowmere`
