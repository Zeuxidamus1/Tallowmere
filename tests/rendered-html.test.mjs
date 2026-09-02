import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  assert.match(normalLogs,/value:\s*50/);
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
  assert.match(page,/gold:addGold\(previous\.gold,ITEMS\[item\]\.value\*safeAmount\)/);
  assert.match(page,/gold:removeGold\(previous\.gold,price\)/);
  assert.match(page,/bank-item--currency/);
  assert.match(page,/tallowmere-city\.png/);
  assert.doesNotMatch(page,/^const AXES/m);
  assert.doesNotMatch(page,/^function InventoryGrid/m);
  assert.doesNotMatch(page,/^function itemCount/m);
});

test("keeps gold in one safe numeric balance and switches visual tiers",async () => {
  const currencyUrl = new URL("../app/game/currency/index.ts",import.meta.url);
  currencyUrl.searchParams.set("test",`${process.pid}-${Date.now()}`);
  const {addGold,removeGold,getGoldIcon,formatGold} = await import(currencyUrl.href);

  assert.equal(addGold(150_303,15_000_000),15_150_303);
  assert.equal(removeGold(15_150_303,14_500_000),650_303);
  assert.equal(removeGold(650_303,625_303),25_000);
  assert.equal(removeGold(25_000,24_500),500);
  assert.equal(removeGold(500,1_000),0);
  assert.equal(formatGold(150_303),"150,303");
  assert.match(getGoldIcon(565),/gold-small\.png$/);
  assert.match(getGoldIcon(9_999),/gold-small\.png$/);
  assert.match(getGoldIcon(10_000),/gold-medium\.png$/);
  assert.match(getGoldIcon(15_500),/gold-medium\.png$/);
  assert.match(getGoldIcon(99_999),/gold-medium\.png$/);
  assert.match(getGoldIcon(100_000),/gold-large\.png$/);
  assert.match(getGoldIcon(150_303),/gold-large\.png$/);
  assert.match(getGoldIcon(999_999),/gold-large\.png$/);
  assert.match(getGoldIcon(1_000_000),/gold-green\.png$/);

  const assets = ["gold-small.png","gold-medium.png","gold-large.png","gold-green.png"];
  for (const asset of assets) {
    const details = await stat(new URL(`../public/assets/currency/${asset}`,import.meta.url));
    assert.ok(details.size>0,`${asset} should be a real asset`);
  }
});
