import { GEAR } from "../items";
import type { EquipmentSlot, GearId } from "../types";
import { GearIcon } from "./ItemIcons";

export function GearSlot({slot,itemId,onUnequip}:{slot:EquipmentSlot;itemId:GearId|null;onUnequip:(slot:EquipmentSlot)=>void}) {
  const item = itemId ? GEAR[itemId] : null;
  return <button className={`gear-slot gear-slot--${slot} ${item ? "gear-slot--filled" : ""}`} type="button"
    onClick={() => item && onUnequip(slot)} disabled={!item} title={item ? `Unequip ${item.name}` : `Empty ${slot} slot`}
    aria-label={item ? `Unequip ${item.name} from ${slot} slot` : `Empty ${slot} slot`}>
    {item && <GearIcon id={item.id}/>}<small>{slot}</small>
  </button>;
}
