import type { CSSProperties } from "react";
import { AXE_BY_ID, GEAR, ITEMS } from "../items";
import type { AxeId, GearId, ItemId } from "../types";

export function AxeIcon({id="bronze-axe",small=false}:{id?:AxeId;small?:boolean}) {
  const axe = AXE_BY_ID[id];
  const colors = {"--axe-metal":axe.metal,"--axe-edge":axe.edge,"--axe-handle":axe.handle} as CSSProperties;
  return <span className={`axe-icon axe-icon--shape-${axe.shape} ${small ? "axe-icon--small" : ""}`} style={colors} aria-hidden="true"><i/><b/></span>;
}

export function LogIcon({small=false}:{small?:boolean}) {
  return <span className={`log-icon ${small ? "log-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

export function GearIcon({id,small=false}:{id:GearId;small?:boolean}) {
  if (GEAR[id].kind==="axe") return <AxeIcon id={id as AxeId} small={small}/>;
  return <span className={`gear-icon gear-icon--${id} ${small ? "gear-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

export function ItemIcon({id,small=false}:{id:ItemId;small?:boolean}) {
  if (id==="logs") return <LogIcon small={small}/>;
  if (ITEMS[id].kind==="resource") return <span className={`resource-icon resource-icon--${id} ${small ? "resource-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
  return <GearIcon id={id as GearId} small={small}/>;
}
