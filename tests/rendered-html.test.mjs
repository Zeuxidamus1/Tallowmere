import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const {default:worker} = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/",{headers:{accept:"text/html"}}),
    {ASSETS:{fetch:async () => new Response("Not found",{status:404})}},
    {waitUntil(){},passThroughOnException(){}},
  );
}

test("server-renders the Tallowmere game",async () => {
  const response = await render();
  assert.equal(response.status,200);
  assert.match(response.headers.get("content-type") ?? "",/^text\/html\b/i);

  const html = await response.text();
  assert.match(html,/<title>Tallowmere — The city gates are open<\/title>/i);
  assert.match(html,/Tallowmere City/);
  assert.match(html,/Woodcutting/);
  assert.match(html,/Inventory/);
  assert.match(html,/Enter The Bank of Tallowmere/);
  assert.match(html,/Enter Tallowmere General Store/);
  assert.match(html,/Enter The Iron Lantern/);
  assert.match(html,/Enter The Green Aegis/);
  assert.match(html,/Enter Guild of Trades/);
  assert.doesNotMatch(html,/Your site is taking shape|Building your site/);
});

test("keeps item, skill, shop, and reusable game systems outside the route",async () => {
  const [page,itemRegistry,normalLogs,axes,woodcutting,inventoryRules,inventoryGrid,shops,storePanel] = await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/game/items/index.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/game/items/resources/logs/normal-logs.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/game/items/weapons/axes/index.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/game/skills/woodcutting/index.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/game/lib/inventory.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/game/components/InventoryGrid.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/game/shops/index.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/game/components/StorePanel.tsx",import.meta.url),"utf8"),
  ]);

  assert.match(normalLogs,/category:"resources"/);
  assert.match(normalLogs,/skill:"woodcutting"/);
  assert.match(normalLogs,/value:\s*1/);
  assert.match(axes,/category:"weapons"/);
  assert.match(axes,/value:\s*500000/);
  assert.match(woodcutting,/id:"woodcutting"/);
  assert.match(woodcutting,/xpMultiplier:5/);
  assert.match(woodcutting,/xpPerAction:125/);
  assert.match(woodcutting,/MAX_WOODCUTTING_XP/);
  assert.match(itemRegistry,/logs:normalLogs/);
  assert.match(inventoryRules,/export function addInventoryItems/);
  assert.match(inventoryGrid,/export function InventoryGrid/);
  assert.match(shops,/general:/);
  assert.match(shops,/weapons:/);
  assert.match(shops,/armor:/);
  assert.match(shops,/skills:/);
  assert.match(shops,/if \(store==="general"\) return true/);
  assert.match(storePanel,/Every item is purchased at the gold value listed in its item file/);
  assert.match(page,/gold:previous\.gold\+ITEMS\[item\]\.value\*safeAmount/);
  assert.match(page,/tallowmere-city\.png/);
  assert.doesNotMatch(page,/^const AXES/m);
  assert.doesNotMatch(page,/^function InventoryGrid/m);
  assert.doesNotMatch(page,/^function itemCount/m);
});
