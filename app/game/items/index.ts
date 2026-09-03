import type { AxeId, AxeItem, EquipmentState, GearId, GearItem, ItemDefinition, ItemId } from "../types";
import { leatherCap } from "./armor/head/leather-cap";
import { travelerTunic } from "./armor/body/traveler-tunic";
import { woodenBuckler } from "./armor/shields/wooden-buckler";
import { wornTrousers } from "./armor/legs/worn-trousers";
import { normalLogs } from "./resources/logs/normal-logs";
import { AXES } from "./weapons/axes";

export { AXES };

export const ARMOR:GearItem[] = [leatherCap,travelerTunic,woodenBuckler,wornTrousers];
export const GEAR = Object.fromEntries([...AXES,...ARMOR].map(item => [item.id,{...item,noteable:item.noteable??true}])) as Record<GearId,GearItem>;
export const AXE_BY_ID = Object.fromEntries(AXES.map(item => [item.id,item])) as Record<AxeId,AxeItem>;
export const ITEMS = {logs:normalLogs,...GEAR} as Record<ItemId,ItemDefinition>;

export const STARTING_EQUIPMENT:EquipmentState = {
  head:"leather-cap",
  weapon:"bronze-axe",
  body:"traveler-tunic",
  shield:"wooden-buckler",
  legs:"worn-trousers",
};
