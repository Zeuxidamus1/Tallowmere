import { ITEMS } from "../items";
import { MAX_INVENTORY_SLOTS } from "../data/world";
import type { GameState, InventorySlots, ItemCounts, ItemId } from "../types";

export function itemCount(items:ItemCounts,id:ItemId) {
  return Math.max(0,Math.floor(items[id] ?? 0));
}

export function setItemCount(items:ItemCounts,id:ItemId,count:number):ItemCounts {
  const next = {...items};
  if (count > 0) next[id]=Math.floor(count); else delete next[id];
  return next;
}

export function normalizeItemCounts(value:unknown,fallback:ItemCounts={}):ItemCounts {
  if (!value || typeof value !== "object") return {...fallback};
  return Object.entries(value).reduce<ItemCounts>((counts,[id,count]) => {
    if (id in ITEMS && typeof count === "number" && count > 0) counts[id as ItemId]=Math.floor(count);
    return counts;
  },{});
}

function itemCountsToInventorySlots(items:ItemCounts):InventorySlots {
  const slots:InventorySlots = Array<ItemId|null>(MAX_INVENTORY_SLOTS).fill(null);
  let index = 0;
  (Object.keys(ITEMS) as ItemId[]).forEach(id => {
    for (let count=0;count<itemCount(items,id) && index<MAX_INVENTORY_SLOTS;count+=1) slots[index++]=id;
  });
  return slots;
}

export function normalizeInventorySlots(value:unknown,fallback:ItemCounts={}):InventorySlots {
  if (!Array.isArray(value)) return itemCountsToInventorySlots(fallback);
  return Array.from({length:MAX_INVENTORY_SLOTS},(_,index) => {
    const id = value[index];
    return typeof id === "string" && id in ITEMS ? id as ItemId : null;
  });
}

export function inventorySlotsUsed(state:Pick<GameState,"inventorySlots">) {
  return state.inventorySlots.reduce((total,item) => total + (item ? 1 : 0),0);
}

export function inventoryItemCount(slots:InventorySlots,id:ItemId) {
  return slots.reduce((total,item) => total + (item===id ? 1 : 0),0);
}

export function addInventoryItems(slots:InventorySlots,id:ItemId,amount:number):InventorySlots {
  const next = slots.slice();
  let remaining = Math.max(0,Math.floor(amount));
  for (let index=0;index<next.length && remaining>0;index+=1) {
    if (!next[index]) { next[index]=id; remaining-=1; }
  }
  return next;
}

export function removeInventoryItems(slots:InventorySlots,id:ItemId,amount:number,preferredIndex?:number):InventorySlots {
  const next = slots.slice();
  let remaining = Math.max(0,Math.floor(amount));
  if (remaining>0 && preferredIndex !== undefined && preferredIndex>=0 && preferredIndex<next.length && next[preferredIndex]===id) {
    next[preferredIndex]=null; remaining-=1;
  }
  for (let index=0;index<next.length && remaining>0;index+=1) {
    if (next[index]===id) { next[index]=null; remaining-=1; }
  }
  return next;
}
