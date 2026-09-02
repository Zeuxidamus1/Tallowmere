import type { CSSProperties, MouseEvent } from "react";
import type { CityBuildingDefinition } from "../shops";

export function CityBuilding({building,onVisit}:{building:CityBuildingDefinition;onVisit:()=>void}) {
  const position = {left:`${building.x}%`,top:`${building.y}%`} as CSSProperties;
  return <button className={`city-building city-building--${building.id}`} style={position} type="button"
    onClick={(event:MouseEvent<HTMLButtonElement>) => {event.stopPropagation();onVisit();}}
    aria-label={`Enter ${building.name}`}>
    <span className="city-building__badge" aria-hidden="true">{building.icon}</span>
    <span className="city-building__label">{building.shortName}</span>
  </button>;
}
