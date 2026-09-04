import { AXE_BY_ID, GEAR } from "../../items";
import type { AxeId, GameState } from "../../types";
import type { SkillDefinition } from "../types";

export * from "./trees";

export const WOODCUTTING:SkillDefinition = {
  id:"woodcutting",
  name:"Woodcutting",
  description:"Cut trees to gather logs and improve your chopping skill.",
  maxLevel:99,
  xpMultiplier:5,
  xpPerAction:125,
};

export const WOODCUTTING_XP_PER_LOG = WOODCUTTING.xpPerAction;

export function xpForWoodcuttingLevel(level:number) {
  let points = 0;
  for (let current=1;current<level;current+=1) {
    points += Math.floor(current+300*Math.pow(2,current/7));
  }
  return Math.floor(points/4);
}

export const MAX_WOODCUTTING_XP = xpForWoodcuttingLevel(WOODCUTTING.maxLevel);

export function woodcuttingLevelFromXp(xp:number) {
  for (let level=WOODCUTTING.maxLevel;level>=2;level-=1) {
    if (xp>=xpForWoodcuttingLevel(level)) return level;
  }
  return 1;
}

export function hasWoodcuttingAxe(state:Pick<GameState,"equipment">) {
  const weapon = state.equipment.weapon;
  return Boolean(weapon && GEAR[weapon]?.kind==="axe");
}

export function equippedWoodcuttingAxe(state:Pick<GameState,"equipment">) {
  const weapon = state.equipment.weapon;
  return weapon && GEAR[weapon]?.kind==="axe" ? AXE_BY_ID[weapon as AxeId] : null;
}
