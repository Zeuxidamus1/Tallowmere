import type { AxeId, AxeItem, EquipmentState, GearId, GearItem, ItemDefinition, ItemId } from "../types";
import { leatherCap } from "./armor/head/leather-cap";
import { travelerTunic } from "./armor/body/traveler-tunic";
import { woodenBuckler } from "./armor/shields/wooden-buckler";
import { wornTrousers } from "./armor/legs/worn-trousers";
import { ancientLogs } from "./resources/logs/ancient-logs";
import { celestialLogs } from "./resources/logs/celestial-logs";
import { magicLogs } from "./resources/logs/magic-logs";
import { mahoganyLogs } from "./resources/logs/mahogany-logs";
import { mapleLogs } from "./resources/logs/maple-logs";
import { normalLogs } from "./resources/logs/normal-logs";
import { oakLogs } from "./resources/logs/oak-logs";
import { teakLogs } from "./resources/logs/teak-logs";
import { willowLogs } from "./resources/logs/willow-logs";
import { yewLogs } from "./resources/logs/yew-logs";
import { AXES } from "./weapons/axes";

export { AXES };

export const ARMOR:GearItem[] = [leatherCap,travelerTunic,woodenBuckler,wornTrousers];
export const GEAR = Object.fromEntries([...AXES,...ARMOR].map(item => [item.id,{...item,noteable:item.noteable??true}])) as Record<GearId,GearItem>;
export const AXE_BY_ID = Object.fromEntries(AXES.map(item => [item.id,item])) as Record<AxeId,AxeItem>;
export const LOGS = [normalLogs,oakLogs,willowLogs,teakLogs,mapleLogs,mahoganyLogs,yewLogs,magicLogs,ancientLogs,celestialLogs];
export const ITEMS = {...Object.fromEntries(LOGS.map(item => [item.id,item])),...GEAR} as Record<ItemId,ItemDefinition>;

export const STARTING_EQUIPMENT:EquipmentState = {
  head:"leather-cap",
  weapon:"bronze-axe",
  body:"traveler-tunic",
  shield:"wooden-buckler",
  legs:"worn-trousers",
};
