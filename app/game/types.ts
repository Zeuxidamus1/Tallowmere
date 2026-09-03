export type Action = "idle" | "walking-point" | "walking-tree" | "chopping" | "walking-bank" | "banking" | "waiting";
export type Panel = "inventory" | "skills" | "equipment";
export type EquipmentSlot = "head" | "weapon" | "body" | "shield" | "legs";
export type StoreId = "general" | "weapons" | "armor" | "skills";

export type AxeId =
  | "bronze-axe" | "iron-hatchet" | "steel-feller" | "ashen-splitter" | "silverleaf-axe"
  | "deepforge-axe" | "briar-edge" | "emberbite" | "frostcleaver" | "storm-hew"
  | "moonsteel-axe" | "sunforged-axe" | "runebark-cutter" | "obsidian-beak"
  | "dragonbone-axe" | "spiritwood-crescent" | "starfall-axe" | "voidglass-axe"
  | "elder-king-axe" | "tallowmere-relic";

export type ArmorId = "leather-cap" | "traveler-tunic" | "wooden-buckler" | "worn-trousers";
export type GearId = AxeId | ArmorId;
export type ItemId = "logs" | GearId;
export type BankItemId = ItemId;
export type BankMenuMode = "withdraw" | "deposit";
export type ItemCounts = Partial<Record<ItemId,number>>;
export type NotedItemStack = { noted:true; itemId:ItemId; quantity:number };
export type InventorySlot = ItemId | NotedItemStack | null;
export type InventorySlots = InventorySlot[];
export type ItemCategory = "resources" | "weapons" | "armor";

export type GearItem = {
  id:GearId; name:string; slot:EquipmentSlot; description:string;
  kind:"axe"|"armor"; category:"weapons"|"armor"; requiredLevel:number; value:number; skill?:string; noteable?:boolean;
};
export type AxeItem = GearItem & {
  id:AxeId; kind:"axe"; category:"weapons"; bonusChance:number; metal:string; edge:string; handle:string; shape:number;
};
export type ResourceItem = {
  id:"logs"; name:string; kind:"resource"; category:"resources"; description:string;
  requiredLevel:number; value:number; skill?:string; noteable?:boolean;
};
export type ItemDefinition = GearItem | ResourceItem;
export type EquipmentState = Record<EquipmentSlot,GearId|null>;
export type TreeState = { id:number;x:number;y:number;charges:number;maxCharges:number;respawnAt:number };
export type GameState = {
  xp:number; gold:number; inventorySlots:InventorySlots; bankItems:ItemCounts; afk:boolean; action:Action;
  targetTreeId:number|null; nextActionAt:number; characterX:number; characterY:number;
  trees:TreeState[]; now:number; equipment:EquipmentState;
};
export type OfflineSummary = { elapsed:number;logs:number;xp:number };
