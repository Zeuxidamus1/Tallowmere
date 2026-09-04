import type { CSSProperties } from "react";
import { AXE_BY_ID, GEAR, ITEMS } from "../items";
import type { AxeId, GearId, ItemId, LogId } from "../types";

export function AxeIcon({id="bronze-axe",small=false}:{id?:AxeId;small?:boolean}) {
  const axe = AXE_BY_ID[id];
  const colors = {"--axe-metal":axe.metal,"--axe-edge":axe.edge,"--axe-handle":axe.handle} as CSSProperties;
  return <span className={`axe-icon axe-icon--shape-${axe.shape} ${small ? "axe-icon--small" : ""}`} style={colors} aria-hidden="true"><i/><b/></span>;
}

export function LogIcon({id="logs",small=false}:{id?:LogId;small?:boolean}) {
  const item = ITEMS[id];
  return <span className={`log-icon log-icon--art ${small ? "log-icon--small" : ""}`} aria-hidden="true">
    {/* eslint-disable-next-line @next/next/no-img-element -- public item art must also work in the GitHub Pages build */}
    <img src={item.kind==="resource" ? item.image : ""} alt="" draggable="false"/>
  </span>;
}

export function GearIcon({id,small=false}:{id:GearId;small?:boolean}) {
  if (GEAR[id].kind==="axe") return <AxeIcon id={id as AxeId} small={small}/>;
  return <span className={`gear-icon gear-icon--${id} ${small ? "gear-icon--small" : ""}`} aria-hidden="true"><i/><b/></span>;
}

export function ItemIcon({id,small=false}:{id:ItemId;small?:boolean}) {
  if (ITEMS[id].kind==="resource") return <LogIcon id={id as LogId} small={small}/>;
  return <GearIcon id={id as GearId} small={small}/>;
}
