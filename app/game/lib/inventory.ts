import { ITEMS } from "../items";
import { MAX_INVENTORY_SLOTS } from "../data/world";
import type { GameState, InventorySlot, InventorySlots, ItemCounts, ItemId, NotedItemStack } from "../types";

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
  const slots:InventorySlots = Array<InventorySlot>(MAX_INVENTORY_SLOTS).fill(null);
  let index = 0;
  (Object.keys(ITEMS) as ItemId[]).forEach(id => {
    for (let count=0;count<itemCount(items,id) && index<MAX_INVENTORY_SLOTS;count+=1) slots[index++]=id;
  });
  return slots;
}

export function normalizeInventorySlots(value:unknown,fallback:ItemCounts={}):InventorySlots {
  if (!Array.isArray(value)) return itemCountsToInventorySlots(fallback);
  return Array.from({length:MAX_INVENTORY_SLOTS},(_,index) => {
    const slot = value[index];
    if (typeof slot === "string" && slot in ITEMS) return slot as ItemId;
    if (isNotedItemStack(slot) && isNoteableItem(slot.itemId)) {
      return {noted:true,itemId:slot.itemId,quantity:Math.min(Number.MAX_SAFE_INTEGER,Math.max(1,Math.floor(slot.quantity)))};
    }
    return null;
  });
}

export function isNoteableItem(id:ItemId) {
  return ITEMS[id].noteable===true;
}

export function isNotedItemStack(slot:unknown):slot is NotedItemStack {
  if (!slot || typeof slot!=="object") return false;
  const possible = slot as Partial<NotedItemStack>;
  return possible.noted===true && typeof possible.itemId==="string" && possible.itemId in ITEMS
    && typeof possible.quantity==="number" && Number.isFinite(possible.quantity) && possible.quantity>0;
}

export function inventorySlotItemId(slot:InventorySlot):ItemId|null {
  return typeof slot==="string" ? slot : isNotedItemStack(slot) ? slot.itemId : null;
}

export function emptyInventorySlots():InventorySlots {
  return Array<InventorySlot>(MAX_INVENTORY_SLOTS).fill(null);
}

export function inventorySlotsUsed(state:Pick<GameState,"inventorySlots">) {
  return state.inventorySlots.reduce((total,item) => total + (item ? 1 : 0),0);
}

export function inventoryItemCount(slots:InventorySlots,id:ItemId) {
  return slots.reduce((total,slot) => {
    if (slot===id) return total+1;
    return isNotedItemStack(slot) && slot.itemId===id ? total+slot.quantity : total;
  },0);
}

export function inventoryNotedItemCount(slots:InventorySlots,id:ItemId) {
  return slots.reduce((total,slot) => total+(isNotedItemStack(slot) && slot.itemId===id ? slot.quantity : 0),0);
}

export function addInventoryItems(slots:InventorySlots,id:ItemId,amount:number):InventorySlots {
  const next = slots.slice();
  let remaining = Number.isFinite(amount) ? Math.max(0,Math.floor(amount)) : 0;
  for (let index=0;index<next.length && remaining>0;index+=1) {
    if (!next[index]) { next[index]=id; remaining-=1; }
  }
  return next;
}

export function canAddNotedInventoryItems(slots:InventorySlots,id:ItemId) {
  return notedInventoryCapacity(slots,id)>0;
}

export function notedInventoryCapacity(slots:InventorySlots,id:ItemId) {
  const existing = slots.find(slot => isNotedItemStack(slot) && slot.itemId===id);
  if (isNotedItemStack(existing)) return Math.max(0,Number.MAX_SAFE_INTEGER-existing.quantity);
  return slots.some(slot => slot===null) ? Number.MAX_SAFE_INTEGER : 0;
}

export function addNotedInventoryItems(slots:InventorySlots,id:ItemId,amount:number):InventorySlots {
  const requested = Number.isFinite(amount) ? Math.max(0,Math.floor(amount)) : 0;
  const quantity = Math.min(requested,notedInventoryCapacity(slots,id));
  if (quantity===0 || !isNoteableItem(id)) return slots.slice();
  const next = slots.slice();
  const existingIndex = next.findIndex(slot => isNotedItemStack(slot) && slot.itemId===id);
  if (existingIndex>=0) {
    const existing = next[existingIndex] as NotedItemStack;
    next[existingIndex] = {...existing,quantity:Math.min(Number.MAX_SAFE_INTEGER,existing.quantity+quantity)};
    return next;
  }
  const freeIndex = next.findIndex(slot => slot===null);
  if (freeIndex<0) return next;
  next[freeIndex] = {noted:true,itemId:id,quantity};
  return next;
}

export function removeInventoryItems(slots:InventorySlots,id:ItemId,amount:number,preferredIndex?:number):InventorySlots {
  const next = slots.slice();
  let remaining = Number.isFinite(amount) ? Math.max(0,Math.floor(amount)) : 0;
  const removeFromSlot = (index:number) => {
    if (remaining<=0 || index<0 || index>=next.length) return;
    const slot = next[index];
    if (slot===id) { next[index]=null; remaining-=1; return; }
    if (isNotedItemStack(slot) && slot.itemId===id) {
      const removed = Math.min(remaining,slot.quantity);
      next[index] = removed===slot.quantity ? null : {...slot,quantity:slot.quantity-removed};
      remaining-=removed;
    }
  };
  if (preferredIndex!==undefined) removeFromSlot(preferredIndex);
  for (let index=0;index<next.length && remaining>0;index+=1) {
    if (index!==preferredIndex) removeFromSlot(index);
  }
  return next;
}
