import type { TreeSpecies } from "../types";

export const TREE_LAYOUT = [
  {species:"normal",x:5,y:10},
  {species:"oak",x:14,y:8},
  {species:"willow",x:87,y:8},
  {species:"teak",x:95,y:16},
  {species:"maple",x:4,y:58},
  {species:"mahogany",x:7,y:88},
  {species:"yew",x:18,y:95},
  {species:"magic",x:83,y:95},
  {species:"ancient",x:94,y:83},
  {species:"celestial",x:97,y:54},
] as const satisfies readonly {species:TreeSpecies;x:number;y:number}[];

export const BANK_POSITION = {x:23,y:40};
export const SAVE_KEY = "tallowmere-save-v1";
export const CHOP_MS = 1700;
export const RESPAWN_MS = 11_000;
export const MAX_INVENTORY_SLOTS = 28;
export const MAX_OFFLINE_MS = 12*60*60*1000;
