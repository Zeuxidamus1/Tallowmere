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
  assert.match(normalLogs,/noteable:true/);
  assert.match(axes,/category:"weapons"/);
  assert.match(axes,/value:\s*500000/);
  assert.match(woodcutting,/id:"woodcutting"/);
  assert.match(woodcutting,/xpMultiplier:5/);
  assert.match(woodcutting,/xpPerAction:125/);
  assert.match(woodcutting,/MAX_WOODCUTTING_XP/);
  assert.match(itemRegistry,/export const LOGS = \[normalLogs,oakLogs,willowLogs,teakLogs,mapleLogs,mahoganyLogs,yewLogs,magicLogs,ancientLogs,celestialLogs\]/);
  assert.match(inventoryRules,/export function addInventoryItems/);
  assert.match(inventoryRules,/export function addNotedInventoryItems/);
  assert.match(inventoryRules,/export function notedInventoryCapacity/);
  assert.match(inventoryGrid,/export function InventoryGrid/);
  assert.match(inventoryGrid,/inventory-slot--noted/);
  assert.match(shops,/general:/);
  assert.match(shops,/weapons:/);
  assert.match(shops,/armor:/);
  assert.match(shops,/skills:/);
  assert.match(shops,/if \(store==="general"\) return true/);
  assert.match(storePanel,/const shopStock = Array\.from\(new Set\(store\.stock\)\)/);
  assert.match(storePanel,/store-item-grid/);
  assert.match(storePanel,/YOUR INVENTORY/);
  assert.match(storePanel,/BUY PRICE/);
  assert.match(storePanel,/SELL PRICE/);
  assert.match(storePanel,/onSelect\(itemId,"buy"\)/);
  assert.match(storePanel,/onSelect\(item,"sell"\)/);
  assert.match(page,/gold:addGold\(previous\.gold,ITEMS\[item\]\.value\*safeAmount\)/);
  assert.match(page,/gold:removeGold\(previous\.gold,price\)/);
  assert.match(page,/bank-item--currency/);
  assert.match(page,/Withdraw as Note/);
  assert.match(page,/tallowmere-city\.png/);
  assert.doesNotMatch(page,/^const AXES/m);
  assert.doesNotMatch(page,/^function InventoryGrid/m);
  assert.doesNotMatch(page,/^function itemCount/m);
});

test("registers every woodcutting tree, log value, and supplied image",async () => {
  const treeCatalog = await readFile(new URL("../app/game/skills/woodcutting/trees.ts",import.meta.url),"utf8");
  const tiers = [
    ["normal",1,"logs",50,125],
    ["oak",15,"oak-logs",100,188],
    ["willow",30,"willow-logs",175,338],
    ["teak",35,"teak-logs",250,425],
    ["maple",45,"maple-logs",350,500],
    ["mahogany",50,"mahogany-logs",500,625],
    ["yew",60,"yew-logs",750,875],
    ["magic",75,"magic-logs",1250,1250],
    ["ancient",85,"ancient-logs",2000,1750],
    ["celestial",95,"celestial-logs",3500,2500],
  ];

  for (const [species,level,itemId,value,xp] of tiers) {
    const fileName = species==="normal" ? "normal-logs.ts" : `${species}-logs.ts`;
    const item = await readFile(new URL(`../app/game/items/resources/logs/${fileName}`,import.meta.url),"utf8");
    assert.match(item,new RegExp(`id:"${itemId}"`));
    assert.match(item,new RegExp(`requiredLevel:${level}`));
    assert.match(item,new RegExp(`value:${value}`));
    assert.match(item,new RegExp(`image:"assets/woodcutting/logs/${species}-logs\\.png"`));
    assert.match(item,/noteable:true/);
    assert.match(treeCatalog,new RegExp(`id:"${species}"[^\\n]+logId:"${itemId}"[^\\n]+requiredLevel:${level}[^\\n]+xp:${xp}[^\\n]+image:"assets/woodcutting/trees/${species}-tree\\.png"`));

    for (const asset of [`logs/${species}-logs.png`,`trees/${species}-tree.png`]) {
      const details = await stat(new URL(`../public/assets/woodcutting/${asset}`,import.meta.url));
      assert.ok(details.size>0,`${asset} should be a real supplied asset`);
    }
  }

  const page = await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  assert.match(page,/inventorySlots:addInventoryItems\(state\.inventorySlots,definition\.logId,logsGained\)/);
  assert.match(page,/state\.xp \+ definition\.xp \* logsGained/);
  assert.match(page,/definition\.requiredLevel>woodcuttingLevelFromXp/);
  assert.match(page,/ITEMS\[item\]\.value\*safeAmount/);
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
