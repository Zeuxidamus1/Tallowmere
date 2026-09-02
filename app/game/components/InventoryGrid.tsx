import { useRef, useState, type DragEvent as ReactDragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { MAX_INVENTORY_SLOTS } from "../data/world";
import { GEAR, ITEMS } from "../items";
import { WOODCUTTING } from "../skills";
import type { GearId, InventorySlots, ItemId } from "../types";
import { GearIcon, ItemIcon } from "./ItemIcons";

export function InventoryGrid({slots,level,mode="equip",onActivate,onItemContext,onMove}:{
  slots:InventorySlots; level:number; mode?:"equip"|"deposit"; onActivate?:(id:ItemId,index:number)=>void;
  onItemContext?:(event:ReactMouseEvent<HTMLButtonElement>,id:ItemId,index:number)=>void; onMove:(from:number,to:number)=>void;
}) {
  const [draggedSlot,setDraggedSlot] = useState<number|null>(null);
  const lastDragEndedAt = useRef(0);
  const used = slots.reduce((total,item) => total+(item ? 1 : 0),0);
  const dropItem = (event:ReactDragEvent<HTMLButtonElement>,to:number) => {
    event.preventDefault();
    const rawFrom = event.dataTransfer.getData("application/x-tallowmere-slot");
    const fromData = rawFrom==="" ? null : Number(rawFrom);
    const from = fromData!==null && Number.isInteger(fromData) ? fromData : draggedSlot;
    if (from!==null && from>=0 && from<MAX_INVENTORY_SLOTS && from!==to) onMove(from,to);
    setDraggedSlot(null);
  };
  const moveWithKeyboard = (event:ReactKeyboardEvent<HTMLButtonElement>,from:number) => {
    if (!event.altKey) return;
    const offsets:Record<string,number> = {ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
    const offset = offsets[event.key];
    if (!offset) return;
    const to = from+offset;
    if (to<0 || to>=MAX_INVENTORY_SLOTS) return;
    event.preventDefault(); onMove(from,to);
  };
  const activateItem = (id:ItemId,index:number) => {
    if (Date.now()-lastDragEndedAt.current<180) return;
    onActivate?.(id,index);
  };
  return <div className="inventory-grid" aria-label={`Inventory, ${used} of 28 slots used`}>
    {Array.from({length:28}).map((_,index) => {
      const itemId = slots[index];
      if (itemId && ITEMS[itemId].kind!=="resource") {
        const gearId = itemId as GearId;
        const locked = mode==="equip" && GEAR[gearId].requiredLevel>level;
        const title = mode==="deposit" ? `Deposit ${GEAR[gearId].name}` : locked ? `${GEAR[gearId].name} requires ${WOODCUTTING.name} ${GEAR[gearId].requiredLevel}` : `Equip ${GEAR[gearId].name}`;
        return <button className={`inventory-slot inventory-slot--filled inventory-slot--gear inventory-slot--draggable ${locked ? "inventory-slot--locked" : ""} ${draggedSlot===index ? "inventory-slot--dragging" : ""}`} type="button" key={index}
          draggable onDragStart={event => {event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("application/x-tallowmere-slot",String(index));setDraggedSlot(index);}}
          onDragEnd={() => {lastDragEndedAt.current=Date.now();setDraggedSlot(null);}} onDragOver={event => event.preventDefault()} onDrop={event => dropItem(event,index)} onKeyDown={event => moveWithKeyboard(event,index)}
          onClick={() => activateItem(itemId,index)} onContextMenu={event => onItemContext?.(event,itemId,index)} title={`${title}. Drag to rearrange.`} aria-label={`${title}. Drag to rearrange.`}>
          <GearIcon id={gearId}/><span className="inventory-equip-mark">{mode==="deposit" ? "↓" : locked ? GEAR[gearId].requiredLevel : "+"}</span>
        </button>;
      }
      if (itemId) {
        const title = mode==="deposit" ? `Deposit ${ITEMS[itemId].name}` : ITEMS[itemId].name;
        return <button className={`inventory-slot inventory-slot--filled inventory-slot--draggable ${mode==="deposit" ? "inventory-slot--actionable" : ""} ${draggedSlot===index ? "inventory-slot--dragging" : ""}`} type="button" key={index}
          draggable onDragStart={event => {event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("application/x-tallowmere-slot",String(index));setDraggedSlot(index);}}
          onDragEnd={() => {lastDragEndedAt.current=Date.now();setDraggedSlot(null);}} onDragOver={event => event.preventDefault()} onDrop={event => dropItem(event,index)} onKeyDown={event => moveWithKeyboard(event,index)}
          onClick={() => mode==="deposit" && activateItem(itemId,index)} onContextMenu={event => onItemContext?.(event,itemId,index)} title={`${title}. Drag to rearrange.`} aria-label={`${title}. Drag to rearrange.`}>
          <ItemIcon id={itemId}/><span className="item-amount">1</span>
        </button>;
      }
      return <button className="inventory-slot inventory-slot--drop-target" type="button" key={index} aria-label={`Empty inventory slot ${index+1}`}
        onDragOver={event => {event.preventDefault();event.dataTransfer.dropEffect="move";}} onDrop={event => dropItem(event,index)}/>;
    })}
  </div>;
}
