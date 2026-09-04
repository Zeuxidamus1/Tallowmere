import { AXES, STARTING_EQUIPMENT } from "../items";
import { BANK_POSITION, MAX_INVENTORY_SLOTS, TREE_LAYOUT } from "../data/world";
import { WOODCUTTING_TREE_BY_ID, woodcuttingLevelFromXp } from "../skills";
import type { GameState, InventorySlot, ItemCounts, TreeState } from "../types";

function makeTrees():TreeState[] {
  return TREE_LAYOUT.map(({x,y,species},id) => {
    const maxCharges = 5+((id*7+2)%6);
    return {id,species,x,y,charges:maxCharges,maxCharges,respawnAt:0};
  });
}

export function restoreTrees(value:unknown,now:number):TreeState[] {
  const base = makeTrees();
  if (!Array.isArray(value)) return base;
  return base.map((tree,index) => {
    const saved = value[index];
    if (!saved || typeof saved!=="object") return tree;
    const candidate = saved as Partial<TreeState>;
    const charges = typeof candidate.charges==="number" && Number.isFinite(candidate.charges)
      ? Math.max(0,Math.min(tree.maxCharges,Math.floor(candidate.charges))) : tree.maxCharges;
    const respawnAt = charges===0 && typeof candidate.respawnAt==="number" && candidate.respawnAt>now ? candidate.respawnAt : 0;
    return respawnAt ? {...tree,charges:0,respawnAt} : {...tree,charges:charges===0 ? tree.maxCharges : charges,respawnAt:0};
  });
}

export function initialGame():GameState {
  const bankItems:ItemCounts = {logs:0};
  AXES.filter(axe => axe.id!=="bronze-axe").forEach(axe => {bankItems[axe.id]=1;});
  return {
    xp:0, gold:0, inventorySlots:Array<InventorySlot>(MAX_INVENTORY_SLOTS).fill(null), bankItems, afk:true,
    action:"idle", targetTreeId:null, nextActionAt:0, characterX:55, characterY:45,
    trees:makeTrees(), now:Date.now(), equipment:{...STARTING_EQUIPMENT},
  };
}

function distance(ax:number,ay:number,bx:number,by:number) {
  return Math.hypot(ax-bx,ay-by);
}

export function walkTime(ax:number,ay:number,bx:number,by:number) {
  return Math.min(2400,Math.max(650,distance(ax,ay,bx,by)*24));
}

export function availableTree(state:GameState) {
  const level = woodcuttingLevelFromXp(state.xp);
  return state.trees.filter(tree => tree.charges>0 && WOODCUTTING_TREE_BY_ID[tree.species].requiredLevel<=level)
    .sort((a,b) => distance(state.characterX,state.characterY,a.x,a.y)-distance(state.characterX,state.characterY,b.x,b.y))[0];
}

export function moveToTree(state:GameState,tree:TreeState,now:number):GameState {
  return {...state,action:"walking-tree",targetTreeId:tree.id,characterX:tree.x+1.8,characterY:tree.y+3,
    nextActionAt:now+walkTime(state.characterX,state.characterY,tree.x,tree.y)};
}

export function moveToNextTree(state:GameState,now:number):GameState {
  const tree = availableTree(state);
  return tree ? moveToTree(state,tree,now) : {...state,action:"waiting",targetTreeId:null,nextActionAt:now+1000};
}

export function moveToBank(state:GameState,now:number):GameState {
  return {...state,action:"walking-bank",targetTreeId:null,characterX:BANK_POSITION.x,characterY:BANK_POSITION.y,
    nextActionAt:now+walkTime(state.characterX,state.characterY,BANK_POSITION.x,BANK_POSITION.y)};
}

export function formatNumber(value:number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDuration(ms:number) {
  const minutes = Math.max(1,Math.floor(ms/60000));
  if (minutes<60) return `${minutes}m`;
  const hours = Math.floor(minutes/60);
  return `${hours}h ${minutes%60}m`;
}
